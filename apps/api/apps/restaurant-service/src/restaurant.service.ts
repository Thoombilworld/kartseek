import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

import {
  Restaurant, RestaurantStatus,
  MenuCategory, MenuItem, DietaryType,
  RestaurantOrder, RestaurantOrderStatus, RestaurantOrderType, RestaurantPaymentMethod, RestaurantPaymentStatus,
  ORDER_STATUS_TRANSITIONS,
  Reservation, ReservationStatus,
  RestaurantReview,
  RestaurantTable, TableStatus,
  RestaurantPromotion,
  RestaurantStaff,
} from './entities';

@Injectable()
export class RestaurantService {
  private readonly logger = new Logger(RestaurantService.name);

  constructor(
    @InjectRepository(Restaurant)        private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuCategory)      private readonly categoryRepo: Repository<MenuCategory>,
    @InjectRepository(MenuItem)          private readonly menuItemRepo: Repository<MenuItem>,
    @InjectRepository(RestaurantOrder)   private readonly orderRepo: Repository<RestaurantOrder>,
    @InjectRepository(Reservation)       private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(RestaurantReview)  private readonly reviewRepo: Repository<RestaurantReview>,
    @InjectRepository(RestaurantTable)   private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(RestaurantPromotion) private readonly promotionRepo: Repository<RestaurantPromotion>,
    @InjectRepository(RestaurantStaff)   private readonly staffRepo: Repository<RestaurantStaff>,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  Health
  // ═══════════════════════════════════════════════════════════════════════════

