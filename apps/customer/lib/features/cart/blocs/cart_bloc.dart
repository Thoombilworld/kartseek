import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_event.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_state.dart';

/// BLoC for the Shopping Cart module.
///
/// Manages cart items, quantities, coupon application, and price calculations.
/// State persists across the app session via the top-level BlocProvider.
class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc() : super(const CartState()) {
    on<LoadCart>(_onLoadCart);
    on<AddToCart>(_onAddToCart);
    on<RemoveFromCart>(_onRemoveFromCart);
    on<UpdateCartQuantity>(_onUpdateQuantity);
    on<ClearCart>(_onClearCart);
    on<ApplyCoupon>(_onApplyCoupon);
    on<RemoveCoupon>(_onRemoveCoupon);
  }

  Future<void> _onLoadCart(LoadCart event, Emitter<CartState> emit) async {
    emit(state.copyWith(status: CartStatus.loading));
    await Future.delayed(const Duration(milliseconds: 200));
    emit(state.copyWith(status: CartStatus.loaded));
  }

  void _onAddToCart(AddToCart event, Emitter<CartState> emit) {
    final existingIndex = state.items.indexWhere((i) => i.productId == event.productId);

    List<CartItem> updatedItems;
    if (existingIndex >= 0) {
      // Increase quantity of existing item
      updatedItems = List<CartItem>.from(state.items);
      final existing = updatedItems[existingIndex];
      updatedItems[existingIndex] = existing.copyWith(quantity: existing.quantity + event.quantity);
    } else {
      // Add new item
      updatedItems = [
        ...state.items,
        CartItem(
          productId: event.productId,
          productName: event.productName,
          price: event.price,
          quantity: event.quantity,
          imageUrl: event.imageUrl,
          sellerName: event.sellerName,
        ),
      ];
    }

    emit(state.copyWith(status: CartStatus.loaded, items: updatedItems));
    debugPrint('[CartBloc] ➕ Added ${event.productName} (qty: ${event.quantity})');
  }

  void _onRemoveFromCart(RemoveFromCart event, Emitter<CartState> emit) {
    final updatedItems = state.items.where((i) => i.productId != event.productId).toList();
    emit(state.copyWith(status: CartStatus.loaded, items: updatedItems));
    debugPrint('[CartBloc] ➖ Removed product: ${event.productId}');
  }

  void _onUpdateQuantity(UpdateCartQuantity event, Emitter<CartState> emit) {
    if (event.quantity <= 0) {
      add(RemoveFromCart(event.productId));
      return;
    }

    final updatedItems = state.items.map((item) {
      if (item.productId == event.productId) {
        return item.copyWith(quantity: event.quantity);
      }
      return item;
    }).toList();

    emit(state.copyWith(status: CartStatus.loaded, items: updatedItems));
  }

  void _onClearCart(ClearCart event, Emitter<CartState> emit) {
    emit(const CartState(status: CartStatus.loaded));
    debugPrint('[CartBloc] 🗑️ Cart cleared');
  }

  Future<void> _onApplyCoupon(ApplyCoupon event, Emitter<CartState> emit) async {
    emit(state.copyWith(status: CartStatus.updating));
    await Future.delayed(const Duration(milliseconds: 500));

    // Mock coupon validation
    const validCoupons = {'SAVE10': 0.10, 'SAVE20': 0.20, 'FIRST50': 0.50};
    final discount = validCoupons[event.code.toUpperCase()];

    if (discount != null) {
      final discountAmount = state.subtotal * discount;
      emit(state.copyWith(
        status: CartStatus.loaded,
        appliedCoupon: event.code.toUpperCase(),
        discountAmount: discountAmount,
      ));
      debugPrint('[CartBloc] 🎟️ Coupon applied: ${event.code} (-$discountAmount)');
    } else {
      emit(state.copyWith(
        status: CartStatus.error,
        errorMessage: 'Invalid coupon code',
      ));
    }
  }

  void _onRemoveCoupon(RemoveCoupon event, Emitter<CartState> emit) {
    emit(CartState(
      status: CartStatus.loaded,
      items: state.items,
      appliedCoupon: null,
      discountAmount: 0.0,
    ));
  }
}
