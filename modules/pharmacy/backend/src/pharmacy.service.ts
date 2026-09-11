import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

import {
  PharmacyStore,
  PharmacyStoreStatus,
  PharmacyCategory,
  PharmacyItem,
  PharmacyOrder,
  PharmacyOrderStatus,
  Prescription,
  PrescriptionStatus,
  PharmacyReview,
  PharmacyStaff,
  PharmacyPromotion,
} from './entities';

@Injectable()
export class PharmacyService {
  private readonly logger = new Logger(PharmacyService.name);

  constructor(
    @InjectRepository(PharmacyStore) private readonly storeRepo: Repository<PharmacyStore>,
    @InjectRepository(PharmacyCategory) private readonly categoryRepo: Repository<PharmacyCategory>,
    @InjectRepository(PharmacyItem) private readonly itemRepo: Repository<PharmacyItem>,
    @InjectRepository(PharmacyOrder) private readonly orderRepo: Repository<PharmacyOrder>,
    @InjectRepository(Prescription) private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PharmacyReview) private readonly reviewRepo: Repository<PharmacyReview>,
    @InjectRepository(PharmacyStaff) private readonly staffRepo: Repository<PharmacyStaff>,
    @InjectRepository(PharmacyPromotion) private readonly promoRepo: Repository<PharmacyPromotion>,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  Health
  // ═══════════════════════════════════════════════════════════════════════════