  async healthCheck() {
    return { service: 'restaurant-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Restaurant CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async listRestaurants(opts: {
    cuisine?: string; minRating?: number; sortBy?: string;
    isOpen?: boolean; page?: number; limit?: number;
    regionCode?: string; countryCode?: string;
  }) {
    const { cuisine, minRating, sortBy, isOpen, page = 1, limit = 20, regionCode, countryCode } = opts;
    const qb = this.restaurantRepo.createQueryBuilder('r')
      .where('r.status = :status', { status: RestaurantStatus.APPROVED });

    if (countryCode)  qb.andWhere('r.countryCode = :cc', { cc: countryCode });
    if (regionCode)   qb.andWhere('r.regionCode = :rc', { rc: regionCode });
    if (isOpen !== undefined) qb.andWhere('r.isOnline = :isOnline', { isOnline: isOpen });
    if (minRating)    qb.andWhere('r.rating >= :minRating', { minRating });
    if (cuisine)      qb.andWhere(':cuisine = ANY(string_to_array(r.cuisines, \',\'))', { cuisine });

    const orderMap: Record<string, string> = {
      rating: 'r.rating', distance: 'r.latitude', popularity: 'r.totalOrders', deliveryTime: 'r.avgPrepTime',
    };
    qb.orderBy(orderMap[sortBy || 'rating'] || 'r.rating', sortBy === 'deliveryTime' ? 'ASC' : 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async searchRestaurants(q: string, page = 1, limit = 20) {
    const query = `%${q}%`;
    const restaurants = await this.restaurantRepo.find({
      where: [
        { name: ILike(query), status: RestaurantStatus.APPROVED },
      ],
      take: limit, skip: (page - 1) * limit,
    });
    const dishes = await this.menuItemRepo.find({
      where: { name: ILike(query), isAvailable: true },
      take: limit,
    });
    return { restaurants, dishes, totalResults: restaurants.length + dishes.length };
  }

  async getRestaurantBySlug(slug: string) {
    const cacheKey = `restaurant:slug:${slug}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const restaurant = await this.restaurantRepo.findOne({
      where: [{ slug }, { id: slug }],
      relations: ['menuCategories'],
    });
    if (!restaurant) throw new NotFoundException(`Restaurant '${slug}' not found`);

    await this.redis.setJson(cacheKey, restaurant, 300);
    return restaurant;
  }

  async getRestaurantById(id: string) {
    const restaurant = await this.restaurantRepo.findOne({ where: { id }, relations: ['menuCategories', 'tables'] });
    if (!restaurant) throw new NotFoundException(`Restaurant ${id} not found`);
    return restaurant;
  }

  async updateRestaurantProfile(id: string, update: Partial<Restaurant>) {
    await this.restaurantRepo.update(id, update);
    await this.redis.del(`restaurant:slug:*`);
    return { success: true, message: 'Profile updated' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Menu Management
  // ═══════════════════════════════════════════════════════════════════════════

  async getMenuByRestaurant(restaurantId: string) {
    const categories = await this.categoryRepo.find({
      where: { restaurantId, isActive: true },
      relations: ['items'],
      order: { sortOrder: 'ASC' },
    });
    return {
      restaurantId,
      categories: categories.map(cat => ({
        ...cat,
        items: (cat.items || []).filter(i => i.isAvailable).sort((a, b) => a.sortOrder - b.sortOrder),
      })),
    };
  }

  async addMenuItem(restaurantId: string, dto: Partial<MenuItem>) {
    const item = this.menuItemRepo.create({ ...dto, restaurantId });
    const saved = await this.menuItemRepo.save(item);
    await this.kafka.publish('restaurant.menu_item.created', { id: saved.id, restaurantId, name: saved.name });
    this.logger.log(`Menu item added: ${saved.id} to restaurant ${restaurantId}`);
    return { success: true, item: saved };
  }

  async updateMenuItem(itemId: string, dto: Partial<MenuItem>) {
    const item = await this.menuItemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`Menu item ${itemId} not found`);
    Object.assign(item, dto);
    const saved = await this.menuItemRepo.save(item);
    return { success: true, item: saved };
  }

  async deleteMenuItem(itemId: string) {
    const result = await this.menuItemRepo.delete(itemId);
    if (!result.affected) throw new NotFoundException(`Menu item ${itemId} not found`);
    return { success: true, message: 'Item deleted' };
  }

  async getMenuCategories(restaurantId: string) {
    return this.categoryRepo.find({ where: { restaurantId }, order: { sortOrder: 'ASC' } });
  }

  async addMenuCategory(restaurantId: string, dto: Partial<MenuCategory>) {
    const cat = this.categoryRepo.create({ ...dto, restaurantId });
    return this.categoryRepo.save(cat);
  }

  async updateMenuCategory(categoryId: string, dto: Partial<MenuCategory>) {
    await this.categoryRepo.update(categoryId, dto);
    return { success: true };
  }

  async deleteMenuCategory(categoryId: string) {
    await this.categoryRepo.delete(categoryId);
    return { success: true };
  }

  async bulkUpdateAvailability(items: Array<{ itemId: string; isAvailable: boolean }>) {
    for (const { itemId, isAvailable } of items) {
      await this.menuItemRepo.update(itemId, { isAvailable });
    }
    return { success: true, updated: items.length };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Orders
  // ═══════════════════════════════════════════════════════════════════════════

  async placeOrder(dto: {
    restaurantId: string; customerId: string; orderType: RestaurantOrderType;
    items: RestaurantOrder['items']; paymentMethod: RestaurantPaymentMethod;
    deliveryAddress?: RestaurantOrder['deliveryAddress']; deliveryInstructions?: string;
    deliverySlot?: RestaurantOrder['deliverySlot']; couponCode?: string;
    tableId?: string; guestCount?: number; scheduledPickupAt?: Date;
    customerPhone?: string; orderNotes?: string; idempotencyKey?: string;
    tip?: number;
  }) {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.orderRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
      if (existing) return { success: true, order: existing, duplicate: true };
    }

    const restaurant = await this.restaurantRepo.findOne({ where: { id: dto.restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (!restaurant.isOnline) throw new BadRequestException('Restaurant is currently closed');

    /**
     * Price the order from the restaurant's own menu.
     *
     * The fees and tax below were always computed server-side, but the line
     * prices were not: `itemTotal += item.price * item.quantity` multiplied a
     * number the client sent. A basket submitted with `price: 1` on every line
     * was accepted and stored at that total, and `additionalPrice` on each
     * customisation was taken on the same trust. The customer also named the
     * dish: `items` was written to the order verbatim, so the receipt said
     * whatever the request said.
     *
     * The client now chooses what and how many; the menu decides what it costs
     * and what it is called. This mirrors the same repair in pharmacy-service.
     */
    const requested = Array.isArray(dto.items) ? dto.items : [];
    if (requested.length === 0) throw new BadRequestException('An order must contain at least one item');

    const menuItems = await this.menuItemRepo.find({
      where: { id: In(requested.map((i) => i.itemId).filter(Boolean)), restaurantId: dto.restaurantId },
    });
    const menuById = new Map(menuItems.map((m) => [m.id, m]));

    let itemTotal = 0;
    const items: RestaurantOrder['items'] = requested.map((requestedItem) => {
      const menuItem = menuById.get(requestedItem.itemId);
      // An item this restaurant does not serve is refused rather than priced at
      // whatever the caller claimed.
      if (!menuItem) throw new BadRequestException(`Item ${requestedItem.itemId} is not on this restaurant's menu`);
      if (!menuItem.isAvailable) throw new BadRequestException(`${menuItem.name} is currently unavailable`);

      const quantity = Math.max(1, Math.trunc(Number(requestedItem.quantity) || 0));
      const unitPrice = Number(menuItem.price);

      // Each chosen option is priced from the group it belongs to. An option the
      // menu does not offer costs nothing rather than whatever was submitted.
      const customizations = (requestedItem.customizations ?? []).map((chosen) => {
        const group = (menuItem.customizations ?? []).find((g) => g.groupName === chosen.groupName);
        const selected = Array.isArray(chosen.selected) ? chosen.selected : [];
        const additionalPrice = selected.reduce((sum, optionName) => {
          const option = group?.options?.find((o) => o.name === optionName);
          return sum + (option ? Number(option.price) || 0 : 0);
        }, 0);
        return { groupName: chosen.groupName, selected, additionalPrice };
      });

      const lineTotal = (unitPrice * quantity)
        + customizations.reduce((sum, c) => sum + c.additionalPrice, 0);
      itemTotal += lineTotal;

      return {
        itemId: menuItem.id,
        name: menuItem.name,
        quantity,
        price: unitPrice,
        // The order line records a boolean; the menu records a four-way dietary
        // type. VEG and VEGAN are both vegetarian for this purpose.
        isVeg: menuItem.dietaryType === DietaryType.VEG || menuItem.dietaryType === DietaryType.VEGAN,
        ...(customizations.length ? { customizations } : {}),
        ...(requestedItem.specialInstructions ? { specialInstructions: requestedItem.specialInstructions } : {}),
      };
    });
    itemTotal = +itemTotal.toFixed(2);

    const deliveryFee = dto.orderType === RestaurantOrderType.DELIVERY ? Number(restaurant.deliveryFee) : 0;
    const packagingFee = Number(restaurant.packagingFee);
    const taxAmount = +(itemTotal * Number(restaurant.taxRate) / 100).toFixed(2);
    // Bounded and non-negative: a negative tip would reduce `grandTotal`, and an
    // unbounded one is the same open door the line prices were.
    const requestedTip = Number(dto.tip);
    const tip = Number.isFinite(requestedTip) && requestedTip > 0
      ? Math.min(+requestedTip.toFixed(2), 10_000)
      : 0;
    let discount = 0;

    // Apply coupon
    if (dto.couponCode) {
      const promo = await this.promotionRepo.findOne({
        where: { code: dto.couponCode, restaurantId: dto.restaurantId, isActive: true },
      });
      if (promo && itemTotal >= Number(promo.minOrderAmount)) {
        if (promo.type === 'PERCENTAGE') {
          discount = Math.min(+(itemTotal * Number(promo.discountValue) / 100).toFixed(2), Number(promo.maxDiscount) || Infinity);
        } else if (promo.type === 'FLAT') {
          discount = Number(promo.discountValue);
        } else if (promo.type === 'FREE_DELIVERY') {
          discount = deliveryFee;
        }
        promo.usedCount += 1;
        await this.promotionRepo.save(promo);
      }
    }

    const grandTotal = +(itemTotal + deliveryFee + packagingFee + taxAmount + tip - discount).toFixed(2);
    const orderNumber = `RST-${Date.now().toString(36).toUpperCase()}`;

    const order = this.orderRepo.create({
      orderNumber, restaurantId: dto.restaurantId, customerId: dto.customerId,
      orderType: dto.orderType, items, paymentMethod: dto.paymentMethod,
      itemTotal, deliveryFee, packagingFee, taxAmount, tip, discount,
      couponCode: dto.couponCode, grandTotal,
      deliveryAddress: dto.deliveryAddress, deliveryInstructions: dto.deliveryInstructions,
      deliverySlot: dto.deliverySlot, tableId: dto.tableId, guestCount: dto.guestCount,
      scheduledPickupAt: dto.scheduledPickupAt, customerPhone: dto.customerPhone,
      orderNotes: dto.orderNotes, idempotencyKey: dto.idempotencyKey,
      deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
      status: RestaurantOrderStatus.PLACED,
      paymentStatus: dto.paymentMethod === RestaurantPaymentMethod.COD
        ? RestaurantPaymentStatus.PENDING : RestaurantPaymentStatus.PENDING,
    });

    const saved = await this.orderRepo.save(order);
    await this.kafka.publish('restaurant.order.placed', { orderId: saved.id, restaurantId: dto.restaurantId, orderType: dto.orderType });
    return { success: true, order: saved };
  }

