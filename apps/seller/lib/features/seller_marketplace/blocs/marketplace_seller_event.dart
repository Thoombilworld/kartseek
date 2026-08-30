import 'package:equatable/equatable.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';

abstract class MarketplaceSellerEvent extends Equatable {
  const MarketplaceSellerEvent();
  @override List<Object?> get props => [];
}

// ── Dashboard & Lifecycle ─────────────────────────────────────────────────────

class LoadMarketplaceDashboard extends MarketplaceSellerEvent {
  final String countryCode;
  const LoadMarketplaceDashboard({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

// ── Orders ────────────────────────────────────────────────────────────────────

class LoadMarketplaceOrders extends MarketplaceSellerEvent {
  final String? statusFilter;
  final String countryCode;
  const LoadMarketplaceOrders({this.statusFilter, this.countryCode = 'QA'});
  @override List<Object?> get props => [statusFilter, countryCode];
}

class FilterMarketplaceOrders extends MarketplaceSellerEvent {
  final String filter;
  const FilterMarketplaceOrders(this.filter);
  @override List<Object?> get props => [filter];
}

class AcceptMarketplaceOrder extends MarketplaceSellerEvent {
  final String orderId;
  const AcceptMarketplaceOrder(this.orderId);
  @override List<Object?> get props => [orderId];
}

class RejectMarketplaceOrder extends MarketplaceSellerEvent {
  final String orderId;
  final String reason;
  const RejectMarketplaceOrder(this.orderId, this.reason);
  @override List<Object?> get props => [orderId, reason];
}

class StartPreparingMarketplaceOrder extends MarketplaceSellerEvent {
  final String orderId;
  const StartPreparingMarketplaceOrder(this.orderId);
  @override List<Object?> get props => [orderId];
}

class MarkMarketplaceOrderReady extends MarketplaceSellerEvent {
  final String orderId;
  final double pickupLat;
  final double pickupLng;
  const MarkMarketplaceOrderReady(this.orderId, {this.pickupLat = 25.2854, this.pickupLng = 51.5310});
  @override List<Object?> get props => [orderId];
}

class MarkMarketplaceOrderShipped extends MarketplaceSellerEvent {
  final String orderId;
  const MarkMarketplaceOrderShipped(this.orderId);
  @override List<Object?> get props => [orderId];
}

class DispatchMarketplaceDelivery extends MarketplaceSellerEvent {
  final String orderId;
  final double pickupLat;
  final double pickupLng;
  const DispatchMarketplaceDelivery({required this.orderId, required this.pickupLat, required this.pickupLng});
  @override List<Object?> get props => [orderId];
}

class MarketplaceNewOrderPushed extends MarketplaceSellerEvent {
  final SellerOrder order;
  const MarketplaceNewOrderPushed(this.order);
  @override List<Object?> get props => [order.id];
}

class UpdateOrderStatus extends MarketplaceSellerEvent {
  final String orderId;
  final SellerOrderStatus status;
  const UpdateOrderStatus({required this.orderId, required this.status});
  @override List<Object?> get props => [orderId, status];
}

// ── Products / Inventory ──────────────────────────────────────────────────────

class LoadMarketplaceProducts extends MarketplaceSellerEvent {
  final String? search;
  final String? category;
  final String countryCode;
  const LoadMarketplaceProducts({this.search, this.category, this.countryCode = 'QA'});
  @override List<Object?> get props => [search, category, countryCode];
}

class FilterMarketplaceProducts extends MarketplaceSellerEvent {
  final String category;
  const FilterMarketplaceProducts(this.category);
  @override List<Object?> get props => [category];
}

class SearchMarketplaceProducts extends MarketplaceSellerEvent {
  final String query;
  const SearchMarketplaceProducts(this.query);
  @override List<Object?> get props => [query];
}

class UpdateMarketplaceStock extends MarketplaceSellerEvent {
  final String productId;
  final int newStock;
  const UpdateMarketplaceStock(this.productId, this.newStock);
  @override List<Object?> get props => [productId, newStock];
}

class ToggleMarketplaceProductActive extends MarketplaceSellerEvent {
  final String productId;
  final bool isActive;
  const ToggleMarketplaceProductActive(this.productId, this.isActive);
  @override List<Object?> get props => [productId, isActive];
}

class ToggleMarketplaceProductFeatured extends MarketplaceSellerEvent {
  final String productId;
  final bool isFeatured;
  const ToggleMarketplaceProductFeatured(this.productId, this.isFeatured);
  @override List<Object?> get props => [productId, isFeatured];
}

class UpdateMarketplaceProductPrice extends MarketplaceSellerEvent {
  final String productId;
  final double newPrice;
  const UpdateMarketplaceProductPrice(this.productId, this.newPrice);
  @override List<Object?> get props => [productId, newPrice];
}

class AddMarketplaceProduct extends MarketplaceSellerEvent {
  final MarketplaceProduct product;
  const AddMarketplaceProduct(this.product);
  @override List<Object?> get props => [product.id];
}

// ── Analytics ─────────────────────────────────────────────────────────────────

class LoadMarketplaceAnalytics extends MarketplaceSellerEvent {
  final String period;
  final String countryCode;
  const LoadMarketplaceAnalytics({this.period = '7d', this.countryCode = 'QA'});
  @override List<Object?> get props => [period, countryCode];
}

// ── Returns ───────────────────────────────────────────────────────────────────

class LoadMarketplaceReturns extends MarketplaceSellerEvent {
  final String? statusFilter;
  final String countryCode;
  const LoadMarketplaceReturns({this.statusFilter, this.countryCode = 'QA'});
  @override List<Object?> get props => [statusFilter, countryCode];
}

class ApproveMarketplaceReturn extends MarketplaceSellerEvent {
  final String returnId;
  const ApproveMarketplaceReturn(this.returnId);
  @override List<Object?> get props => [returnId];
}

class RejectMarketplaceReturn extends MarketplaceSellerEvent {
  final String returnId;
  final String reason;
  const RejectMarketplaceReturn(this.returnId, this.reason);
  @override List<Object?> get props => [returnId, reason];
}

// ── Refunds ───────────────────────────────────────────────────────────────────

class LoadMarketplaceRefunds extends MarketplaceSellerEvent {
  final String? statusFilter;
  final String countryCode;
  const LoadMarketplaceRefunds({this.statusFilter, this.countryCode = 'QA'});
  @override List<Object?> get props => [statusFilter, countryCode];
}

// ── Reviews ───────────────────────────────────────────────────────────────────

class LoadMarketplaceReviews extends MarketplaceSellerEvent {
  final String? filter; // 'all', 'positive', 'negative', 'unreplied'
  final String countryCode;
  const LoadMarketplaceReviews({this.filter, this.countryCode = 'QA'});
  @override List<Object?> get props => [filter, countryCode];
}

class ReplyToMarketplaceReview extends MarketplaceSellerEvent {
  final String reviewId;
  final String reply;
  const ReplyToMarketplaceReview(this.reviewId, this.reply);
  @override List<Object?> get props => [reviewId, reply];
}

// ── Promotions ────────────────────────────────────────────────────────────────

class LoadMarketplacePromotions extends MarketplaceSellerEvent {
  final String countryCode;
  const LoadMarketplacePromotions({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class CreateMarketplacePromotion extends MarketplaceSellerEvent {
  final Map<String, dynamic> promoData;
  const CreateMarketplacePromotion(this.promoData);
  @override List<Object?> get props => [promoData];
}

class UpdateMarketplacePromotion extends MarketplaceSellerEvent {
  final String promoId;
  final Map<String, dynamic> promoData;
  const UpdateMarketplacePromotion(this.promoId, this.promoData);
  @override List<Object?> get props => [promoId, promoData];
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

class LoadMarketplaceCampaigns extends MarketplaceSellerEvent {
  final String countryCode;
  const LoadMarketplaceCampaigns({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class CreateMarketplaceCampaign extends MarketplaceSellerEvent {
  final Map<String, dynamic> campaignData;
  const CreateMarketplaceCampaign(this.campaignData);
  @override List<Object?> get props => [campaignData];
}

// ── Storefront ────────────────────────────────────────────────────────────────

class LoadMarketplaceStorefront extends MarketplaceSellerEvent {
  final String countryCode;
  const LoadMarketplaceStorefront({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class UpdateMarketplaceStorefront extends MarketplaceSellerEvent {
  final Map<String, dynamic> storefrontData;
  const UpdateMarketplaceStorefront(this.storefrontData);
  @override List<Object?> get props => [storefrontData];
}

// ── Financial ─────────────────────────────────────────────────────────────────

class LoadMarketplaceTransactions extends MarketplaceSellerEvent {
  final String? typeFilter;
  final String countryCode;
  const LoadMarketplaceTransactions({this.typeFilter, this.countryCode = 'QA'});
  @override List<Object?> get props => [typeFilter, countryCode];
}

class LoadMarketplacePayouts extends MarketplaceSellerEvent {
  final String countryCode;
  const LoadMarketplacePayouts({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class RequestEarlyPayout extends MarketplaceSellerEvent {
  const RequestEarlyPayout();
}
