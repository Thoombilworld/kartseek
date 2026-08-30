import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_event.dart';
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_state.dart';
import 'package:kartseek_customer/features/marketplace/repositories/marketplace_repository.dart';
import 'package:kartseek_customer/features/marketplace/models/product_model.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Debounce transformer — waits [duration] of inactivity then processes only
/// the latest event. Cancels any in-flight handler when a new event arrives.
EventTransformer<E> _debounceRestartable<E>(Duration duration) {
  return (events, mapper) {
    return restartable<E>().call(
      events.transform(
        StreamTransformer<E, E>.fromHandlers(
          handleData: (event, sink) {
            Future.delayed(duration, () => sink.add(event));
          },
        ),
      ),
      mapper,
    );
  };
}

/// Marketplace BLoC — Single controller handling all marketplace domains.
/// Dispatch a typed [MarketplaceEvent] and react to the resulting [MarketplaceState].
class MarketplaceBloc extends Bloc<MarketplaceEvent, MarketplaceState<dynamic>> {
  final MarketplaceRepository _repo;

  // Internal typed state buckets — widget trees use these sub-BLoCs or
  // cast via BlocBuilder<MarketplaceBloc, …> as needed.
  MarketplaceHomeState homeState = const MarketplaceState();
  CategoryListState categoryState = const MarketplaceState();
  ProductListState productListState = const MarketplaceState();
  ProductDetailState productDetailState = const MarketplaceState();
  CartState cartState = const MarketplaceState();
  WishlistState wishlistState = const MarketplaceState();
  OrderListState ordersState = const MarketplaceState();
  SearchState searchState = const MarketplaceState();
  BrandListState brandState = const MarketplaceState();
  SellerListState sellerState = const MarketplaceState();
  ReviewListState reviewState = const MarketplaceState();

  MarketplaceBloc({MarketplaceRepository? repo})
      : _repo = repo ?? MarketplaceRepository(),
        super(const MarketplaceState()) {
    // Home — droppable prevents duplicate loads
    on<LoadMarketplaceHome>(_onLoadHome, transformer: droppable());
    on<RefreshMarketplaceHome>(_onRefreshHome, transformer: droppable());

    // Categories
    on<LoadCategories>(_onLoadCategories, transformer: droppable());
    on<LoadCategoryById>(_onLoadCategoryById, transformer: restartable());

    // Products — restartable cancels stale requests during rapid filter changes
    on<LoadProducts>(_onLoadProducts, transformer: restartable());
    on<LoadProductById>(_onLoadProductById, transformer: restartable());
    on<LoadFeaturedProducts>(_onLoadFeaturedProducts, transformer: restartable());
    on<LoadDeals>(_onLoadDeals, transformer: restartable());
    on<LoadFlashDeals>(_onLoadFlashDeals, transformer: restartable());

    // Search — 300ms debounce to avoid N API calls for N keystrokes
    on<SearchMarketplace>(_onSearch,
        transformer: _debounceRestartable(const Duration(milliseconds: 300)));
    on<ClearSearch>(_onClearSearch);

    // Cart
    on<LoadCart>(_onLoadCart);
    on<AddToCart>(_onAddToCart);
    on<UpdateCartQuantity>(_onUpdateCartQuantity);
    on<RemoveFromCart>(_onRemoveFromCart);

    // Wishlist
    on<LoadWishlist>(_onLoadWishlist);
    on<ToggleWishlistItem>(_onToggleWishlist);

    // Orders
    on<LoadOrders>(_onLoadOrders);
    on<LoadOrderById>(_onLoadOrderById);
    on<PlaceOrder>(_onPlaceOrder);
    on<CancelOrder>(_onCancelOrder);

    // Reviews
    on<LoadProductReviews>(_onLoadProductReviews);
    on<AddProductReview>(_onAddProductReview);

    // Brands & Sellers
    on<LoadTopBrands>(_onLoadTopBrands);
    on<LoadVerifiedSellers>(_onLoadVerifiedSellers);
    on<LoadSellerById>(_onLoadSellerById);
    on<LoadBrandById>(_onLoadBrandById);

    // Recently Viewed
    on<LoadRecentlyViewed>(_onLoadRecentlyViewed);
  }

