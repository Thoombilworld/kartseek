import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, TreeRepository, ILike, In, MoreThanOrEqual, DataSource } from 'typeorm';
import { Product } from './entities/product.entity';
import { Seller } from './entities/seller.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { ProductListing } from './entities/product-listing.entity';
import { ProductImage } from './entities/product-image.entity';
import { Review } from './entities/review.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { MarketplaceOrder } from './entities/marketplace-order.entity';
import { ReturnRequest } from './entities/return-request.entity';
import { Coupon, CouponUsage } from './entities/coupon.entity';
import { ShipmentTrackingEvent } from './entities/shipment-tracking-event.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductQuestion, ProductAnswer } from './entities/product-qa.entity';
import { DeliveryAssignment } from './entities/delivery-assignment.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { MarketplaceNotification } from './entities/marketplace-notification.entity';
import { GiftCard, GiftCardStatus } from './entities/gift-card.entity';
import { ProductFilter, DataList } from './marketplace.types';
import { PUBLIC_SELLER_FIELDS, publicSellerColumns } from './entities/seller.public-fields';
import { CatalogService } from './catalog.service';
import { MarketplaceHomeCacheService } from './marketplace-home-cache.service';
import { MarketplaceFulfillmentService } from './marketplace-fulfillment.service';
import { getRegionConfig, DEFAULT_REGION } from '@app/region';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Seller) private readonly sellerRepo: Repository<Seller>,
    @InjectRepository(Category) private readonly categoryRepo: TreeRepository<Category>,
    @InjectRepository(Brand) private readonly brandRepo: Repository<Brand>,
    @InjectRepository(ProductListing) private readonly listingRepo: Repository<ProductListing>,
    @InjectRepository(ProductImage) private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(WishlistItem) private readonly wishlistRepo: Repository<WishlistItem>,
    @InjectRepository(MarketplaceOrder) private readonly orderRepo: Repository<MarketplaceOrder>,
    @InjectRepository(ReturnRequest) private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(CouponUsage) private readonly couponUsageRepo: Repository<CouponUsage>,
    @InjectRepository(ShipmentTrackingEvent) private readonly trackingRepo: Repository<ShipmentTrackingEvent>,
    @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductQuestion) private readonly questionRepo: Repository<ProductQuestion>,
    @InjectRepository(ProductAnswer) private readonly answerRepo: Repository<ProductAnswer>,
    @InjectRepository(DeliveryAssignment) private readonly deliveryAssignmentRepo: Repository<DeliveryAssignment>,
    @InjectRepository(ProductAttribute) private readonly attributeRepo: Repository<ProductAttribute>,
    @InjectRepository(MarketplaceNotification) private readonly notificationRepo: Repository<MarketplaceNotification>,
    @InjectRepository(GiftCard) private readonly giftCardRepo: Repository<GiftCard>,
    @InjectDataSource() private readonly dataSource: DataSource,
    // Public catalogue reads live in CatalogService; getHome() composes them.
    private readonly catalog: CatalogService,
    private readonly home: MarketplaceHomeCacheService,
    // Only for the deprecated createReturnRequestLegacy shim below.
    private readonly fulfillment: MarketplaceFulfillmentService,
  ) {}

  async healthCheck() {
    return { service: 'marketplace-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  // ── Categories ────────────────────────────────────────────────────────────

  /**
   * Look a category up by UUID *or* slug. The gateway's `category-list/:slug`
   * alias forwards a slug here, and the web app links categories by slug, so an
   * id-only lookup made every one of those requests fail (comparing a uuid
   * column against e.g. 'electronics' is a Postgres type error, not a miss).
   */

  // ── Subcategories ─────────────────────────────────────────────

  // ── Products ──────────────────────────────────────────────────────────────

  async createProduct(dto: any) {
    const product = this.productRepo.create(dto as any);
    const saved = await this.productRepo.save(product);
    const entity: any = Array.isArray(saved) ? saved[0] : saved;
    await this.redis.del('marketplace:featured');
    await this.kafka.publish('product.created', { id: entity.id, name: entity.name });
    this.logger.log(`Product created: ${entity.name ?? entity.id}`);
    return { success: true, productId: entity.id };
  }

  async updateProduct(id: string, dto: any) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    await this.productRepo.update(id, dto);
    await this.redis.del(`product:${id}`);
    await this.kafka.publish('product.updated', { id, ...dto });
    return { success: true, id };
  }

  /**
   * Approve a listing and put it on sale.
   *
   * Approval has to activate three things or the product still cannot be bought:
   * `approval_status` (what `priceOrderItems` checks), `is_active` (what the
   * storefront filters on) and the **listing's** `isActive` (which carries the
   * price and stock). Only the first was set, so an admin could approve a
   * product and it remained invisible and unbuyable — the seller saw "Approved"
   * and no orders.
   */
  async approveProduct(productId: string, adminId: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    product.approval_status = 'APPROVED';
    product.is_active = true;
    if (product.status === 'DRAFT') product.status = 'ACTIVE';
    await this.productRepo.save(product);

    // Only the submitting seller's own offer goes live with the product.
    //
    // This was `WHERE product_id = :productId` with no seller predicate, which
    // activated *every* listing on the product. Harmless while one listing
    // existed per product — and exactly wrong now that a second seller can offer
    // on an approved item: approving one seller's submission would have put
    // every other seller's unreviewed offer on sale alongside it, at whatever
    // price and condition they had entered.
    //
    // Approving the product is approving the catalogue entry *and* the offer
    // that came with it, because they were submitted together by the same
    // seller. Other sellers' offers are approved one at a time through
    // `approveListing`.
    const activation = this.listingRepo
      .createQueryBuilder()
      .update(ProductListing)
      .set({ isActive: true, approvalStatus: 'APPROVED' })
      .where('product_id = :productId', { productId })
      .andWhere(`"approvalStatus" <> 'REJECTED'`);

    if (product.seller_id) {
      activation.andWhere('seller_id = :sellerId', { sellerId: product.seller_id });
    } else {
      // `products.seller_id` is nullable, and legacy or imported rows carry no
      // owner — so "the seller who submitted this" cannot be identified. With
      // exactly one offer on the product there is no ambiguity to resolve and it
      // is plainly the submission; with more than one, approving them all would
      // be the very thing this scoping exists to prevent, so none are activated
      // and each is left to `approveListing`.
      const listingCount = await this.listingRepo.count({ where: { product: { id: productId } } });
      if (listingCount > 1) {
        this.logger.warn(
          `Product ${productId} has no seller_id and ${listingCount} offers — approving the product ` +
          'activated none of them; approve each offer individually.',
        );
        await this.catalog.recomputeBuyBox(productId);
        await this.kafka.publish('product.approved', { id: productId, approvedBy: adminId });
        return { success: true, productId, listingsActivated: 0 };
      }
    }

    const activated = await activation.execute();

    await this.catalog.recomputeBuyBox(productId);

    await this.kafka.publish('product.approved', { id: productId, approvedBy: adminId });
    this.logger.log(`Product ${productId} approved by ${adminId} — ${activated.affected ?? 0} listing(s) live`);
    return { success: true, productId, listingsActivated: activated.affected ?? 0 };
  }

  /**
   * Approve one seller's offer on an already-approved product.
   *
   * The listing-level half of moderation. A product is reviewed once, for what
   * it is; each offer on it is reviewed separately, for the terms that seller is
   * proposing — price, condition, stock and fulfilment. Those are the things a
   * marketplace polices per merchant, and they are exactly what a second seller
   * supplies when they list against an existing catalogue entry.
   */
  async approveListing(listingId: string, adminId: string) {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
      relations: ['product', 'seller'],
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const product: any = (listing as any).product;
    if (product?.approval_status !== 'APPROVED') {
      throw new BadRequestException(
        'Approve the product before approving offers on it — the catalogue entry itself is not cleared.',
      );
    }

    listing.approvalStatus = 'APPROVED';
    listing.rejectionReason = null as any;
    listing.isActive = true;
    await this.listingRepo.save(listing);

    // The new offer may be the cheapest one on the product, in which case it
    // takes the buy box the moment it goes live.
    const buyBox = await this.catalog.recomputeBuyBox(product.id);

    await this.kafka.publish('listing.approved', {
      listingId, productId: product.id, sellerId: (listing as any).seller?.id, approvedBy: adminId,
    });
    this.logger.log(`Listing ${listingId} approved by ${adminId} (buy box: ${buyBox.winnerId ?? 'none'})`);
    return { success: true, listingId, productId: product.id, buyBoxWinnerId: buyBox.winnerId };
  }

  /** Refuse one seller's offer. The product and every other offer stand. */
  async rejectListing(listingId: string, adminId: string, reason: string) {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
      relations: ['product', 'seller'],
    });
    if (!listing) throw new NotFoundException('Listing not found');

    listing.approvalStatus = 'REJECTED';
    listing.rejectionReason = reason || null as any;
    listing.isActive = false;
    await this.listingRepo.save(listing);

    // A rejected offer cannot hold the buy box.
    const productId = (listing as any).product?.id;
    if (productId) await this.catalog.recomputeBuyBox(productId);

    await this.kafka.publish('listing.rejected', {
      listingId, productId, sellerId: (listing as any).seller?.id, rejectedBy: adminId, reason,
    });
    this.logger.log(`Listing ${listingId} rejected by ${adminId}: ${reason}`);
    return { success: true, listingId, productId, reason };
  }

  /**
   * Offers waiting on a decision.
   *
   * Separate from the product approvals queue, and it has to be: an offer on an
   * existing product creates no new `products` row, so it never appears there.
   * Without this the listings would sit PENDING forever with nothing to surface
   * them — which is how a moderation gate becomes a silent block.
   */
  async getPendingListings(page = 1, limit = 20) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [data, total] = await this.listingRepo.findAndCount({
      where: { approvalStatus: 'PENDING' },
      relations: ['product', 'seller'],
      // Oldest first: a queue a seller is waiting in is answered in order.
      order: { createdAt: 'ASC' },
      skip,
      take,
    });

    return { data, total, page: Number(page) || 1, limit: take };
  }

  /**
   * Ask the seller to correct a listing without rejecting it outright.
   *
   * Distinct from REJECTED: the listing stays in the queue and the seller can
   * resubmit, so it must not be treated as a terminal decision.
   */
  async requestProductCorrection(productId: string, adminId: string, notes: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    product.approval_status = 'CORRECTION_REQUESTED';
    await this.productRepo.save(product);

    await this.kafka.publish('product.correction_requested', { id: productId, requestedBy: adminId, notes });
    this.logger.log(`Product ${productId} correction requested by ${adminId}: ${notes}`);
    return { success: true, productId, notes };
  }

  /**
   * Visibility controls, separate from the approval decision.
   *
   * `is_active` is what the storefront filters on, so unpublishing hides a
   * listing without disturbing the fact that it passed review — re-publishing
   * must not require a second approval. Suspension is the same mechanic with an
   * enforcement reason attached, which is why it is a separate event.
   */
  async setProductPublished(productId: string, adminId: string, published: boolean, reason?: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    product.is_active = published;
    await this.productRepo.save(product);

    await this.kafka.publish(published ? 'product.published' : 'product.unpublished', {
      id: productId, actorId: adminId, reason,
    });
    this.logger.log(`Product ${productId} ${published ? 'published' : 'unpublished'} by ${adminId}`);
    return { success: true, productId, isActive: published };
  }

  async rejectProduct(productId: string, adminId: string, reason: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    product.approval_status = 'REJECTED';
    await this.productRepo.save(product);

    await this.kafka.publish('product.rejected', { id: productId, rejectedBy: adminId, reason });
    this.logger.log(`Product ${productId} rejected by ${adminId}: ${reason}`);
    return { success: true, productId, reason };
  }

  async suspendProduct(productId: string, adminId: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    product.approval_status = 'SUSPENDED';
    product.is_active = false;
    await this.productRepo.save(product);

    await this.kafka.publish('product.suspended', { id: productId, suspendedBy: adminId });
    return { success: true, productId };
  }

  // ── Search ────────────────────────────────────────────────────────────────

  // ── Brands ────────────────────────────────────────────────────────────────

  async approveBrand(brandId: string, adminId: string) {
    const brand = await this.brandRepo.findOne({ where: { id: brandId } });
    if (!brand) throw new NotFoundException(`Brand ${brandId} not found`);
    await this.brandRepo.update(brandId, { isVerified: true });
    await this.redis.del('marketplace:brands:top');
    await this.kafka.publish('brand.approved', { id: brandId, approvedBy: adminId });
    this.logger.log(`Brand ${brandId} approved by ${adminId}`);
    return { success: true, brandId };
  }

  // ── Sellers ───────────────────────────────────────────────────────────────

  async approveSeller(sellerId: string, adminId: string) {
    // Refused rather than queried. `findOne({ where: { id: undefined } })` drops
    // the condition entirely and returns the first row in the table, so a
    // missing id does not fail — it silently retargets the decision at an
    // unrelated seller. That is how an approve call landed on a stranger.
    if (!sellerId) throw new BadRequestException('A seller id is required.');

    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found');
    seller.verificationStatus = 'VERIFIED';
    await this.sellerRepo.save(seller);

    await this.kafka.publish('seller.approved', { id: sellerId, approvedBy: adminId });
    this.logger.log(`Seller ${sellerId} approved by ${adminId}`);
    return { success: true, sellerId };
  }

  async suspendSeller(sellerId: string, adminId: string) {
    // Refused rather than queried. `findOne({ where: { id: undefined } })` drops
    // the condition entirely and returns the first row in the table, so a
    // missing id does not fail — it silently retargets the decision at an
    // unrelated seller. That is how an approve call landed on a stranger.
    if (!sellerId) throw new BadRequestException('A seller id is required.');

    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found');
    seller.verificationStatus = 'SUSPENDED';
    await this.sellerRepo.save(seller);

    await this.kafka.publish('seller.suspended', { id: sellerId, suspendedBy: adminId });
    return { success: true, sellerId };
  }

  async rejectSeller(sellerId: string, data: any) {
    // Refused rather than queried. `findOne({ where: { id: undefined } })` drops
    // the condition entirely and returns the first row in the table, so a
    // missing id does not fail — it silently retargets the decision at an
    // unrelated seller. That is how an approve call landed on a stranger.
    if (!sellerId) throw new BadRequestException('A seller id is required.');

    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found');
    seller.verificationStatus = 'REJECTED';
    await this.sellerRepo.save(seller);
    await this.kafka.publish('seller.rejected', { id: sellerId, rejectedBy: data?.adminId || 'admin', reason: data?.reason });
    return { success: true, sellerId };
  }

  async reactivateSeller(sellerId: string) {
    // Refused rather than queried. `findOne({ where: { id: undefined } })` drops
    // the condition entirely and returns the first row in the table, so a
    // missing id does not fail — it silently retargets the decision at an
    // unrelated seller. That is how an approve call landed on a stranger.
    if (!sellerId) throw new BadRequestException('A seller id is required.');

    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found');
    seller.verificationStatus = 'VERIFIED';
    await this.sellerRepo.save(seller);
    await this.kafka.publish('seller.reactivated', { id: sellerId });
    return { success: true, sellerId };
  }

  // ── Cart ──────────────────────────────────────────────────────────────────
  async getCart(userId: string) {
    const cartData = await this.redis.getJson(`cart:${userId}`);
    if (!cartData) return { userId, items: [], subtotal: 0, itemCount: 0 };
    return cartData;
  }

  async addToCart(dto: { userId: string; productId: string; quantity: number; variantId?: string }) {
    const cartKey = `cart:${dto.userId}`;
    const cart: any = (await this.redis.getJson(cartKey)) || { userId: dto.userId, items: [], subtotal: 0, itemCount: 0 };

    // Fetch product/listing info to snapshot into cart
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    const listing = await this.listingRepo.findOne({
      where: { product: { id: dto.productId }, isActive: true },
      order: { isBuyBoxWinner: 'DESC', sellingPrice: 'ASC' },
    });
    const price = listing?.sellingPrice ?? product.mrp ?? 0;

    // Check if item already in cart — update qty
    const existingIdx = cart.items.findIndex((i: any) => i.productId === dto.productId);
    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity += dto.quantity;
      cart.items[existingIdx].subtotal = cart.items[existingIdx].quantity * price;
    } else {
      cart.items.push({
        productId: dto.productId,
        listingId: listing?.id || null,
        name: product.name,
        price: Number(price),
        quantity: dto.quantity,
        subtotal: dto.quantity * Number(price),
      });
    }

    cart.subtotal = cart.items.reduce((sum: number, i: any) => sum + i.subtotal, 0);
    cart.itemCount = cart.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
    cart.updatedAt = new Date().toISOString();

    await this.redis.setJson(cartKey, cart, 259200); // 72h TTL
    await this.kafka.publish('cart.item.added', dto);
    return { success: true, cart };
  }

  async updateCartItem(userId: string, productId: string, quantity: number) {
    const cartKey = `cart:${userId}`;
    const cart: any = await this.redis.getJson(cartKey);
    if (!cart) throw new NotFoundException('Cart not found');

    const idx = cart.items.findIndex((i: any) => i.productId === productId);
    if (idx < 0) throw new NotFoundException('Item not in cart');

    if (quantity <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = quantity;
      cart.items[idx].subtotal = quantity * cart.items[idx].price;
    }

    cart.subtotal = cart.items.reduce((sum: number, i: any) => sum + i.subtotal, 0);
    cart.itemCount = cart.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
    cart.updatedAt = new Date().toISOString();
    await this.redis.setJson(cartKey, cart, 259200);
    return { success: true, cart };
  }

  async removeFromCart(userId: string, productId: string) {
    return this.updateCartItem(userId, productId, 0);
  }

  // ── Wishlist ──────────────────────────────────────────────────────────────
  async getWishlist(userId: string) {
    const items = await this.wishlistRepo.find({
      where: { customerId: userId },
      // Saved items render as product cards, so they need the same joins the rest
      // of the catalogue reads use — without images and the buy-box listing they
      // show no picture and sit at MRP with no discount.
      relations: { product: { brand: true, images: true, listings: true } },
      order: { createdAt: 'DESC' },
    });
    return { userId, products: items.map(w => w.product), total: items.length };
  }

  async addToWishlist(dto: { userId: string; productId: string }) {
    const existing = await this.wishlistRepo.findOne({
      where: { customerId: dto.userId, productId: dto.productId },
    });
    if (existing) return { success: true, message: 'Already in wishlist' };

    const item = this.wishlistRepo.create({ customerId: dto.userId, productId: dto.productId });
    await this.wishlistRepo.save(item);
    return { success: true, ...dto };
  }

  async removeFromWishlist(userId: string, productId: string) {
    await this.wishlistRepo.delete({ customerId: userId, productId });
    return { success: true, userId, productId };
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  async getOrders(filter: { userId?: string; sellerId?: string; status?: string; page?: number; limit?: number }) {
    const qb = this.orderRepo.createQueryBuilder('o')
      // `leftJoinAndSelect` here returned the entire seller row on every order —
      // bank account number, IFSC, PAN, GST, KYC documents, the seller's private
      // email and phone, and their `ownerId`. Join, then name the columns.
      .leftJoin('o.seller', 'seller')
      .addSelect(publicSellerColumns('seller'))
      .orderBy('o.createdAt', 'DESC');

    if (filter.userId) qb.andWhere('o.customerId = :userId', { userId: filter.userId });
    if (filter.sellerId) qb.andWhere('o.sellerId = :sellerId', { sellerId: filter.sellerId });
    if (filter.status) qb.andWhere('o.status = :status', { status: filter.status });

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, hasMore: total > page * limit };
  }

  async getOrderById(id: string) {
    // `relations: { seller: true }` loads every seller column, banking included.
    // Projected down to what a caller may see — see PUBLIC_SELLER_FIELDS.
    const select = { seller: { ...PUBLIC_SELLER_FIELDS } } as any;
    const order = await this.orderRepo.findOne({ where: { id }, relations: { seller: true }, select });
    if (!order) {
      // Try by orderNumber
      const byNumber = await this.orderRepo.findOne({ where: { orderNumber: id }, relations: { seller: true }, select });
      if (!byNumber) throw new NotFoundException(`Order ${id} not found`);
      return byNumber;
    }
    return order;
  }

  async placeOrder(dto: any) {
    const orderNumber = `KS-${new Date().getFullYear()}-${Date.now() % 100000}`;

    const order = this.orderRepo.create({
      orderNumber,
      customerId: dto.customerId,
      customerName: dto.customerName,
      sellerId: dto.sellerId,
      items: dto.items,
      itemTotal: dto.itemTotal,
      deliveryFee: dto.deliveryFee || 0,
      taxAmount: dto.taxAmount || 0,
      discountAmount: dto.discountAmount || 0,
      grandTotal: dto.grandTotal,
      paymentMethod: dto.paymentMethod || 'ONLINE',
      shippingAddress: dto.shippingAddress,
      regionCode: dto.regionCode,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    });

    const saved = await this.orderRepo.save(order);

    // Emit Kafka event for downstream services (payment, notification, inventory)
    await this.kafka.publish('order.placed', { orderId: saved.id, orderNumber, ...dto });
    this.logger.log(`Order placed: ${orderNumber} (${saved.id})`);

    // Clear customer cart after order placement
    if (dto.customerId) await this.redis.del(`cart:${dto.customerId}`);

    return { success: true, orderId: saved.id, orderNumber };
  }

  async cancelOrder(orderId: string, reason: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    order.status = 'CANCELLED';
    order.cancellationReason = reason;
    await this.orderRepo.save(order);
    await this.kafka.publish('order.cancelled', { orderId, reason });
    return { success: true, orderId, reason };
  }

  async acceptOrder(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    order.status = 'CONFIRMED';
    await this.orderRepo.save(order);
    await this.kafka.publish('order.accepted', { orderId });

    // Trigger delivery partner assignment for the confirmed order
    await this.kafka.publish('delivery.assignment.requested', {
      orderId,
      orderNumber: order.orderNumber,
      sellerId: order.sellerId,
      customerId: order.customerId,
      shippingAddress: order.shippingAddress,
      serviceType: 'marketplace',
      itemCount: order.items?.length || 1,
      grandTotal: order.grandTotal,
    });

    return { success: true, orderId, status: 'CONFIRMED' };
  }

  async shipOrder(orderId: string, trackingId: string, courier: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    order.status = 'SHIPPED';
    order.trackingId = trackingId;
    order.courierName = courier;
    await this.orderRepo.save(order);
    await this.kafka.publish('order.shipped', { orderId, trackingId, courier });
    return { success: true, orderId, trackingId };
  }

  // ── Returns & Refunds ─────────────────────────────────────────────────────
  /** @deprecated Use the full Tier 6 createReturnRequest(dto) below */
  async createReturnRequestLegacy(orderId: string, dto: any) {
    return this.fulfillment.createReturnRequest({ orderId, ...dto });
  }

  async getReturns(sellerId?: string) {
    const where: any = {};
    if (sellerId) where.sellerId = sellerId;
    const [data, total] = await this.returnRepo.findAndCount({
      where, order: { createdAt: 'DESC' }, take: 50,
    });
    return { data, total, sellerId };
  }

  async approveReturn(returnId: string) {
    const ret = await this.returnRepo.findOne({ where: { id: returnId } });
    if (!ret) throw new NotFoundException(`Return ${returnId} not found`);
    await this.returnRepo.update(returnId, { status: 'APPROVED' });
    await this.kafka.publish('return.approved', { returnId });
    return { success: true, returnId, status: 'APPROVED' };
  }

  async rejectReturn(returnId: string, reason: string) {
    const ret = await this.returnRepo.findOne({ where: { id: returnId } });
    if (!ret) throw new NotFoundException(`Return ${returnId} not found`);
    await this.returnRepo.update(returnId, { status: 'REJECTED' });
    await this.kafka.publish('return.rejected', { returnId, reason });
    return { success: true, returnId, status: 'REJECTED' };
  }

  async getRefunds(sellerId?: string) {
    const where: any = { status: 'REFUNDED' };
    if (sellerId) where.sellerId = sellerId;
    const [data, total] = await this.returnRepo.findAndCount({
      where, order: { refundedAt: 'DESC' }, take: 50,
    });
    return { data, total, sellerId };
  }

  async approveRefund(refundId: string, adminId: string) {
    const ret = await this.returnRepo.findOne({ where: { id: refundId } });
    if (!ret) throw new NotFoundException(`Return ${refundId} not found`);
    await this.returnRepo.update(refundId, { status: 'REFUNDED', refundedAt: new Date() });
    await this.kafka.publish('refund.approved', { refundId, approvedBy: adminId });
    return { success: true, refundId, status: 'REFUNDED' };
  }

  // ── Reviews ───────────────────────────────────────────────────────────────
  async getProductReviews(productId: string, page = 1, limit = 20) {
    const [reviews, total] = await this.reviewRepo.findAndCount({
      where: { productId, status: 'PUBLISHED' },
      order: { helpfulCount: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Compute aggregate rating
    const avgResult = await this.reviewRepo.createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.productId = :productId', { productId })
      .andWhere('r.status = :status', { status: 'PUBLISHED' })
      .getRawOne();

    return {
      productId,
      reviews,
      averageRating: parseFloat(avgResult?.avg || '0'),
      total: parseInt(avgResult?.count || '0', 10),
      page,
      limit,
    };
  }

  async getReviewsByCustomer(customerId: string, page = 1, limit = 20) {
    const [reviews, total] = await this.reviewRepo.findAndCount({
      where: { customerId },
      order: { createdAt: 'DESC' },
      relations: ['product'],
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: reviews.map((r: any) => ({
        id: r.id,
        productId: r.productId,
        productName: r.product?.name ?? '',
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        customerName: r.customerName,
        isVerifiedPurchase: r.isVerifiedPurchase,
        helpfulCount: r.helpfulCount,
        imageUrls: r.imageUrls ?? [],
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async addProductReview(productId: string, dto: any) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const review = this.reviewRepo.create({
      productId,
      customerId: dto.customerId,
      customerName: dto.customerName,
      rating: dto.rating,
      title: dto.title,
      comment: dto.comment,
      imageUrls: dto.imageUrls,
      isVerifiedPurchase: dto.isVerifiedPurchase ?? false,
      status: 'PUBLISHED',
    });
    const saved = await this.reviewRepo.save(review);

    // Update product aggregate rating
    const avgResult = await this.reviewRepo.createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.productId = :productId', { productId })
      .andWhere('r.status = :status', { status: 'PUBLISHED' })
      .getRawOne();
    await this.productRepo.update(productId, {
      averageRating: parseFloat(avgResult?.avg || '0'),
      reviewCount: parseInt(avgResult?.count || '0', 10),
    });

    await this.kafka.publish('review.created', { productId, reviewId: saved.id });
    return { success: true, productId, reviewId: saved.id };
  }

  // ── Recently Viewed ───────────────────────────────────────────────────────
  async getRecentlyViewed(userId: string) {
    const cached = await this.redis.getJson(`recently-viewed:${userId}`) as string[] | null;
    if (!cached || !cached.length) return { userId, products: [], data: [], total: 0 };
    const products = await this.productRepo.find({
      where: { id: In(cached) },
      relations: { brand: true },
    });
    // `data`/`total` alongside `products`: every other list endpoint answers in
    // that shape and the mobile client reads `data`, so this one returned a body
    // the client could not parse — which is why it always fell through to its
    // mock fallback. `products` is kept for existing web callers.
    return { userId, products, data: products, total: products.length };
  }

  /**
   * Forget this customer's browse history.
   *
   * Recently-viewed is a per-user Redis list rather than a table — it is
   * genuinely ephemeral and rebuilt by browsing — so clearing it is a delete.
   * The mobile "Clear All" button used to raise a snackbar and remove nothing.
   */
  async clearRecentlyViewed(userId: string) {
    if (!userId) throw new BadRequestException('A signed-in customer is required.');
    await this.redis.del(`recently-viewed:${userId}`);
    return { success: true, userId };
  }

  // ── Home ──────────────────────────────────────────────────────────────────

  /**
   * The storefront home feed for a market.
   *
   * `country` is threaded into every section rather than only into the cache
   * key: previously the key varied by region but the sections it held did not,
   * so `marketplace:home:QA` and `marketplace:home:IN` were byte-identical —
   * Doha saw Indian banners, Indian sellers and rupee-denominated promotions.
   * Banners are filtered to the market and product sections rank that market's
   * sellers first.
   */
  async getMarketplaceHome(country?: string) {
    const region = country ? country.toUpperCase() : undefined;
    const cacheKey = `marketplace:home:${region || 'global'}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    // Full homepage payload — single source of truth for web + Flutter + admin
    // Use safe() wrapper so a single section failure doesn't crash the whole feed
    /**
     * Run one home section, and let the feed survive if it fails.
     *
     * Now names the section and keeps the stack. It logged only
     * `e.message`, which produced lines like
     *
     *     Home section error: Cannot read properties of undefined (reading 'databaseName')
     *
     * on every single home request — with no way to tell which of the fifteen
     * sections had failed, and no frame to look at. The section silently served
     * its fallback, so the storefront showed an empty rail and nothing upstream
     * knew. An error worth swallowing is still worth being able to find.
     */
    const safe = async <T>(section: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch (e) {
        const err = e as Error;
        this.logger.warn(`Home section "${section}" failed: ${err?.message}`);
        if (err?.stack) this.logger.debug(err.stack);
        return fallback;
      }
    };

    const result = {
      region: region ?? null,
      heroBanners: await safe('heroBanners', () => this.getHeroBanners(region), []),
      campaignBanners: await safe('campaignBanners', () => this.getCampaignBanners(region), []),
      countryBanners: await safe('countryBanners', () => this.home.getCountryBanners(region), []),
      trustBadges: this.getTrustBadges(region),
      // Top level only. The storefront renders this straight into its header
      // rail and its "Shop by Category" grid, so handing it the whole flat tree
      // put all 113 rows on the page — "Mobiles & Tablets" next to
      // "Smartphones", "Cases & Covers" and "Diapers" — under a heading that
      // promised 20. Subcategories are reached from their parent's page.
      categories: await safe('categories', async () => {
        const all = ((await this.catalog.getCategories()) as DataList).data || [];
        const roots = (all as any[]).filter((c) => !c?.parentId);
        // If nothing carries a parent the hierarchy is not populated on this
        // deployment; an empty rail would be worse than a flat one.
        return roots.length > 0 ? roots : all;
      }, []),
      flashDeals: await safe('flashDeals', async () => ((await this.catalog.getFlashDeals(region)) as DataList).data || [], []),
      dealsOfDay: await safe('dealsOfDay', async () => ((await this.catalog.getDeals(region)) as DataList).data || [], []),
      newArrivals: await safe('newArrivals', () => this.getNewArrivals(region), []),
      bestSellers: await safe('bestSellers', () => this.getBestSellers(region), []),
      trending: await safe('trending', async () => ((await this.catalog.getFeaturedProducts(region)) as DataList).data || [], []),
      recommended: await safe('recommended', () => this.getRecommended(region), []),
      sponsored: await safe('sponsored', () => this.getSponsored(region), []),
      // Resolved against the brands table, so a card can only advertise a brand
      // the catalogue actually has. `safe` keeps a brand-lookup failure from
      // taking down the whole feed.
      brandPromos: await safe('brandPromos', () => this.getBrandPromos(), {} as Record<string, any[]>),
      verifiedSellers: await safe('verifiedSellers', async () => ((await this.catalog.getVerifiedSellers(region)) as DataList).data || [], []),
      faq: this.getMarketplaceFAQ(),
      updatedAt: new Date().toISOString(),
    };
    await this.redis.setJson(cacheKey, result, 120);
    return result;
  }

  // ── Banner Management ──────────────────────────────────────────────────────
  async getHeroBanners(region?: string) {
    return this.home.getBanners('hero', region);
  }

  async getCampaignBanners(region?: string) {
    return this.home.getBanners('campaign', region);
  }

  // ── Home Feed Sections ──────────────────────────────────────────────────────
  //
  // Each section delegates its region scoping to CatalogService, which is where
  // the "offered by a seller in this region, local sellers first" rule lives.
  // Cache keys carry the region — a shared key was serving one market's feed to
  // every other market regardless of the per-region home key above it.

  private async getNewArrivals(region?: string): Promise<any[]> {
    const key = `marketplace:new-arrivals:${region || 'global'}`;
    const cached = await this.redis.getJson(key);
    if (cached) return cached as any[];
    const data = ((await this.catalog.getProducts(1, 10, { country: region, sort: 'newest' })) as DataList).data || [];
    await this.redis.setJson(key, data, 120);
    return data as any[];
  }

  private async getBestSellers(region?: string): Promise<any[]> {
    const key = `marketplace:best-sellers:${region || 'global'}`;
    const cached = await this.redis.getJson(key);
    if (cached) return cached as any[];
    // Default sort is rating then review count — the closest proxy the catalogue
    // has for "best selling" until order volume is denormalised onto products.
    const data = ((await this.catalog.getProducts(1, 10, { country: region })) as DataList).data || [];
    await this.redis.setJson(key, data, 120);
    return data as any[];
  }

  private async getRecommended(region?: string): Promise<any[]> {
    const key = `marketplace:recommended:${region || 'global'}`;
    const cached = await this.redis.getJson(key);
    if (cached) return cached as any[];
    const data = ((await this.catalog.getProducts(1, 10, { country: region, sort: 'rating' })) as DataList).data || [];
    await this.redis.setJson(key, data, 120);
    return data as any[];
  }

  private async getSponsored(region?: string): Promise<any[]> {
    const key = `marketplace:sponsored:${region || 'global'}`;
    const cached = await this.redis.getJson(key);
    if (cached) return cached as any[];
    // Until a dedicated sponsored_products table exists, promote the highest-value
    // products a seller in this region actually offers.
    const data = ((await this.catalog.getProducts(1, 8, { country: region, sort: 'price_desc' })) as DataList).data || [];
    await this.redis.setJson(key, data, 300);
    return data as any[];
  }

  // ── Static Data ──────────────────────────────────────────────────────────────

  /**
   * Free-delivery thresholds, in each market's own currency.
   *
   * The badge used to read "On orders above ₹499" everywhere, quoting a rupee
   * figure to a customer paying in riyals.
   */
  private static readonly FREE_DELIVERY_THRESHOLD: Record<string, string> = {
    QA: 'QR 100', IN: '₹499', AE: 'AED 100', SA: 'SAR 100', BH: 'BD 10',
    KW: 'KD 10', OM: 'OMR 10', GB: '£35', US: '$35', SG: 'S$40',
  };

  private getTrustBadges(region?: string) {
    const threshold = region ? MarketplaceService.FREE_DELIVERY_THRESHOLD[region] : undefined;

    return [
      {
        id: 'tb-1', icon: 'Truck', title: 'Free Delivery',
        subtitle: threshold ? `On orders above ${threshold}` : 'On qualifying orders',
        color: 'text-blue-600',
      },
      { id: 'tb-2', icon: 'ShieldCheck', title: 'Secure Payments', subtitle: 'SSL encrypted checkout', color: 'text-emerald-600' },
      { id: 'tb-3', icon: 'RotateCcw', title: 'Easy Returns', subtitle: '7-day return policy', color: 'text-orange-600' },
      { id: 'tb-4', icon: 'Headphones', title: '24/7 Support', subtitle: 'Chat, email & phone', color: 'text-purple-600' },
      { id: 'tb-5', icon: 'BadgeCheck', title: 'Genuine Products', subtitle: '100% authentic items', color: 'text-rose-600' },
    ];
  }

  /**
   * Curated presentation for the homepage brand cards.
   *
   * Styling and copy only — **no identifier**. `getBrandPromos()` joins each row
   * against the brands table to supply the real `id` and `slug`, and drops any
   * entry the catalogue does not carry. Adding a brand here does not make it
   * appear on the homepage; seeding the brand does.
   */
  private static readonly BRAND_PROMO_STYLES: Record<string, { name: string; tagline: string; discount: string; color: string; textColor: string }[]> = {
      electronics: [
        { name: 'Apple', tagline: 'Think Different', discount: 'Up to 25% Off', color: 'bg-gradient-to-br from-slate-900 to-slate-700', textColor: 'text-white' },
        { name: 'Samsung', tagline: 'Galaxy of Innovation', discount: 'Up to 35% Off', color: 'bg-gradient-to-br from-blue-900 to-blue-700', textColor: 'text-white' },
        { name: 'Sony', tagline: 'Be Moved', discount: 'Up to 30% Off', color: 'bg-gradient-to-br from-amber-900 to-amber-700', textColor: 'text-white' },
        { name: 'OnePlus', tagline: 'Never Settle', discount: 'Up to 20% Off', color: 'bg-gradient-to-br from-red-900 to-red-700', textColor: 'text-white' },
      ],
      fashion: [
        { name: 'Nike', tagline: 'Just Do It', discount: 'Up to 40% Off', color: 'bg-gradient-to-br from-orange-600 to-amber-500', textColor: 'text-white' },
        { name: 'Adidas', tagline: 'Impossible Is Nothing', discount: 'Up to 35% Off', color: 'bg-gradient-to-br from-slate-900 to-slate-600', textColor: 'text-white' },
        { name: 'Zara', tagline: 'Love Your Curves', discount: 'Up to 50% Off', color: 'bg-gradient-to-br from-rose-800 to-pink-600', textColor: 'text-white' },
        { name: 'H&M', tagline: 'Fashion & Quality', discount: 'Up to 60% Off', color: 'bg-gradient-to-br from-emerald-800 to-teal-600', textColor: 'text-white' },
      ],
      home: [
        { name: 'IKEA', tagline: 'Make More of Your Home', discount: 'Up to 30% Off', color: 'bg-gradient-to-br from-blue-700 to-yellow-500', textColor: 'text-white' },
        { name: 'Dyson', tagline: 'Engineered Better', discount: 'Up to 20% Off', color: 'bg-gradient-to-br from-violet-900 to-purple-700', textColor: 'text-white' },
        { name: 'Philips', tagline: 'Innovation for You', discount: 'Up to 25% Off', color: 'bg-gradient-to-br from-cyan-800 to-blue-600', textColor: 'text-white' },
        { name: 'Bosch', tagline: 'Invented for Life', discount: 'Up to 35% Off', color: 'bg-gradient-to-br from-slate-700 to-slate-500', textColor: 'text-white' },
      ],
      beauty: [
        { name: 'L\'Oréal', tagline: 'Because You\'re Worth It', discount: 'Up to 30% Off', color: 'bg-gradient-to-br from-pink-700 to-rose-500', textColor: 'text-white' },
        { name: 'MAC', tagline: 'All Ages, All Races', discount: 'Up to 25% Off', color: 'bg-gradient-to-br from-slate-900 to-gray-700', textColor: 'text-white' },
        { name: 'Maybelline', tagline: 'Maybe It\'s Maybelline', discount: 'Up to 40% Off', color: 'bg-gradient-to-br from-fuchsia-700 to-pink-500', textColor: 'text-white' },
        { name: 'Nivea', tagline: 'Touch of Care', discount: 'Up to 35% Off', color: 'bg-gradient-to-br from-blue-800 to-indigo-600', textColor: 'text-white' },
      ],
      sports: [
        { name: 'Puma', tagline: 'Forever Faster', discount: 'Up to 45% Off', color: 'bg-gradient-to-br from-green-800 to-emerald-600', textColor: 'text-white' },
        { name: 'Under Armour', tagline: 'Protect This House', discount: 'Up to 30% Off', color: 'bg-gradient-to-br from-red-700 to-orange-500', textColor: 'text-white' },
        { name: 'Reebok', tagline: 'Be More Human', discount: 'Up to 40% Off', color: 'bg-gradient-to-br from-blue-700 to-sky-500', textColor: 'text-white' },
        { name: 'Decathlon', tagline: 'Sport for All', discount: 'Up to 50% Off', color: 'bg-gradient-to-br from-cyan-700 to-teal-500', textColor: 'text-white' },
      ],
  };

  /**
   * Homepage brand cards, joined to real brands.
   *
   * This used to return the curated list verbatim, with synthetic ids
   * (`bp-e1`, `bp-e2`, …). Those are presentation keys that match no row, so the
   * storefront — which links a promo card to `/marketplace/brand/<id>` — sent
   * every visitor to a brand page that could not resolve. It was invisible for
   * as long as that page rendered fabricated content for an unknown key; the
   * moment it started answering 404, every Top Brands card broke.
   *
   * Nine of the twenty curated names were also brands the catalogue has never
   * carried (OnePlus, Zara, H&M, L'Oréal, MAC, Maybelline, Under Armour,
   * Reebok, Decathlon), so even a correct identifier would have led nowhere.
   *
   * Resolving here means the feed can only ever advertise a brand that exists,
   * and every card carries the `slug` the storefront routes on. A name with no
   * matching brand is dropped rather than emitted — the homepage cannot show a
   * card it has no destination for.
   */
  private async getBrandPromos(): Promise<Record<string, any[]>> {
    const styles = MarketplaceService.BRAND_PROMO_STYLES;
    const wanted = [...new Set(Object.values(styles).flat().map((s) => s.name))];

    let rows: Brand[] = [];
    try {
      rows = await this.brandRepo.find({ where: { name: In(wanted) } });
    } catch (e) {
      this.logger.warn(`Brand promo resolution failed: ${(e as Error)?.message}`);
      return {};
    }

    const byName = new Map(rows.map((b) => [String(b.name).toLowerCase(), b]));

    const out: Record<string, any[]> = {};
    for (const [category, entries] of Object.entries(styles)) {
      const resolved = entries.flatMap((entry) => {
        const brand = byName.get(entry.name.toLowerCase());
        if (!brand) return [];
        return [{
          // Both keys travel: the storefront routes on `slug`, the follow
          // button and updates feed need the uuid.
          id: brand.id,
          slug: brand.slug,
          name: brand.name,
          logoUrl: brand.logoUrl ?? null,
          tagline: entry.tagline,
          discount: entry.discount,
          color: entry.color,
          textColor: entry.textColor,
        }];
      });
      if (resolved.length > 0) out[category] = resolved;
    }
    return out;
  }

  private getMarketplaceFAQ() {
    return [
      { q: 'How do I return a product?', a: 'You can initiate a return within 7 days of delivery from your order history. Go to Orders → Select Order → Request Return.' },
      { q: 'Is COD available?', a: 'Cash on Delivery is available for most products under ₹50,000. COD availability depends on your location and the seller.' },
      { q: 'How long does delivery take?', a: 'Standard delivery takes 3-7 business days. Express delivery (1-2 days) is available for select products and locations.' },
      { q: 'Are products genuine?', a: 'All products on KARTSEEK are from verified sellers. We have a strict seller verification process and a 100% authenticity guarantee.' },
      { q: 'How do refunds work?', a: 'Refunds are processed within 5-7 business days after the return is received and inspected. Refund is credited to your original payment method.' },
    ];
  }

  // ── Support ───────────────────────────────────────────────────────────────
  async createSupportTicket(dto: any) {
    const ticketId = `SUP-${Date.now() % 100000}`;
    await this.kafka.publish('support.ticket.created', { ticketId, ...dto });
    return { success: true, ticketId };
  }

  // getExchangeOffers(productId) moved to Phase 1 section below

  /**
   * Mark a review as helpful.
   *
   * `reviews.helpfulCount` has existed since the entity was written and nothing
   * could ever increment it — the storefront rendered the number beside a
   * thumbs-up button that had no handler, so every review sat at zero forever.
   *
   * One vote per customer per review, tracked in Redis rather than a join
   * table: the value of the guard is stopping a double-tap and a refresh from
   * counting twice, and that does not need to survive a year. A signed-out
   * reader cannot vote at all, which is what `customerId` being required
   * enforces.
   */
  async voteReviewHelpful(reviewId: string, customerId: string) {
    if (!customerId) throw new BadRequestException('Sign in to mark a review as helpful.');

    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);

    const voteKey = `review:${reviewId}:voters`;
    const voters = (await this.redis.getJson(voteKey) as string[] | null) ?? [];
    if (voters.includes(customerId)) {
      return { success: true, alreadyVoted: true, helpfulCount: review.helpfulCount };
    }

    review.helpfulCount = (review.helpfulCount ?? 0) + 1;
    await this.reviewRepo.save(review);
    await this.redis.setJson(voteKey, [...voters, customerId], 60 * 60 * 24 * 90);

    return { success: true, alreadyVoted: false, helpfulCount: review.helpfulCount };
  }

  // ── Phase 1: New Customer-Facing Methods ──────────────────────────────────

  /**
   * Active flash deals, for `/marketplace/flash-deals/active`.
   *
   * Delegates rather than querying: this used to take the twenty best-rated
   * products and stamp `dealStartedAt = now - 2h` / `dealEndsAt = now + 6h` on
   * them, so the two flash-deal endpoints disagreed about both which products
   * were on deal and when the deal ended. One query, one answer.
   */
  async getFlashDealsActive(region?: string) {
    return this.catalog.getFlashDeals(region);
  }

  async getDealsOfTheDay() {
    const cacheKey = 'marketplace:deals-of-the-day';
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;
    const products = await this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.is_active = true')
      .orderBy('p.reviewCount', 'DESC')
      .addOrderBy('p.averageRating', 'DESC')
      .take(24)
      .getMany();
    const result = {
      data: products,
      total: products.length,
      validUntil: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
    };
    await this.redis.setJson(cacheKey, result, 300);
    return result;
  }

  async getNewArrivalsPage(page = 1, limit = 20) {
    const [data, total] = await this.productRepo.findAndCount({
      where: { is_active: true },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: { category: true, brand: true, images: true, listings: true },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getBestSellersPage(page = 1, limit = 20) {
    const [data, total] = await this.productRepo.findAndCount({
      where: { is_active: true },
      order: { reviewCount: 'DESC', averageRating: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: { category: true, brand: true, images: true, listings: true },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getProductQA(productId: string, page = 1, limit = 10) {
    const [data, total] = await this.questionRepo.findAndCount({
      where: { productId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, productId };
  }

  async askProductQuestion(productId: string, userId: string, text: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    const question = this.questionRepo.create({
      productId,
      customerId: userId,
      questionText: text,
    });
    const saved = await this.questionRepo.save(question);
    await this.kafka.publish('product.question.asked', { id: saved.id, productId, userId });
    return { success: true, id: saved.id };
  }

  async answerProductQuestion(questionId: string, userId: string, text: string) {
    const question = await this.questionRepo.findOne({ where: { id: questionId } });
    if (!question) throw new NotFoundException(`Question ${questionId} not found`);
    const answer = this.answerRepo.create({
      questionId,
      authorId: userId,
      answerText: text,
    });
    const saved = await this.answerRepo.save(answer);
    await this.kafka.publish('product.question.answered', { id: saved.id, questionId, userId });
    return { success: true, id: saved.id };
  }

  async createProductReview(productId: string, userId: string, dto: any) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    // Check for duplicate review
    const existing = await this.reviewRepo.findOne({ where: { productId, customerId: userId } });
    if (existing) throw new BadRequestException('You have already reviewed this product');
    const review = this.reviewRepo.create({
      productId,
      customerId: userId,
      rating: dto.rating,
      title: dto.title,
      comment: dto.comment,
      imageUrls: dto.photos || [],
    });
    const saved = await this.reviewRepo.save(review);
    // Update product average rating
    const stats = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.productId = :productId', { productId })
      .getRawOne();
    await this.productRepo.update(productId, {
      averageRating: parseFloat(stats.avg) || 0,
      reviewCount: parseInt(stats.count) || 0,
    });
    await this.kafka.publish('product.review.created', { id: saved.id, productId, rating: dto.rating });
    return { success: true, id: saved.id, rating: dto.rating };
  }

  async getExchangeOffers(productId: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    // Generate exchange offer tiers based on product price
    const basePrice = Number(product.mrp) || 0;
    const tiers = [
      { condition: 'Excellent', discountPercent: 25, estimatedValue: Math.round(basePrice * 0.25), label: 'Like new, fully functional, no scratches' },
      { condition: 'Good', discountPercent: 18, estimatedValue: Math.round(basePrice * 0.18), label: 'Minor scratches, fully functional' },
      { condition: 'Fair', discountPercent: 10, estimatedValue: Math.round(basePrice * 0.10), label: 'Visible wear, functional with minor issues' },
      { condition: 'Poor', discountPercent: 5, estimatedValue: Math.round(basePrice * 0.05), label: 'Heavy wear, partially functional' },
    ];
    return { productId, productName: product.name, tiers, currency: 'INR' };
  }

  async getEmiOptions(productId: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    const price = Number(product.mrp) || 0;
    if (price < 3000) return { productId, eligible: false, reason: 'EMI available on orders above ₹3,000' };
    const plans = [
      { tenure: 3, bank: 'All Banks', interestRate: 0, monthlyEmi: Math.round(price / 3), totalCost: price, label: 'No Cost EMI' },
      { tenure: 6, bank: 'HDFC/ICICI/SBI', interestRate: 12, monthlyEmi: Math.round((price * 1.06) / 6), totalCost: Math.round(price * 1.06), label: 'Low Interest' },
      { tenure: 9, bank: 'HDFC/ICICI', interestRate: 14, monthlyEmi: Math.round((price * 1.105) / 9), totalCost: Math.round(price * 1.105), label: 'Standard EMI' },
      { tenure: 12, bank: 'All Banks', interestRate: 16, monthlyEmi: Math.round((price * 1.16) / 12), totalCost: Math.round(price * 1.16), label: 'Easy 12-Month' },
      { tenure: 18, bank: 'HDFC/SBI', interestRate: 18, monthlyEmi: Math.round((price * 1.27) / 18), totalCost: Math.round(price * 1.27), label: 'Extended EMI' },
      { tenure: 24, bank: 'HDFC', interestRate: 18, monthlyEmi: Math.round((price * 1.36) / 24), totalCost: Math.round(price * 1.36), label: 'Max Tenure' },
    ];
    return { productId, eligible: true, price, currency: 'INR', plans };
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const [data, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const unreadCount = await this.notificationRepo.count({ where: { userId, isRead: false } });
    return { data, total, unreadCount, page, limit };
  }

  async markNotificationRead(id: string, userId: string) {
    const notification = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);
    await this.notificationRepo.update(id, { isRead: true });
    return { success: true, id };
  }

  async markAllNotificationsRead(userId: string) {
    await this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }

  /** Distinct products from a customer's delivered orders — "buy again" suggestions. */
  async getBuyAgain(userId: string, limit = 20) {
    if (!userId) return { data: [], total: 0 };
    const orders = await this.orderRepo.find({
      where: { customerId: userId, status: 'DELIVERED' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const seen = new Set<string>();
    const products: any[] = [];
    for (const order of orders) {
      for (const item of order.items || []) {
        if (item?.productId && !seen.has(item.productId)) {
          seen.add(item.productId);
          products.push({
            productId: item.productId,
            name: item.name,
            imageUrl: item.imageUrl,
            lastPrice: item.unitPrice,
            lastOrderedAt: order.createdAt,
          });
          if (products.length >= limit) break;
        }
      }
      if (products.length >= limit) break;
    }
    return { data: products, total: products.length };
  }

  /** A customer's own marketplace order history. */
  async getCustomerOrders(filters: { userId?: string; status?: string; page?: number; limit?: number }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    if (!filters?.userId) return { data: [], total: 0, page, limit };
    const where: any = { customerId: filters.userId };
    if (filters.status) where.status = filters.status;
    const [data, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getGiftCardBalance(code: string) {
    const card = await this.giftCardRepo.findOne({ where: { code: code.toUpperCase() } });
    if (!card) throw new NotFoundException(`Gift card with code '${code}' not found`);
    if (card.status === GiftCardStatus.EXPIRED) throw new BadRequestException('This gift card has expired');
    if (card.status === GiftCardStatus.DISABLED) throw new BadRequestException('This gift card has been disabled');
    if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
      await this.giftCardRepo.update(card.id, { status: GiftCardStatus.EXPIRED });
      throw new BadRequestException('This gift card has expired');
    }
    return {
      code: card.code,
      currentBalance: Number(card.currentBalance),
      originalAmount: Number(card.originalAmount),
      currency: card.currency,
      status: card.status,
      expiresAt: card.expiresAt,
      redemptionHistory: card.redemptionHistory || [],
    };
  }

  async redeemGiftCard(code: string, orderId: string, amount: number, userId: string) {
    // A redemption must be a positive, finite amount of money.
    //
    // Without this, `amount: -1000` sailed through: Math.min(-1000, 5000) is
    // -1000, and `balance - (-1000)` is 6000 — so redeeming a negative amount
    // INCREASED the card's balance and recorded a negative entry in the
    // redemption history. Verified against a live card: 5000 became 6000 and the
    // API answered `{"success":true,"redeemed":-1000}`. Any signed-in customer
    // who knew a code could mint balance on it, without limit.
    //
    // Checked here rather than only at the gateway because this service is also
    // reachable over TCP, where no HTTP DTO validation runs.
    const requested = Number(amount);
    if (!Number.isFinite(requested) || requested <= 0) {
      throw new BadRequestException('Redemption amount must be a positive number');
    }

    // Lock the gift-card row so two concurrent redemptions can't double-spend the balance.
    const result = await this.dataSource.transaction(async (mgr) => {
      const repo = mgr.getRepository(GiftCard);
      const card = await repo.findOne({ where: { code: code.toUpperCase() }, lock: { mode: 'pessimistic_write' } });
      if (!card) throw new NotFoundException(`Gift card with code '${code}' not found`);
      if (card.status !== GiftCardStatus.ACTIVE) throw new BadRequestException(`Gift card is ${card.status}`);
      if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
        await repo.update(card.id, { status: GiftCardStatus.EXPIRED });
        throw new BadRequestException('This gift card has expired');
      }
      const balance = Number(card.currentBalance);
      if (balance <= 0) throw new BadRequestException('Gift card has no remaining balance');
      // Never more than the card holds, and — with the guard above — never less
      // than zero. Rounded to whole currency units so repeated part-redemptions
      // cannot leave a sub-cent residue that never clears.
      const redeemAmount = Math.round(Math.min(requested, balance) * 100) / 100;
      const newBalance = balance - redeemAmount;
      const history = card.redemptionHistory || [];
      history.push({ orderId, amount: redeemAmount, date: new Date().toISOString() });
      await repo.update(card.id, {
        currentBalance: newBalance,
        status: newBalance <= 0 ? GiftCardStatus.REDEEMED : GiftCardStatus.ACTIVE,
        redeemedByUserId: userId,
        redeemedAt: newBalance <= 0 ? new Date() : card.redeemedAt,
        redemptionHistory: history,
      });
      return { redeemAmount, newBalance, currency: card.currency };
    });
    await this.kafka.publish('gift-card.redeemed', { code, orderId, amount: result.redeemAmount, userId });
    return { success: true, redeemed: result.redeemAmount, remainingBalance: result.newBalance, currency: result.currency };
  }

  /**
   * Build the GST invoice for an order.
   *
   * `requesterId` is the signed-in customer. It is optional only so internal
   * callers (admin tooling, the seller portal) can still ask without one; every
   * customer-facing path must pass it, because the order id alone is guessable
   * enough that omitting the check made one customer's name, shipping address
   * and line items readable by any other signed-in account.
   *
   * A mismatch answers 404 rather than 403 — confirming "this order exists but
   * is not yours" is itself a disclosure.
   */
  async getOrderInvoice(orderId: string, requesterId?: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (requesterId && order.customerId !== requesterId) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    // An invoice reports what was charged. It must not recompute it.
    //
    // This used to apply a flat 18% to every line, sum that into `totalTax`,
    // split the result into `cgst`/`sgst` and return `currency: 'INR'` —
    // India's GST, applied to every order in every market. On a Qatari order,
    // where no VAT is levied at all, the invoice inflated each line by 18% and
    // reported a grand total the customer was never charged, under two tax
    // components that do not exist here.
    //
    // The order rows carry the real figures (`itemTotal`, `taxAmount`,
    // `deliveryFee`, `discountAmount`, `grandTotal`), captured at checkout, so
    // the invoice reads them. The region's own registry supplies the currency
    // and the name of whatever tax was actually applied.
    const regionCode = order.regionCode ?? DEFAULT_REGION;
    const region = getRegionConfig(regionCode);
    const itemTotal = Number(order.itemTotal ?? 0);
    const taxAmount = Number(order.taxAmount ?? 0);
    const deliveryFee = Number(order.deliveryFee ?? 0);
    const discountAmount = Number(order.discountAmount ?? 0);
    const grandTotal = Number(order.grandTotal ?? 0);

    // Apportion the order's tax across lines by value, so the lines still sum
    // to the order's tax without inventing a rate. A zero-tax region yields
    // zero on every line, which is the correct rendering for Qatar.
    const items = (order.items || []).map((item: any, idx: number) => {
      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
      const quantity = Number(item.quantity ?? 1);
      const lineTotal = Number(item.subtotal ?? unitPrice * quantity);
      const share = itemTotal > 0 ? lineTotal / itemTotal : 0;
      const lineTax = Math.round(taxAmount * share * 100) / 100;
      return {
        sno: idx + 1,
        name: item.name || item.productName || `Item ${idx + 1}`,
        quantity,
        unitPrice,
        taxAmount: lineTax,
        total: Math.round((lineTotal + lineTax) * 100) / 100,
      };
    });

    return {
      invoiceNumber: `INV-${orderId.substring(0, 8).toUpperCase()}`,
      orderId,
      orderDate: order.createdAt,
      invoiceDate: new Date().toISOString(),
      buyerName: (order as any).customerName || 'Customer',
      buyerAddress: (order as any).shippingAddress || {},
      // No 'KartSeek Marketplace' fallback: an invoice naming a party that did
      // not sell anything is a fabricated legal document. The gateway resolves
      // the real seller record and overlays it; null here means "unknown", and
      // the invoice page renders that honestly.
      sellerName: (order as any).sellerName ?? null,
      items,
      subtotal: itemTotal,
      deliveryFee,
      discountAmount,
      totalTax: taxAmount,
      // Named from the region's own registry — "VAT", "GST", or absent where
      // the market levies none.
      taxLabel: region && region.tax.rate > 0 ? region.tax.name : null,
      grandTotal,
      currency: region?.currencyCode ?? null,
      regionCode,
      status: order.status,
    };
  }

  async getSellerCoupons(sellerId: string) {
    const [coupons, total] = await this.couponRepo.findAndCount({
      where: { sellerId } as any,
      order: { createdAt: 'DESC' },
    });
    return { data: coupons, total, sellerId };
  }

  async createSellerCoupon(sellerId: string, dto: any) {
    const coupon = this.couponRepo.create({
      ...dto,
      sellerId,
      code: dto.code || `${sellerId.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      isActive: true,
      usedCount: 0,
      createdAt: new Date(),
    });
    const saved = await this.couponRepo.save(coupon);
    const savedId = Array.isArray(saved) ? (saved[0] as any)?.id : (saved as any)?.id;
    await this.kafka.publish('seller-coupon.created', { sellerId, couponId: savedId });
    return { success: true, coupon: saved };
  }

  // ── Product Bundles ─────────────────────────────────────────────────────

  /**
   * Products that customers have actually bought together.
   *
   * Derived from order history: every pair of products appearing in the same
   * order is counted, and pairs seen more than once are returned most-frequent
   * first. Each product is priced at its real buy-box listing, so the storefront
   * quotes the same price the basket will.
   *
   * This used to *manufacture* bundles: it took the first 20 products in the
   * table, glued them into pairs regardless of what they were, named the result
   * "<A> + <B> Combo" and priced it at `totalMrp * 0.85`. Nothing honoured that
   * 15%: no bundle record was written, the coupon engine knew nothing about it,
   * and the storefront's "Add All to Cart" added both lines at full price. So a
   * shopper was shown "Save ₹40,000" on a pairing no merchandiser had made, and
   * then charged the undiscounted total. There is no bundles table to price
   * against, so no bundle price is quoted at all — `bundlePrice` equals the sum
   * of the parts and `savings` is zero until real bundle pricing exists.
   *
   * When no pair has ever been co-purchased the result is empty, and the
   * storefront section hides itself.
   */
  async getProductBundles(sellerId?: string) {
    const cacheKey = `marketplace:bundles:${sellerId || 'all'}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const qb = this.orderRepo.createQueryBuilder('o').select(['o.id', 'o.items', 'o.seller_id']);
    if (sellerId) qb.where('o.seller_id = :sellerId', { sellerId });
    const orders = await qb.orderBy('o.createdAt', 'DESC').take(500).getMany().catch(() => [] as any[]);

    // Count co-occurrence per unordered product pair.
    const pairCounts = new Map<string, { a: string; b: string; count: number; sellerId?: string }>();
    for (const order of orders) {
      const ids: string[] = Array.from(new Set(
        (Array.isArray((order as any).items) ? (order as any).items : [])
          .map((i: any) => i?.productId)
          .filter((id: any): id is string => typeof id === 'string' && id.length > 0),
      ));
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = ids[i] < ids[j] ? [ids[i], ids[j]] : [ids[j], ids[i]];
          const key = `${a}|${b}`;
          const entry = pairCounts.get(key) ?? { a, b, count: 0, sellerId: (order as any).seller_id };
          entry.count += 1;
          pairCounts.set(key, entry);
        }
      }
    }

    const topPairs = [...pairCounts.values()]
      .filter((p) => p.count > 1)
      .sort((x, y) => y.count - x.count)
      .slice(0, 20);

    if (topPairs.length === 0) {
      const empty = { data: [] as unknown[], total: 0 };
      await this.redis.setJson(cacheKey, empty, 300);
      return empty;
    }

    // One lookup for every product involved, rather than two per pair.
    const productIds = [...new Set(topPairs.flatMap((p) => [p.a, p.b]))];
    const products = await this.productRepo.find({ where: { id: In(productIds) } as any });
    const byId = new Map(products.map((p: any) => [p.id, p]));

    const listings = await this.listingRepo
      .find({ where: { productId: In(productIds), isActive: true } as any })
      .catch(() => [] as any[]);
    // The payable price is the buy-box listing, falling back to MRP when a
    // product currently has no active offer.
    const priceById = new Map<string, number>();
    for (const listing of listings as any[]) {
      const current = priceById.get(listing.productId);
      const price = Number(listing.sellingPrice ?? 0) || 0;
      if (price > 0 && (current === undefined || listing.isBuyBoxWinner || price < current)) {
        priceById.set(listing.productId, price);
      }
    }

    const bundles = topPairs
      .map((pair) => {
        const first: any = byId.get(pair.a);
        const second: any = byId.get(pair.b);
        if (!first || !second) return null;
        const items = [first, second].map((p: any) => ({
          id: p.id,
          name: p.name,
          mrp: p.mrp,
          price: priceById.get(p.id) ?? (Number(p.mrp || 0) || 0),
        }));
        const totalMrp = items.reduce((sum, i) => sum + (Number(i.mrp) || 0), 0);
        const bundlePrice = items.reduce((sum, i) => sum + i.price, 0);
        return {
          id: `pair-${pair.a}-${pair.b}`,
          name: `${first.name} + ${second.name}`,
          products: items,
          sellerId: pair.sellerId ?? first.seller_id,
          totalMrp,
          bundlePrice,
          // No bundle-level discount is claimed — see the note above.
          savings: 0,
          savingsPercent: 0,
          status: 'active',
          boughtTogetherCount: pair.count,
        };
      })
      .filter(Boolean);

    const result = { data: bundles, total: bundles.length };
    await this.redis.setJson(cacheKey, result, 300);
    return result;
  }

  async createProductBundle(dto: any) {
    const id = `bundle-${Date.now()}`;
    await this.kafka.publish('bundle.created', { id, ...dto });
    return { success: true, id, ...dto };
  }

  // ── Seller Dashboard ────────────────────────────────────────────────────

  async getSellerDashboard(sellerId: string) {
    const cacheKey = `seller:dashboard:${sellerId}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException(`Seller ${sellerId} not found`);

    const orders = await this.orderRepo.find({ where: { sellerId } });
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);

    // `marketplace_orders.status` is an enum of UPPERCASE values — PENDING,
    // CONFIRMED, SHIPPED, DELIVERED, CANCELLED. These comparisons were written
    // against lowercase strings, so every one of them matched nothing and the
    // dashboard reported 0 delivered, 0 pending, 0 shipped and 0 cancelled to a
    // seller who had orders in all four states. Normalised rather than rewritten
    // as literals, so a row written in either case still counts.
    const statusOf = (o: { status?: string }) => String(o.status ?? '').toUpperCase();
    const delivered = orders.filter(o => statusOf(o) === 'DELIVERED');
    const pending = orders.filter(o => ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(statusOf(o)));
    const shipped = orders.filter(o => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(statusOf(o)));
    const cancelled = orders.filter(o => statusOf(o) === 'CANCELLED');

    const reviewStats = await this.sellerReviewStats(sellerId);
    const avgRating = reviewStats.avgRating;

    const returns = await this.returnRepo.count({ where: { sellerId } });
    const products = await this.productRepo.count({ where: { seller_id: sellerId } });
    const activeProducts = await this.productRepo.count({ where: { seller_id: sellerId, is_active: true } });
    const lowStockVariants = await this.variantRepo.createQueryBuilder('v')
      .innerJoin('v.product', 'p')
      .where('p.seller_id = :sellerId', { sellerId })
      .andWhere('v.stockQuantity < v.lowStockThreshold')
      .getCount().catch(() => 0);

    const commission = Math.round(totalRevenue * 0.1);
    const now = new Date();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === now.toDateString()).length;
    const todayRevenue = orders.filter(o => new Date(o.createdAt).toDateString() === now.toDateString()).reduce((s, o) => s + Number(o.grandTotal || 0), 0);

    // 7-day trend
    const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 86400000);
      const dayStr = d.toISOString().split('T')[0];
      const dayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString());
      return { date: dayStr, orders: dayOrders.length, revenue: dayOrders.reduce((s, o) => s + Number(o.grandTotal || 0), 0) };
    });

    const result = {
      seller: { id: seller.id, name: seller.businessName, isVerified: seller.verificationStatus === 'VERIFIED' },
      summary: {
        totalRevenue, commission, netEarnings: totalRevenue - commission,
        todayOrders, todayRevenue,
        totalOrders: orders.length, pendingOrders: pending.length, shippedOrders: shipped.length,
        deliveredOrders: delivered.length, cancelledOrders: cancelled.length,
        avgRating, reviewCount: reviewStats.count,
        returnCount: returns, returnRate: orders.length > 0 ? Math.round((returns / orders.length) * 100) : 0,
        totalProducts: products, activeProducts, lowStockAlerts: lowStockVariants,
      },
      weeklyTrend,
      lastUpdated: now.toISOString(),
    };

    await this.redis.setJson(cacheKey, result, 60);
    return result;
  }

  /**
   * A seller's review aggregate.
   *
   * `Review` has no `seller_id` column — reviews key on `product_id` and
   * `customer_id`. Three call sites queried `{ where: { sellerId } }` anyway,
   * each silenced with an `as any` cast, and every one of them threw
   * `Property "sellerId" was not found in "Review"` at runtime. That is why the
   * seller dashboard, the admin seller-health page and the admin seller
   * rankings all answered 500 on every request.
   *
   * The link runs through the product, so join it. Aggregated in SQL rather than
   * loaded and reduced in JavaScript — the old code pulled every review row for
   * the seller just to average one column.
   */
  private async sellerReviewStats(sellerId: string): Promise<{ count: number; avgRating: number }> {
    const row = await this.reviewRepo
      .createQueryBuilder('r')
      .innerJoin('r.product', 'p')
      .select('COUNT(r.id)', 'count')
      .addSelect('COALESCE(AVG(r.rating), 0)', 'avg')
      .where('p.seller_id = :sellerId', { sellerId })
      .andWhere('r.status = :status', { status: 'PUBLISHED' })
      .getRawOne<{ count: string; avg: string }>();

    return {
      count: Number(row?.count ?? 0) || 0,
      avgRating: Math.round((Number(row?.avg ?? 0) || 0) * 10) / 10,
    };
  }

}