  // ── Customer-facing order reads ─────────────────────────────────────────────

  /** Guards uuid columns against being compared with a human-facing reference. */
  private static readonly UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /**
   * One customer's own restaurant orders, newest first.
   *
   * `placeOrder` has always persisted to `restaurant_orders`, but nothing could
   * read those rows back for the person who placed them: the only query was
   * `getOrdersByRestaurant`, which is the seller's view. So the gateway answered
   * `GET /orders/restaurant/history` with three order objects written into the
   * controller — "The Grand Biryani House", "Pizza Paradise", "Punjab Da Dhaba"
   * — identical for every customer, and a real order placed through checkout
   * never appeared anywhere afterwards.
   */
  async getCustomerOrders(customerId: string, opts: { status?: string; type?: string; page?: number; limit?: number } = {}) {
    if (!customerId) throw new BadRequestException('customerId is required');
    const { status, type, page = 1, limit = 20 } = opts;
    const qb = this.orderRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.restaurant', 'r')
      .where('o.customerId = :customerId', { customerId });
    if (status && status !== 'all') qb.andWhere('o.status = :status', { status });
    if (type && type !== 'all') qb.andWhere('o.orderType = :type', { type });
    qb.orderBy('o.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * One order, scoped to the customer who placed it.
   *
   * The customer id is part of the lookup rather than checked afterwards, so an
   * order belonging to someone else is indistinguishable from one that does not
   * exist — a `NotFoundException` either way, which is what stops the id space
   * being probed for whose orders exist.
   */
  async getCustomerOrderById(customerId: string, orderId: string) {
    if (!customerId) throw new BadRequestException('customerId is required');
    if (!orderId) throw new BadRequestException('orderId is required');

    // Customers know their order by its number ("RST-MTBB5K55"), which is what
    // the history rows link with, but `id` is a uuid column. Offering both in one
    // `where` array is not enough: Postgres rejects the whole statement with
    // `invalid input syntax for type uuid` before the second branch can match, so
    // the uuid comparison is only included when the value could be one.
    const where = RestaurantService.UUID.test(orderId)
      ? [{ id: orderId, customerId }, { orderNumber: orderId, customerId }]
      : [{ orderNumber: orderId, customerId }];

    const order = await this.orderRepo.findOne({ where, relations: ['restaurant'] });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return order;
  }

  /**
   * A tracking timeline for one of the customer's orders.
   *
   * Built from the timestamps the order actually carries, so a step is "done"
   * only where the row records that it happened. The gateway used to return a
   * fixed four-step ladder with the first three marked complete regardless of
   * the order's real state.
   */
  async getCustomerOrderTracking(customerId: string, orderId: string) {
    const order = await this.getCustomerOrderById(customerId, orderId);

    const cancelled = order.status === RestaurantOrderStatus.CANCELLED
      || order.status === RestaurantOrderStatus.RESTAURANT_REJECTED;

    // Dine-in and takeaway do not pass through a courier, so their timelines end
    // at the restaurant rather than showing delivery steps that will never come.
    const deliverySteps = order.orderType === RestaurantOrderType.DELIVERY
      ? [
          { key: RestaurantOrderStatus.OUT_FOR_DELIVERY, label: 'Out for delivery', at: order.pickedUpAt },
          { key: RestaurantOrderStatus.DELIVERED, label: 'Delivered', at: order.deliveredAt },
        ]
      : [
          {
            key: order.orderType === RestaurantOrderType.TAKEAWAY
              ? RestaurantOrderStatus.CUSTOMER_PICKED_UP
              : RestaurantOrderStatus.SERVED,
            label: order.orderType === RestaurantOrderType.TAKEAWAY ? 'Picked up' : 'Served',
            at: order.completedAt,
          },
        ];

    const steps = [
      { key: RestaurantOrderStatus.PLACED, label: 'Order placed', at: order.createdAt },
      { key: RestaurantOrderStatus.RESTAURANT_ACCEPTED, label: 'Accepted by restaurant', at: order.acceptedAt },
      { key: RestaurantOrderStatus.PREPARING, label: 'Preparing', at: null as Date | null },
      { key: RestaurantOrderStatus.READY_FOR_PICKUP, label: 'Ready', at: order.preparedAt },
      ...deliverySteps,
    ];

    /**
     * A step is complete when the order has reached it, whether or not there is
     * a column recording the moment.
     *
     * Not every step has a timestamp — the order records `acceptedAt`,
     * `preparedAt`, `pickedUpAt` and `deliveredAt`, but nothing for PREPARING.
     * Deriving "done" from the timestamp alone left an order that was visibly
     * being prepared showing that step as not yet started; borrowing `acceptedAt`
     * for it instead — which is what this did — claimed the kitchen started
     * cooking at the same instant it accepted, and stamped a time on an event
     * that had not been recorded. Position in the order's own lifecycle decides
     * completion; the timestamp is shown only where one genuinely exists.
     */
    const reached = steps.findIndex((s) => s.key === order.status);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      orderType: order.orderType,
      restaurantName: order.restaurant?.name ?? null,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
      cancelled,
      cancelReason: order.cancelReason,
      driverId: order.driverId,
      steps: steps.map((s, i) => ({
        status: s.key,
        label: s.label,
        at: s.at ?? null,
        // A cancelled order stops where it stopped: nothing beyond the last
        // recorded step should read as completed.
        done: cancelled ? !!s.at : (!!s.at || (reached >= 0 && i <= reached)),
      })),
    };
  }

  /**
   * Cancel one of the customer's own orders.
   *
   * The gateway used to answer this with `success: true` and a refund object
   * quoting a fixed amount and a made-up refund id, without touching the order.
   * A customer who cancelled saw a confirmed refund, the restaurant saw a live
   * order, and no refund existed anywhere.
   *
   * The transition table decides whether cancelling is still allowed, so an
   * order already out for delivery is refused rather than silently "cancelled".
   */
  async cancelCustomerOrder(customerId: string, orderId: string, reason?: string) {
    const order = await this.getCustomerOrderById(customerId, orderId);
    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(RestaurantOrderStatus.CANCELLED)) {
      throw new BadRequestException(`This order can no longer be cancelled (${order.status})`);
    }

    order.status = RestaurantOrderStatus.CANCELLED;
    order.cancelReason = reason ?? null;
    order.cancelledBy = 'customer';
    const saved = await this.orderRepo.save(order);

    // Refunds are payment-service's to issue, and it listens for this. Nothing
    // here quotes an amount or a refund id, because nothing here has issued one.
    await this.kafka.publish('restaurant.order.cancelled', {
      orderId: saved.id,
      orderNumber: saved.orderNumber,
      restaurantId: saved.restaurantId,
      customerId: saved.customerId,
      paymentStatus: saved.paymentStatus,
      grandTotal: saved.grandTotal,
      cancelledBy: 'customer',
      reason: reason ?? null,
      cancelledAt: new Date().toISOString(),
    });

    return { success: true, order: saved };
  }