  // ── Home ────────────────────────────────────────────────────────────────────
  Future<void> _onLoadHome(LoadMarketplaceHome e, Emitter<MarketplaceState<dynamic>> emit) async {
    homeState = homeState.copyWith(status: MarketplaceStatus.loading);
    emit(homeState);
    try {
      final data = await _repo.getMarketplaceHome();
      homeState = homeState.copyWith(status: MarketplaceStatus.success, data: data);
      emit(homeState);
    } catch (err) {
      homeState = homeState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(homeState);
    }
  }

  Future<void> _onRefreshHome(RefreshMarketplaceHome e, Emitter<MarketplaceState<dynamic>> emit) async {
    homeState = homeState.copyWith(status: MarketplaceStatus.refreshing);
    emit(homeState);
    await _onLoadHome(const LoadMarketplaceHome(), emit);
  }

  // ── Categories ───────────────────────────────────────────────────────────────
  Future<void> _onLoadCategories(LoadCategories e, Emitter<MarketplaceState<dynamic>> emit) async {
    categoryState = categoryState.copyWith(status: MarketplaceStatus.loading);
    emit(categoryState);
    try {
      final data = await _repo.getCategories();
      categoryState = categoryState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(categoryState);
    } catch (err) {
      categoryState = categoryState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(categoryState);
    }
  }

  Future<void> _onLoadCategoryById(LoadCategoryById e, Emitter<MarketplaceState<dynamic>> emit) async {
    emit(const MarketplaceState(status: MarketplaceStatus.loading));
    try {
      final data = await _repo.getCategoryById(e.id);
      emit(MarketplaceState(status: MarketplaceStatus.success, data: data));
    } catch (err) {
      emit(MarketplaceState(status: MarketplaceStatus.error, errorMessage: err.toString()));
    }
  }

  // ── Products ─────────────────────────────────────────────────────────────────
  Future<void> _onLoadProducts(LoadProducts e, Emitter<MarketplaceState<dynamic>> emit) async {
    productListState = productListState.copyWith(status: MarketplaceStatus.loading);
    emit(productListState);
    try {
      final region = RegionService.instance;
      final lat = region.lastDetection?.lat ?? region.currentCountry.defaultLat;
      final lng = region.lastDetection?.lng ?? region.currentCountry.defaultLng;
      
      final filterWithLocation = e.filter.copyWith(lat: lat, lng: lng);
      
      final data = await _repo.getProducts(filterWithLocation);
      productListState = productListState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(productListState);
    } catch (err) {
      productListState = productListState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(productListState);
    }
  }

  Future<void> _onLoadProductById(LoadProductById e, Emitter<MarketplaceState<dynamic>> emit) async {
    productDetailState = productDetailState.copyWith(status: MarketplaceStatus.loading);
    emit(productDetailState);
    try {
      final data = await _repo.getProductById(e.id);
      productDetailState = productDetailState.copyWith(status: MarketplaceStatus.success, data: data);
      emit(productDetailState);
    } catch (err) {
      productDetailState = productDetailState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(productDetailState);
    }
  }

  Future<void> _onLoadFeaturedProducts(LoadFeaturedProducts e, Emitter<MarketplaceState<dynamic>> emit) async {
    productListState = productListState.copyWith(status: MarketplaceStatus.loading);
    emit(productListState);
    try {
      final data = await _repo.getFeaturedProducts();
      productListState = productListState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(productListState);
    } catch (err) {
      productListState = productListState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(productListState);
    }
  }

  Future<void> _onLoadDeals(LoadDeals e, Emitter<MarketplaceState<dynamic>> emit) async {
    productListState = productListState.copyWith(status: MarketplaceStatus.loading);
    emit(productListState);
    try {
      final data = await _repo.getDeals();
      productListState = productListState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(productListState);
    } catch (err) {
      productListState = productListState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(productListState);
    }
  }

  Future<void> _onLoadFlashDeals(LoadFlashDeals e, Emitter<MarketplaceState<dynamic>> emit) async {
    productListState = productListState.copyWith(status: MarketplaceStatus.loading);
    emit(productListState);
    try {
      final data = await _repo.getFlashDeals();
      productListState = productListState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(productListState);
    } catch (err) {
      productListState = productListState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(productListState);
    }
  }

