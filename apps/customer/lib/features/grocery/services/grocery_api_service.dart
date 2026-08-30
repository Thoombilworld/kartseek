import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:shared_mobile/core/constants.dart';
import 'package:shared_mobile/core/security/ssl_pinning_service.dart';
import 'package:shared_mobile/core/security/secure_api_client.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/grocery/models/grocery_model.dart';

/// Grocery API Service — Secure client for Grocery endpoints.
///
/// Category data mirrors the canonical list in:
///   apps/web/src/lib/grocery-categories.ts
/// and the API backend at:
///   GET /grocery/categories (grocery.service.ts CANONICAL_CATEGORIES)
class GroceryApiService {
  static String get _devBase => AppConstants.apiBaseUrl;

  late final Dio _dio;

  /// Opt-in offline mode for local development. Off by default, and — unlike
  /// before — it is now the *only* thing that can produce mock data: the catch
  /// blocks below used to return the same fixtures on any network or parse
  /// error, so a signed-out session, an outage or a changed response shape all
  /// rendered a convincing storefront of items that cannot be bought.
  final bool useMock;

  GroceryApiService({this.useMock = false}) {
    _dio = Dio(BaseOptions(
      baseUrl: _devBase,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    // Secure connection using SSL Pinning
    _dio.httpClientAdapter = IOHttpClientAdapter(
      createHttpClient: SslPinningService.createSecureHttpClient,
    );

    // Auth and region, matching marketplace/restaurant/doctor. This client had
    // neither: it sent only Content-Type, so every authenticated grocery call —
    // placing an order, the wishlist, submitting a review, order history — went
    // out anonymous. Those routes are now behind JwtAuthGuard on the gateway and
    // would reject it, and the region header is what scopes results to the
    // customer's market rather than the egress IP.
    _dio.interceptors.add(_AuthInterceptor());
    _dio.interceptors.add(_RegionInterceptor());
    _dio.interceptors.add(LogInterceptor(requestBody: false, responseBody: false));
  }

  // ── Mock Data ─────────────────────────────────────────────────────────────

  final List<GroceryStoreModel> _mockStores = [
    GroceryStoreModel(id: 'store-1', name: 'FreshMart Supermarket', rating: 4.8, deliveryTime: '15-20 min', distance: '1.2 km', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=400', tags: ['Vegetables', 'Fruits', 'Dairy'], isPromoted: true),
    GroceryStoreModel(id: 'store-2', name: 'KARTSEEK Daily Essentials', rating: 4.9, deliveryTime: '10-15 min', distance: '0.8 km', imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=400', tags: ['Snacks', 'Beverages', 'Instant Food']),
    GroceryStoreModel(id: 'store-3', name: 'QuickMart Express', rating: 4.7, deliveryTime: '8-12 min', distance: '0.5 km', imageUrl: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?q=80&w=400', tags: ['Quick', 'Essentials', 'Dairy']),
  ];

  /// Canonical global categories — mirrors apps/web/src/lib/grocery-categories.ts
  /// and the API backend CANONICAL_CATEGORIES constant.
  /// Updated when admin saves via GET /grocery/categories API in production.
  static const List<Map<String, dynamic>> _mockGlobalCategories = [
    {'id': 'fruits-vegetables', 'name': 'Fruits & Vegetables', 'emoji': '🥬', 'gradient': 'from-green-600 to-emerald-500', 'description': 'Farm-fresh produce daily', 'productCount': 240, 'imageUrl': null, 'subcategoryCount': 2},
    {'id': 'fresh-meat', 'name': 'Fresh Meat', 'emoji': '🥩', 'gradient': 'from-red-600 to-rose-500', 'description': 'Premium, hygienically processed', 'productCount': 120, 'imageUrl': null, 'subcategoryCount': 3},
    {'id': 'fresh-fish', 'name': 'Fresh Fish', 'emoji': '🐟', 'gradient': 'from-blue-600 to-cyan-500', 'description': 'Coastal catch, on ice', 'productCount': 85, 'imageUrl': null, 'subcategoryCount': 1},
    {'id': 'dairy-bread-eggs', 'name': 'Dairy, Bread & Eggs', 'emoji': '🥛', 'gradient': 'from-yellow-500 to-amber-400', 'description': 'Farm-fresh dairy and bakery', 'productCount': 180, 'imageUrl': null, 'subcategoryCount': 6},
    {'id': 'rice-flour-pulses', 'name': 'Rice, Flour & Pulses', 'emoji': '🌾', 'gradient': 'from-amber-600 to-orange-500', 'description': 'Staples for every kitchen', 'productCount': 150, 'imageUrl': null, 'subcategoryCount': 3},
    {'id': 'cooking-oil-ghee', 'name': 'Cooking Oil & Ghee', 'emoji': '🫒', 'gradient': 'from-lime-600 to-green-500', 'description': 'Pure oils and premium ghee', 'productCount': 65, 'imageUrl': null, 'subcategoryCount': 2},
    {'id': 'masala-spices', 'name': 'Masala & Spices', 'emoji': '🌶️', 'gradient': 'from-orange-600 to-red-500', 'description': 'Authentic flavors', 'productCount': 110, 'imageUrl': null, 'subcategoryCount': 2},
    {'id': 'snacks-packaged', 'name': 'Snacks & Packaged Food', 'emoji': '🍪', 'gradient': 'from-purple-600 to-violet-500', 'description': 'Munchies and namkeen', 'productCount': 320, 'imageUrl': null, 'subcategoryCount': 5},
    {'id': 'beverages', 'name': 'Beverages', 'emoji': '☕', 'gradient': 'from-amber-600 to-orange-500', 'description': 'Tea, coffee, juices', 'productCount': 190, 'imageUrl': null, 'subcategoryCount': 6},
    {'id': 'frozen-food', 'name': 'Frozen Food', 'emoji': '🧊', 'gradient': 'from-cyan-600 to-sky-500', 'description': 'Ready-to-cook and ice cream', 'productCount': 95, 'imageUrl': null, 'subcategoryCount': 5},
    {'id': 'bakery', 'name': 'Bakery', 'emoji': '🥐', 'gradient': 'from-orange-500 to-amber-400', 'description': 'Fresh bread and pastries', 'productCount': 75, 'imageUrl': null, 'subcategoryCount': 3},
    {'id': 'breakfast', 'name': 'Breakfast Items', 'emoji': '🥣', 'gradient': 'from-yellow-500 to-orange-400', 'description': 'Cereals, oats, muesli', 'productCount': 80, 'imageUrl': null, 'subcategoryCount': 3},
    {'id': 'household-cleaning', 'name': 'Household Cleaning', 'emoji': '🧹', 'gradient': 'from-teal-600 to-emerald-500', 'description': 'Detergents and cleaners', 'productCount': 140, 'imageUrl': null, 'subcategoryCount': 6},
    {'id': 'personal-care', 'name': 'Personal Care', 'emoji': '🧴', 'gradient': 'from-pink-500 to-rose-400', 'description': 'Skincare and grooming', 'productCount': 210, 'imageUrl': null, 'subcategoryCount': 6},
    {'id': 'baby-care', 'name': 'Baby Care', 'emoji': '👶', 'gradient': 'from-pink-500 to-rose-400', 'description': 'Diapers and baby essentials', 'productCount': 90, 'imageUrl': null, 'subcategoryCount': 4},
    {'id': 'pet-care', 'name': 'Pet Care', 'emoji': '🐾', 'gradient': 'from-amber-500 to-yellow-400', 'description': 'Food and accessories', 'productCount': 60, 'imageUrl': null, 'subcategoryCount': 4},
    {'id': 'organic', 'name': 'Organic Products', 'emoji': '🌱', 'gradient': 'from-emerald-600 to-green-500', 'description': 'Certified organic', 'productCount': 110, 'imageUrl': null, 'subcategoryCount': 3},
    {'id': 'dry-fruits-nuts', 'name': 'Dry Fruits & Nuts', 'emoji': '🥜', 'gradient': 'from-amber-700 to-orange-500', 'description': 'Almonds, cashews and more', 'productCount': 80, 'imageUrl': null, 'subcategoryCount': 4},
    {'id': 'chocolates-sweets', 'name': 'Chocolates & Sweets', 'emoji': '🍫', 'gradient': 'from-yellow-800 to-amber-600', 'description': 'Chocolates and mithai', 'productCount': 120, 'imageUrl': null, 'subcategoryCount': 3},
    {'id': 'health-wellness', 'name': 'Health & Wellness', 'emoji': '💊', 'gradient': 'from-teal-600 to-cyan-500', 'description': 'Vitamins and supplements', 'productCount': 85, 'imageUrl': null, 'subcategoryCount': 4},
    {'id': 'ready-to-cook', 'name': 'Ready-to-Cook', 'emoji': '🍳', 'gradient': 'from-orange-600 to-amber-500', 'description': 'Marinated and pre-cut', 'productCount': 65, 'imageUrl': null, 'subcategoryCount': 3},
    {'id': 'international-foods', 'name': 'International Foods', 'emoji': '🌍', 'gradient': 'from-indigo-600 to-violet-500', 'description': 'Thai, Korean, Italian & more', 'productCount': 70, 'imageUrl': null, 'subcategoryCount': 3},
    {'id': 'tea-coffee-health', 'name': 'Tea, Coffee & Health Drinks', 'emoji': '🍵', 'gradient': 'from-green-800 to-emerald-600', 'description': 'Artisan teas and coffees', 'productCount': 90, 'imageUrl': null, 'subcategoryCount': 3},
  ];

  final List<GroceryProductModel> _mockProducts = [
    GroceryProductModel(id: 'prod-1', name: 'Farm Fresh Tomatoes', price: 45, mrp: 60, unit: '1 kg', imageUrl: ''),
    GroceryProductModel(id: 'prod-2', name: 'Whole Wheat Bread', price: 40, unit: '1 pack', imageUrl: ''),
  ];

  // ── Global Categories (admin-configured, not store-scoped) ────────────────

  /// Fetches all active grocery categories from GET /grocery/categories.
  /// These are admin-configured and drive the home screen quick-category grid.
  Future<List<GroceryCategoryModel>> getGlobalCategories() async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 250));
      return _mockGlobalCategories
          .map(GroceryCategoryModel.fromJson)
          .toList();
    }
    final res = await _dio.get('/grocery/categories');
    final list = res.data['categories'] as List;
    return list.map((j) => GroceryCategoryModel.fromJson(j as Map<String, dynamic>)).toList();
  }

  // ── Stores ─────────────────────────────────────────────────────────────

  Future<List<GroceryStoreModel>> getStores({double? lat, double? lng}) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockStores;
    }
    final res = await _dio.get('/grocery/stores', queryParameters: {
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
    });
    return (res.data['data'] as List).map((j) => GroceryStoreModel.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<GroceryStoreModel> getStoreById(String id) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return _mockStores.firstWhere((s) => s.id == id, orElse: () => _mockStores.first);
    }
    final res = await _dio.get('/grocery/stores/$id');
    return GroceryStoreModel.fromJson(res.data as Map<String, dynamic>);
  }

  // ── Store-scoped Categories & Products ────────────────────────────────────

  Future<List<GroceryCategoryModel>> getCategories(String storeId) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      // Return a subset for store-specific view
      return _mockGlobalCategories
          .take(8)
          .map(GroceryCategoryModel.fromJson)
          .toList();
    }
    final res = await _dio.get('/grocery/stores/$storeId/categories');
    final list = res.data['categories'] as List;
    return list.map((j) => GroceryCategoryModel.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<List<GroceryProductModel>> getProducts(String storeId, {String? categoryId}) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockProducts;
    }
    final res = await _dio.get('/grocery/stores/$storeId/products', queryParameters: {
      if (categoryId != null) 'category': categoryId,
    });
    return (res.data['data'] as List).map((j) => GroceryProductModel.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<List<GroceryProductModel>> searchProducts(String query) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return _mockProducts;
    }
    final res = await _dio.get('/grocery/search', queryParameters: {'q': query});
    return (res.data['results'] as List).map((j) => GroceryProductModel.fromJson(j as Map<String, dynamic>)).toList();
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  /// Place a new grocery order.
  Future<Map<String, dynamic>> createOrder({
    required String customerId,
    required String storeId,
    required List<Map<String, dynamic>> items,
    required Map<String, dynamic> deliveryAddress,
    required String paymentMethod,
    String? scheduledAt,
  }) async {
    final body = {
      'customerId': customerId,
      'storeId': storeId,
      'items': items,
      'deliveryAddress': deliveryAddress,
      'paymentMethod': paymentMethod,
      if (scheduledAt != null) 'scheduledAt': scheduledAt,
    };
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 500));
      return {'success': true, 'order': {'id': 'mock-order-1', 'orderNumber': 'GRO-1001', 'status': 'PLACED'}};
    }
    final res = await _dio.post('/grocery/orders', data: body);
    return res.data as Map<String, dynamic>;
  }

  /// Get a single order by ID.
  Future<Map<String, dynamic>> getOrderById(String orderId) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return {'id': orderId, 'orderNumber': 'GRO-1001', 'status': 'PLACED', 'items': [], 'grandTotal': 0};
    }
    final res = await _dio.get('/grocery/orders/$orderId');
    return res.data as Map<String, dynamic>;
  }

  /// Get order history for a customer.
  Future<List<Map<String, dynamic>>> getOrderHistory(String customerId, {int page = 1, int limit = 20}) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return [];
    }
    // No catch returning `[]`. An empty history and a failed request are
    // different answers and only one of them means "you have never ordered" —
    // swallowing the error told a customer with orders that they had none, and
    // hid the 403 the gateway raises when the token does not match customerId.
    final res = await _dio.get('/grocery/orders/customer/$customerId',
        queryParameters: {'page': page, 'limit': limit});
    return (res.data['data'] as List).map((j) => j as Map<String, dynamic>).toList();
  }

  /// Update the status of an order (used by seller for accept/reject/pack).
  Future<Map<String, dynamic>> updateOrderStatus(String orderId, String status, {String? reason}) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return {'success': true, 'order': {'id': orderId, 'status': status}};
    }
    final res = await _dio.patch('/grocery/orders/$orderId/status', data: {
      'status': status,
      if (reason != null) 'reason': reason,
    });
    return res.data as Map<String, dynamic>;
  }

  /// Track an active delivery order (polls for status + driver location).
  Future<Map<String, dynamic>> trackOrder(String orderId) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return {'orderId': orderId, 'status': 'OUT_FOR_DELIVERY', 'driverLat': -1.2930, 'driverLng': 36.7857, 'estimatedMinutes': 12};
    }
    try {
      final res = await _dio.get('/grocery/orders/$orderId');
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return {'orderId': orderId, 'status': 'UNKNOWN', 'error': e.toString()};
    }
  }

  // ── Flash Deals ─────────────────────────────────────────────────────────

  /// Get active flash deals for a specific store.
  Future<Map<String, dynamic>> getStoreFlashDeals(String storeId) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return {'storeId': storeId, 'deals': [], 'total': 0};
    }
    final res = await _dio.get('/grocery/flash-deals/store/$storeId');
    return res.data as Map<String, dynamic>;
  }

  /// List all flash deals (admin/seller filtered).
  Future<Map<String, dynamic>> getFlashDeals({String? storeId, String? status, int page = 1, int limit = 20}) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return {'data': [], 'total': 0, 'page': page, 'limit': limit};
    }
    final res = await _dio.get('/grocery/flash-deals', queryParameters: {
      if (storeId != null) 'storeId': storeId,
      if (status != null) 'status': status,
      'page': page, 'limit': limit,
    });
    return res.data as Map<String, dynamic>;
  }

  // ── Reviews ──────────────────────────────────────────────────────────────

  /// Submit a review for a product.
  Future<Map<String, dynamic>> submitReview(String storeId, String productId, {required String customerId, String? customerName, required int rating, String? comment}) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return {'success': true, 'review': {'id': 'mock-review', 'rating': rating}};
    }
    final res = await _dio.post('/grocery/stores/$storeId/products/$productId/reviews', data: {
      'customerId': customerId,
      if (customerName != null) 'customerName': customerName,
      'rating': rating,
      if (comment != null) 'comment': comment,
    });
    return res.data as Map<String, dynamic>;
  }

  /// Get reviews for a product.
  Future<Map<String, dynamic>> getProductReviews(String storeId, String productId, {int page = 1, int limit = 20}) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return {'data': [], 'total': 0, 'page': page, 'limit': limit};
    }
    final res = await _dio.get('/grocery/stores/$storeId/products/$productId/reviews', queryParameters: {'page': page, 'limit': limit});
    return res.data as Map<String, dynamic>;
  }

  // ── Wishlist ─────────────────────────────────────────────────────────────

  /// Add a product to wishlist.
  Future<Map<String, dynamic>> addToWishlist({required String customerId, required String productId, required String storeId}) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return {'success': true, 'wishlistItem': {'id': 'mock-wl', 'productId': productId}};
    }
    final res = await _dio.post('/grocery/wishlist', data: {
      'customerId': customerId, 'productId': productId, 'storeId': storeId,
    });
    return res.data as Map<String, dynamic>;
  }

  /// Remove a product from wishlist.
  Future<Map<String, dynamic>> removeFromWishlist(String customerId, String productId) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return {'success': true, 'deleted': true};
    }
    final res = await _dio.delete('/grocery/wishlist/$customerId/$productId');
    return res.data as Map<String, dynamic>;
  }

  /// Get customer's wishlist.
  Future<Map<String, dynamic>> getWishlist(String customerId, {int page = 1, int limit = 30}) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return {'data': [], 'total': 0, 'page': page, 'limit': limit};
    }
    final res = await _dio.get('/grocery/wishlist/$customerId', queryParameters: {'page': page, 'limit': limit});
    return res.data as Map<String, dynamic>;
  }

  // ── Reorder ──────────────────────────────────────────────────────────────

  /// Clone items from a past order into a new cart-ready payload.
  Future<Map<String, dynamic>> reorderFromHistory(String orderId, String customerId) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return {'success': true, 'items': [], 'itemCount': 0, 'message': 'Mock reorder'};
    }
    final res = await _dio.post('/grocery/orders/$orderId/reorder', data: {'customerId': customerId});
    return res.data as Map<String, dynamic>;
  }
}

// ── Dio Interceptors ──────────────────────────────────────────────────────────

/// Injects the JWT Bearer token from SecureApiClient into every request.
/// Mirrors the interceptor in marketplace_api_service.dart.
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

/// Injects X-Region-Code so the gateway scopes results to the customer's market
/// rather than falling back to geolocating the egress IP.
class _RegionInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final region = RegionService.instance.currentCountry;
    options.headers['X-Region-Code'] = region.code;
    options.headers['X-Currency'] = region.currencyCode;
    handler.next(options);
  }
}
