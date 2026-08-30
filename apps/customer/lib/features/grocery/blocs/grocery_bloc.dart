import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/grocery/blocs/grocery_event.dart';
import 'package:kartseek_customer/features/grocery/blocs/grocery_state.dart';
import 'package:kartseek_customer/features/grocery/models/grocery_model.dart';
import 'package:kartseek_customer/features/grocery/repositories/grocery_repository.dart';

/// GroceryBloc — Manages grocery store discovery, shopping cart, and ordering.
class GroceryBloc extends Bloc<GroceryEvent, GroceryState> {
  final GroceryRepository _repository;

  GroceryBloc({GroceryRepository? repository}) 
      : _repository = repository ?? GroceryRepository(),
        super(const GroceryState()) {
    on<LoadGroceryHome>(_onLoadHome);
    on<LoadGroceryStores>(_onLoadStores);
    on<LoadGroceryStoreById>(_onLoadStoreById);
    on<LoadGroceryCategories>(_onLoadCategories);
    on<LoadGroceryGlobalCategories>(_onLoadGlobalCategories);
    on<LoadGroceryProducts>(_onLoadProducts);
    on<SearchGrocery>(_onSearch);
    on<AddGroceryToCart>(_onAddToCart);
    on<RemoveGroceryFromCart>(_onRemoveFromCart);
    on<UpdateGroceryCartQuantity>(_onUpdateQuantity);
    on<PlaceGroceryOrder>(_onPlaceOrder);
    on<LoadGroceryOrders>(_onLoadOrders);
    // Flash Deals, Wishlist, Reviews, Reorder
    on<LoadFlashDeals>(_onLoadFlashDeals);
    on<ToggleWishlist>(_onToggleWishlist);
    on<LoadWishlist>(_onLoadWishlist);
    on<SubmitReview>(_onSubmitReview);
    on<LoadProductReviews>(_onLoadProductReviews);
    on<ReorderFromHistory>(_onReorderFromHistory);
  }

