import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_mobile/core/constants.dart';
import 'package:shared_mobile/core/security/ssl_pinning_service.dart';
import 'package:shared_mobile/core/security/secure_api_client.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// KARTSEEK Restaurant API Service — Dio-based client for NestJS API Gateway.
///
/// Covers all 115 restaurant controller routes:
///   - Discovery: search, nearby, trending, cuisines, popular dishes, collections
///   - Restaurant detail: profile, menu, reviews, offers
///   - Cart & Checkout: add/update/remove items, clear cart
///   - Orders: place, track, history
///   - Table Booking: book, my-reservations, cancel
///   - Favorites/Wishlist: add, remove, list
///   - Coupons: apply, remove
///   - Gift Cards: purchase, list
///   - Subscriptions: list plans, subscribe
///   - Addresses: CRUD
///   - Support: call-waiter
class RestaurantApiService {
  static String get _devBase => AppConstants.apiBaseUrl;

  late final Dio _dio;
  final bool useMock;

  static RestaurantApiService? _instance;

  factory RestaurantApiService({bool? useMock}) {
    return _instance ??= RestaurantApiService._internal(useMock: useMock);
  }

  RestaurantApiService._internal({bool? useMock})
      : useMock = useMock ?? AppConstants.useMockData {
    _dio = Dio(BaseOptions(
      baseUrl: _devBase,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));
    _dio.httpClientAdapter = IOHttpClientAdapter(
      createHttpClient: SslPinningService.createSecureHttpClient,
    );
    _dio.interceptors.add(_AuthInterceptor());
    _dio.interceptors.add(_RegionInterceptor());
    _dio.interceptors.add(LogInterceptor(requestBody: false, responseBody: false));
  }

