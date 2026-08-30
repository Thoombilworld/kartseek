import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_mobile/core/constants.dart';
import 'package:shared_mobile/core/security/ssl_pinning_service.dart';
import 'package:shared_mobile/core/security/secure_api_client.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_exception.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_mock_data.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Marketplace API Service — Dio-based client for NestJS API Gateway.
/// Dual-mode: falls back to mock data when backend is unavailable.
///
/// Set `useMock = false` in constructor or via environment config to switch to live API.
class MarketplaceApiService {
  // ignore: unused_field
  static const _prodBase = 'https://api.kartseek.com/api';

  static String get _devBase => AppConstants.apiBaseUrl;

  /// Mock delay in ms — set to 0 via env flag for fast dev builds.
  static const _mockDelayMs = bool.fromEnvironment('FAST_MOCK') ? 0 : 300;
  static const _mockDelay = Duration(milliseconds: _mockDelayMs);

  late final Dio _dio;
  final bool useMock;

  /// Tracks API failures for observability. Reset on successful calls.
  int _apiFailureCount = 0;

  // ── Singleton ────────────────────────────────────────────────────────────
  static MarketplaceApiService? _instance;

  /// Returns the shared singleton instance.
  /// Reuses one Dio connection pool, interceptor stack, and TLS session.
  factory MarketplaceApiService({bool? useMock}) {
    return _instance ??= MarketplaceApiService._internal(useMock: useMock);
  }

  /// Named constructor for unit tests — always creates a fresh instance.
  MarketplaceApiService.forTest({bool? useMock})
      : useMock = useMock ?? true {
    _initDio();
  }

  MarketplaceApiService._internal({bool? useMock})
      : useMock = useMock ?? AppConstants.useMockData {
    _initDio();
  }

  void _initDio() {
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
    _dio.interceptors.add(_LocationInterceptor());
    _dio.interceptors.add(_RetryInterceptor(_dio));
    _dio.interceptors
        .add(LogInterceptor(requestBody: false, responseBody: false));
  }

  /// Log a failed call, then let it travel.
  ///
  /// This used to be the last thing that happened before a mock fallback, so the
  /// only trace of an outage was a debug line nobody reads in a release build.
  /// Every caller now throws [MarketplaceApiException] instead, and the screens
  /// render it — this stays for the developer-facing detail (status, URL,
  /// running failure count) that a customer-facing message deliberately omits.
  void _logApiError(Object error, String methodName) {
    _apiFailureCount++;
    if (error is DioException) {
      final statusCode = error.response?.statusCode ?? 'N/A';
      final url = error.requestOptions.uri;
      final msg = error.message ?? error.type.name;
      debugPrint(
        '[MarketplaceAPI] ⚠️ $methodName failed '
        '(status=$statusCode, url=$url, error=$msg, '
        'totalFailures=$_apiFailureCount)',
      );
    } else {
      debugPrint(
        '[MarketplaceAPI] ⚠️ $methodName failed '
        '(error=$error, totalFailures=$_apiFailureCount)',
      );
    }
  }

  // ── Cancel Token Management ───────────────────────────────────────────────
  final Map<String, CancelToken> _cancelTokens = {};

  /// Creates a named [CancelToken]. If a token with the same tag already
  /// exists and is not cancelled, it is cancelled first (prevents stale
  /// in-flight requests).
  CancelToken createCancelToken(String tag) {
    _cancelTokens[tag]?.cancel('Superseded by new request');
    final token = CancelToken();
    _cancelTokens[tag] = token;
    return token;
  }

  /// Cancels all active cancel tokens. Call from screen `dispose()`.
  void cancelAll() {
    for (final token in _cancelTokens.values) {
      if (!token.isCancelled) token.cancel('Screen disposed');
    }
    _cancelTokens.clear();
  }

