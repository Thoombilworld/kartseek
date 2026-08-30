import 'package:equatable/equatable.dart';

abstract class GroceryEvent extends Equatable {
  const GroceryEvent();
  @override
  List<Object?> get props => [];
}

class LoadGroceryHome extends GroceryEvent { const LoadGroceryHome(); }
class LoadGroceryStores extends GroceryEvent { const LoadGroceryStores(); }
class LoadGroceryStoreById extends GroceryEvent {
  final String id;
  const LoadGroceryStoreById(this.id);
  @override List<Object?> get props => [id];
}
class LoadGroceryCategories extends GroceryEvent {
  final String storeId;
  const LoadGroceryCategories(this.storeId);
  @override List<Object?> get props => [storeId];
}
class LoadGroceryProducts extends GroceryEvent {
  final String storeId;
  final String? categoryId;
  const LoadGroceryProducts({required this.storeId, this.categoryId});
  @override List<Object?> get props => [storeId, categoryId];
}
class SearchGrocery extends GroceryEvent {
  final String query;
  const SearchGrocery(this.query);
  @override List<Object?> get props => [query];
}
class AddGroceryToCart extends GroceryEvent {
  final String productId;
  final int quantity;
  const AddGroceryToCart({required this.productId, this.quantity = 1});
  @override List<Object?> get props => [productId, quantity];
}
class RemoveGroceryFromCart extends GroceryEvent {
  final String productId;
  const RemoveGroceryFromCart(this.productId);
  @override List<Object?> get props => [productId];
}
class UpdateGroceryCartQuantity extends GroceryEvent {
  final String productId;
  final int quantity;
  const UpdateGroceryCartQuantity({required this.productId, required this.quantity});
  @override List<Object?> get props => [productId, quantity];
}
class PlaceGroceryOrder extends GroceryEvent {
  final String paymentMethod;
  final String deliveryAddress;
  const PlaceGroceryOrder({required this.paymentMethod, required this.deliveryAddress});
  @override List<Object?> get props => [paymentMethod, deliveryAddress];
}
class LoadGroceryOrders extends GroceryEvent { const LoadGroceryOrders(); }

/// Loads the global category list (not store-scoped) from GET /grocery/categories.
/// Used by the home screen quick-category grid to render admin-configured categories.
class LoadGroceryGlobalCategories extends GroceryEvent {
  const LoadGroceryGlobalCategories();
}

// ── Flash Deals ─────────────────────────────────────────────────────────

class LoadFlashDeals extends GroceryEvent {
  final String storeId;
  const LoadFlashDeals(this.storeId);
  @override List<Object?> get props => [storeId];
}

// ── Wishlist ────────────────────────────────────────────────────────────

class ToggleWishlist extends GroceryEvent {
  final String productId;
  final String storeId;
  const ToggleWishlist({required this.productId, required this.storeId});
  @override List<Object?> get props => [productId, storeId];
}

class LoadWishlist extends GroceryEvent {
  const LoadWishlist();
}

// ── Reviews ─────────────────────────────────────────────────────────────

class SubmitReview extends GroceryEvent {
  final String storeId;
  final String productId;
  final int rating;
  final String? comment;
  const SubmitReview({required this.storeId, required this.productId, required this.rating, this.comment});
  @override List<Object?> get props => [storeId, productId, rating, comment];
}

class LoadProductReviews extends GroceryEvent {
  final String storeId;
  final String productId;
  const LoadProductReviews({required this.storeId, required this.productId});
  @override List<Object?> get props => [storeId, productId];
}

// ── Reorder ─────────────────────────────────────────────────────────────

class ReorderFromHistory extends GroceryEvent {
  final String orderId;
  const ReorderFromHistory(this.orderId);
  @override List<Object?> get props => [orderId];
}