  Future<void> _onLoadHome(LoadGroceryHome event, Emitter<GroceryState> emit) async {
    emit(state.copyWith(status: GroceryStatus.loading));
    try {
      // Load stores and global categories in parallel
      final results = await Future.wait([
        _repository.getNearbyStores(),
        _repository.getGlobalCategories(),
      ]);
      final stores = results[0] as List<GroceryStoreModel>;
      final globalCats = results[1] as List<GroceryCategoryModel>;
      emit(state.copyWith(
        status: GroceryStatus.success,
        stores: stores.map((s) => {'id': s.id, 'name': s.name, 'imageUrl': s.imageUrl, 'distance': s.distance, 'deliveryTime': s.deliveryTime, 'rating': s.rating}).toList(),
        globalCategories: globalCats.map((c) => c.toMap()).toList(),
        globalCategoriesLoaded: true,
      ));
    } catch (err) {
      emit(state.copyWith(status: GroceryStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadStores(LoadGroceryStores event, Emitter<GroceryState> emit) async {
    emit(state.copyWith(status: GroceryStatus.loading));
    try {
      final stores = await _repository.getNearbyStores();
      emit(state.copyWith(status: GroceryStatus.success, stores: stores.map((s) => {'id': s.id, 'name': s.name, 'imageUrl': s.imageUrl, 'distance': s.distance, 'deliveryTime': s.deliveryTime, 'rating': s.rating}).toList()));
    } catch (err) {
      emit(state.copyWith(status: GroceryStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadStoreById(LoadGroceryStoreById event, Emitter<GroceryState> emit) async {
    emit(state.copyWith(status: GroceryStatus.loading));
    try {
      final store = await _repository.getStoreById(event.id);
      emit(state.copyWith(status: GroceryStatus.success, selectedStore: {'id': store.id, 'name': store.name, 'imageUrl': store.imageUrl}));
    } catch (err) {
      emit(state.copyWith(status: GroceryStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadCategories(LoadGroceryCategories event, Emitter<GroceryState> emit) async {
    try {
      final categories = await _repository.getStoreCategories(event.storeId);
      emit(state.copyWith(categories: categories.map((c) => c.toMap()).toList()));
    } catch (err) {
      debugPrint('Load grocery categories failed: $err');
    }
  }

  /// Loads the global (admin-configured) category list for the home screen grid.
  Future<void> _onLoadGlobalCategories(LoadGroceryGlobalCategories event, Emitter<GroceryState> emit) async {
    // Skip if already loaded (cached for session lifetime)
    if (state.globalCategoriesLoaded) return;
    try {
      final categories = await _repository.getGlobalCategories();
      emit(state.copyWith(
        globalCategories: categories.map((c) => c.toMap()).toList(),
        globalCategoriesLoaded: true,
      ));
    } catch (err) {
      debugPrint('Load global grocery categories failed: $err');
    }
  }

  Future<void> _onLoadProducts(LoadGroceryProducts event, Emitter<GroceryState> emit) async {
    emit(state.copyWith(status: GroceryStatus.loading));
    try {
      final products = await _repository.getStoreProducts(event.storeId, categoryId: event.categoryId);
      emit(state.copyWith(status: GroceryStatus.success, products: products.map((p) => {'id': p.id, 'name': p.name, 'price': p.price, 'imageUrl': p.imageUrl, 'unit': p.unit}).toList()));
    } catch (err) {
      emit(state.copyWith(status: GroceryStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onSearch(SearchGrocery event, Emitter<GroceryState> emit) async {
    if (event.query.isEmpty) { emit(state.copyWith(status: GroceryStatus.initial)); return; }
    emit(state.copyWith(status: GroceryStatus.loading));
    try {
      final products = await _repository.searchProducts(event.query);
      emit(state.copyWith(status: GroceryStatus.success, products: products.map((p) => {'id': p.id, 'name': p.name, 'price': p.price, 'imageUrl': p.imageUrl, 'unit': p.unit}).toList()));
    } catch (err) {
      emit(state.copyWith(status: GroceryStatus.error, errorMessage: err.toString()));
    }
  }

  void _onAddToCart(AddGroceryToCart event, Emitter<GroceryState> emit) {
    final items = List<Map<String, dynamic>>.from(state.cartItems);
    final idx = items.indexWhere((i) => i['productId'] == event.productId);
    if (idx >= 0) {
      items[idx] = {...items[idx], 'quantity': (items[idx]['quantity'] as int? ?? 1) + event.quantity};
    } else {
      items.add({'productId': event.productId, 'quantity': event.quantity});
    }
    emit(state.copyWith(cartItems: items));
  }

  void _onRemoveFromCart(RemoveGroceryFromCart event, Emitter<GroceryState> emit) {
    final items = state.cartItems.where((i) => i['productId'] != event.productId).toList();
    emit(state.copyWith(cartItems: items));
  }

  void _onUpdateQuantity(UpdateGroceryCartQuantity event, Emitter<GroceryState> emit) {
    if (event.quantity <= 0) { add(RemoveGroceryFromCart(event.productId)); return; }
    final items = state.cartItems.map((i) {
      if (i['productId'] == event.productId) return {...i, 'quantity': event.quantity};
      return i;
    }).toList();
    emit(state.copyWith(cartItems: items));
  }

  Future<void> _onPlaceOrder(PlaceGroceryOrder event, Emitter<GroceryState> emit) async {
    emit(state.copyWith(status: GroceryStatus.ordering));
    try {
      await Future.delayed(const Duration(seconds: 1));
      emit(state.copyWith(status: GroceryStatus.ordered, cartItems: []));
    } catch (err) {
      emit(state.copyWith(status: GroceryStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadOrders(LoadGroceryOrders event, Emitter<GroceryState> emit) async {
    try {
      await Future.delayed(const Duration(milliseconds: 300));
      emit(state.copyWith(orders: []));
    } catch (err) {
      debugPrint('Load grocery orders failed: $err');
    }
  }

  // ── Flash Deals ─────────────────────────────────────────────────────────

  Future<void> _onLoadFlashDeals(LoadFlashDeals event, Emitter<GroceryState> emit) async {
    try {
      final res = await _repository.getStoreFlashDeals(event.storeId);
      final deals = (res['deals'] as List?)?.map((d) => d as Map<String, dynamic>).toList() ?? [];
      emit(state.copyWith(flashDeals: deals));
    } catch (err) {
      debugPrint('Load flash deals failed: $err');
    }
  }

  // ── Wishlist ────────────────────────────────────────────────────────────

  Future<void> _onToggleWishlist(ToggleWishlist event, Emitter<GroceryState> emit) async {
    final ids = Set<String>.from(state.wishlistIds);
    if (ids.contains(event.productId)) {
      ids.remove(event.productId);
      emit(state.copyWith(wishlistIds: ids));
      try {
        await _repository.removeFromWishlist('current-user', event.productId);
      } catch (err) {
        debugPrint('Remove from wishlist failed: $err');
        ids.add(event.productId);
        emit(state.copyWith(wishlistIds: ids));
      }
    } else {
      ids.add(event.productId);
      emit(state.copyWith(wishlistIds: ids));
      try {
        await _repository.addToWishlist(customerId: 'current-user', productId: event.productId, storeId: event.storeId);
      } catch (err) {
        debugPrint('Add to wishlist failed: $err');
        ids.remove(event.productId);
        emit(state.copyWith(wishlistIds: ids));
      }
    }
  }

  Future<void> _onLoadWishlist(LoadWishlist event, Emitter<GroceryState> emit) async {
    try {
      final res = await _repository.getWishlist('current-user');
      final items = (res['data'] as List?)?.map((d) => d as Map<String, dynamic>).toList() ?? [];
      final ids = items.map((i) => i['productId'] as String? ?? '').where((id) => id.isNotEmpty).toSet();
      emit(state.copyWith(wishlistIds: ids));
    } catch (err) {
      debugPrint('Load wishlist failed: $err');
    }
  }

  // ── Reviews ─────────────────────────────────────────────────────────────

  Future<void> _onSubmitReview(SubmitReview event, Emitter<GroceryState> emit) async {
    try {
      await _repository.submitReview(
        event.storeId, event.productId,
        customerId: 'current-user', rating: event.rating, comment: event.comment,
      );
    } catch (err) {
      debugPrint('Submit review failed: $err');
    }
  }

  Future<void> _onLoadProductReviews(LoadProductReviews event, Emitter<GroceryState> emit) async {
    try {
      final res = await _repository.getProductReviews(event.storeId, event.productId);
      final reviews = (res['data'] as List?)?.map((d) => d as Map<String, dynamic>).toList() ?? [];
      emit(state.copyWith(reviews: reviews));
    } catch (err) {
      debugPrint('Load product reviews failed: $err');
    }
  }

  // ── Reorder ─────────────────────────────────────────────────────────────

  Future<void> _onReorderFromHistory(ReorderFromHistory event, Emitter<GroceryState> emit) async {
    emit(state.copyWith(status: GroceryStatus.loading));
    try {
      final res = await _repository.reorderFromHistory(event.orderId, 'current-user');
      final items = (res['items'] as List?)?.map((d) => d as Map<String, dynamic>).toList() ?? [];
      emit(state.copyWith(status: GroceryStatus.success, cartItems: items));
    } catch (err) {
      emit(state.copyWith(status: GroceryStatus.error, errorMessage: err.toString()));
    }
  }
}