  /**
   * The items of a past order, for repopulating a cart.
   *
   * Availability is resolved against the menu as it stands now, so an item the
   * restaurant has since removed or switched off is reported unavailable rather
   * than being offered again and failing at checkout.
   */
  async getReorderItems(customerId: string, orderId: string) {
    const order = await this.getCustomerOrderById(customerId, orderId);
    const menuIds = order.items.map((i) => i.itemId).filter(Boolean);
    const menuItems = menuIds.length
      ? await this.menuItemRepo.find({ where: { id: In(menuIds) } })
      : [];
    const byId = new Map(menuItems.map((m) => [m.id, m]));

    const available: Array<Record<string, unknown>> = [];
    const unavailable: Array<Record<string, unknown>> = [];
    for (const item of order.items) {
      const current = byId.get(item.itemId);
      const target = current?.isAvailable ? available : unavailable;
      target.push({
        itemId: item.itemId,
        name: current?.name ?? item.name,
        quantity: item.quantity,
        // The price now, not the price then — a stale price would be rejected at
        // checkout, and quoting it here would misstate the basket.
        price: current ? Number(current.price) : null,
        previousPrice: item.price,
      });
    }

    return {
      restaurantId: order.restaurantId,
      restaurantName: order.restaurant?.name ?? null,
      sourceOrderId: order.id,
      sourceOrderNumber: order.orderNumber,
      items: available,
      unavailableItems: unavailable,
      estimatedTotal: available.reduce(
        (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0,
      ),
    };
  }

  async getOrdersByRestaurant(restaurantId: string, opts: { status?: string; type?: string; page?: number; limit?: number }) {
    const { status, type, page = 1, limit = 20 } = opts;
    const qb = this.orderRepo.createQueryBuilder('o')
      .where('o.restaurantId = :restaurantId', { restaurantId });
    if (status && status !== 'all') qb.andWhere('o.status = :status', { status });
    if (type && type !== 'all') qb.andWhere('o.orderType = :type', { type });
    qb.orderBy('o.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getOrderById(restaurantId: string, orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return order;
  }

  async updateOrderStatus(restaurantId: string, orderId: string, newStatus: RestaurantOrderStatus, meta?: { reason?: string; cancelledBy?: string }) {
    const order = await this.getOrderById(restaurantId, orderId);
    const allowed = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowed?.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${newStatus}`);
    }
    order.status = newStatus;
    if (newStatus === RestaurantOrderStatus.RESTAURANT_ACCEPTED) order.acceptedAt = new Date();
    if (newStatus === RestaurantOrderStatus.READY_FOR_PICKUP) order.preparedAt = new Date();
    if (newStatus === RestaurantOrderStatus.DELIVERED) order.deliveredAt = new Date();
    if (newStatus === RestaurantOrderStatus.COMPLETED) order.completedAt = new Date();
    if (newStatus === RestaurantOrderStatus.CANCELLED) {
      order.cancelReason = meta?.reason || null;
      order.cancelledBy = meta?.cancelledBy || null;
    }
    const saved = await this.orderRepo.save(order);
    await this.kafka.publish('restaurant.order.status_changed', { orderId, newStatus, restaurantId });
    return { success: true, order: saved };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Reservations
  // ═══════════════════════════════════════════════════════════════════════════

  async bookTable(restaurantId: string, dto: {
    customerId: string; customerName: string; customerPhone?: string; customerEmail?: string;
    date: string; time: string; guests: number; tableId?: string;
    seatingPreference?: string; occasion?: string; specialRequests?: string;
  }) {
    // Check for conflicting reservation
    if (dto.tableId) {
      const existing = await this.reservationRepo.findOne({
        where: { restaurantId, tableId: dto.tableId, date: dto.date, time: dto.time,
          status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]) },
      });
      if (existing) throw new ConflictException('This table is already booked for the selected time');
    }

    const bookingRef = `TBK-${Date.now().toString(36).toUpperCase()}`;
    const reservation = this.reservationRepo.create({
      bookingRef, restaurantId, ...dto, status: ReservationStatus.PENDING,
    });
    const saved = await this.reservationRepo.save(reservation);
    await this.kafka.publish('restaurant.table.booked', { id: saved.id, restaurantId, customerId: dto.customerId });
    return { success: true, booking: saved };
  }

  async getReservations(restaurantId: string, opts?: { status?: string; date?: string }) {
    const where: any = { restaurantId };
    if (opts?.status && opts.status !== 'all') where.status = opts.status;
    if (opts?.date) where.date = opts.date;
    return this.reservationRepo.find({ where, order: { date: 'ASC', time: 'ASC' } });
  }

  async updateReservationStatus(reservationId: string, status: ReservationStatus, meta?: { reason?: string; cancelledBy?: string }) {
    const res = await this.reservationRepo.findOne({ where: { id: reservationId } });
    if (!res) throw new NotFoundException(`Reservation ${reservationId} not found`);
    res.status = status;
    if (status === ReservationStatus.CONFIRMED) res.confirmedAt = new Date();
    if (status === ReservationStatus.SEATED) res.seatedAt = new Date();
    if (status === ReservationStatus.COMPLETED) res.completedAt = new Date();
    if (status === ReservationStatus.CANCELLED) {
      res.cancellationReason = meta?.reason || null;
      res.cancelledBy = meta?.cancelledBy || null;
    }
    return this.reservationRepo.save(res);
  }

  async getCustomerReservations(customerId: string) {
    return this.reservationRepo.find({ where: { customerId }, order: { date: 'DESC' } });
  }

  async cancelReservation(reservationId: string, customerId: string, reason?: string) {
    const res = await this.reservationRepo.findOne({ where: { id: reservationId, customerId } });
    if (!res) throw new NotFoundException('Reservation not found');
    return this.updateReservationStatus(reservationId, ReservationStatus.CANCELLED, { reason, cancelledBy: 'customer' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Reviews
  // ═══════════════════════════════════════════════════════════════════════════

  async getReviews(restaurantId: string, page = 1, limit = 20) {
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { restaurantId, isVisible: true },
      order: { createdAt: 'DESC' },
      take: limit, skip: (page - 1) * limit,
    });
    return { data, total, page, limit };
  }

  async submitReview(dto: { restaurantId: string; customerId: string; customerName: string; orderId?: string; rating: number; comment?: string; photos?: string[] }) {
    const review = this.reviewRepo.create(dto);
    const saved = await this.reviewRepo.save(review);

    // Update restaurant aggregate rating
    const { avg, count } = await this.reviewRepo.createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.restaurantId = :rid', { rid: dto.restaurantId })
      .getRawOne();
    await this.restaurantRepo.update(dto.restaurantId, {
      rating: parseFloat(avg).toFixed(1) as any,
      ratingCount: parseInt(count),
    });

    return { success: true, review: saved };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Tables
  // ═══════════════════════════════════════════════════════════════════════════

  async getTables(restaurantId: string) {
    return this.tableRepo.find({ where: { restaurantId }, order: { area: 'ASC', sortOrder: 'ASC' } });
  }

  async updateTable(restaurantId: string, tableId: string, dto: Partial<RestaurantTable>) {
    await this.tableRepo.update({ id: tableId, restaurantId }, dto);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Promotions
  // ═══════════════════════════════════════════════════════════════════════════

  async getPromotions(restaurantId: string) {
    return this.promotionRepo.find({ where: { restaurantId }, order: { createdAt: 'DESC' } });
  }

  async createPromotion(restaurantId: string, dto: Partial<RestaurantPromotion>) {
    const promo = this.promotionRepo.create({ ...dto, restaurantId });
    return this.promotionRepo.save(promo);
  }

  async updatePromotion(promoId: string, dto: Partial<RestaurantPromotion>) {
    await this.promotionRepo.update(promoId, dto);
    return { success: true };
  }

  async deletePromotion(promoId: string) {
    await this.promotionRepo.delete(promoId);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Staff Management
  // ═══════════════════════════════════════════════════════════════════════════

  async getStaff(restaurantId: string) {
    return this.staffRepo.find({ where: { restaurantId }, order: { createdAt: 'ASC' } });
  }

  async addStaff(restaurantId: string, dto: Partial<RestaurantStaff>) {
    const staff = this.staffRepo.create({ ...dto, restaurantId });
    return this.staffRepo.save(staff);
  }

  async updateStaff(staffId: string, dto: Partial<RestaurantStaff>) {
    await this.staffRepo.update(staffId, dto);
    return { success: true };
  }

  async removeStaff(staffId: string) {
    await this.staffRepo.delete(staffId);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  async getAnalytics(restaurantId: string) {
    const totalOrders = await this.orderRepo.count({ where: { restaurantId } });
    const completedOrders = await this.orderRepo.count({ where: { restaurantId, status: RestaurantOrderStatus.COMPLETED } });
    const cancelledOrders = await this.orderRepo.count({ where: { restaurantId, status: RestaurantOrderStatus.CANCELLED } });

    const revenueResult = await this.orderRepo.createQueryBuilder('o')
      .select('COALESCE(SUM(o.grandTotal), 0)', 'totalRevenue')
      .addSelect('COALESCE(AVG(o.grandTotal), 0)', 'avgOrderValue')
      .where('o.restaurantId = :rid', { rid: restaurantId })
      .andWhere('o.status = :status', { status: RestaurantOrderStatus.COMPLETED })
      .getRawOne();

    const ratingResult = await this.reviewRepo.createQueryBuilder('r')
      .select('COALESCE(AVG(r.rating), 0)', 'avgRating')
      .addSelect('COUNT(r.id)', 'totalReviews')
      .where('r.restaurantId = :rid', { rid: restaurantId })
      .getRawOne();

    return {
      totalOrders, completedOrders, cancelledOrders,
      cancellationRate: totalOrders > 0 ? +((cancelledOrders / totalOrders) * 100).toFixed(1) : 0,
      totalRevenue: parseFloat(revenueResult.totalRevenue),
      avgOrderValue: parseFloat(revenueResult.avgOrderValue),
      avgRating: parseFloat(ratingResult.avgRating),
      totalReviews: parseInt(ratingResult.totalReviews),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Admin — Approvals & Management
  // ═══════════════════════════════════════════════════════════════════════════

  async getPendingApprovals() {
    return this.restaurantRepo.find({
      where: { status: In([RestaurantStatus.PENDING_KYC, RestaurantStatus.PENDING_APPROVAL]) },
      order: { createdAt: 'ASC' },
    });
  }

  async approveRestaurant(restaurantId: string, adminId: string) {
    await this.restaurantRepo.update(restaurantId, { status: RestaurantStatus.APPROVED, isOnline: true });
    await this.kafka.publish('restaurant.approved', { id: restaurantId, approvedBy: adminId });
    this.logger.log(`Restaurant ${restaurantId} approved by ${adminId}`);
    return { success: true, restaurantId, message: 'Restaurant approved and activated' };
  }

  async rejectRestaurant(restaurantId: string, reason: string) {
    await this.restaurantRepo.update(restaurantId, { status: RestaurantStatus.PENDING_KYC, rejectionReason: reason });
    return { success: true, restaurantId, message: 'Restaurant rejected' };
  }

  async suspendRestaurant(restaurantId: string) {
    await this.restaurantRepo.update(restaurantId, { status: RestaurantStatus.SUSPENDED, isOnline: false });
    return { success: true };
  }

  async unsuspendRestaurant(restaurantId: string) {
    await this.restaurantRepo.update(restaurantId, { status: RestaurantStatus.APPROVED });
    return { success: true };
  }

  async blockRestaurant(restaurantId: string) {
    await this.restaurantRepo.update(restaurantId, { status: RestaurantStatus.BLOCKED, isOnline: false });
    return { success: true };
  }

  async unblockRestaurant(restaurantId: string) {
    await this.restaurantRepo.update(restaurantId, { status: RestaurantStatus.APPROVED });
    return { success: true };
  }

  async getAdminRestaurantList(opts: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 50 } = opts;
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    const [data, total] = await this.restaurantRepo.findAndCount({
      where, order: { createdAt: 'DESC' }, take: limit, skip: (page - 1) * limit,
    });
    return { data, total, page, limit };
  }

  async setCommission(restaurantId: string, rate: number) {
    await this.restaurantRepo.update(restaurantId, { commissionRate: rate });
    return { success: true, restaurantId, commissionRate: rate };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Nearby (Geo — uses simple distance calc; upgrade to PostGIS for prod)
  // ═══════════════════════════════════════════════════════════════════════════

  async getNearbyRestaurants(lat: number, lng: number, radiusKm = 5) {
    // `lat.toFixed()` below assumed both coordinates were present. Calling
    // /restaurants/nearby without them (or with text the gateway's parseFloat
    // turned into NaN) threw "Cannot read properties of null (reading
    // 'toFixed')" and surfaced as a 500 — a missing query parameter reported as
    // a server fault. Range-checked too, so a swapped lat/lng is rejected here
    // rather than silently returning nothing.
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      throw new BadRequestException('lat and lng are required and must be numbers');
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      throw new BadRequestException('lat must be between -90 and 90, lng between -180 and 180');
    }
    lat = latNum;
    lng = lngNum;

    const cacheKey = `restaurants:nearby:${lat.toFixed(2)}:${lng.toFixed(2)}:${radiusKm}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    // Simple Haversine approximation — replace with PostGIS ST_DWithin for production
    const restaurants = await this.restaurantRepo.createQueryBuilder('r')
      .where('r.status = :status', { status: RestaurantStatus.APPROVED })
      .andWhere('r.isOnline = true')
      .orderBy('r.rating', 'DESC')
      .take(50)
      .getMany();

    const filtered = restaurants.filter(r => {
      const dLat = (Number(r.latitude) - lat) * Math.PI / 180;
      const dLng = (Number(r.longitude) - lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(Number(r.latitude) * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const d = 2 * 6371 * Math.asin(Math.sqrt(a));
      return d <= radiusKm;
    });

    const result = { data: filtered, total: filtered.length };
    await this.redis.setJson(cacheKey, result, 120);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Misc
  // ═══════════════════════════════════════════════════════════════════════════

  async toggleRestaurantStatus(restaurantId: string, isOnline: boolean) {
    await this.restaurantRepo.update(restaurantId, { isOnline });
    await this.redis.set(`restaurant:${restaurantId}:online`, isOnline ? '1' : '0', 86400);
    await this.kafka.publish('restaurant.status.changed', { id: restaurantId, isOnline });
    return { success: true, restaurantId, isOnline };
  }

  async getOffers(restaurantId: string) {
    return this.promotionRepo.find({
      where: { restaurantId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getCuisines() {
    const result = await this.restaurantRepo.createQueryBuilder('r')
      .select("unnest(string_to_array(r.cuisines, ','))", 'cuisine')
      .addSelect('COUNT(*)', 'count')
      .where('r.status = :status', { status: RestaurantStatus.APPROVED })
      .groupBy('cuisine')
      .orderBy('count', 'DESC')
      .getRawMany();
    return result.map((r: any, i: number) => ({
      id: `CUI-${String(i + 1).padStart(3, '0')}`,
      name: r.cuisine?.trim(),
      slug: r.cuisine?.trim().toLowerCase().replace(/\s+/g, '-'),
      restaurantCount: parseInt(r.count),
    }));
  }

  async getPayouts(restaurantId: string) {
    const completedOrders = await this.orderRepo.find({
      where: { restaurantId, status: RestaurantOrderStatus.COMPLETED },
      order: { completedAt: 'DESC' },
      take: 50,
    });
    const restaurant = await this.restaurantRepo.findOne({ where: { id: restaurantId } });
    const totalEarnings = completedOrders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
    const commission = totalEarnings * (Number(restaurant?.commissionRate || 15) / 100);

    return {
      totalEarnings: +totalEarnings.toFixed(2),
      commission: +commission.toFixed(2),
      netPayout: +(totalEarnings - commission).toFixed(2),
      orders: completedOrders.length,
    };
  }

  async getEarnings(restaurantId: string) {
    return this.getPayouts(restaurantId);
  }

  async getInventory(restaurantId: string) {
    return this.menuItemRepo.find({
      where: { restaurantId },
      select: ['id', 'name', 'stockQuantity', 'isAvailable', 'price'],
      order: { name: 'ASC' },
    });
  }

  async updateInventoryItem(restaurantId: string, itemId: string, dto: { stockQuantity?: number; isAvailable?: boolean }) {
    await this.menuItemRepo.update({ id: itemId, restaurantId }, dto);
    return { success: true };
  }
}
