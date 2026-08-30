import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:shared_mobile/core/constants.dart';
import 'package:shared_mobile/core/security/ssl_pinning_service.dart';
import 'package:shared_mobile/core/security/secure_api_client.dart';

/// Grocery Seller API Service — Secure client for seller-facing Grocery endpoints.
/// Uses SSL pinning; `useMock` is an opt-in, default-off offline dev mode.
///
/// Provides:
/// - Product CRUD (create, update, delete, bulk import)
/// - Order management (list, status updates)
/// - Store analytics & settings
/// - Promotions & inventory management
class GrocerySellerApiService {
  static String get _devBase => AppConstants.apiBaseUrl;

  late final Dio _dio;
  final bool useMock;

  GrocerySellerApiService({this.useMock = false}) {
    _dio = Dio(BaseOptions(
      baseUrl: _devBase,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.httpClientAdapter = IOHttpClientAdapter(
      createHttpClient: SslPinningService.createSecureHttpClient,
    );

    // This client sent no Authorization header at all. Every route it calls is
    // seller-scoped — product CRUD, bulk import, order status, store settings,
    // analytics — and all of them are now behind JwtAuthGuard plus
    // GroceryStoreOwnershipGuard on the gateway, which resolves the store's
    // owner from `grocery_stores.ownerId`. Without the token the seller cannot
    // prove the store is theirs, and every write is refused.
    _dio.interceptors.add(_AuthInterceptor());
  }

  // ── Orders ────────────────────────────────────────────────────────────

  /// Get orders for the seller's store
  Future<Map<String, dynamic>> getStoreOrders(
    String storeId, {
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    if (useMock) return _mockStoreOrders();
    final response = await _dio.get('/grocery/orders/store/$storeId', queryParameters: {
      if (status != null) 'status': status,
      'page': page,
      'limit': limit,
    });
    return response.data;
  }

  /// Update order status (e.g., CONFIRMED → PACKING → READY_FOR_PICKUP)
  Future<Map<String, dynamic>> updateOrderStatus(
    String orderId,
    String status, {
    String? reason,
  }) async {
    if (useMock) return {'success': true, 'orderId': orderId, 'status': status};
    try {
      final response = await _dio.patch('/grocery/orders/$orderId/status', data: {
        'status': status,
        if (reason != null) 'reason': reason,
      });
      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  // ── Products CRUD ─────────────────────────────────────────────────────

  /// Get products for the seller's store
  Future<Map<String, dynamic>> getProducts(
    String storeId, {
    String? category,
    int page = 1,
    int limit = 30,
  }) async {
    if (useMock) return _mockProducts();
    final response = await _dio.get('/grocery/stores/$storeId/products', queryParameters: {
      if (category != null) 'category': category,
      'page': page,
      'limit': limit,
    });
    return response.data;
  }

  /// Create a new product
  Future<Map<String, dynamic>> createProduct(
    String storeId,
    Map<String, dynamic> productData,
  ) async {
    if (useMock) return {'success': true, 'product': productData};
    try {
      final response = await _dio.post('/grocery/stores/$storeId/products', data: productData);
      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Update an existing product
  Future<Map<String, dynamic>> updateProduct(
    String storeId,
    String productId,
    Map<String, dynamic> productData,
  ) async {
    if (useMock) return {'success': true, 'productId': productId};
    try {
      final response = await _dio.put('/grocery/stores/$storeId/products/$productId', data: productData);
      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Delete a product
  Future<Map<String, dynamic>> deleteProduct(String storeId, String productId) async {
    if (useMock) return {'success': true, 'deletedId': productId};
    try {
      final response = await _dio.delete('/grocery/stores/$storeId/products/$productId');
      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Bulk import products
  Future<Map<String, dynamic>> bulkImportProducts(
    String storeId,
    List<Map<String, dynamic>> products,
  ) async {
    if (useMock) return {'uploaded': products.length, 'errors': 0, 'total': products.length};
    try {
      final response = await _dio.post('/grocery/stores/$storeId/products/bulk', data: {'products': products});
      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  // ── Analytics ─────────────────────────────────────────────────────────

  /// Get store analytics (revenue, orders, ratings)
  Future<Map<String, dynamic>> getStoreAnalytics(
    String storeId, {
    String period = '7d',
  }) async {
    if (useMock) return _mockAnalytics();
    final response = await _dio.get('/grocery/stores/$storeId/analytics', queryParameters: {'period': period});
    return response.data;
  }

  // ── Store Settings ────────────────────────────────────────────────────

  /// Update store settings (hours, delivery radius, etc.)
  Future<Map<String, dynamic>> updateStoreSettings(
    String storeId,
    Map<String, dynamic> settings,
  ) async {
    if (useMock) return {'success': true};
    try {
      final response = await _dio.patch('/grocery/stores/$storeId/settings', data: settings);
      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  // ── Promotions ────────────────────────────────────────────────────────

  /// Get promoted products for the store
  Future<Map<String, dynamic>> getStorePromotions(String storeId) async {
    if (useMock) return {'storeId': storeId, 'promotions': [], 'total': 0};
    try {
      final response = await _dio.get('/grocery/stores/$storeId/promotions');
      return response.data;
    } catch (e) {
      // Reports the failure like every other method here. Returning an empty
      // promotions list told the seller nothing was promoted, which is a
      // legitimate state and therefore indistinguishable from the request failing.
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Toggle product promotion status
  Future<Map<String, dynamic>> toggleProductPromotion(
    String storeId,
    String productId,
    bool promoted,
  ) async {
    if (useMock) return {'success': true, 'productId': productId, 'isPromoted': promoted};
    try {
      final response = await _dio.patch(
        '/grocery/stores/$storeId/products/$productId/promote',
        data: {'promoted': promoted},
      );
      return response.data;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  // ── Inventory / Low Stock ─────────────────────────────────────────────

  /// Get items below stock threshold
  Future<Map<String, dynamic>> getLowStockItems(
    String storeId, {
    int threshold = 10,
  }) async {
    if (useMock) return _mockLowStock();
    final response = await _dio.get('/grocery/stores/$storeId/low-stock', queryParameters: {'threshold': threshold});
    return response.data;
  }

  // ══════════════════════════════════════════════════════════════════════
  // MOCK DATA FALLBACKS
  // ══════════════════════════════════════════════════════════════════════

  Map<String, dynamic> _mockStoreOrders() => {
    'data': [
      {'id': 'ORD-001', 'orderNumber': 'KSG-2024-001', 'status': 'PLACED', 'customerName': 'John Doe', 'grandTotal': 487, 'createdAt': DateTime.now().toIso8601String(), 'items': [
        {'name': 'Fresh Tomatoes', 'weight': '1 kg', 'quantity': 2, 'price': 42},
      ]},
      {'id': 'ORD-002', 'orderNumber': 'KSG-2024-002', 'status': 'CONFIRMED', 'customerName': 'Jane Smith', 'grandTotal': 324, 'createdAt': DateTime.now().toIso8601String(), 'items': [
        {'name': 'Amul Milk', 'weight': '1 litre', 'quantity': 2, 'price': 27},
      ]},
    ],
    'total': 2, 'page': 1,
  };

  Map<String, dynamic> _mockProducts() => {
    'data': [
      {'id': 'GP-001', 'name': 'Fresh Tomatoes', 'brand': 'Fresho', 'category': 'fruits-vegetables', 'isAvailable': true, 'weightVariants': [{'weight': '1 kg', 'price': 42, 'mrp': 55, 'stock': 150}]},
      {'id': 'GP-002', 'name': 'Robusta Bananas', 'brand': 'Fresho', 'category': 'fruits-vegetables', 'isAvailable': true, 'weightVariants': [{'weight': '1 dozen', 'price': 49, 'mrp': 60, 'stock': 200}]},
    ],
    'total': 2, 'page': 1,
  };

  Map<String, dynamic> _mockAnalytics() => {
    'storeId': 'current-store',
    'storeName': 'My Grocery Store',
    'period': '7d',
    'stats': {
      'totalOrders': 156,
      'totalRevenue': 45780,
      'avgOrderValue': 293.5,
      'deliveredOrders': 142,
      'cancelledOrders': 4,
      'fulfillmentRate': 91.0,
      'productCount': 128,
      'rating': 4.6,
      'totalRatings': 89,
    },
    'dailyStats': [
      {'date': '2026-06-22', 'orders': 21, 'revenue': 6150},
      {'date': '2026-06-23', 'orders': 24, 'revenue': 7020},
      {'date': '2026-06-24', 'orders': 19, 'revenue': 5570},
      {'date': '2026-06-25', 'orders': 25, 'revenue': 7325},
      {'date': '2026-06-26', 'orders': 22, 'revenue': 6490},
      {'date': '2026-06-27', 'orders': 28, 'revenue': 8190},
      {'date': '2026-06-28', 'orders': 17, 'revenue': 5035},
    ],
  };

  Map<String, dynamic> _mockLowStock() => {
    'storeId': 'current-store',
    'threshold': 10,
    'items': [
      {'id': 'GP-015', 'name': 'Saffron', 'category': 'masala-spices', 'lowestStock': 3},
      {'id': 'GP-042', 'name': 'Organic Honey', 'category': 'daily-essentials', 'lowestStock': 5},
    ],
    'total': 2,
  };
}

// ── Dio Interceptors ──────────────────────────────────────────────────────────

/// Injects the seller's JWT Bearer token from SecureApiClient into every request.
/// Mirrors the interceptor the marketplace seller service uses.
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
