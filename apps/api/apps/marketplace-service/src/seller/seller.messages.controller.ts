import { Controller, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RpcAwareExceptionsFilter } from '@app/common';
import { SellerService } from './seller.service';
import { RegisterSellerDto } from '../dto/seller.dto';
import { DEFAULT_REGION } from '@app/region';

// Every `countryCode` below used to default to a literal 'IN'. These are RPC
// entry points, so the default fires whenever a caller omits the field — and
// the gateway omitted it on several routes — which fetched and wrote a Qatari
// seller's data under India's region scope.

/**
 * Seller TCP message handlers, consumed by the API Gateway via ClientProxy.
 *
 * Deliberately a SEPARATE class from SellerController: the HTTP controller carries
 * class-level JwtAuthGuard + SellerOwnershipGuard, and those guards are meaningless
 * on an RPC context (there is no `request.user`). Keeping the two surfaces apart
 * means neither can silently inherit the other's authorisation model.
 *
 * AUTHORISATION MODEL FOR THIS CLASS: the gateway is responsible for authenticating
 * the caller and for confirming that the JWT subject owns `sellerId` before it
 * forwards. Defence in depth on the transport itself is InternalServiceGuard
 * (set INTERNAL_SERVICE_SECRET) plus network isolation — the TCP port must never be
 * routable from outside the cluster.
 */
// Keeps a handler's HttpException status intact across the TCP hop — see the
// note on MarketplaceController. Nest would otherwise flatten it to a generic
// error and the gateway would report 503 for every failure.
@UseFilters(RpcAwareExceptionsFilter)
@Controller()
export class SellerMessagesController {
  constructor(private readonly svc: SellerService) {}

  /** Ownership lookup for the gateway's SellerOwnershipGuard. Read-only, no PII. */
  @MessagePattern({ cmd: 'get_seller_owner' })
  msgSellerOwner(@Payload() d: { sellerId: string }) { return this.svc.getSellerOwner(d.sellerId); }

  /** The seller account a user owns — the applicant's own application. */
  @MessagePattern({ cmd: 'get_seller_by_owner' })
  msgSellerByOwner(@Payload() d: { ownerId: string }) { return this.svc.getSellerByOwner(d.ownerId); }

  /** Approval lookup for the gateway's SellerApprovalGuard. Read-only, no PII. */
  @MessagePattern({ cmd: 'get_seller_account_status' })
  msgSellerAccountStatus(@Payload() d: { sellerId: string }) { return this.svc.getSellerAccountStatus(d.sellerId); }

  /**
   * Project a placed order onto its sellers. Called by the gateway immediately
   * after `place_order` succeeds — see `SellerService.createSellerOrders` for why
   * this bridge has to exist at all.
   */
  @MessagePattern({ cmd: 'create_seller_orders' })
  msgCreateSellerOrders(@Payload() d: any) { return this.svc.createSellerOrders(d); }

  /**
   * Seller business registration.
   *
   * Validated here, not just at the HTTP route. This is the path the gateway
   * actually uses (`PublicSellersController` forwards `{cmd:'register_seller'}`),
   * so `RegisterSellerDto` was being skipped entirely on every real registration
   * — a malformed payload reached the service, its unknown keys read as
   * `undefined`, and the failure surfaced as an opaque 500.
   *
   * `whitelist` is deliberately OFF: the web wizard spells several fields
   * differently from the canonical DTO, and `SellerService.normaliseRegistration`
   * needs to see those keys. Stripping them here would silently discard the
   * applicant's market, contact details and bank account — which is the bug this
   * validation exists to catch.
   */
  @MessagePattern({ cmd: 'register_seller' })
  @UsePipes(new ValidationPipe({ transform: true, forbidUnknownValues: false }))
  tcpRegister(@Payload() d: RegisterSellerDto & { ownerId?: string }) {
    const { ownerId, ...dto } = d ?? ({} as any);
    return this.svc.registerSeller(dto as Record<string, any>, ownerId);
  }

  // ── Profile & Dashboard ─────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_profile' }) msgProfile(@Payload() d: { sellerId: string; countryCode: string }) { return this.svc.getSellerProfile(d.sellerId, d.countryCode); }
  @MessagePattern({ cmd: 'get_seller_dashboard' }) msgDashboard(@Payload() d: { sellerId: string; countryCode?: string; period?: 'today' | 'week' | 'month' }) { return this.svc.getSellerDashboard(d.sellerId, d.countryCode ?? DEFAULT_REGION, d.period ?? 'today'); }

