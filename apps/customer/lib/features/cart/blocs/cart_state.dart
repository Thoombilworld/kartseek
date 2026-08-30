import 'package:equatable/equatable.dart';

/// Cart item model.
class CartItem extends Equatable {
  final String productId;
  final String productName;
  final double price;
  final int quantity;
  final String? imageUrl;
  final String? sellerName;

  const CartItem({
    required this.productId,
    required this.productName,
    required this.price,
    required this.quantity,
    this.imageUrl,
    this.sellerName,
  });

  double get totalPrice => price * quantity;

  CartItem copyWith({int? quantity}) => CartItem(
        productId: productId,
        productName: productName,
        price: price,
        quantity: quantity ?? this.quantity,
        imageUrl: imageUrl,
        sellerName: sellerName,
      );

  @override
  List<Object?> get props => [productId, productName, price, quantity, imageUrl, sellerName];
}

/// Status for the Cart module.
enum CartStatus { initial, loading, loaded, updating, error }

/// State for the Cart module BLoC.
class CartState extends Equatable {
  final CartStatus status;
  final List<CartItem> items;
  final String? appliedCoupon;
  final double discountAmount;
  final String? errorMessage;

  const CartState({
    this.status = CartStatus.initial,
    this.items = const [],
    this.appliedCoupon,
    this.discountAmount = 0.0,
    this.errorMessage,
  });

  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);
  double get subtotal => items.fold(0.0, (sum, item) => sum + item.totalPrice);
  double get deliveryFee => subtotal > 500 ? 0.0 : 40.0;
  double get total => subtotal - discountAmount + deliveryFee;
  bool get isEmpty => items.isEmpty;

  CartState copyWith({
    CartStatus? status,
    List<CartItem>? items,
    String? appliedCoupon,
    double? discountAmount,
    String? errorMessage,
  }) {
    return CartState(
      status: status ?? this.status,
      items: items ?? this.items,
      appliedCoupon: appliedCoupon ?? this.appliedCoupon,
      discountAmount: discountAmount ?? this.discountAmount,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, items, appliedCoupon, discountAmount, errorMessage];
}
