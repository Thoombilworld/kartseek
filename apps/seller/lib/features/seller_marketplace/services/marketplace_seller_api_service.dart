import 'package:shared_mobile/core/security/secure_api_client.dart';
import 'package:shared_mobile/core/constants.dart';

/// Marketplace-specific Seller API Service
///
/// Covers the 18 marketplace screens beyond the generic seller endpoints.
/// All calls target `/sellers/{sellerId}/...` on the NestJS API Gateway.
/// Every method falls back to mock data on API failure for offline-first UX.
class MarketplaceSellerApiService {
  static final MarketplaceSellerApiService _instance = MarketplaceSellerApiService._();
  static MarketplaceSellerApiService get instance => _instance;
  MarketplaceSellerApiService._();

  final SecureApiClient _api = SecureApiClient();
  final bool _useMock = AppConstants.useMockData;

  String _sellerPath(String sellerId, String path) => '/sellers/$sellerId/$path';

  // ── Storefront ──────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getStorefront(String sellerId) async {
    if (_useMock) return _mockStorefront();
    try {
      return await _api.get(_sellerPath(sellerId, 'storefront'));
    } catch (_) {
      return _mockStorefront();
    }
  }

  Future<bool> updateStorefront(String sellerId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.put(_sellerPath(sellerId, 'storefront'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Returns ─────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getReturns(String sellerId, {String? status, int page = 1}) async {
    if (_useMock) return _mockReturns();
    try {
      return await _api.get(_sellerPath(sellerId, 'returns'), queryParams: {
        if (status != null) 'status': status,
        'page': '$page',
      });
    } catch (_) {
      return _mockReturns();
    }
  }

  Future<bool> approveReturn(String sellerId, String returnId) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'returns/$returnId/accept'));
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> rejectReturn(String sellerId, String returnId, String reason) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'returns/$returnId/reject'), body: {'reason': reason});
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Refunds ─────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getRefunds(String sellerId, {String? status, int page = 1}) async {
    if (_useMock) return _mockRefunds();
    try {
      return await _api.get(_sellerPath(sellerId, 'refunds'), queryParams: {
        if (status != null) 'status': status,
        'page': '$page',
      });
    } catch (_) {
      return _mockRefunds();
    }
  }

  // ── Reviews ─────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getReviews(String sellerId, {String? filter, int page = 1}) async {
    if (_useMock) return _mockReviews();
    try {
      return await _api.get(_sellerPath(sellerId, 'reviews'), queryParams: {
        if (filter != null) 'rating': filter,
        'page': '$page',
      });
    } catch (_) {
      return _mockReviews();
    }
  }

  Future<bool> replyToReview(String sellerId, String reviewId, String reply) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'reviews/$reviewId/reply'), body: {'reply': reply});
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Promotions ──────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getPromotions(String sellerId, {String? status, int page = 1}) async {
    if (_useMock) return _mockPromotions();
    try {
      return await _api.get(_sellerPath(sellerId, 'promotions'), queryParams: {
        if (status != null) 'status': status,
        'page': '$page',
      });
    } catch (_) {
      return _mockPromotions();
    }
  }

  Future<bool> createPromotion(String sellerId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'promotions'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updatePromotion(String sellerId, String promoId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.put(_sellerPath(sellerId, 'promotions/$promoId'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> deletePromotion(String sellerId, String promoId) async {
    if (_useMock) return true;
    try {
      await _api.delete(_sellerPath(sellerId, 'promotions/$promoId'));
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Campaigns ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getCampaigns(String sellerId, {String? status, int page = 1}) async {
    if (_useMock) return _mockCampaigns();
    try {
      return await _api.get(_sellerPath(sellerId, 'campaigns'), queryParams: {
        if (status != null) 'status': status,
        'page': '$page',
      });
    } catch (_) {
      return _mockCampaigns();
    }
  }

  Future<bool> createCampaign(String sellerId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'campaigns'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updateCampaign(String sellerId, String campaignId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.put(_sellerPath(sellerId, 'campaigns/$campaignId'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> pauseCampaign(String sellerId, String campaignId) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'campaigns/$campaignId/pause'));
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> resumeCampaign(String sellerId, String campaignId) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'campaigns/$campaignId/resume'));
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Flash Deals ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getFlashDeals(String sellerId) async {
    if (_useMock) return _mockFlashDeals();
    try {
      return await _api.get(_sellerPath(sellerId, 'flash-deals'));
    } catch (_) {
      return _mockFlashDeals();
    }
  }

  Future<bool> joinFlashDeal(String sellerId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'flash-deals'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Sponsored Products ──────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getSponsoredProducts(String sellerId, {String? status}) async {
    if (_useMock) return _mockSponsored();
    try {
      return await _api.get(_sellerPath(sellerId, 'sponsored'), queryParams: {
        if (status != null) 'status': status,
      });
    } catch (_) {
      return _mockSponsored();
    }
  }

  Future<bool> sponsorProduct(String sellerId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'sponsored'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> pauseSponsored(String sellerId, String sponsoredId) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'sponsored/$sponsoredId/pause'));
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> resumeSponsored(String sellerId, String sponsoredId) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'sponsored/$sponsoredId/resume'));
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Brand Center ────────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getBrands(String sellerId) async {
    if (_useMock) return _mockBrands();
    try {
      final res = await _api.get(_sellerPath(sellerId, 'brands'));
      return List<Map<String, dynamic>>.from(res['data'] ?? []);
    } catch (_) {
      return _mockBrands();
    }
  }

  Future<bool> registerBrand(String sellerId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'brands'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updateBrand(String sellerId, String brandId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.put(_sellerPath(sellerId, 'brands/$brandId'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Transactions ────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getTransactions(String sellerId, {String? type, int page = 1}) async {
    if (_useMock) return _mockTransactions();
    try {
      return await _api.get(_sellerPath(sellerId, 'transactions'), queryParams: {
        if (type != null) 'type': type,
        'page': '$page',
      });
    } catch (_) {
      return _mockTransactions();
    }
  }

  // ── Payouts ─────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getPayouts(String sellerId, {int page = 1}) async {
    if (_useMock) return _mockPayouts();
    try {
      return await _api.get(_sellerPath(sellerId, 'payouts'), queryParams: {'page': '$page'});
    } catch (_) {
      return _mockPayouts();
    }
  }

  Future<Map<String, dynamic>> requestPayout(String sellerId, {required double amount, String? bankAccountId}) async {
    if (_useMock) return {'success': true, 'payoutId': 'PAY-NEW', 'status': 'PROCESSING'};
    try {
      return await _api.post(_sellerPath(sellerId, 'payouts'), body: {
        'amount': amount,
        if (bankAccountId != null) 'bankAccountId': bankAccountId,
      });
    } catch (_) {
      return {'success': false};
    }
  }

  // ── Commissions ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getCommissions(String sellerId, {String? category, int page = 1}) async {
    if (_useMock) return _mockCommissions();
    try {
      return await _api.get(_sellerPath(sellerId, 'commissions'), queryParams: {
        if (category != null) 'category': category,
        'page': '$page',
      });
    } catch (_) {
      return _mockCommissions();
    }
  }

  // ── Wallet ──────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getWallet(String sellerId) async {
    if (_useMock) return _mockWallet();
    try {
      return await _api.get(_sellerPath(sellerId, 'wallet'));
    } catch (_) {
      return _mockWallet();
    }
  }

  Future<Map<String, dynamic>> getWalletTransactions(String sellerId, {String? type, int page = 1}) async {
    if (_useMock) return _mockWalletTransactions();
    try {
      return await _api.get(_sellerPath(sellerId, 'wallet/transactions'), queryParams: {
        if (type != null) 'type': type,
        'page': '$page',
      });
    } catch (_) {
      return _mockWalletTransactions();
    }
  }

  // ── Settings ────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getMarketplaceSettings(String sellerId) async {
    if (_useMock) return _mockSettings();
    try {
      return await _api.get(_sellerPath(sellerId, 'settings'));
    } catch (_) {
      return _mockSettings();
    }
  }

  Future<bool> updateMarketplaceSettings(String sellerId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.put(_sellerPath(sellerId, 'settings'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Staff ───────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getStaff(String sellerId) async {
    if (_useMock) return _mockStaff();
    try {
      return await _api.get(_sellerPath(sellerId, 'staff'));
    } catch (_) {
      return _mockStaff();
    }
  }

  Future<bool> addStaff(String sellerId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.post(_sellerPath(sellerId, 'staff'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updateStaff(String sellerId, String staffId, Map<String, dynamic> data) async {
    if (_useMock) return true;
    try {
      await _api.put(_sellerPath(sellerId, 'staff/$staffId'), body: data);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> removeStaff(String sellerId, String staffId) async {
    if (_useMock) return true;
    try {
      await _api.delete(_sellerPath(sellerId, 'staff/$staffId'));
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Bulk Upload ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> bulkUpload(String sellerId, List<Map<String, dynamic>> products) async {
    if (_useMock) return {'uploaded': products.length, 'errors': 0, 'errorDetails': []};
    try {
      return await _api.post(_sellerPath(sellerId, 'products/bulk'), body: {'products': products});
    } catch (_) {
      return {'uploaded': 0, 'errors': products.length, 'errorDetails': [{'row': 1, 'message': 'API unavailable'}]};
    }
  }

  // ── Low Stock ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getLowStockProducts(String sellerId) async {
    if (_useMock) return _mockLowStock();
    try {
      return await _api.get(_sellerPath(sellerId, 'inventory/low-stock'));
    } catch (_) {
      return _mockLowStock();
    }
  }

  Future<bool> setLowStockThreshold(String sellerId, String productId, int threshold) async {
    if (_useMock) return true;
    try {
      await _api.put(_sellerPath(sellerId, 'inventory/$productId/threshold'), body: {'threshold': threshold});
      return true;
    } catch (_) {
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Mock Data Fallbacks
  // ═══════════════════════════════════════════════════════════════════════════

  Map<String, dynamic> _mockStorefront() => {
    'storeName': 'Gulf Tech & Fashion Emporium',
    'slug': 'gulf-tech-fashion',
    'description': 'Premium electronics & fashion — delivered nationwide',
    'returnPolicy': '7-day easy returns on all products.',
    'shippingPolicy': 'Free shipping on orders above AED 100.',
    'supportEmail': 'support@gulftechfashion.com',
    'theme': {'primaryColor': '#6C3FC8', 'accentColor': '#F59E0B'},
  };

  Map<String, dynamic> _mockReturns() => {
    'data': [
      {'id': 'RET-001', 'orderId': 'KS-2026-10042', 'product': 'iPhone 15 Pro', 'reason': 'Defective screen', 'status': 'pending', 'date': '2026-06-20'},
      {'id': 'RET-002', 'orderId': 'KS-2026-10038', 'product': 'Sony WH-1000XM5', 'reason': 'Wrong colour', 'status': 'approved', 'date': '2026-06-18'},
    ],
    'total': 2,
  };

  Map<String, dynamic> _mockRefunds() => {
    'data': [
      {'id': 'REF-001', 'orderId': 'KS-2026-10038', 'amount': 1299, 'status': 'completed', 'date': '2026-06-19'},
      {'id': 'REF-002', 'orderId': 'KS-2026-10025', 'amount': 499, 'status': 'pending', 'date': '2026-06-22'},
    ],
    'total': 2, 'totalRefunded': 1299, 'pendingRefunds': 499, 'currency': 'QAR',
  };

  Map<String, dynamic> _mockReviews() => {
    'data': [
      {'id': 'REV-001', 'productName': 'iPhone 15 Pro', 'customerName': 'Ahmed K.', 'rating': 5, 'comment': 'Excellent product!', 'reply': null, 'date': '2026-06-21'},
      {'id': 'REV-002', 'productName': 'MacBook Air M3', 'customerName': 'Sara M.', 'rating': 4, 'comment': 'Good but keyboard could be better', 'reply': 'Thank you!', 'date': '2026-06-19'},
      {'id': 'REV-003', 'productName': 'JBL Flip 6', 'customerName': 'Omar F.', 'rating': 2, 'comment': 'Battery life not as advertised', 'reply': null, 'date': '2026-06-18'},
    ],
    'total': 3, 'averageRating': 3.7,
  };

  Map<String, dynamic> _mockPromotions() => {
    'data': [
      {'id': 'PROMO-001', 'name': 'Summer Sale', 'code': 'SUMMER25', 'type': 'percentage', 'value': 25, 'usageCount': 142, 'usageLimit': 500, 'status': 'active', 'startDate': '2026-06-01', 'endDate': '2026-06-30'},
      {'id': 'PROMO-002', 'name': 'New User Welcome', 'code': 'WELCOME10', 'type': 'flat', 'value': 50, 'usageCount': 87, 'usageLimit': 200, 'status': 'active', 'startDate': '2026-01-01', 'endDate': '2026-12-31'},
    ],
    'total': 2,
  };

  Map<String, dynamic> _mockCampaigns() => {
    'data': [
      {'id': 'CAMP-001', 'name': 'Eid Collection Launch', 'type': 'banner', 'status': 'active', 'budget': 5000, 'spent': 2340, 'impressions': 45200, 'clicks': 1820, 'orders': 89, 'startDate': '2026-06-10', 'endDate': '2026-06-30'},
      {'id': 'CAMP-002', 'name': 'Back to School', 'type': 'promotion', 'status': 'scheduled', 'budget': 3000, 'spent': 0, 'impressions': 0, 'clicks': 0, 'orders': 0, 'startDate': '2026-08-15', 'endDate': '2026-09-15'},
    ],
    'total': 2,
  };

  Map<String, dynamic> _mockFlashDeals() => {
    'data': [
      {'id': 'FD-001', 'productName': 'iPhone 15 Pro', 'originalPrice': 4999, 'dealPrice': 3999, 'stock': 50, 'sold': 32, 'status': 'live', 'endsAt': '2026-06-27T23:59:59Z'},
    ],
    'total': 1,
  };

  Map<String, dynamic> _mockSponsored() => {
    'data': [
      {'id': 'SP-001', 'productName': 'MacBook Air M3', 'dailyBudget': 100, 'maxCpc': 2.5, 'spent': 67, 'impressions': 8400, 'clicks': 312, 'orders': 15, 'status': 'active'},
    ],
    'total': 1,
  };

  List<Map<String, dynamic>> _mockBrands() => [
    {
      'id': 'BRD-001', 'name': 'TechVision', 'tagline': 'Premium Electronics', 'status': 'REGISTERED',
      'logo': '🔷', 'category': 'Electronics', 'productCount': 120, 'trademark': 'TM-2024-001',
    },
    {
      'id': 'BRD-002', 'name': 'ElectroPro', 'tagline': 'Power Your Life', 'status': 'PENDING',
      'logo': '⚡', 'category': 'Electronics', 'productCount': 45, 'trademark': 'TM-2024-042',
    },
  ];

  Map<String, dynamic> _mockTransactions() => {
    'data': [
      {'id': 'TXN-001', 'type': 'credit', 'amount': 4999, 'description': 'Order KS-2026-10042 payment', 'status': 'completed', 'date': '2026-06-24'},
      {'id': 'TXN-002', 'type': 'debit', 'amount': 500, 'description': 'Commission deducted', 'status': 'completed', 'date': '2026-06-24'},
      {'id': 'TXN-003', 'type': 'payout', 'amount': 12000, 'description': 'Weekly payout to bank', 'status': 'completed', 'date': '2026-06-22'},
    ],
    'total': 3, 'totalIn': 4999, 'totalOut': 12500, 'currency': 'QAR',
  };

  Map<String, dynamic> _mockPayouts() => {
    'data': [
      {'id': 'PAY-001', 'amount': 12000, 'status': 'completed', 'method': 'Bank Transfer', 'date': '2026-06-22'},
      {'id': 'PAY-002', 'amount': 8500, 'status': 'pending', 'method': 'Bank Transfer', 'date': '2026-06-26'},
    ],
    'pendingBalance': 8500, 'totalPaidOut': 42000, 'currency': 'QAR',
  };

  Map<String, dynamic> _mockCommissions() => {
    'data': [
      {'categoryName': 'Electronics', 'rate': 8.0, 'ordersCount': 245, 'totalCommission': 18400},
      {'categoryName': 'Fashion', 'rate': 12.0, 'ordersCount': 128, 'totalCommission': 9600},
      {'categoryName': 'Home & Living', 'rate': 10.0, 'ordersCount': 67, 'totalCommission': 3200},
    ],
    'effectiveRate': 9.4, 'totalCommission': 31200, 'currency': 'QAR',
  };

  Map<String, dynamic> _mockWallet() => {
    'balance': 24500, 'pendingPayout': 8500, 'completedPayouts': 42000,
    'holdAmount': 1200, 'currency': 'QAR',
  };

  Map<String, dynamic> _mockWalletTransactions() => {
    'data': [
      {'id': 'WT-001', 'type': 'credit', 'amount': 4999, 'description': 'Order payment received', 'status': 'completed', 'date': '2026-06-24'},
      {'id': 'WT-002', 'type': 'debit', 'amount': 500, 'description': 'Platform commission', 'status': 'completed', 'date': '2026-06-24'},
    ],
    'total': 2,
  };

  Map<String, dynamic> _mockSettings() => {
    'autoAcceptOrders': false, 'autoFulfillment': false,
    'fulfillmentMode': 'manual', 'vacationMode': false,
    'notifyNewOrders': true, 'notifyReturns': true,
    'notifyLowStock': true, 'notifyPayouts': true,
  };

  Map<String, dynamic> _mockStaff() => {
    'data': [
      {'id': 'STF-001', 'name': 'Fatima Al-Hassan', 'email': 'fatima@gulftechfashion.com', 'role': 'manager', 'status': 'active', 'lastActive': '2026-06-26T14:30:00Z'},
      {'id': 'STF-002', 'name': 'Khalid Bin Rashid', 'email': 'khalid@gulftechfashion.com', 'role': 'catalog', 'status': 'active', 'lastActive': '2026-06-25T09:15:00Z'},
    ],
    'total': 2,
  };

  Map<String, dynamic> _mockLowStock() => {
    'data': [
      {'id': 'PRD-1002', 'name': 'MacBook Air M3', 'stock': 3, 'threshold': 10, 'severity': 'critical'},
      {'id': 'PRD-1004', 'name': 'Samsung Galaxy S24 Ultra', 'stock': 0, 'threshold': 10, 'severity': 'out_of_stock'},
      {'id': 'PRD-1007', 'name': 'Apple Watch Ultra 2', 'stock': 5, 'threshold': 8, 'severity': 'low'},
    ],
    'total': 3,
  };

  // ── Shipping & Logistics ───────────────────────────────────────────────────

  Future<Map<String, dynamic>> getShippingZones(String sellerId) async {
    if (_useMock) return _mockShippingZones();
    try {
      return await _api.get(_sellerPath(sellerId, 'shipping/zones'));
    } catch (_) {
      return _mockShippingZones();
    }
  }

  Future<bool> updateShippingZone(String sellerId, String zoneId, Map<String, dynamic> payload) async {
    if (_useMock) return true;
    try {
      await _api.put(_sellerPath(sellerId, 'shipping/zones/$zoneId'), body: payload);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> getShippingRates(String sellerId) async {
    if (_useMock) return _mockShippingRates();
    try {
      return await _api.get(_sellerPath(sellerId, 'shipping/rates'));
    } catch (_) {
      return _mockShippingRates();
    }
  }

  Future<Map<String, dynamic>> getShippingCouriers(String sellerId) async {
    if (_useMock) return _mockShippingCouriers();
    try {
      return await _api.get(_sellerPath(sellerId, 'shipping/couriers'));
    } catch (_) {
      return _mockShippingCouriers();
    }
  }

  Future<bool> updateShippingCouriers(String sellerId, Map<String, dynamic> payload) async {
    if (_useMock) return true;
    try {
      await _api.put(_sellerPath(sellerId, 'shipping/couriers'), body: payload);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> getShipmentTracking(String sellerId, {String? status, int page = 1}) async {
    if (_useMock) return _mockShipmentTracking();
    try {
      return await _api.get(_sellerPath(sellerId, 'shipping/tracking'), queryParams: {
        if (status != null) 'status': status,
        'page': '$page',
      });
    } catch (_) {
      return _mockShipmentTracking();
    }
  }

  Future<Map<String, dynamic>> getShippingSettings(String sellerId) async {
    if (_useMock) return _mockShippingSettings();
    try {
      return await _api.get(_sellerPath(sellerId, 'shipping/settings'));
    } catch (_) {
      return _mockShippingSettings();
    }
  }

  Future<bool> updateShippingSettings(String sellerId, Map<String, dynamic> payload) async {
    if (_useMock) return true;
    try {
      await _api.put(_sellerPath(sellerId, 'shipping/settings'), body: payload);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Shipping Mock Data ─────────────────────────────────────────────────────

  Map<String, dynamic> _mockShippingZones() => {
    'data': [
      {'id': 'z1', 'name': 'Metro Cities', 'regions': ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata'], 'baseRate': 49, 'perKgRate': 15, 'freeAbove': 499, 'estDays': '1-2 days', 'isActive': true, 'type': 'express', 'adminBaseRate': 49},
      {'id': 'z2', 'name': 'Tier-1 Cities', 'regions': ['Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'], 'baseRate': 69, 'perKgRate': 20, 'freeAbove': 799, 'estDays': '2-3 days', 'isActive': true, 'type': 'standard', 'adminBaseRate': 69},
      {'id': 'z3', 'name': 'Tier-2 Cities', 'regions': ['Surat', 'Indore', 'Bhopal', 'Coimbatore', 'Nagpur'], 'baseRate': 89, 'perKgRate': 25, 'freeAbove': 999, 'estDays': '3-5 days', 'isActive': true, 'type': 'standard', 'adminBaseRate': 89},
      {'id': 'z4', 'name': 'Rest of India', 'regions': ['North East', 'J&K', 'Himachal', 'Islands', 'Rural Areas'], 'baseRate': 129, 'perKgRate': 35, 'freeAbove': 1499, 'estDays': '5-7 days', 'isActive': true, 'type': 'economy', 'adminBaseRate': 129},
      {'id': 'z5', 'name': 'Same-Day Delivery', 'regions': ['Mumbai (Select)', 'Delhi NCR (Select)', 'Bangalore (Select)'], 'baseRate': 149, 'perKgRate': 40, 'freeAbove': 1999, 'estDays': 'Same Day', 'isActive': false, 'type': 'express', 'adminBaseRate': 149},
    ],
  };

  Map<String, dynamic> _mockShippingRates() => {
    'data': [
      {'id': 'SR-001', 'name': 'Metro Cities — Free Shipping', 'type': 'value', 'zones': ['Metro Cities'], 'freeAbove': 499, 'rates': [{'label': 'Orders below ₹499', 'rate': 40}, {'label': 'Orders ₹499+', 'rate': 0}], 'source': 'admin'},
      {'id': 'SR-002', 'name': 'Tier-1 Weight-Based', 'type': 'weight', 'zones': ['Tier-1 Cities'], 'freeAbove': 799, 'rates': [{'label': 'Up to 500g', 'rate': 49}, {'label': '500g – 1kg', 'rate': 79}, {'label': '1kg – 3kg', 'rate': 99}], 'source': 'admin'},
    ],
  };

  Map<String, dynamic> _mockShippingCouriers() => {
    'data': [
      {'id': 'c1', 'name': 'Delhivery', 'rating': 4.5, 'avgDelivery': '2.4 days', 'rtoRate': '3.2%', 'codSupport': true, 'active': true, 'speciality': 'Pan-India Coverage'},
      {'id': 'c2', 'name': 'BlueDart', 'rating': 4.7, 'avgDelivery': '1.8 days', 'rtoRate': '2.1%', 'codSupport': true, 'active': true, 'speciality': 'Premium Express'},
      {'id': 'c3', 'name': 'DTDC', 'rating': 4.2, 'avgDelivery': '3.1 days', 'rtoRate': '4.5%', 'codSupport': true, 'active': true, 'speciality': 'Cost-Effective'},
      {'id': 'c4', 'name': 'Ecom Express', 'rating': 4.3, 'avgDelivery': '2.6 days', 'rtoRate': '3.8%', 'codSupport': true, 'active': true, 'speciality': 'E-commerce Specialist'},
      {'id': 'c5', 'name': 'Shadowfax', 'rating': 4.1, 'avgDelivery': '1.2 days', 'rtoRate': '1.8%', 'codSupport': false, 'active': false, 'speciality': 'Hyperlocal & Same-Day'},
      {'id': 'c6', 'name': 'India Post', 'rating': 3.8, 'avgDelivery': '5.4 days', 'rtoRate': '6.2%', 'codSupport': true, 'active': false, 'speciality': 'Remote Areas'},
    ],
  };

  Map<String, dynamic> _mockShipmentTracking() => {
    'data': [
      {'id': 't1', 'orderId': 'ORD-10248', 'courier': 'Delhivery', 'trackingId': 'DEL784512369', 'status': 'in_transit', 'buyer': 'Rahul Sharma', 'city': 'Mumbai', 'date': '2026-07-12', 'eta': 'Jul 13'},
      {'id': 't2', 'orderId': 'ORD-10247', 'courier': 'BlueDart', 'trackingId': 'BLU998877665', 'status': 'picked_up', 'buyer': 'Priya Patel', 'city': 'Ahmedabad', 'date': '2026-07-12', 'eta': 'Jul 14'},
      {'id': 't3', 'orderId': 'ORD-10243', 'courier': 'Delhivery', 'trackingId': 'DEL784512370', 'status': 'out_for_delivery', 'buyer': 'Deepika Joshi', 'city': 'Pune', 'date': '2026-07-11', 'eta': 'Jul 12'},
      {'id': 't4', 'orderId': 'ORD-10242', 'courier': 'BlueDart', 'trackingId': 'BFLX9876543', 'status': 'delivered', 'buyer': 'Amit Gupta', 'city': 'Kolkata', 'date': '2026-07-10', 'eta': 'Jul 12'},
      {'id': 't5', 'orderId': 'ORD-10241', 'courier': 'DTDC', 'trackingId': 'DTDC554433221', 'status': 'delivered', 'buyer': 'Meera Iyer', 'city': 'Chennai', 'date': '2026-07-09', 'eta': 'Jul 11'},
      {'id': 't6', 'orderId': 'ORD-10239', 'courier': 'Ecom Express', 'trackingId': 'ECX667788990', 'status': 'rto', 'buyer': 'Sneha Kapoor', 'city': 'Chandigarh', 'date': '2026-07-08', 'eta': null},
    ],
    'total': 6,
  };

  Map<String, dynamic> _mockShippingSettings() => {
    'defaultCourier': 'Delhivery',
    'autoAssign': true,
    'freeShippingThreshold': 499,
    'handlingTime': 24,
    'returnShippingPaid': 'seller',
    'packagingType': 'standard',
    'codEnabled': true,
    'insuranceEnabled': false,
  };


  Future<Map<String, dynamic>> getAvailableDeals(String sellerId) async {
    if (_useMock) return _mockAvailableDeals();
    try {
      return await _api.get(_sellerPath(sellerId, 'flash-deals/available'));
    } catch (_) {
      return _mockAvailableDeals();
    }
  }

  Future<Map<String, dynamic>> nominateProduct(String sellerId, Map<String, dynamic> data) async {
    if (_useMock) return {'success': true, 'id': 'NOM-MOCK-${DateTime.now().millisecondsSinceEpoch}'};
    try {
      return await _api.post(_sellerPath(sellerId, 'flash-deals/nominate'), body: data);
    } catch (_) {
      return {'success': false, 'message': 'Failed to submit nomination'};
    }
  }

  Future<Map<String, dynamic>> getNominations(String sellerId) async {
    if (_useMock) return _mockNominations();
    try {
      return await _api.get(_sellerPath(sellerId, 'flash-deals/nominations'));
    } catch (_) {
      return _mockNominations();
    }
  }

  Future<Map<String, dynamic>> withdrawFromDeal(String sellerId, String dealId) async {
    if (_useMock) return {'success': true};
    try {
      return await _api.patch(_sellerPath(sellerId, 'flash-deals/$dealId/withdraw'), body: {});
    } catch (_) {
      return {'success': false, 'message': 'Failed to withdraw'};
    }
  }



  Map<String, dynamic> _mockAvailableDeals() => {
    'data': [
      {'id': 'FD-003', 'name': 'Electronics Bonanza', 'discount': 'Flat 40%', 'stockLimit': 800, 'start': '2026-07-14 10:00', 'end': '2026-07-14 22:00', 'status': 'scheduled', 'minDiscount': 25},
      {'id': 'FD-006', 'name': 'Sports Gear Rush', 'discount': 'Up to 55%', 'stockLimit': 400, 'start': '2026-07-15 08:00', 'end': '2026-07-15 20:00', 'status': 'scheduled', 'minDiscount': 20},
    ],
    'total': 2,
  };

  Map<String, dynamic> _mockNominations() => {
    'data': [
      {'id': 'NOM-001', 'dealId': 'FD-001', 'productName': 'Samsung Galaxy S24 Ultra', 'proposedDiscount': 25, 'stockAllocated': 50, 'status': 'approved', 'submittedAt': '2026-07-12'},
      {'id': 'NOM-002', 'dealId': 'FD-003', 'productName': 'Sony WH-1000XM5', 'proposedDiscount': 35, 'stockAllocated': 100, 'status': 'pending', 'submittedAt': '2026-07-12'},
    ],
    'total': 2,
  };
}