  // ── Search ───────────────────────────────────────────────────────────────────
  Future<void> _onSearch(SearchMarketplace e, Emitter<MarketplaceState<dynamic>> emit) async {
    if (e.query.isEmpty) {
      searchState = const MarketplaceState(status: MarketplaceStatus.initial);
      emit(searchState);
      return;
    }
    searchState = searchState.copyWith(status: MarketplaceStatus.loading);
    emit(searchState);
    try {
      final region = RegionService.instance;
      final lat = region.lastDetection?.lat ?? region.currentCountry.defaultLat;
      final lng = region.lastDetection?.lng ?? region.currentCountry.defaultLng;

      final filterWithLocation = (e.filter ?? const ProductFilter()).copyWith(lat: lat, lng: lng);

      final data = await _repo.searchMarketplace(e.query, filter: filterWithLocation);
      searchState = searchState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(searchState);
    } catch (err) {
      searchState = searchState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(searchState);
    }
  }

  void _onClearSearch(ClearSearch e, Emitter<MarketplaceState<dynamic>> emit) {
    searchState = const MarketplaceState(status: MarketplaceStatus.initial);
    emit(searchState);
  }

  // ── Cart ─────────────────────────────────────────────────────────────────────
  Future<void> _onLoadCart(LoadCart e, Emitter<MarketplaceState<dynamic>> emit) async {
    cartState = cartState.copyWith(status: MarketplaceStatus.loading);
    emit(cartState);
    try {
      final data = await _repo.getCart();
      cartState = cartState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(cartState);
    } catch (err) {
      cartState = cartState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(cartState);
    }
  }

  Future<void> _onAddToCart(AddToCart e, Emitter<MarketplaceState<dynamic>> emit) async {
    try {
      await _repo.addToCart(e.productId, quantity: e.quantity, variantId: e.variantId);
      add(const LoadCart());
    } catch (err) {
      cartState = cartState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(cartState);
    }
  }

  Future<void> _onUpdateCartQuantity(UpdateCartQuantity e, Emitter<MarketplaceState<dynamic>> emit) async {
    try {
      await _repo.updateCartItem(e.itemId, e.quantity);
      add(const LoadCart());
    } catch (err) {
      cartState = cartState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(cartState);
    }
  }

  Future<void> _onRemoveFromCart(RemoveFromCart e, Emitter<MarketplaceState<dynamic>> emit) async {
    try {
      await _repo.removeFromCart(e.itemId);
      add(const LoadCart());
    } catch (err) {
      cartState = cartState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(cartState);
    }
  }

  // ── Wishlist ──────────────────────────────────────────────────────────────────
  Future<void> _onLoadWishlist(LoadWishlist e, Emitter<MarketplaceState<dynamic>> emit) async {
    wishlistState = wishlistState.copyWith(status: MarketplaceStatus.loading);
    emit(wishlistState);
    try {
      final data = await _repo.getWishlist();
      wishlistState = wishlistState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(wishlistState);
    } catch (err) {
      wishlistState = wishlistState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(wishlistState);
    }
  }

  Future<void> _onToggleWishlist(ToggleWishlistItem e, Emitter<MarketplaceState<dynamic>> emit) async {
    try {
      final current = wishlistState.data ?? [];
      if (current.any((p) => p.id == e.productId)) {
        await _repo.removeFromWishlist(e.productId);
      } else {
        await _repo.addToWishlist(e.productId);
      }
      add(const LoadWishlist());
    } catch (err) {
      wishlistState = wishlistState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(wishlistState);
    }
  }

  // ── Orders ───────────────────────────────────────────────────────────────────
  Future<void> _onLoadOrders(LoadOrders e, Emitter<MarketplaceState<dynamic>> emit) async {
    ordersState = ordersState.copyWith(status: MarketplaceStatus.loading);
    emit(ordersState);
    try {
      final data = await _repo.getOrders();
      ordersState = ordersState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(ordersState);
    } catch (err) {
      ordersState = ordersState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(ordersState);
    }
  }

