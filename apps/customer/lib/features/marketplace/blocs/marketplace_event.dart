import 'package:equatable/equatable.dart';
import 'package:kartseek_customer/features/marketplace/models/product_model.dart';

/// Base event class for all marketplace BLoC events.
abstract class MarketplaceEvent extends Equatable {
  const MarketplaceEvent();
  @override
  List<Object?> get props => [];
}

// ── Home ────────────────────────────────────────────────────────────────────
class LoadMarketplaceHome extends MarketplaceEvent {
  const LoadMarketplaceHome();
}

class RefreshMarketplaceHome extends MarketplaceEvent {
  const RefreshMarketplaceHome();
}

// ── Categories ───────────────────────────────────────────────────────────────
class LoadCategories extends MarketplaceEvent {
  const LoadCategories();
}

class LoadCategoryById extends MarketplaceEvent {
  final String id;
  const LoadCategoryById(this.id);
  @override
  List<Object?> get props => [id];
}

// ── Products ─────────────────────────────────────────────────────────────────
class LoadProducts extends MarketplaceEvent {
  final ProductFilter filter;
  const LoadProducts(this.filter);
  @override
  List<Object?> get props => [filter];
}

class LoadProductById extends MarketplaceEvent {
  final String id;
  const LoadProductById(this.id);
  @override
  List<Object?> get props => [id];
}

class LoadFeaturedProducts extends MarketplaceEvent {
  const LoadFeaturedProducts();
}

class LoadDeals extends MarketplaceEvent {
  const LoadDeals();
}

class LoadFlashDeals extends MarketplaceEvent {
  const LoadFlashDeals();
}

// ── Search ───────────────────────────────────────────────────────────────────
class SearchMarketplace extends MarketplaceEvent {
  final String query;
  final ProductFilter? filter;
  const SearchMarketplace(this.query, {this.filter});
  @override
  List<Object?> get props => [query, filter];
}

class ClearSearch extends MarketplaceEvent {
  const ClearSearch();
}

// ── Cart ─────────────────────────────────────────────────────────────────────
class LoadCart extends MarketplaceEvent {
  const LoadCart();
}

class AddToCart extends MarketplaceEvent {
  final String productId;
  final int quantity;
  final String? variantId;
  const AddToCart(this.productId, {this.quantity = 1, this.variantId});
  @override
  List<Object?> get props => [productId, quantity, variantId];
}

class UpdateCartQuantity extends MarketplaceEvent {
  final String itemId;
  final int quantity;
  const UpdateCartQuantity(this.itemId, this.quantity);
  @override
  List<Object?> get props => [itemId, quantity];
}

class RemoveFromCart extends MarketplaceEvent {
  final String itemId;
  const RemoveFromCart(this.itemId);
  @override
  List<Object?> get props => [itemId];
}

// ── Wishlist ──────────────────────────────────────────────────────────────────
class LoadWishlist extends MarketplaceEvent {
  const LoadWishlist();
}

class ToggleWishlistItem extends MarketplaceEvent {
  final String productId;
  const ToggleWishlistItem(this.productId);
  @override
  List<Object?> get props => [productId];
}

// ── Orders ───────────────────────────────────────────────────────────────────
class LoadOrders extends MarketplaceEvent {
  const LoadOrders();
}

class LoadOrderById extends MarketplaceEvent {
  final String id;
  const LoadOrderById(this.id);
  @override
  List<Object?> get props => [id];
}

class PlaceOrder extends MarketplaceEvent {
  final Map<String, dynamic> payload;
  const PlaceOrder(this.payload);
  @override
  List<Object?> get props => [payload];
}

class CancelOrder extends MarketplaceEvent {
  final String orderId;
  final String reason;
  const CancelOrder(this.orderId, this.reason);
  @override
  List<Object?> get props => [orderId, reason];
}

// ── Reviews ──────────────────────────────────────────────────────────────────
class LoadProductReviews extends MarketplaceEvent {
  final String productId;
  const LoadProductReviews(this.productId);
  @override
  List<Object?> get props => [productId];
}

class AddProductReview extends MarketplaceEvent {
  final String productId;
  final Map<String, dynamic> review;
  const AddProductReview(this.productId, this.review);
  @override
  List<Object?> get props => [productId, review];
}

// ── Brands & Sellers ──────────────────────────────────────────────────────────
class LoadTopBrands extends MarketplaceEvent {
  const LoadTopBrands();
}

class LoadVerifiedSellers extends MarketplaceEvent {
  const LoadVerifiedSellers();
}

class LoadSellerById extends MarketplaceEvent {
  final String id;
  const LoadSellerById(this.id);
  @override
  List<Object?> get props => [id];
}

class LoadBrandById extends MarketplaceEvent {
  final String id;
  const LoadBrandById(this.id);
  @override
  List<Object?> get props => [id];
}

// ── Recently Viewed ───────────────────────────────────────────────────────────
class LoadRecentlyViewed extends MarketplaceEvent {
  const LoadRecentlyViewed();
}
