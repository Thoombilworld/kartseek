import 'package:equatable/equatable.dart';

/// Events for the Wishlist module BLoC.
abstract class WishlistEvent extends Equatable {
  const WishlistEvent();
  @override
  List<Object?> get props => [];
}

/// Load all wishlist items.
class LoadWishlist extends WishlistEvent {
  const LoadWishlist();
}

/// Add a product to the wishlist.
class AddToWishlist extends WishlistEvent {
  final String productId;
  final String productName;
  final double price;
  final String? imageUrl;
  final String? sellerName;

  const AddToWishlist({
    required this.productId,
    required this.productName,
    required this.price,
    this.imageUrl,
    this.sellerName,
  });

  @override
  List<Object?> get props => [productId];
}

/// Remove a product from the wishlist.
class RemoveFromWishlist extends WishlistEvent {
  final String productId;
  const RemoveFromWishlist(this.productId);

  @override
  List<Object?> get props => [productId];
}

/// Toggle wishlist status for a product.
class ToggleWishlist extends WishlistEvent {
  final String productId;
  final String productName;
  final double price;
  final String? imageUrl;

  const ToggleWishlist({
    required this.productId,
    required this.productName,
    required this.price,
    this.imageUrl,
  });

  @override
  List<Object?> get props => [productId];
}

/// Move a wishlist item to cart.
class MoveToCart extends WishlistEvent {
  final String productId;
  const MoveToCart(this.productId);

  @override
  List<Object?> get props => [productId];
}

/// Clear entire wishlist.
class ClearWishlist extends WishlistEvent {
  const ClearWishlist();
}
