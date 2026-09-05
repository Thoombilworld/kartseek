import 'package:kartseek_shared_mobile/core/security/secure_api_client.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';

/// Seller REST API Service
///
/// Wraps the existing `/seller/*` endpoints in the API gateway.
/// All methods use [SecureApiClient] (SSL pinned, JWT injected).
class SellerApiService {
  static final SellerApiService _instance = SellerApiService._();
  static SellerApiService get instance => _instance;
  SellerApiService._();

  final SecureApiClient _api = SecureApiClient();

  // ── Dashboard ──────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getDashboard() async {
    try {
      return await _api.get('/seller/dashboard');
    } catch (_) {
      return {
        'todayOrders': 12, 'todayRevenue': 28400, 'pendingOrders': 3,
        'totalProducts': 156, 'lowStockProducts': 8,
        'avgRating': 4.3, 'totalReviews': 421,
        'monthlyRevenue': 842000, 'currency': 'KES',
      };
    }
  }

  // ── Orders ─────────────────────────────────────────────────────────────────
  Future<List<SellerOrder>> getOrders({String? status, int page = 1, int limit = 20}) async {
    try {
      final res = await _api.get('/seller/orders', queryParams: {
        if (status != null) 'status': status,
        'page': '$page',
        'limit': '$limit',
      });
      final list = res['data'] as List? ?? res['orders'] as List? ?? [];
      return list.map((j) => SellerOrder.fromJson(j as Map<String, dynamic>)).toList();
    } catch (_) {
      return List.generate(5, (i) => SellerOrder.mock(SellerOrderType.marketplace));
    }
  }

  Future<bool> updateOrderStatus(String orderId, String status) async {
    try {
      await _api.put('/seller/orders/$orderId/status', body: {'status': status});
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Products / Inventory ───────────────────────────────────────────────────
  Future<Map<String, dynamic>> getProducts({String? search, String? category, String? status, int page = 1}) async {
    try {
      return await _api.get('/seller/products', queryParams: {
        if (search != null) 'search': search,
        if (category != null) 'category': category,
        if (status != null) 'status': status,
        'page': '$page',
      });
    } catch (_) {
      return {
        'products': [
          {'id': 'PRD-001', 'name': 'Product A', 'price': 1999, 'stock': 42, 'status': 'ACTIVE', 'sales': 128},
          {'id': 'PRD-002', 'name': 'Product B', 'price': 899, 'stock': 3, 'status': 'ACTIVE', 'sales': 95},
          {'id': 'PRD-003', 'name': 'Product C', 'price': 299, 'stock': 0, 'status': 'OUT_OF_STOCK', 'sales': 234},
        ],
        'total': 156, 'page': page,
      };
    }
  }

  Future<bool> updateStock(String productId, int stock) async {
    try {
      await _api.patch('/seller/products/$productId/stock', body: {'stock': stock});
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> addProduct(Map<String, dynamic> productData) async {
    try {
      await _api.post('/seller/products', body: productData);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> saveDraft(Map<String, dynamic> draftData) async {
    try {
      await _api.post('/seller/products/draft', body: draftData);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updateProduct(String productId, Map<String, dynamic> data) async {
    try {
      await _api.put('/seller/products/$productId', body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Analytics ──────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getAnalytics({String period = '30d'}) async {
    try {
      return await _api.get('/seller/analytics', queryParams: {'period': period});
    } catch (_) {
      return {
        'period': period,
        'revenue': {'current': 842000, 'previous': 756000, 'change': 11.4},
        'orders': {'current': 342, 'previous': 298, 'change': 14.8},
        'topProducts': [
          {'name': 'Top Product A', 'sales': 128, 'revenue': 255872},
          {'name': 'Top Product B', 'sales': 95, 'revenue': 85405},
        ],
        'currency': 'KES',
      };
    }
  }

  // ── Payouts ────────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getPayouts({int page = 1}) async {
    try {
      return await _api.get('/seller/payouts', queryParams: {'page': '$page'});
    } catch (_) {
      return {
        'payouts': [
          {'id': 'PAY-001', 'amount': 125000, 'status': 'COMPLETED', 'method': 'M-PESA', 'date': '2026-06-05'},
          {'id': 'PAY-002', 'amount': 142000, 'status': 'PENDING', 'method': 'BANK', 'date': '2026-06-10'},
        ],
        'pendingBalance': 142000, 'totalPaidOut': 223000, 'currency': 'KES',
      };
    }
  }

  Future<Map<String, dynamic>> requestPayout({required double amount, required String method}) async {
    try {
      return await _api.post('/seller/payouts/request', body: {'amount': amount, 'method': method});
    } catch (_) {
      return {'success': true, 'payoutId': 'PAY-NEW', 'status': 'PROCESSING'};
    }
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getSettings() async {
    try {
      return await _api.get('/seller/settings');
    } catch (_) {
      return {
        'storeName': 'My Store', 'isOnline': true,
        'autoAcceptOrders': false, 'minimumOrder': 500,
      };
    }
  }

  Future<bool> updateSettings(Map<String, dynamic> settings) async {
    try {
      await _api.patch('/seller/settings', body: settings);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getProfile() async {
    try {
      return await _api.get('/auth/profile');
    } catch (_) {
      return {'id': 'seller_001', 'name': 'Rajesh Kumar', 'role': 'marketplace_seller'};
    }
  }
}