  // ── Storefront ──────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_storefront' }) msgStorefront(@Payload() d: { sellerId: string }) { return this.svc.getStorefront(d.sellerId); }
  @MessagePattern({ cmd: 'update_seller_storefront' }) msgUpdateStorefront(@Payload() d: { sellerId: string; [k: string]: any }) { const { sellerId, ...dto } = d; return this.svc.updateStorefront(sellerId, dto); }

  // ── Settings ────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_settings' }) msgSettings(@Payload() d: { sellerId: string }) { return this.svc.getSettings(d.sellerId); }
  @MessagePattern({ cmd: 'update_seller_settings' }) msgUpdateSettings(@Payload() d: { sellerId: string; [k: string]: any }) { const { sellerId, ...dto } = d; return this.svc.updateSettings(sellerId, dto); }

  // ── Promotions ──────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_promotions' }) msgPromotions(@Payload() d: { sellerId: string; status?: string; page?: number }) { return this.svc.getPromotions(d.sellerId); }
  @MessagePattern({ cmd: 'create_seller_promotion' }) msgCreatePromotion(@Payload() d: { sellerId: string; [k: string]: any }) { const { sellerId, ...dto } = d; return this.svc.createPromotion(sellerId, dto); }
  @MessagePattern({ cmd: 'update_seller_promotion' }) msgUpdatePromotion(@Payload() d: { sellerId: string; promoId: string; [k: string]: any }) { const { sellerId, promoId, ...dto } = d; return this.svc.updatePromotion(sellerId, promoId, dto); }
  @MessagePattern({ cmd: 'delete_seller_promotion' }) msgDeletePromotion(@Payload() d: { sellerId: string; promoId: string }) { return this.svc.deletePromotion(d.sellerId, d.promoId); }

  // ── Campaigns ───────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_campaigns' }) msgCampaigns(@Payload() d: { sellerId: string; status?: string; page?: number }) { return this.svc.getCampaigns(d.sellerId, d.status, d.page); }
  @MessagePattern({ cmd: 'create_seller_campaign' }) msgCreateCampaign(@Payload() d: { sellerId: string; [k: string]: any }) { const { sellerId, ...dto } = d; return this.svc.createCampaign(sellerId, dto); }
  @MessagePattern({ cmd: 'update_seller_campaign' }) msgUpdateCampaign(@Payload() d: { sellerId: string; campaignId: string; [k: string]: any }) { const { sellerId, campaignId, ...dto } = d; return this.svc.updateCampaign(sellerId, campaignId, dto); }
  @MessagePattern({ cmd: 'pause_seller_campaign' }) msgPauseCampaign(@Payload() d: { sellerId: string; campaignId: string }) { return this.svc.pauseCampaign(d.sellerId, d.campaignId); }
  @MessagePattern({ cmd: 'resume_seller_campaign' }) msgResumeCampaign(@Payload() d: { sellerId: string; campaignId: string }) { return this.svc.resumeCampaign(d.sellerId, d.campaignId); }

  // ── Flash Deals ─────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_flash_deals' }) msgFlashDeals(@Payload() d: { sellerId: string }) { return this.svc.getFlashDeals(d.sellerId); }
  @MessagePattern({ cmd: 'join_flash_deal' }) msgJoinFlashDeal(@Payload() d: { sellerId: string; [k: string]: any }) { const { sellerId, ...dto } = d; return this.svc.joinFlashDeal(sellerId, dto); }

  // ── Sponsored ───────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_sponsored' }) msgSponsored(@Payload() d: { sellerId: string; status?: string }) { return this.svc.getSponsored(d.sellerId); }
  @MessagePattern({ cmd: 'create_seller_sponsored' }) msgCreateSponsored(@Payload() d: { sellerId: string; [k: string]: any }) { const { sellerId, ...dto } = d; return this.svc.sponsorProduct(sellerId, dto); }
  @MessagePattern({ cmd: 'pause_seller_sponsored' }) msgPauseSponsored(@Payload() d: { sellerId: string; sponsoredId: string }) { return this.svc.pauseSponsored(d.sellerId, d.sponsoredId); }
  @MessagePattern({ cmd: 'resume_seller_sponsored' }) msgResumeSponsored(@Payload() d: { sellerId: string; sponsoredId: string }) { return this.svc.resumeSponsored(d.sellerId, d.sponsoredId); }

