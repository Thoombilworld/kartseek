import 'package:equatable/equatable.dart';

/// Wishlist item model.
class WishlistItem extends Equatable {
  final String productId;
  final String productName;
  final double price;
  final String? imageUrl;
  final String? sellerName;
  final DateTime addedAt;

  WishlistItem({
    required this.productId,
    required this.productName,
    required this.price,
    this.imageUrl,
    this.sellerName,
    DateTime? addedAt,
  }) : addedAt = addedAt ?? DateTime.now();

  @override
  List<Object?> get props => [productId, productName, price, imageUrl, sellerName, addedAt];
}

/// Wishlist module status.
enum WishlistStatus { initial, loading, loaded, error }

/// State for the Wishlist module BLoC.
class WishlistState extends Equatable {
  final WishlistStatus status;
  final List<WishlistItem> items;
  final String? errorMessage;

  const WishlistState({
    this.status = WishlistStatus.initial,
    this.items = const [],
    this.errorMessage,
  });

  int get itemCount => items.length;
  bool isInWishlist(String productId) => items.any((i) => i.productId == productId);

  WishlistState copyWith({
    WishlistStatus? status,
    List<WishlistItem>? items,
    String? errorMessage,
  }) {
    return WishlistState(
      status: status ?? this.status,
      items: items ?? this.items,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, items, errorMessage];
}