  Future<void> _onLoadOrderById(LoadOrderById e, Emitter<MarketplaceState<dynamic>> emit) async {
    emit(const MarketplaceState(status: MarketplaceStatus.loading));
    try {
      final data = await _repo.getOrderById(e.id);
      emit(MarketplaceState(status: MarketplaceStatus.success, data: data));
    } catch (err) {
      emit(MarketplaceState(status: MarketplaceStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onPlaceOrder(PlaceOrder e, Emitter<MarketplaceState<dynamic>> emit) async {
    emit(const MarketplaceState(status: MarketplaceStatus.loading));
    try {
      final orderId = await _repo.placeOrder(e.payload);
      emit(MarketplaceState(status: MarketplaceStatus.success, data: orderId));
    } catch (err) {
      emit(MarketplaceState(status: MarketplaceStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onCancelOrder(CancelOrder e, Emitter<MarketplaceState<dynamic>> emit) async {
    emit(const MarketplaceState(status: MarketplaceStatus.loading));
    try {
      await _repo.cancelOrder(e.orderId, e.reason);
      emit(const MarketplaceState(status: MarketplaceStatus.success, data: 'Order cancelled'));
      // Refresh orders list
      add(const LoadOrders());
    } catch (err) {
      emit(MarketplaceState(status: MarketplaceStatus.error, errorMessage: err.toString()));
    }
  }

  // ── Reviews ──────────────────────────────────────────────────────────────────
  Future<void> _onLoadProductReviews(LoadProductReviews e, Emitter<MarketplaceState<dynamic>> emit) async {
    reviewState = reviewState.copyWith(status: MarketplaceStatus.loading);
    emit(reviewState);
    try {
      final data = await _repo.getProductReviews(e.productId);
      reviewState = reviewState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(reviewState);
    } catch (err) {
      reviewState = reviewState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(reviewState);
    }
  }

  Future<void> _onAddProductReview(AddProductReview e, Emitter<MarketplaceState<dynamic>> emit) async {
    try {
      await _repo.addProductReview(e.productId, e.review);
      // Reload reviews after adding
      add(LoadProductReviews(e.productId));
    } catch (err) {
      emit(MarketplaceState(status: MarketplaceStatus.error, errorMessage: err.toString()));
    }
  }

  // ── Brands & Sellers ──────────────────────────────────────────────────────────
  Future<void> _onLoadTopBrands(LoadTopBrands e, Emitter<MarketplaceState<dynamic>> emit) async {
    brandState = brandState.copyWith(status: MarketplaceStatus.loading);
    emit(brandState);
    try {
      final data = await _repo.getTopBrands();
      brandState = brandState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(brandState);
    } catch (err) {
      brandState = brandState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(brandState);
    }
  }

  Future<void> _onLoadVerifiedSellers(LoadVerifiedSellers e, Emitter<MarketplaceState<dynamic>> emit) async {
    sellerState = sellerState.copyWith(status: MarketplaceStatus.loading);
    emit(sellerState);
    try {
      final data = await _repo.getVerifiedSellers();
      sellerState = sellerState.copyWith(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      );
      emit(sellerState);
    } catch (err) {
      sellerState = sellerState.copyWith(status: MarketplaceStatus.error, errorMessage: err.toString());
      emit(sellerState);
    }
  }

  Future<void> _onLoadSellerById(LoadSellerById e, Emitter<MarketplaceState<dynamic>> emit) async {
    emit(const MarketplaceState(status: MarketplaceStatus.loading));
    try {
      final data = await _repo.getSellerById(e.id);
      emit(MarketplaceState(status: MarketplaceStatus.success, data: data));
    } catch (err) {
      emit(MarketplaceState(status: MarketplaceStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadBrandById(LoadBrandById e, Emitter<MarketplaceState<dynamic>> emit) async {
    emit(const MarketplaceState(status: MarketplaceStatus.loading));
    try {
      final data = await _repo.getBrandById(e.id);
      emit(MarketplaceState(status: MarketplaceStatus.success, data: data));
    } catch (err) {
      emit(MarketplaceState(status: MarketplaceStatus.error, errorMessage: err.toString()));
    }
  }

  // ── Recently Viewed ───────────────────────────────────────────────────────────
  Future<void> _onLoadRecentlyViewed(LoadRecentlyViewed e, Emitter<MarketplaceState<dynamic>> emit) async {
    emit(const MarketplaceState(status: MarketplaceStatus.loading));
    try {
      final data = await _repo.getRecentlyViewed();
      emit(MarketplaceState(
        status: data.isEmpty ? MarketplaceStatus.empty : MarketplaceStatus.success,
        data: data,
      ));
    } catch (err) {
      emit(MarketplaceState(status: MarketplaceStatus.error, errorMessage: err.toString()));
    }
  }
}