  // ── Brand ───────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_brand' }) msgBrand(@Payload() d: { sellerId: string }) { return this.svc.getBrand(d.sellerId); }
  @MessagePattern({ cmd: 'update_seller_brand' }) msgUpdateBrand(@Payload() d: { sellerId: string; [k: string]: any }) { const { sellerId, ...dto } = d; return this.svc.updateBrand(sellerId, dto); }

  // ── Finance ─────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_transactions' }) msgTransactions(@Payload() d: { sellerId: string; type?: string; page?: number }) { return this.svc.getWalletTransactions(d.sellerId, d.type, d.page); }
  /** Just the seller's rate — the records come from commission-service. */
  @MessagePattern({ cmd: 'get_seller_commission_rate' }) msgCommissionRate(@Payload() d: { sellerId: string }) { return this.svc.getCommissionRate(d.sellerId); }
  /** uuid → `orderNumber`, so ledgers held elsewhere can show a real reference. */
  @MessagePattern({ cmd: 'resolve_seller_order_numbers' }) msgResolveOrderNumbers(@Payload() d: { sellerId: string; orderIds: string[] }) { return this.svc.resolveOrderNumbers(d.sellerId, d.orderIds ?? []); }

  // ── Staff ───────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_staff' }) msgStaff(@Payload() d: { sellerId: string }) { return this.svc.getStaff(d.sellerId); }
  @MessagePattern({ cmd: 'add_seller_staff' }) msgAddStaff(@Payload() d: { sellerId: string; [k: string]: any }) { const { sellerId, ...dto } = d; return this.svc.addStaff(sellerId, dto); }
  @MessagePattern({ cmd: 'update_seller_staff' }) msgUpdateStaff(@Payload() d: { sellerId: string; staffId: string; [k: string]: any }) { const { sellerId, staffId, ...dto } = d; return this.svc.updateStaff(sellerId, staffId, dto); }
  @MessagePattern({ cmd: 'remove_seller_staff' }) msgRemoveStaff(@Payload() d: { sellerId: string; staffId: string }) { return this.svc.removeStaff(d.sellerId, d.staffId); }

  // ── Analytics & Performance ─────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_analytics' }) msgAnalytics(@Payload() d: { sellerId: string; period?: string }) { return this.svc.getAnalytics(d.sellerId, d.period); }
  @MessagePattern({ cmd: 'get_seller_performance' }) msgPerformance(@Payload() d: { sellerId: string }) { return this.svc.getPerformance(d.sellerId); }

  // ── Communication ───────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_messages' }) msgMessages(@Payload() d: { sellerId: string }) { return this.svc.getMessages(d.sellerId); }
  @MessagePattern({ cmd: 'get_seller_disputes' }) msgDisputes(@Payload() d: { sellerId: string }) { return this.svc.getDisputes(d.sellerId); }

  // ── GST & Compliance ────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_gst' }) msgGst(@Payload() d: { sellerId: string }) { return this.svc.getGst(d.sellerId); }

  // ── Shipping ────────────────────────────────────────────────────
  @MessagePattern({ cmd: 'get_seller_shipping' }) msgShipping(@Payload() d: { sellerId: string }) { return this.svc.getShipping(d.sellerId); }
  @MessagePattern({ cmd: 'update_seller_shipping' }) msgUpdateShipping(@Payload() d: { sellerId: string; [k: string]: any }) { const { sellerId, ...dto } = d; return this.svc.updateShipping(sellerId, dto); }

  // ── Reports, notifications, support & product CRUD ──────────────
  //
  // These have had working service implementations and HTTP routes on this
  // service all along, but no TCP handler — and the gateway can only reach this
  // service over TCP. So the portal's Reports, Notifications, Help & Support and
  // single-product pages called gateway routes that did not exist and took a 404,
  // which each page then swallowed and replaced with its own invented data.
  @MessagePattern({ cmd: 'get_seller_reports' }) msgReports(@Payload() d: { sellerId: string; type?: string }) { return this.svc.getReports(d.sellerId, d.type); }
  @MessagePattern({ cmd: 'export_seller_report' }) msgExportReport(@Payload() d: { sellerId: string; type?: string }) { return this.svc.exportReport(d.sellerId, d.type); }