  async healthCheck() {
    let dbConnected = false;
    try {
      await this.storeRepo.query('SELECT 1');
      dbConnected = true;
    } catch (err) {
      this.logger.error('Health check DB probe failed', err);
    }
    return {
      service: 'pharmacy-service',
      status: dbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      dbConnected,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Store Discovery
  // ═══════════════════════════════════════════════════════════════════════════

  async listStores(params: {
    page?: number;
    limit?: number;
    is24hr?: boolean;
    search?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }) {
    const { page = 1, limit = 20, is24hr, search, lat, lng, radius = 10 } = params;
    const qb = this.storeRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: PharmacyStoreStatus.APPROVED });

    if (is24hr !== undefined) qb.andWhere('s.is24hr = :is24hr', { is24hr });
    if (search) qb.andWhere('(s.name ILIKE :q OR s.city ILIKE :q)', { q: `%${search}%` });

    // Geo-spatial filtering using Haversine formula (distance in km)
    if (lat !== undefined && lng !== undefined) {
      const haversine = `(
        6371 * acos(
          LEAST(1.0, cos(radians(:lat)) * cos(radians(s.latitude))
          * cos(radians(s.longitude) - radians(:lng))
          + sin(radians(:lat)) * sin(radians(s.latitude)))
        )
      )`;
      qb.addSelect(haversine, 's_distance');
      qb.setParameters({ lat, lng });
      qb.andWhere(`${haversine} <= :radius`, { radius });
      qb.orderBy('s_distance', 'ASC');
    } else {
      qb.orderBy('s.rating', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Home screen aggregation — returns featured stores, categories, and active promotions.
   */
  async getPharmacyHome(params?: { lat?: number; lng?: number }) {
    const [featuredStores] = await this.storeRepo.findAndCount({
      where: { status: PharmacyStoreStatus.APPROVED, isOnline: true },
      order: { rating: 'DESC' },
      take: 10,
    });
    const categories = await this.categoryRepo.find({ order: { name: 'ASC' } });
    const promotions = await this.promoRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return { featuredStores, categories, promotions };
  }

  async getStoreById(id: string) {
    const store = await this.storeRepo.findOne({
      where: { id },
      relations: ['staff', 'promotions'],
    });
    if (!store) throw new NotFoundException(`Pharmacy store ${id} not found`);
    return store;
  }

  async getStoreBySlug(slug: string) {
    const store = await this.storeRepo.findOne({
      where: { slug },
      relations: ['staff', 'promotions'],
    });
    if (!store) throw new NotFoundException(`Pharmacy store '${slug}' not found`);
    return store;
  }

  async searchStores(q: string, page = 1, limit = 20) {
    const [data, total] = await this.storeRepo.findAndCount({
      where: [{ name: ILike(`%${q}%`) }, { city: ILike(`%${q}%`) }],
      order: { rating: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Categories
  // ═══════════════════════════════════════════════════════════════════════════

  async getCategories() {
    return this.categoryRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
  }

  async getCategoryById(id: string) {
    const cat = await this.categoryRepo.findOneBy({ id });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Medicines / Items
  // ═══════════════════════════════════════════════════════════════════════════

  async getMedicines(
    storeId: string,
    params: { categoryId?: string; search?: string; page?: number; limit?: number },
  ) {
    const { categoryId, search, page = 1, limit = 20 } = params;
    const qb = this.itemRepo
      .createQueryBuilder('i')
      .where('i.store_id = :storeId', { storeId })
      .andWhere('i.isAvailable = true');
    if (categoryId) qb.andWhere('i.categoryId = :categoryId', { categoryId });
    if (search)
      qb.andWhere('(i.name ILIKE :q OR i.genericName ILIKE :q OR i.composition ILIKE :q)', {
        q: `%${search}%`,
      });
    qb.orderBy('i.sortOrder', 'ASC')
      .addOrderBy('i.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getMedicineById(id: string) {
    const item = await this.itemRepo.findOne({ where: { id }, relations: ['store'] });
    if (!item) throw new NotFoundException(`Medicine ${id} not found`);
    return item;
  }

  async searchMedicines(query: string, page = 1, limit = 20) {
    const [data, total] = await this.itemRepo.findAndCount({
      where: [
        { name: ILike(`%${query}%`), isAvailable: true },
        { genericName: ILike(`%${query}%`), isAvailable: true },
        { composition: ILike(`%${query}%`), isAvailable: true },
      ],
      relations: ['store'],
      order: { orderCount: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  // ── Barcode / Product Identification ────────────────────────────────────────

  async lookupByBarcode(code: string) {
    if (!code || code.trim().length < 3) {
      throw new BadRequestException('Barcode must be at least 3 characters');
    }
    const trimmed = code.trim();
    this.logger.log(`Looking up barcode: ${trimmed}`);

    // Search across barcode, gtin, and sku columns
    const items = await this.itemRepo.find({
      where: [
        { barcode: trimmed, isAvailable: true },
        { gtin: trimmed, isAvailable: true },
        { sku: trimmed, isAvailable: true },
      ],
      relations: ['store'],
      take: 10,
      order: { orderCount: 'DESC' },
    });

    // If no exact barcode match, fall back to name search
    if (items.length === 0) {
      this.logger.log(`No barcode match, trying name search for: ${trimmed}`);
      const fallback = await this.itemRepo.find({
        where: [
          { name: ILike(`%${trimmed}%`), isAvailable: true },
          { genericName: ILike(`%${trimmed}%`), isAvailable: true },
        ],
        relations: ['store'],
        take: 10,
        order: { orderCount: 'DESC' },
      });
      return { data: fallback, matchType: 'name_search', code: trimmed };
    }

    return { data: items, matchType: 'barcode', code: trimmed };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Prescriptions
  // ═══════════════════════════════════════════════════════════════════════════

  async uploadPrescription(dto: {
    customerId: string;
    patientName: string;
    patientAge?: number;
    fileUrl: string;
    storeId?: string;
    notes?: string;
  }) {
    const presc = this.prescriptionRepo.create({
      customerId: dto.customerId,
      patientName: dto.patientName,
      patientAge: dto.patientAge,
      fileUrl: dto.fileUrl,
      storeId: dto.storeId,
      pharmacistNotes: dto.notes,
      status: PrescriptionStatus.PENDING_VERIFICATION,
    });
    const saved = await this.prescriptionRepo.save(presc);
    await this.kafka.publish('pharmacy.prescription.uploaded', {
      id: saved.id,
      customerId: dto.customerId,
    });
    this.logger.log(`📋 Prescription ${saved.id} uploaded by customer ${dto.customerId}`);
    return { success: true, prescription: saved };
  }

  async getCustomerPrescriptions(customerId: string) {
    return this.prescriptionRepo.find({ where: { customerId }, order: { createdAt: 'DESC' } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Orders
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Place a pharmacy order, priced from the store's own catalogue.
   *
   * Every figure on this order used to come from the request body:
   * `itemTotal: dto.itemTotal ?? 0` and
   * `grandTotal: dto.grandTotal ?? dto.itemTotal ?? 0`. Two things followed.
   *
   * A client that did not send totals — which is what a caller reasonably
   * assumes the server computes — got an order saved at 0.00 and owed nothing
   * for it. And a client that did send them could name any price it liked: a
   * 5,000 basket submitted with `grandTotal: 1` was accepted and stored as 1.
   *
   * The same applied to the dispensing flags. `requiresPrescription`,
   * `isScheduleHDrug` and `coldChainRequired` were read off the submitted items,
   * so an order for a prescription-only medicine that claimed
   * `requiresPrescription: false` skipped `PRESCRIPTION_PENDING` and went
   * straight to `PLACED` — a pharmacist verification step bypassed by editing a
   * request body.
   *
   * Prices, tax and both flags now come from the `pharmacy_items` rows for the
   * store being ordered from. The client chooses what and how many; the server
   * decides what that costs and how it must be handled.
   */
  async placeOrder(dto: any) {
    const store = await this.storeRepo.findOneBy({ id: dto.storeId });
    if (!store) throw new NotFoundException(`Pharmacy store ${dto.storeId} not found`);

    const requested: any[] = Array.isArray(dto.items) ? dto.items : [];
    if (requested.length === 0)
      throw new BadRequestException('An order must contain at least one item');

    const catalogue = await this.itemRepo.find({
      where: { id: In(requested.map((i) => i.itemId).filter(Boolean)), storeId: dto.storeId },
    });
    const byId = new Map(catalogue.map((c) => [c.id, c]));

    let itemTotal = 0;
    let taxAmount = 0;
    let requiresRx = false;
    let hasScheduleH = false;
    let hasColdChain = false;

    const items = requested.map((requestedItem) => {
      const item = byId.get(requestedItem.itemId);
      // An item the store does not stock is refused rather than being priced at
      // whatever the caller said it costs.
      if (!item)
        throw new BadRequestException(`Item ${requestedItem.itemId} is not sold by this pharmacy`);
      if (!item.isAvailable) throw new BadRequestException(`${item.name} is currently unavailable`);

      const quantity = Math.max(1, Math.trunc(Number(requestedItem.quantity) || 0));
      if (item.maxQuantityPerOrder && quantity > item.maxQuantityPerOrder) {
        throw new BadRequestException(
          `${item.name} is limited to ${item.maxQuantityPerOrder} per order`,
        );
      }

      const price = Number(item.price);
      const lineTotal = price * quantity;
      itemTotal += lineTotal;
      taxAmount += (lineTotal * (Number(item.taxPercent) || 0)) / 100;

      if (item.requiresPrescription) requiresRx = true;
      if (item.isScheduleHDrug) hasScheduleH = true;
      if (item.coldChainRequired) hasColdChain = true;

      return {
        itemId: item.id,
        name: item.name,
        quantity,
        price,
        dosageForm: item.dosageForm,
        requiresPrescription: item.requiresPrescription,
      };
    });

    itemTotal = +itemTotal.toFixed(2);
    taxAmount = +taxAmount.toFixed(2);
    const deliveryFee =
      String(dto.orderType ?? 'DELIVERY').toUpperCase() === 'PICKUP'
        ? 0
        : Number(store.deliveryFee) || 0;
    const grandTotal = +(itemTotal + deliveryFee + taxAmount).toFixed(2);

    const orderNumber = `PHM-${Date.now().toString(36).toUpperCase()}`;
    const order = this.orderRepo.create({
      orderNumber,
      storeId: dto.storeId,
      customerId: dto.customerId,
      items,
      prescriptionId: dto.prescriptionId ?? null,
      requiresPrescription: requiresRx,
      containsScheduleHDrugs: hasScheduleH,
      coldChainRequired: hasColdChain,
      itemTotal,
      deliveryFee,
      packagingFee: 0,
      platformFee: 0,
      taxAmount,
      discount: 0,
      couponCode: dto.couponCode,
      grandTotal,
      paymentMethod: dto.paymentMethod ?? 'COD',
      paymentStatus: 'PENDING',
      deliveryAddress: dto.deliveryAddress,
      deliveryInstructions: dto.deliveryInstructions,
      orderType: dto.orderType ?? 'DELIVERY',
      status: requiresRx ? PharmacyOrderStatus.PRESCRIPTION_PENDING : PharmacyOrderStatus.PLACED,
    } as any);

    const saved = (await this.orderRepo.save(order)) as any as PharmacyOrder;
    await this.kafka.publish('pharmacy.order.created', {
      id: saved.id,
      orderNumber: saved.orderNumber,
      storeId: saved.storeId,
      customerId: saved.customerId,
    });
    this.logger.log(`🛒 Order ${saved.orderNumber} placed for store ${store.name}`);
    return { success: true, order: saved };
  }

  /**
   * One customer's pharmacy orders.
   *
   * The guard is not redundant with the gateway's. TypeORM removes an
   * `undefined` condition from the `where` clause instead of matching nothing,
   * so `findAndCount({ where: { customerId: undefined } })` returned the whole
   * orders table — every patient's address, medicines and prescription flags —
   * to any caller that omitted the id. Refusing here means no future caller can
   * reintroduce that by forgetting to pass one.
   */
  async getCustomerOrders(customerId: string, page = 1, limit = 20) {
    if (!customerId) throw new BadRequestException('customerId is required');
    const [data, total] = await this.orderRepo.findAndCount({
      where: { customerId },
      relations: ['store'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  /**
   * One pharmacy order, scoped to whoever is asking.
   *
   * The gateway has been forwarding `requesterId` and `requesterRole` here for a
   * while, but this method took only `orderId` and looked the row up by id
   * alone, so the scoping never happened: any signed-in customer could read any
   * pharmacy order by its id — the patient's name and address, the medicines
   * dispensed, whether a prescription was involved and what was paid.
   *
   * The requester is part of the query rather than a check afterwards, so an
   * order belonging to someone else is a `NotFoundException`, identical to one
   * that does not exist. A 403 would confirm which ids are real.
   *
   * Staff of the dispensing pharmacy and admins legitimately need to read orders
   * they did not place, so their reads are not narrowed.
   */
  async getOrderById(orderId: string, requester?: { id?: string; role?: string }) {
    const privileged = ['admin', 'super_admin', 'seller', 'pharmacy_staff'].includes(
      String(requester?.role ?? '').toLowerCase(),
    );

    // Fail closed. An unidentified caller is refused rather than served an
    // unscoped lookup, so a future caller that forgets to pass the requester
    // gets an error instead of quietly reinstating the leak.
    if (!privileged && !requester?.id) {
      throw new BadRequestException('A requester is required to read an order');
    }

    const where = privileged ? { id: orderId } : { id: orderId, customerId: requester!.id };

    const order = await this.orderRepo.findOne({ where, relations: ['store'] });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return order;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Reviews
  // ═══════════════════════════════════════════════════════════════════════════

  async getStoreReviews(storeId: string, page = 1, limit = 20) {
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { storeId, isVisible: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async submitReview(dto: {
    storeId: string;
    customerId: string;
    customerName?: string;
    rating: number;
    comment?: string;
    orderId?: string;
  }) {
    const review = this.reviewRepo.create({
      storeId: dto.storeId,
      customerId: dto.customerId,
      customerName: dto.customerName ?? 'Anonymous',
      rating: dto.rating,
      comment: dto.comment,
      orderId: dto.orderId,
    });
    const saved = await this.reviewRepo.save(review);
    // Update store rating aggregate
    const { avg } = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.store_id = :sid', { sid: dto.storeId })
      .getRawOne();
    const count = await this.reviewRepo.count({ where: { storeId: dto.storeId } });
    await this.storeRepo.update(dto.storeId, { rating: parseFloat(avg) || 0, ratingCount: count });
    return saved;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Customer — Promotions
  // ═══════════════════════════════════════════════════════════════════════════

  async getStorePromotions(storeId: string) {
    return this.promoRepo.find({
      where: { storeId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Seller — Dashboard & Orders
  // ═══════════════════════════════════════════════════════════════════════════

  async getSellerDashboard(storeId: string) {
    const store = await this.storeRepo.findOneBy({ id: storeId });
    if (!store) throw new NotFoundException(`Store ${storeId} not found`);
    const totalOrders = await this.orderRepo.count({ where: { storeId } });
    const pendingOrders = await this.orderRepo.count({
      where: { storeId, status: PharmacyOrderStatus.PLACED },
    });
    const prescPending = await this.orderRepo.count({
      where: { storeId, status: PharmacyOrderStatus.PRESCRIPTION_PENDING },
    });
    const totalItems = await this.itemRepo.count({ where: { storeId } });
    const lowStock = await this.itemRepo
      .createQueryBuilder('i')
      .where('i.store_id = :storeId', { storeId })
      .andWhere('i."stockLevel" <= i."reorderLevel"')
      .getCount();
    return { store, totalOrders, pendingOrders, prescPending, totalItems, lowStock };
  }

  async getSellerOrders(
    storeId: string,
    params: { status?: string; page?: number; limit?: number },
  ) {
    const { status, page = 1, limit = 20 } = params;
    const where: any = { storeId };
    if (status) where.status = status;
    const [data, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async updateOrderStatus(orderId: string, status: PharmacyOrderStatus, meta?: any) {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    order.status = status;
    if (meta?.cancelReason) order.cancelReason = meta.cancelReason;
    if (meta?.cancelledBy) order.cancelledBy = meta.cancelledBy;
    if (status === PharmacyOrderStatus.STORE_ACCEPTED) order.acceptedAt = new Date();
    if (status === PharmacyOrderStatus.PREPARING) order.preparedAt = new Date();
    if (status === PharmacyOrderStatus.DELIVERED) order.deliveredAt = new Date();
    if (status === PharmacyOrderStatus.COMPLETED) order.completedAt = new Date();
    const saved = await this.orderRepo.save(order);
    await this.kafka.publish('pharmacy.order.status_updated', {
      id: saved.id,
      orderNumber: saved.orderNumber,
      status,
      storeId: saved.storeId,
    });
    return saved;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Seller — Products / Inventory
  // ═══════════════════════════════════════════════════════════════════════════

  async addMedicine(storeId: string, dto: any) {
    const item = this.itemRepo.create({ ...dto, storeId });
    return this.itemRepo.save(item);
  }

  async updateMedicine(itemId: string, dto: any) {
    const item = await this.itemRepo.findOneBy({ id: itemId });
    if (!item) throw new NotFoundException(`Item ${itemId} not found`);
    Object.assign(item, dto);
    return this.itemRepo.save(item);
  }

  async deleteMedicine(itemId: string) {
    const result = await this.itemRepo.delete(itemId);
    return { success: !!result.affected };
  }

  async getInventory(storeId: string) {
    return this.itemRepo.find({ where: { storeId }, order: { stockLevel: 'ASC' } });
  }

  async updateStock(itemId: string, stockLevel: number) {
    const item = await this.itemRepo.findOneBy({ id: itemId });
    if (!item) throw new NotFoundException(`Item ${itemId} not found`);
    item.stockLevel = stockLevel;
    const saved = await this.itemRepo.save(item);
    if (stockLevel <= item.reorderLevel) {
      await this.kafka.publish('pharmacy.low_stock', {
        itemId,
        name: item.name,
        storeId: item.storeId,
        stockLevel,
      });
    }
    return saved;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Seller — Promotions
  // ═══════════════════════════════════════════════════════════════════════════

  async createPromotion(storeId: string, dto: any) {
    const promo = this.promoRepo.create({ ...dto, storeId });
    return this.promoRepo.save(promo);
  }

  async updatePromotion(promoId: string, dto: any) {
    const promo = await this.promoRepo.findOneBy({ id: promoId });
    if (!promo) throw new NotFoundException(`Promotion ${promoId} not found`);
    Object.assign(promo, dto);
    return this.promoRepo.save(promo);
  }

  async deletePromotion(promoId: string) {
    const result = await this.promoRepo.delete(promoId);
    return { success: !!result.affected };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Seller — Staff
  // ═══════════════════════════════════════════════════════════════════════════

  async getStaff(storeId: string) {
    return this.staffRepo.find({ where: { storeId }, order: { role: 'ASC', name: 'ASC' } });
  }

  async addStaff(storeId: string, dto: any) {
    const staff = this.staffRepo.create({ ...dto, storeId });
    return this.staffRepo.save(staff);
  }

  async updateStaff(staffId: string, dto: any) {
    const staff = await this.staffRepo.findOneBy({ id: staffId });
    if (!staff) throw new NotFoundException(`Staff ${staffId} not found`);
    Object.assign(staff, dto);
    return this.staffRepo.save(staff);
  }

  async removeStaff(staffId: string) {
    const result = await this.staffRepo.delete(staffId);
    return { success: !!result.affected };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Seller — Payouts & Earnings
  // ═══════════════════════════════════════════════════════════════════════════

  async getPayouts(storeId: string) {
    const store = await this.storeRepo.findOneBy({ id: storeId });
    if (!store) throw new NotFoundException(`Store ${storeId} not found`);
    const totalRevenue = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o."grandTotal")', 'total')
      .where('o.store_id = :sid', { sid: storeId })
      .andWhere('o.status IN (:...statuses)', {
        statuses: [PharmacyOrderStatus.COMPLETED, PharmacyOrderStatus.DELIVERED],
      })
      .getRawOne();
    return {
      storeId,
      totalRevenue: parseFloat(totalRevenue?.total ?? '0'),
      commissionRate: store.commissionRate,
      commission: parseFloat(totalRevenue?.total ?? '0') * (store.commissionRate / 100),
      netPayout: parseFloat(totalRevenue?.total ?? '0') * (1 - store.commissionRate / 100),
      bankDetails: store.bankDetails,
    };
  }

  async getEarnings(storeId: string) {
    return this.getPayouts(storeId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Seller — Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  async getAnalytics(storeId: string) {
    const store = await this.storeRepo.findOneBy({ id: storeId });
    const totalOrders = await this.orderRepo.count({ where: { storeId } });
    const completedOrders = await this.orderRepo.count({
      where: { storeId, status: PharmacyOrderStatus.COMPLETED },
    });
    const totalReviews = await this.reviewRepo.count({ where: { storeId } });
    const totalItems = await this.itemRepo.count({ where: { storeId } });
    return { store, totalOrders, completedOrders, totalReviews, totalItems };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Admin — Prescription Verification
  // ═══════════════════════════════════════════════════════════════════════════

  async verifyPrescription(
    prescId: string,
    dto: {
      status: PrescriptionStatus;
      adminId: string;
      rejectionReason?: string;
      pharmacistNotes?: string;
    },
  ) {
    const presc = await this.prescriptionRepo.findOneBy({ id: prescId });
    if (!presc) throw new NotFoundException(`Prescription ${prescId} not found`);
    presc.status = dto.status;
    presc.verifiedByAdminId = dto.adminId;
    presc.verifiedAt = new Date();
    if (dto.rejectionReason) presc.rejectionReason = dto.rejectionReason;
    if (dto.pharmacistNotes) presc.pharmacistNotes = dto.pharmacistNotes;
    const saved = await this.prescriptionRepo.save(presc);

    // If approved and linked to an order, advance the order status
    if (dto.status === PrescriptionStatus.VERIFIED_APPROVED && presc.orderId) {
      await this.updateOrderStatus(presc.orderId, PharmacyOrderStatus.PRESCRIPTION_VERIFIED);
    }
    if (
      dto.status === PrescriptionStatus.REJECTED_INVALID ||
      dto.status === PrescriptionStatus.REJECTED_EXPIRED ||
      dto.status === PrescriptionStatus.REJECTED_UNREADABLE
    ) {
      if (presc.orderId) {
        await this.updateOrderStatus(presc.orderId, PharmacyOrderStatus.PRESCRIPTION_REJECTED);
      }
    }
    await this.kafka.publish('pharmacy.prescription.verified', {
      id: saved.id,
      status: dto.status,
    });
    return saved;
  }

  async getPendingPrescriptions(page = 1, limit = 20) {
    return this.prescriptionRepo.findAndCount({
      where: { status: PrescriptionStatus.PENDING_VERIFICATION },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Admin — Store Management
  // ═══════════════════════════════════════════════════════════════════════════

  async approveStore(storeId: string) {
    const store = await this.storeRepo.findOneBy({ id: storeId });
    if (!store) throw new NotFoundException(`Store ${storeId} not found`);
    store.status = PharmacyStoreStatus.APPROVED;
    store.isOnline = true;
    store.isTemporarilyClosed = false;
    const saved = await this.storeRepo.save(store);
    await this.kafka.publish('pharmacy.store.approved', { id: saved.id, name: saved.name });
    return saved;
  }

  async suspendStore(storeId: string, reason?: string) {
    const store = await this.storeRepo.findOneBy({ id: storeId });
    if (!store) throw new NotFoundException(`Store ${storeId} not found`);
    store.status = PharmacyStoreStatus.SUSPENDED;
    store.isOnline = false;
    if (reason) store.rejectionReason = reason;
    return this.storeRepo.save(store);
  }

  /**
   * `countryCode` is the caller's market, forwarded by the gateway as `scope`
   * for a region-locked administrator and left undefined for a global one.
   * Without it the Qatar admin's Stores screen listed every market's
   * pharmacies.
   */
  async getAdminStoreList(params: {
    status?: string;
    page?: number;
    limit?: number;
    countryCode?: string;
  }) {
    const { status, page = 1, limit = 50, countryCode } = params;
    const where: any = {};
    if (status) where.status = status;
    if (countryCode) where.countryCode = countryCode;
    return this.storeRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async setCommission(storeId: string, rate: number) {
    await this.storeRepo.update(storeId, { commissionRate: rate });
    return { success: true, storeId, commissionRate: rate };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Franchise — Scoped Queries
  // ═══════════════════════════════════════════════════════════════════════════

  async getStoresByFranchise(franchiseId: string, page = 1, limit = 20) {
    const [data, total] = await this.storeRepo.findAndCount({
      where: { franchiseId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