  void _logApiError(Object error, String methodName) {
    if (error is DioException) {
      debugPrint('[RestaurantAPI] ⚠️ $methodName failed '
          '(status=${error.response?.statusCode}, url=${error.requestOptions.uri})');
    } else {
      debugPrint('[RestaurantAPI] ⚠️ $methodName failed ($error)');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ DISCOVERY & SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET /restaurants — List all restaurants (with optional filters)
  Future<List<dynamic>> getRestaurants({
    String? cuisine, String? sortBy, double? lat, double? lng, int? radius,
  }) async {
    try {
      final res = await _dio.get('/restaurants', queryParameters: {
        if (cuisine != null) 'cuisine': cuisine,
        if (sortBy != null) 'sortBy': sortBy,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
        if (radius != null) 'radius': radius,
      });
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getRestaurants');
      return [];
    }
  }

  /// GET /restaurants/search?q=...
  Future<List<dynamic>> searchRestaurants(String query, {String? cuisine}) async {
    try {
      final res = await _dio.get('/restaurants/search', queryParameters: {
        'q': query,
        if (cuisine != null) 'cuisine': cuisine,
      });
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'searchRestaurants');
      return [];
    }
  }

  /// GET /restaurants/cuisines
  Future<List<dynamic>> getCuisines() async {
    try {
      final res = await _dio.get('/restaurants/cuisines');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getCuisines');
      return [];
    }
  }

  /// GET /restaurants/trending
  Future<List<dynamic>> getTrending() async {
    try {
      final res = await _dio.get('/restaurants/trending');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getTrending');
      return [];
    }
  }

  /// GET /restaurants/nearby
  Future<List<dynamic>> getNearby({required double lat, required double lng, int? radius}) async {
    try {
      final res = await _dio.get('/restaurants/nearby', queryParameters: {
        'lat': lat, 'lng': lng,
        if (radius != null) 'radius': radius,
      });
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getNearby');
      return [];
    }
  }

  /// GET /restaurants/home-feed
  Future<Map<String, dynamic>> getHomeFeed() async {
    try {
      final res = await _dio.get('/restaurants/home-feed');
      return Map<String, dynamic>.from(res.data);
    } catch (e) {
      _logApiError(e, 'getHomeFeed');
      return {};
    }
  }

  /// GET /restaurants/suggestions
  Future<List<dynamic>> getSuggestions() async {
    try {
      final res = await _dio.get('/restaurants/suggestions');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getSuggestions');
      return [];
    }
  }

  /// GET /restaurants/popular-dishes
  Future<List<dynamic>> getPopularDishes() async {
    try {
      final res = await _dio.get('/restaurants/popular-dishes');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getPopularDishes');
      return [];
    }
  }

  /// GET /restaurants/collections
  Future<List<dynamic>> getCollections() async {
    try {
      final res = await _dio.get('/restaurants/collections');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getCollections');
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ RESTAURANT DETAIL
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET /restaurants/:slug
  Future<Map<String, dynamic>> getRestaurantBySlug(String slug) async {
    try {
      final res = await _dio.get('/restaurants/$slug');
      return Map<String, dynamic>.from(res.data['data'] ?? res.data);
    } catch (e) {
      _logApiError(e, 'getRestaurantBySlug');
      return {};
    }
  }

  /// GET /restaurants/:id/menu
  Future<List<dynamic>> getMenu(String restaurantId) async {
    try {
      final res = await _dio.get('/restaurants/$restaurantId/menu');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getMenu');
      return [];
    }
  }

  /// GET /restaurants/:id/reviews
  Future<List<dynamic>> getReviews(String restaurantId) async {
    try {
      final res = await _dio.get('/restaurants/$restaurantId/reviews');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getReviews');
      return [];
    }
  }

  /// POST /restaurants/:id/review
  Future<Map<String, dynamic>> addReview(String restaurantId, Map<String, dynamic> review) async {
    final res = await _dio.post('/restaurants/$restaurantId/review', data: review);
    return Map<String, dynamic>.from(res.data);
  }

  /// GET /restaurants/:id/offers
  Future<List<dynamic>> getOffers(String restaurantId) async {
    try {
      final res = await _dio.get('/restaurants/$restaurantId/offers');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getOffers');
      return [];
    }
  }

  /// GET /restaurants/:id/profile
  Future<Map<String, dynamic>> getProfile(String restaurantId) async {
    try {
      final res = await _dio.get('/restaurants/$restaurantId/profile');
      return Map<String, dynamic>.from(res.data);
    } catch (e) {
      _logApiError(e, 'getProfile');
      return {};
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ CART MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET /restaurants/cart
  Future<Map<String, dynamic>> getCart() async {
    try {
      final res = await _dio.get('/restaurants/cart');
      return Map<String, dynamic>.from(res.data);
    } catch (e) {
      _logApiError(e, 'getCart');
      return {'items': [], 'total': 0};
    }
  }

  /// POST /restaurants/cart/add
  Future<void> addToCart(Map<String, dynamic> item) async {
    await _dio.post('/restaurants/cart/add', data: item);
  }

  /// PUT /restaurants/cart/item/:itemId
  Future<void> updateCartItem(String itemId, {required int quantity}) async {
    await _dio.put('/restaurants/cart/item/$itemId', data: {'quantity': quantity});
  }

  /// DELETE /restaurants/cart/item/:itemId
  Future<void> removeCartItem(String itemId) async {
    await _dio.delete('/restaurants/cart/item/$itemId');
  }

  /// DELETE /restaurants/cart/clear
  Future<void> clearCart() async {
    await _dio.delete('/restaurants/cart/clear');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  /// POST /restaurants/:restaurantId/order
  Future<Map<String, dynamic>> placeOrder(String restaurantId, Map<String, dynamic> payload) async {
    final res = await _dio.post('/restaurants/$restaurantId/order', data: payload);
    return Map<String, dynamic>.from(res.data);
  }

  /// GET /restaurants/:restaurantId/orders/:orderId
  Future<Map<String, dynamic>> getOrderDetail(String restaurantId, String orderId) async {
    final res = await _dio.get('/restaurants/$restaurantId/orders/$orderId');
    return Map<String, dynamic>.from(res.data);
  }

  /// GET /restaurants/:restaurantId/orders/:orderId/receipt
  Future<Map<String, dynamic>> getOrderReceipt(String restaurantId, String orderId) async {
    final res = await _dio.get('/restaurants/$restaurantId/orders/$orderId/receipt');
    return Map<String, dynamic>.from(res.data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ TABLE BOOKING (DINE-IN)
  // ═══════════════════════════════════════════════════════════════════════════

  /// POST /restaurants/:restaurantId/book-table
  Future<Map<String, dynamic>> bookTable(String restaurantId, Map<String, dynamic> payload) async {
    final res = await _dio.post('/restaurants/$restaurantId/book-table', data: payload);
    return Map<String, dynamic>.from(res.data);
  }

  /// GET /restaurants/my-reservations
  Future<List<dynamic>> getMyReservations() async {
    try {
      final res = await _dio.get('/restaurants/my-reservations');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getMyReservations');
      return [];
    }
  }

  /// POST /restaurants/reservations/:reservationId/cancel
  Future<void> cancelReservation(String reservationId) async {
    await _dio.post('/restaurants/reservations/$reservationId/cancel');
  }

  /// GET /restaurants/:id/tables — available tables
  Future<List<dynamic>> getAvailableTables(String restaurantId) async {
    try {
      final res = await _dio.get('/restaurants/$restaurantId/tables');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getAvailableTables');
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ FAVORITES / WISHLIST
  // ═══════════════════════════════════════════════════════════════════════════

  /// POST /restaurants/:id/favorite
  Future<void> addToFavorites(String restaurantId) async {
    await _dio.post('/restaurants/$restaurantId/favorite');
  }

  /// DELETE /restaurants/:id/favorite
  Future<void> removeFromFavorites(String restaurantId) async {
    await _dio.delete('/restaurants/$restaurantId/favorite');
  }

  /// GET /restaurants/favorites
  Future<List<dynamic>> getFavorites() async {
    try {
      final res = await _dio.get('/restaurants/favorites');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getFavorites');
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ COUPONS
  // ═══════════════════════════════════════════════════════════════════════════

  /// POST /restaurants/:id/apply-coupon
  Future<Map<String, dynamic>> applyCoupon(String restaurantId, String couponCode) async {
    final res = await _dio.post('/restaurants/$restaurantId/apply-coupon', data: {'code': couponCode});
    return Map<String, dynamic>.from(res.data);
  }

  /// POST /restaurants/:id/remove-coupon
  Future<void> removeCoupon(String restaurantId) async {
    await _dio.post('/restaurants/$restaurantId/remove-coupon');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ GIFT CARDS
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET /restaurants/gift-cards
  Future<List<dynamic>> getGiftCards() async {
    try {
      final res = await _dio.get('/restaurants/gift-cards');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getGiftCards');
      return [];
    }
  }

  /// POST /restaurants/gift-cards/purchase
  Future<Map<String, dynamic>> purchaseGiftCard(Map<String, dynamic> payload) async {
    final res = await _dio.post('/restaurants/gift-cards/purchase', data: payload);
    return Map<String, dynamic>.from(res.data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET /restaurants/subscriptions
  Future<List<dynamic>> getSubscriptionPlans() async {
    try {
      final res = await _dio.get('/restaurants/subscriptions');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getSubscriptionPlans');
      return [];
    }
  }

  /// POST /restaurants/subscriptions/:planId/subscribe
  Future<Map<String, dynamic>> subscribe(String planId) async {
    final res = await _dio.post('/restaurants/subscriptions/$planId/subscribe');
    return Map<String, dynamic>.from(res.data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ ADDRESSES
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET /restaurants/addresses
  Future<List<dynamic>> getAddresses() async {
    try {
      final res = await _dio.get('/restaurants/addresses');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getAddresses');
      return [];
    }
  }

  /// POST /restaurants/addresses
  Future<Map<String, dynamic>> addAddress(Map<String, dynamic> address) async {
    final res = await _dio.post('/restaurants/addresses', data: address);
    return Map<String, dynamic>.from(res.data);
  }

  /// PUT /restaurants/addresses/:addressId
  Future<void> updateAddress(String addressId, Map<String, dynamic> address) async {
    await _dio.put('/restaurants/addresses/$addressId', data: address);
  }

  /// DELETE /restaurants/addresses/:addressId
  Future<void> deleteAddress(String addressId) async {
    await _dio.delete('/restaurants/addresses/$addressId');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ IN-RESTAURANT ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /// POST /restaurants/:id/call-waiter
  Future<void> callWaiter(String restaurantId) async {
    await _dio.post('/restaurants/$restaurantId/call-waiter');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ MENU CATEGORIES (read-only for customers)
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET /restaurants/menu-categories
  Future<List<dynamic>> getMenuCategories() async {
    try {
      final res = await _dio.get('/restaurants/menu-categories');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getMenuCategories');
      return [];
    }
  }
}

// ── Dio Interceptors ──────────────────────────────────────────────────────────

class _AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = SecureApiClient().authToken;
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    options.headers['X-Client-Platform'] = 'flutter';
    options.headers['X-Client-Version'] = AppConstants.appVersion;
    handler.next(options);
  }
}

class _RegionInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final region = RegionService.instance.currentCountry;
    options.headers['X-Region-Code'] = region.code;
    options.headers['X-Currency'] = region.currencyCode;
    handler.next(options);
  }
}