  @MessagePattern({ cmd: 'get_seller_notifications' }) msgNotifications(@Payload() d: { sellerId: string; type?: string; page?: number }) { return this.svc.getNotifications(d.sellerId, d.type, d.page); }
  @MessagePattern({ cmd: 'read_seller_notification' }) msgReadNotification(@Payload() d: { sellerId: string; notificationId: string }) { return this.svc.markNotifRead(d.sellerId, d.notificationId); }
  @MessagePattern({ cmd: 'read_all_seller_notifications' }) msgReadAllNotifications(@Payload() d: { sellerId: string }) { return this.svc.markAllNotifRead(d.sellerId); }

  @MessagePattern({ cmd: 'get_seller_support' }) msgSupport(@Payload() d: { sellerId: string }) { return this.svc.getSupport(d.sellerId); }
  @MessagePattern({ cmd: 'create_seller_ticket' }) msgCreateTicket(@Payload() d: { sellerId: string; [k: string]: any }) { const { sellerId, ...dto } = d; return this.svc.createTicket(sellerId, dto); }
  @MessagePattern({ cmd: 'reply_seller_ticket' }) msgReplyTicket(@Payload() d: { sellerId: string; ticketId: string; message: string }) { return this.svc.replyTicket(d.sellerId, d.ticketId, d.message); }

  @MessagePattern({ cmd: 'get_seller_product' }) msgProduct(@Payload() d: { sellerId: string; productId: string }) { return this.svc.getProductById(d.sellerId, d.productId); }
  /** Price/stock edits across many products — see `SellerService.bulkEditProducts`. */
  @MessagePattern({ cmd: 'bulk_edit_seller_products' })
  msgBulkEditProducts(@Payload() d: { sellerId: string; edits: any[] }) { return this.svc.bulkEditProducts(d?.sellerId, d?.edits); }

  @MessagePattern({ cmd: 'update_seller_product' }) msgUpdateProduct(@Payload() d: { sellerId: string; productId: string; [k: string]: any }) { const { sellerId, productId, ...dto } = d; return this.svc.updateProduct(sellerId, productId, dto); }
  @MessagePattern({ cmd: 'delete_seller_product' }) msgDeleteProduct(@Payload() d: { sellerId: string; productId: string }) { return this.svc.deleteProduct(d.sellerId, d.productId); }
  @MessagePattern({ cmd: 'save_seller_product_draft' }) msgSaveDraft(@Payload() d: { sellerId: string; countryCode?: string; [k: string]: any }) { const { sellerId, countryCode, ...dto } = d; return this.svc.saveDraft(sellerId, countryCode ?? DEFAULT_REGION, dto); }
  @MessagePattern({ cmd: 'get_seller_products' }) msgProducts(@Payload() d: { sellerId: string; countryCode?: string; status?: string; search?: string; page?: number; limit?: number }) { return this.svc.getSellerProducts(d.sellerId, d.countryCode ?? DEFAULT_REGION, d.status, d.search, d.page ?? 1, d.limit ?? 20); }

  @MessagePattern({ cmd: 'delete_seller_campaign' }) msgDeleteCampaign(@Payload() d: { sellerId: string; campaignId: string }) { return this.svc.deleteCampaign(d.sellerId, d.campaignId); }
  @MessagePattern({ cmd: 'update_seller_profile' }) msgUpdateProfile(@Payload() d: { sellerId: string; countryCode?: string; [k: string]: any }) { const { sellerId, countryCode, ...dto } = d; return this.svc.updateSellerProfile(sellerId, countryCode ?? DEFAULT_REGION, dto); }

