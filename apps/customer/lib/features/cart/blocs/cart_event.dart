import 'package:equatable/equatable.dart';

/// Events for the Cart module BLoC.
abstract class CartEvent extends Equatable {
  const CartEvent();
  @override
  List<Object?> get props => [];
}

/// Load cart items from local storage or API.
class LoadCart extends CartEvent {
  const LoadCart();
}

/// Add a product to the cart.
class AddToCart extends CartEvent {
  final String productId;
  final String productName;
  final double price;
  final int quantity;
  final String? imageUrl;
  final String? sellerName;

  const AddToCart({
    required this.productId,
    required this.productName,
    required this.price,
    this.quantity = 1,
    this.imageUrl,
    this.sellerName,
  });

  @override
  List<Object?> get props => [productId, productName, price, quantity];
}

/// Remove a product from the cart.
class RemoveFromCart extends CartEvent {
  final String productId;
  const RemoveFromCart(this.productId);

  @override
  List<Object?> get props => [productId];
}

/// Update the quantity of a cart item.
class UpdateCartQuantity extends CartEvent {
  final String productId;
  final int quantity;
  const UpdateCartQuantity({required this.productId, required this.quantity});

  @override
  List<Object?> get props => [productId, quantity];
}

/// Clear all items from the cart.
class ClearCart extends CartEvent {
  const ClearCart();
}

/// Apply a coupon code.
class ApplyCoupon extends CartEvent {
  final String code;
  const ApplyCoupon(this.code);

  @override
  List<Object?> get props => [code];
}

/// Remove applied coupon.
class RemoveCoupon extends CartEvent {
  const RemoveCoupon();
}
