import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/wishlist/blocs/wishlist_event.dart';
import 'package:kartseek_customer/features/wishlist/blocs/wishlist_state.dart';

/// BLoC for the Wishlist module.
///
/// Manages the user's saved/favorited products across all marketplace modules.
/// Persists across the app session via the top-level BlocProvider.
class WishlistBloc extends Bloc<WishlistEvent, WishlistState> {
  WishlistBloc() : super(const WishlistState()) {
    on<LoadWishlist>(_onLoadWishlist);
    on<AddToWishlist>(_onAddToWishlist);
    on<RemoveFromWishlist>(_onRemoveFromWishlist);
    on<ToggleWishlist>(_onToggleWishlist);
    on<MoveToCart>(_onMoveToCart);
    on<ClearWishlist>(_onClearWishlist);
  }

  Future<void> _onLoadWishlist(LoadWishlist event, Emitter<WishlistState> emit) async {
    emit(state.copyWith(status: WishlistStatus.loading));
    await Future.delayed(const Duration(milliseconds: 200));
    emit(state.copyWith(status: WishlistStatus.loaded));
  }

  void _onAddToWishlist(AddToWishlist event, Emitter<WishlistState> emit) {
    if (state.isInWishlist(event.productId)) return;

    final item = WishlistItem(
      productId: event.productId,
      productName: event.productName,
      price: event.price,
      imageUrl: event.imageUrl,
      sellerName: event.sellerName,
    );

    emit(state.copyWith(
      status: WishlistStatus.loaded,
      items: [...state.items, item],
    ));
    debugPrint('[WishlistBloc] ❤️ Added: ${event.productName}');
  }

  void _onRemoveFromWishlist(RemoveFromWishlist event, Emitter<WishlistState> emit) {
    final updated = state.items.where((i) => i.productId != event.productId).toList();
    emit(state.copyWith(status: WishlistStatus.loaded, items: updated));
    debugPrint('[WishlistBloc] 💔 Removed: ${event.productId}');
  }

  void _onToggleWishlist(ToggleWishlist event, Emitter<WishlistState> emit) {
    if (state.isInWishlist(event.productId)) {
      add(RemoveFromWishlist(event.productId));
    } else {
      add(AddToWishlist(
        productId: event.productId,
        productName: event.productName,
        price: event.price,
        imageUrl: event.imageUrl,
      ));
    }
  }

  void _onMoveToCart(MoveToCart event, Emitter<WishlistState> emit) {
    // Remove from wishlist — the CartBloc.AddToCart should be dispatched by the UI
    add(RemoveFromWishlist(event.productId));
    debugPrint('[WishlistBloc] 🛒 Moved to cart: ${event.productId}');
  }

  void _onClearWishlist(ClearWishlist event, Emitter<WishlistState> emit) {
    emit(const WishlistState(status: WishlistStatus.loaded));
    debugPrint('[WishlistBloc] 🗑️ Wishlist cleared');
  }
}