  // ══════════════════════════════════════════════════════════════════════════
  // ██ ORDERS — the seller's actual job
  // ══════════════════════════════════════════════════════════════════════════
  //
  // The gateway has always sent these six commands and nothing has ever answered
  // them. Every call timed out into the gateway's `catch { return { data: [], … } }`,
  // so the Orders queue rendered "no orders" for a seller who had them, and
  // Accept / Pack / Ship reported success while doing nothing at all. Combined
  // with orders never being projected onto sellers in the first place, the
  // fulfilment half of this portal had no working path end to end.
  @MessagePattern({ cmd: 'get_seller_orders' })
  msgOrders(@Payload() d: { sellerId: string; countryCode?: string; status?: string; page?: number; limit?: number }) {
    return this.svc.getSellerOrders(d.sellerId, d.countryCode ?? DEFAULT_REGION, d.status, d.page ?? 1, d.limit ?? 20);
  }
  @MessagePattern({ cmd: 'get_seller_order' })
  msgOrder(@Payload() d: { sellerId: string; orderId: string }) { return this.svc.getOrderById(d.sellerId, d.orderId); }
  @MessagePattern({ cmd: 'accept_order' })
  msgAcceptOrder(@Payload() d: { sellerId: string; orderId: string }) { return this.svc.acceptOrder(d.sellerId, d.orderId); }
  @MessagePattern({ cmd: 'reject_order' })
  msgRejectOrder(@Payload() d: { sellerId: string; orderId: string; reason?: string }) { return this.svc.rejectOrder(d.sellerId, d.orderId, d.reason ?? ''); }
  @MessagePattern({ cmd: 'pack_order' })
  msgPackOrder(@Payload() d: { sellerId: string; orderId: string }) { return this.svc.markPacked(d.sellerId, d.orderId); }
  @MessagePattern({ cmd: 'ship_order' })
  msgShipOrder(@Payload() d: { sellerId: string; orderId: string; [k: string]: any }) {
    const { sellerId, orderId, ...dto } = d;
    return this.svc.shipOrder(sellerId, orderId, dto);
  }
  /** Delivery confirmation — the point commission is charged. */
  @MessagePattern({ cmd: 'deliver_order' })
  msgDeliverOrder(@Payload() d: { sellerId: string; orderId: string }) { return this.svc.markDelivered(d.sellerId, d.orderId); }

  // ══════════════════════════════════════════════════════════════════════════
  // ██ RETURNS, REFUNDS, REVIEWS
  // ══════════════════════════════════════════════════════════════════════════
  @MessagePattern({ cmd: 'get_seller_returns' })
  msgReturns(@Payload() d: { sellerId: string; status?: string; page?: number }) { return this.svc.getReturns(d.sellerId, d.status, d.page ?? 1); }
  @MessagePattern({ cmd: 'accept_seller_return' })
  msgAcceptReturn(@Payload() d: { sellerId: string; returnId: string }) { return this.svc.acceptReturn(d.sellerId, d.returnId); }
  @MessagePattern({ cmd: 'reject_seller_return' })
  msgRejectReturn(@Payload() d: { sellerId: string; returnId: string; reason?: string }) { return this.svc.rejectReturn(d.sellerId, d.returnId, d.reason ?? ''); }
  @MessagePattern({ cmd: 'get_seller_refunds' })
  msgRefunds(@Payload() d: { sellerId: string; status?: string; page?: number }) { return this.svc.getRefunds(d.sellerId, d.status, d.page ?? 1); }
  @MessagePattern({ cmd: 'get_seller_reviews' })
  msgReviews(@Payload() d: { sellerId: string; page?: number }) { return this.svc.getReviews(d.sellerId, d.page ?? 1); }
  @MessagePattern({ cmd: 'reply_seller_review' })
  msgReplyReview(@Payload() d: { sellerId: string; reviewId: string; reply: string }) { return this.svc.replyReview(d.sellerId, d.reviewId, d.reply); }