  /// Cancels a specific request group by tag.
  void cancelByTag(String tag) {
    _cancelTokens[tag]?.cancel('Cancelled by tag: $tag');
    _cancelTokens.remove(tag);
  }

  // ── Marketplace Home ────────────────────────────────────────────────────
  Future<MarketplaceHomeData> getMarketplaceHome() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.homeData;
    }
    try {
      final region = RegionService.instance;
      final country = region.currentCountry.code;
      final lat = region.lastDetection?.lat ?? region.currentCountry.defaultLat;
      final lng = region.lastDetection?.lng ?? region.currentCountry.defaultLng;
      final res = await _dio
          .get('/marketplace/home', queryParameters: {'country': country, 'lat': lat, 'lng': lng});
      return MarketplaceHomeData.fromJson(res.data);
    } catch (e) {
      _logApiError(e, 'getMarketplaceHome');
      throw MarketplaceApiException.from(e, subject: 'the store');
    }
  }

  // ── Products ─────────────────────────────────────────────────────────────
  Future<List<ProductModel>> getProducts({ProductFilter? filter}) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      var products = MarketplaceMockData.allProducts;
      if (filter != null) {
        if (filter.categoryId != null) {
          products =
              products.where((p) => p.categoryId == filter.categoryId).toList();
        }
        if (filter.subcategoryId != null) {
          products = products
              .where((p) => p.subcategoryId == filter.subcategoryId)
              .toList();
        }
        if (filter.brandId != null) {
          products = products
              .where(
                  (p) => p.brand.toLowerCase() == filter.brandId!.toLowerCase())
              .toList();
        }
        if (filter.sellerId != null) {
          products =
              products.where((p) => p.sellerId == filter.sellerId).toList();
        }
        if (filter.query != null && filter.query!.isNotEmpty) {
          products = MarketplaceMockData.searchProducts(filter.query!);
        }
        if (filter.minPrice != null) {
          products =
              products.where((p) => p.price >= filter.minPrice!).toList();
        }
        if (filter.maxPrice != null) {
          products =
              products.where((p) => p.price <= filter.maxPrice!).toList();
        }
        if (filter.minRating != null) {
          products =
              products.where((p) => p.rating >= filter.minRating!).toList();
        }
        if (filter.minDiscount != null) {
          products =
              products.where((p) => p.discount >= filter.minDiscount!).toList();
        }
        if (filter.inStockOnly == true) {
          products = products.where((p) => p.inStock).toList();
        }
        if (filter.freeDeliveryOnly == true) {
          products = products.where((p) => p.freeDelivery).toList();
        }

        // Sort
        switch (filter.sortBy) {
          case 'price_asc':
            products.sort((a, b) => a.price.compareTo(b.price));
            break;
          case 'price_desc':
            products.sort((a, b) => b.price.compareTo(a.price));
            break;
          case 'rating':
            products.sort((a, b) => b.rating.compareTo(a.rating));
            break;
          case 'discount':
            products.sort((a, b) => b.discount.compareTo(a.discount));
            break;
          case 'newest':
            break; // Default order
          default:
            break;
        }

        // Pagination
        final start = (filter.page - 1) * filter.limit;
        final end = start + filter.limit;
        if (start < products.length) {
          products = products.sublist(start, end.clamp(0, products.length));
        }
      }
      return products;
    }
    try {
      final res = await _dio.get('/marketplace/products',
          queryParameters: filter?.toQueryParams() ?? {});
      return (res.data['data'] as List).map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _logApiError(e, 'getProducts');
      throw MarketplaceApiException.from(e, subject: 'these products');
    }
  }

  Future<ProductModel> getProductById(String id) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.getProductById(id);
    }
    final res = await _dio.get('/marketplace/products/$id');
    return ProductModel.fromJson(res.data);
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  Future<List<CategoryModel>> getCategories() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.categories;
    }
    try {
      final res = await _dio.get('/marketplace/categories');
      return (res.data['data'] as List).map((e) => CategoryModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _logApiError(e, 'getCategories');
      throw MarketplaceApiException.from(e, subject: 'categories');
    }
  }

  Future<CategoryModel> getCategoryById(String id) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.getCategoryById(id);
    }
    final res = await _dio.get('/marketplace/categories/$id');
    return CategoryModel.fromJson(res.data);
  }

  Future<SubcategoryModel> getSubcategoryById(String id) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.getSubcategoryById(id);
    }
    final res = await _dio.get('/marketplace/subcategories/$id');
    return SubcategoryModel.fromJson(res.data);
  }

  // ── Brands ─────────────────────────────────────────────────────────────
  Future<BrandModel> getBrandById(String id) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.getBrandById(id);
    }
    final res = await _dio.get('/marketplace/brands/$id');
    return BrandModel.fromJson(res.data);
  }

  Future<List<BrandModel>> getTopBrands() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.brands;
    }
    try {
      final res = await _dio.get('/marketplace/brands/top');
      return (res.data['data'] as List).map((e) => BrandModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _logApiError(e, 'getTopBrands');
      throw MarketplaceApiException.from(e, subject: 'brands');
    }
  }

  // ── Sellers ────────────────────────────────────────────────────────────
  Future<SellerModel> getSellerById(String id) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.getSellerById(id);
    }
    final res = await _dio.get('/marketplace/sellers/$id');
    return SellerModel.fromJson(res.data);
  }

  Future<List<SellerModel>> getVerifiedSellers() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.sellers;
    }
    try {
      final res = await _dio.get('/marketplace/sellers/verified');
      return (res.data['data'] as List).map((e) => SellerModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _logApiError(e, 'getVerifiedSellers');
      throw MarketplaceApiException.from(e, subject: 'sellers');
    }
  }

  // ── Search ─────────────────────────────────────────────────────────────
  Future<List<ProductModel>> searchMarketplace(String query,
      {ProductFilter? filter}) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.searchProducts(query);
    }
    try {
      final params = <String, dynamic>{'q': query};
      if (filter != null) {
        params.addAll(filter.toQueryParams());
      }
      final res =
          await _dio.get('/marketplace/search', queryParameters: params);
      return (res.data['data'] as List).map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _logApiError(e, 'searchMarketplace');
      throw MarketplaceApiException.from(e, subject: 'search results');
    }
  }

  // ── Deals ──────────────────────────────────────────────────────────────
  Future<List<ProductModel>> getDeals() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.allProducts
          .where((p) => p.discount >= 10)
          .toList();
    }
    try {
      final res = await _dio.get('/marketplace/deals');
      return (res.data['data'] as List).map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _logApiError(e, 'getDeals');
      throw MarketplaceApiException.from(e, subject: 'deals');
    }
  }

  Future<List<ProductModel>> getFlashDeals() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.allProducts
          .where((p) => p.discount >= 15)
          .toList();
    }
    try {
      final res = await _dio.get('/marketplace/flash-deals');
      return (res.data['data'] as List).map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _logApiError(e, 'getFlashDeals');
      throw MarketplaceApiException.from(e, subject: 'flash deals');
    }
  }

  Future<List<ProductModel>> getFeaturedProducts() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.allProducts
          .where((p) => p.rating >= 4.5)
          .toList();
    }
    try {
      final res = await _dio.get('/marketplace/featured');
      return (res.data['data'] as List).map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _logApiError(e, 'getFeaturedProducts');
      throw MarketplaceApiException.from(e, subject: 'featured products');
    }
  }

  // ── Cart ──────────────────────────────────────────────────────────────
  Future<List<CartItemModel>> getCart() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.mockCart;
    }
    final res = await _dio.get('/marketplace/cart');
    return (res.data['data'] as List?)?.map((e) => CartItemModel.fromJson(e as Map<String, dynamic>)).toList() ??
        [];
  }

  Future<void> addToCart(String productId,
      {int quantity = 1, String? variantId}) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return;
    }
    await _dio.post('/marketplace/cart', data: {
      'productId': productId,
      'quantity': quantity,
      'variantId': variantId
    });
  }

  Future<void> updateCartItem(String itemId, int quantity) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return;
    }
    await _dio.put('/marketplace/cart/$itemId', data: {'quantity': quantity});
  }

  Future<void> removeFromCart(String itemId) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return;
    }
    await _dio.delete('/marketplace/cart/$itemId');
  }

  // ── Wishlist ──────────────────────────────────────────────────────────
  Future<List<ProductModel>> getWishlist() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return [
        MarketplaceMockData.getProductById('p1'),
        MarketplaceMockData.getProductById('p5'),
        MarketplaceMockData.getProductById('p7')
      ];
    }
    final res = await _dio.get('/marketplace/wishlist');
    return (res.data['data'] as List?)?.map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList() ??
        [];
  }

  Future<void> addToWishlist(String productId) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return;
    }
    await _dio.post('/marketplace/wishlist', data: {'productId': productId});
  }

  Future<void> removeFromWishlist(String productId) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return;
    }
    await _dio.delete('/marketplace/wishlist/$productId');
  }

  // ── Orders ────────────────────────────────────────────────────────────
  Future<List<OrderModel>> getOrders() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.mockOrders;
    }
    try {
      final res = await _dio.get('/marketplace/orders');
      return (res.data['data'] as List?)?.map((e) => OrderModel.fromJson(e as Map<String, dynamic>)).toList() ??
          [];
    } catch (e) {
      _logApiError(e, 'getOrders');
      throw MarketplaceApiException.from(e, subject: 'your orders');
    }
  }

  Future<OrderModel> getOrderById(String id) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.mockOrders.firstWhere((o) => o.id == id,
          orElse: () => MarketplaceMockData.mockOrders.first);
    }
    final res = await _dio.get('/marketplace/orders/$id');
    return OrderModel.fromJson(res.data);
  }

  Future<String> placeOrder(Map<String, dynamic> payload) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return 'KS-2026-${DateTime.now().millisecondsSinceEpoch % 100000}';
    }
    final res = await _dio.post('/marketplace/orders', data: payload);
    return res.data['orderId'];
  }

  Future<void> cancelOrder(String orderId, String reason) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return;
    }
    await _dio
        .post('/marketplace/orders/$orderId/cancel', data: {'reason': reason});
  }


  // ── Reviews ───────────────────────────────────────────────────────────
  Future<List<ProductReview>> getProductReviews(String productId) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.sampleReviews;
    }
    try {
      final res = await _dio.get('/marketplace/products/$productId/reviews');
      return (res.data['data'] as List?)
              ?.map((e) => ProductReview.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [];
    } catch (e) {
      _logApiError(e, 'getProductReviews');
      throw MarketplaceApiException.from(e, subject: 'reviews');
    }
  }

  Future<void> addProductReview(
      String productId, Map<String, dynamic> review) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return;
    }
    await _dio.post('/marketplace/products/$productId/reviews', data: review);
  }

  // ── Support ───────────────────────────────────────────────────────────
  Future<void> createSupportTicket(Map<String, dynamic> payload) async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return;
    }
    await _dio.post('/marketplace/support', data: payload);
  }

  // ── Recently Viewed ───────────────────────────────────────────────────
  Future<List<ProductModel>> getRecentlyViewed() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return MarketplaceMockData.allProducts.take(6).toList();
    }
    try {
      final res = await _dio.get('/marketplace/recently-viewed');
      // The service answers `{ userId, products, data, total }`. Reading only
      // `data` used to throw on a body that carried `products` alone, and the
      // old mock fallback swallowed it — so this screen never once showed real
      // history. Both keys are accepted.
      final rows = (res.data['data'] ?? res.data['products'] ?? const []) as List;
      return rows.map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _logApiError(e, 'getRecentlyViewed');
      throw MarketplaceApiException.from(e, subject: 'recently viewed items');
    }
  }

  /// Forget the browse history. Backed by `DELETE /marketplace/recently-viewed`.
  Future<void> clearRecentlyViewed() async {
    if (useMock) {
      await Future.delayed(_mockDelay);
      return;
    }
    try {
      await _dio.delete('/marketplace/recently-viewed');
    } catch (e) {
      _logApiError(e, 'clearRecentlyViewed');
      throw MarketplaceApiException.from(e, subject: 'your recently viewed items');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ TIER 6 — New Entity APIs
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Returns ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> createReturnRequest(Map<String, dynamic> payload) async {
    final res = await _dio.post('/marketplace/returns', data: payload);
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> getReturnRequests({String? customerId, String? status, int page = 1}) async {
    final res = await _dio.get('/marketplace/returns', queryParameters: {
      if (customerId != null) 'customerId': customerId,
      if (status != null) 'status': status,
      'page': page,
    });
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> getReturnById(String id) async {
    final res = await _dio.get('/marketplace/returns/$id');
    return Map<String, dynamic>.from(res.data);
  }

  // ── Coupons ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getCoupons({bool? isActive, int page = 1}) async {
    final res = await _dio.get('/marketplace/coupons', queryParameters: {
      if (isActive != null) 'isActive': isActive.toString(),
      'page': page,
    });
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> validateCoupon({
    required String code,
    required double cartTotal,
    String? userId,
    String? paymentMethod,
  }) async {
    final res = await _dio.post('/marketplace/coupons/validate', data: {
      'code': code,
      'cartTotal': cartTotal,
      if (userId != null) 'userId': userId,
      if (paymentMethod != null) 'paymentMethod': paymentMethod,
    });
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> redeemCoupon({
    required String code,
    required String orderId,
    required String customerId,
    required double cartTotal,
  }) async {
    final res = await _dio.post('/marketplace/coupons/redeem', data: {
      'code': code,
      'orderId': orderId,
      'customerId': customerId,
      'cartTotal': cartTotal,
    });
    return Map<String, dynamic>.from(res.data);
  }

  // ── Shipment Tracking ───────────────────────────────────────────────────

  Future<Map<String, dynamic>> getTrackingEvents(String orderId) async {
    final res = await _dio.get('/marketplace/tracking/order/$orderId');
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> getTrackingByTrackingId(String trackingId) async {
    final res = await _dio.get('/marketplace/tracking/$trackingId');
    return Map<String, dynamic>.from(res.data);
  }

  // ── Product Variants ────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getVariants(String productId) async {
    final res = await _dio.get('/marketplace/products/$productId/variants');
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> getVariantById(String variantId) async {
    final res = await _dio.get('/marketplace/variants/$variantId');
    return Map<String, dynamic>.from(res.data);
  }

  // ── Product Q&A ─────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getQuestions(String productId, {int page = 1, int limit = 20}) async {
    final res = await _dio.get('/marketplace/products/$productId/questions', queryParameters: {
      'page': page,
      'limit': limit,
    });
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> createQuestion({
    required String productId,
    required String questionText,
    String? customerName,
  }) async {
    final res = await _dio.post('/marketplace/products/$productId/questions', data: {
      'questionText': questionText,
      if (customerName != null) 'customerName': customerName,
    });
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> getAnswers(String questionId) async {
    final res = await _dio.get('/marketplace/questions/$questionId/answers');
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> createAnswer({
    required String questionId,
    required String answerText,
    String? authorName,
    String? authorRole,
  }) async {
    final res = await _dio.post('/marketplace/questions/$questionId/answers', data: {
      'answerText': answerText,
      if (authorName != null) 'authorName': authorName,
      if (authorRole != null) 'authorRole': authorRole,
    });
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> upvoteQuestion(String questionId) async {
    final res = await _dio.post('/marketplace/questions/$questionId/upvote');
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> voteAnswerHelpful(String answerId) async {
    final res = await _dio.post('/marketplace/answers/$answerId/helpful');
    return Map<String, dynamic>.from(res.data);
  }

  // ── Delivery Assignments ────────────────────────────────────────────────

  Future<Map<String, dynamic>> getDeliveryAssignments({String? orderId, String? status}) async {
    final res = await _dio.get('/marketplace/delivery-assignments', queryParameters: {
      if (orderId != null) 'orderId': orderId,
      if (status != null) 'status': status,
    });
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> getDeliveryAssignmentById(String id) async {
    final res = await _dio.get('/marketplace/delivery-assignments/$id');
    return Map<String, dynamic>.from(res.data);
  }
}

// ── Dio Interceptors ──────────────────────────────────────────────────────────

/// Injects JWT Bearer token from SecureApiClient into all requests.
class _AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Inject actual JWT from SecureApiClient singleton
    final token = SecureApiClient().authToken;
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    options.headers['X-Client-Platform'] = 'flutter';
    options.headers['X-Client-Version'] = AppConstants.appVersion;
    handler.next(options);
  }
}

/// Injects X-Region-Code header based on detected region.
class _RegionInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final region = RegionService.instance.currentCountry;
    options.headers['X-Region-Code'] = region.code;
    options.headers['X-Currency'] = region.currencyCode;
    handler.next(options);
  }
}

/// Injects GPS coordinates when available for location-based results.
/// Reads cached lat/lng from SharedPreferences (set by address_selection_screen).
class _LocationInterceptor extends Interceptor {
  static double? _cachedLat;
  static double? _cachedLng;
  static bool _loaded = false;

  /// Call this from the address selection screen to update cached location.
  // ignore: unused_element
  static void updateLocation(double lat, double lng) {
    _cachedLat = lat;
    _cachedLng = lng;
    _loaded = true;
    // Persist for next app launch
    SharedPreferences.getInstance().then((prefs) {
      prefs.setDouble('marketplace_lat', lat);
      prefs.setDouble('marketplace_lng', lng);
    });
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Lazy-load cached location from disk on first request
    if (!_loaded) {
      _loaded = true;
      try {
        final prefs = await SharedPreferences.getInstance();
        _cachedLat = prefs.getDouble('marketplace_lat');
        _cachedLng = prefs.getDouble('marketplace_lng');
      } catch (_) {}
    }
    if (_cachedLat != null && _cachedLng != null) {
      options.headers['X-Latitude'] = _cachedLat.toString();
      options.headers['X-Longitude'] = _cachedLng.toString();
    }
    handler.next(options);
  }
}

/// Retry interceptor — retries on 5xx errors and timeouts (max 2 retries).
class _RetryInterceptor extends Interceptor {
  final Dio _dio;
  static const _maxRetries = 2;
  static const _retryDelays = [
    Duration(seconds: 1),
    Duration(seconds: 3),
  ];

  _RetryInterceptor(this._dio);

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final statusCode = err.response?.statusCode;
    final isRetryable = err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        (statusCode != null && statusCode >= 500);

    if (!isRetryable) {
      handler.next(err);
      return;
    }

    // Retrieve or initialize retry count
    final retryCount = (err.requestOptions.extra['_retryCount'] as int?) ?? 0;
    if (retryCount >= _maxRetries) {
      handler.next(err);
      return;
    }

    await Future<void>.delayed(_retryDelays[retryCount]);

    // Clone request with incremented retry count
    final opts = err.requestOptions;
    opts.extra['_retryCount'] = retryCount + 1;
    try {
      final response = await _dio.fetch(opts);
      handler.resolve(response);
    } on DioException catch (e) {
      handler.next(e);
    }
  }
}