  // ══════════════════════════════════════════════════════════════════════════
  // ██ INVENTORY
  // ══════════════════════════════════════════════════════════════════════════
  @MessagePattern({ cmd: 'get_seller_inventory' })
  msgInventory(@Payload() d: { sellerId: string; countryCode?: string; page?: number; limit?: number }) {
    return this.svc.getSellerInventory(d.sellerId, d.countryCode ?? DEFAULT_REGION, d.page ?? 1, d.limit ?? 30);
  }
  @MessagePattern({ cmd: 'update_seller_inventory' })
  msgUpdateInventory(@Payload() d: { sellerId: string; countryCode?: string; productId: string; stock: number }) {
    return this.svc.updateInventory(d.sellerId, d.countryCode ?? DEFAULT_REGION, d.productId, Number(d.stock));
  }
  @MessagePattern({ cmd: 'get_seller_low_stock' })
  msgLowStock(@Payload() d: { sellerId: string; countryCode?: string }) { return this.svc.getLowStock(d.sellerId, d.countryCode ?? DEFAULT_REGION); }
  @MessagePattern({ cmd: 'set_seller_threshold' })
  msgSetThreshold(@Payload() d: { sellerId: string; productId: string; threshold: number }) {
    return this.svc.setLowStockThreshold(d.sellerId, d.productId, Number(d.threshold));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ██ CATALOGUE WRITES
  // ══════════════════════════════════════════════════════════════════════════
  @MessagePattern({ cmd: 'create_seller_product' })
  msgCreateProduct(@Payload() d: { sellerId: string; countryCode?: string; [k: string]: any }) {
    const { sellerId, countryCode, ...dto } = d;
    return this.svc.addProduct(sellerId, countryCode ?? DEFAULT_REGION, dto);
  }
  @MessagePattern({ cmd: 'bulk_upload_products' })
  msgBulkUpload(@Payload() d: { sellerId: string; countryCode?: string; products: any[] }) {
    return this.svc.bulkUpload(d.sellerId, d.countryCode ?? DEFAULT_REGION, d.products ?? []);
  }

  /**
   * Offer on a product that already exists — the multi-vendor path.
   *
   * `create_seller_product` always mints a new catalogue entry; this attaches
   * one seller's price and stock to an entry someone else authored, which is
   * what lets two sellers compete on the same product page.
   */
  @MessagePattern({ cmd: 'create_seller_listing' })
  msgCreateListing(@Payload() d: { sellerId: string; [k: string]: any }) {
    const { sellerId, ...dto } = d;
    return this.svc.addListing(sellerId, dto);
  }
  @MessagePattern({ cmd: 'update_seller_listing' })
  msgUpdateListing(@Payload() d: { sellerId: string; listingId: string; [k: string]: any }) {
    const { sellerId, listingId, ...dto } = d;
    return this.svc.updateListing(sellerId, listingId, dto);
  }
  @MessagePattern({ cmd: 'get_seller_listings' })
  msgGetListings(@Payload() d: { sellerId: string; status?: string; page?: number; limit?: number }) {
    return this.svc.getSellerListings(d.sellerId, d.status, d.page ?? 1, d.limit ?? 20);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ██ SHIPPING CONFIGURATION
  // ══════════════════════════════════════════════════════════════════════════
  @MessagePattern({ cmd: 'get_seller_shipping_zones' })
  msgShippingZones(@Payload() d: { sellerId: string }) { return this.svc.getShippingZones(d.sellerId); }
  @MessagePattern({ cmd: 'update_seller_shipping_zone' })
  msgUpdateShippingZone(@Payload() d: { sellerId: string; zoneId: string; [k: string]: any }) {
    const { sellerId, zoneId, ...dto } = d;
    return this.svc.updateShippingZone(sellerId, zoneId, dto);
  }
  @MessagePattern({ cmd: 'get_seller_shipping_rates' })
  msgShippingRates(@Payload() d: { sellerId: string }) { return this.svc.getShippingRates(d.sellerId); }
  @MessagePattern({ cmd: 'get_seller_couriers' })
  msgCouriers(@Payload() d: { sellerId: string }) { return this.svc.getCouriers(d.sellerId); }
  @MessagePattern({ cmd: 'update_seller_couriers' })
  msgUpdateCouriers(@Payload() d: { sellerId: string; [k: string]: any }) {
    const { sellerId, ...dto } = d;
    return this.svc.updateCouriers(sellerId, dto);
  }
  @MessagePattern({ cmd: 'get_seller_shipment_tracking' })
  msgShipmentTracking(@Payload() d: { sellerId: string; status?: string; page?: number }) {
    return this.svc.getShipmentTracking(d.sellerId, d.status, d.page ?? 1);
  }
  // ══════════════════════════════════════════════════════════════════════════
  // ██ PRODUCT MEDIA, VARIANTS, Q&A, BANK ACCOUNTS
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Every table behind these already existed (`product_images`,
  // `product_variants`, `product_questions` / `product_answers`); nothing
  // seller-facing ever read or wrote them, so the corresponding portal pages had
  // no backend. Bank accounts are new — payouts had no destination at all.

  @MessagePattern({ cmd: 'get_product_images' })
  msgProductImages(@Payload() d: { sellerId: string; productId: string }) { return this.svc.getProductImages(d.sellerId, d.productId); }
  @MessagePattern({ cmd: 'add_product_image' })
  msgAddProductImage(@Payload() d: { sellerId: string; productId: string; [k: string]: any }) {
    const { sellerId, productId, ...dto } = d;
    return this.svc.addProductImage(sellerId, productId, dto as any);
  }
  @MessagePattern({ cmd: 'set_primary_product_image' })
  msgSetPrimaryImage(@Payload() d: { sellerId: string; productId: string; imageId: string }) { return this.svc.setPrimaryProductImage(d.sellerId, d.productId, d.imageId); }
  @MessagePattern({ cmd: 'reorder_product_images' })
  msgReorderImages(@Payload() d: { sellerId: string; productId: string; imageIds: string[] }) { return this.svc.reorderProductImages(d.sellerId, d.productId, d.imageIds); }
  @MessagePattern({ cmd: 'delete_product_image' })
  msgDeleteImage(@Payload() d: { sellerId: string; productId: string; imageId: string }) { return this.svc.deleteProductImage(d.sellerId, d.productId, d.imageId); }

  @MessagePattern({ cmd: 'get_product_spin360' })
  msgGetSpin360(@Payload() d: { sellerId: string; productId: string }) { return this.svc.getProductSpin360(d.sellerId, d.productId); }
  @MessagePattern({ cmd: 'set_product_spin360' })
  msgSetSpin360(@Payload() d: { sellerId: string; productId: string; urls: string[] }) { return this.svc.setProductSpin360(d.sellerId, d.productId, d.urls); }

  @MessagePattern({ cmd: 'get_product_variants' })
  msgVariants(@Payload() d: { sellerId: string; productId: string }) { return this.svc.getProductVariants(d.sellerId, d.productId); }
  @MessagePattern({ cmd: 'create_product_variant' })
  msgCreateVariant(@Payload() d: { sellerId: string; productId: string; [k: string]: any }) {
    const { sellerId, productId, ...dto } = d;
    return this.svc.createProductVariant(sellerId, productId, dto);
  }
  @MessagePattern({ cmd: 'update_product_variant' })
  msgUpdateVariant(@Payload() d: { sellerId: string; productId: string; variantId: string; [k: string]: any }) {
    const { sellerId, productId, variantId, ...dto } = d;
    return this.svc.updateProductVariant(sellerId, productId, variantId, dto);
  }
  @MessagePattern({ cmd: 'delete_product_variant' })
  msgDeleteVariant(@Payload() d: { sellerId: string; productId: string; variantId: string }) { return this.svc.deleteProductVariant(d.sellerId, d.productId, d.variantId); }

  @MessagePattern({ cmd: 'get_seller_questions' })
  msgQuestions(@Payload() d: { sellerId: string; status?: string; page?: number }) { return this.svc.getSellerQuestions(d.sellerId, d.status, d.page ?? 1); }
  @MessagePattern({ cmd: 'answer_seller_question' })
  msgAnswerQuestion(@Payload() d: { sellerId: string; questionId: string; answer: string }) { return this.svc.answerQuestion(d.sellerId, d.questionId, d.answer); }

  @MessagePattern({ cmd: 'get_seller_bank_accounts' })
  msgBankAccounts(@Payload() d: { sellerId: string }) { return this.svc.getBankAccounts(d.sellerId); }
  @MessagePattern({ cmd: 'add_seller_bank_account' })
  msgAddBankAccount(@Payload() d: { sellerId: string; [k: string]: any }) {
    const { sellerId, ...dto } = d;
    return this.svc.addBankAccount(sellerId, dto);
  }
  @MessagePattern({ cmd: 'set_default_bank_account' })
  msgSetDefaultBankAccount(@Payload() d: { sellerId: string; accountId: string }) { return this.svc.setDefaultBankAccount(d.sellerId, d.accountId); }
  @MessagePattern({ cmd: 'delete_seller_bank_account' })
  msgDeleteBankAccount(@Payload() d: { sellerId: string; accountId: string }) { return this.svc.deleteBankAccount(d.sellerId, d.accountId); }

  @MessagePattern({ cmd: 'get_seller_shipping_settings' })
  msgShippingSettings(@Payload() d: { sellerId: string }) { return this.svc.getShipping(d.sellerId); }
  @MessagePattern({ cmd: 'update_seller_shipping_settings' })
  msgUpdateShippingSettings(@Payload() d: { sellerId: string; [k: string]: any }) {
    const { sellerId, ...dto } = d;
    return this.svc.updateShipping(sellerId, dto);
  }
}
