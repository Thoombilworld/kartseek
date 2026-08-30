import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// KARTSEEK — User Behavior Tracking Service
///
/// Tracks user interactions (searches, views, purchases, category browsing)
/// to build a behavioral profile for the recommendation engine.
///
/// All data is persisted locally via SharedPreferences and can be synced
/// to the backend for cross-device recommendations when the API supports it.
class UserBehaviorService extends ChangeNotifier {
  UserBehaviorService._();
  static final UserBehaviorService instance = UserBehaviorService._();

  // ── In-Memory Behavior Store ──────────────────────────────────────────────
  final List<SearchEvent> _searchHistory = [];
  final List<ViewEvent> _viewHistory = [];
  final List<PurchaseEvent> _purchaseHistory = [];
  final Map<String, int> _categoryViews = {};
  final Map<String, int> _brandViews = {};
  final Map<String, int> _categorySearches = {};

  bool _initialized = false;
  static const int _maxHistorySize = 200;
  static const String _prefsKey = 'kartseek_user_behavior';

  // ── Public Getters ────────────────────────────────────────────────────────
  List<SearchEvent> get searchHistory => List.unmodifiable(_searchHistory);
  List<ViewEvent> get viewHistory => List.unmodifiable(_viewHistory);
  List<PurchaseEvent> get purchaseHistory => List.unmodifiable(_purchaseHistory);
  Map<String, int> get categoryViews => Map.unmodifiable(_categoryViews);
  Map<String, int> get brandViews => Map.unmodifiable(_brandViews);

  /// Top N most-viewed categories, sorted by view count descending.
  List<MapEntry<String, int>> get topCategories {
    final sorted = _categoryViews.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(10).toList();
  }

  /// Top N most-viewed brands, sorted descending.
  List<MapEntry<String, int>> get topBrands {
    final sorted = _brandViews.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(10).toList();
  }

  /// Recent search queries (deduplicated, most recent first).
  List<String> get recentSearchQueries {
    final seen = <String>{};
    return _searchHistory.reversed
        .where((e) => seen.add(e.query.toLowerCase()))
        .map((e) => e.query)
        .take(20)
        .toList();
  }

  /// Average price of viewed products (for price-range preference).
  double get averageViewedPrice {
    final prices = _viewHistory.where((v) => v.price > 0).map((v) => v.price).toList();
    if (prices.isEmpty) return 0;
    return prices.reduce((a, b) => a + b) / prices.length;
  }

  /// Price range preference [min, max] based on viewed products.
  (double, double) get priceRangePreference {
    final prices = _viewHistory.where((v) => v.price > 0).map((v) => v.price).toList();
    if (prices.isEmpty) return (0, 100000);
    prices.sort();
    // Use 10th and 90th percentile to exclude outliers
    final lo = prices[(prices.length * 0.1).floor()];
    final hi = prices[(prices.length * 0.9).floor()];
    return (lo * 0.5, hi * 1.5); // Expand range slightly
  }

  // ── Tracking Methods ──────────────────────────────────────────────────────

  /// Track a product search query.
  void trackSearch(String query, {String? module, String? categoryId}) {
    if (query.trim().isEmpty) return;
    _searchHistory.add(SearchEvent(
      query: query.trim(),
      module: module ?? 'all',
      categoryId: categoryId,
      timestamp: DateTime.now(),
    ));
    if (categoryId != null) {
      _categorySearches[categoryId] = (_categorySearches[categoryId] ?? 0) + 1;
    }
    _trimHistory();
    _persistAsync();
    debugPrint('[UserBehavior] 🔍 Search: "$query" (module=$module)');
  }

  /// Track a product view.
  void trackProductView({
    required String productId,
    required String productName,
    required String categoryId,
    required String categoryName,
    String? brandName,
    double price = 0,
  }) {
    _viewHistory.add(ViewEvent(
      productId: productId,
      productName: productName,
      categoryId: categoryId,
      categoryName: categoryName,
      brandName: brandName ?? '',
      price: price,
      timestamp: DateTime.now(),
    ));
    _categoryViews[categoryId] = (_categoryViews[categoryId] ?? 0) + 1;
    if (brandName != null && brandName.isNotEmpty) {
      _brandViews[brandName] = (_brandViews[brandName] ?? 0) + 1;
    }
    _trimHistory();
    _persistAsync();
    debugPrint('[UserBehavior] 👁️ View: "$productName" (cat=$categoryId, brand=$brandName)');
  }

  /// Track a completed purchase.
  void trackPurchase({
    required String orderId,
    required List<String> productIds,
    required List<String> categoryIds,
    required double totalAmount,
  }) {
    _purchaseHistory.add(PurchaseEvent(
      orderId: orderId,
      productIds: productIds,
      categoryIds: categoryIds,
      totalAmount: totalAmount,
      timestamp: DateTime.now(),
    ));
    for (final catId in categoryIds) {
      _categoryViews[catId] = (_categoryViews[catId] ?? 0) + 3; // Purchases weigh 3x
    }
    _trimHistory();
    _persistAsync();
    debugPrint('[UserBehavior] 🛒 Purchase: $orderId (${productIds.length} items, total=$totalAmount)');
  }

  /// Track a category browse action.
  void trackCategoryBrowse(String categoryId, String categoryName) {
    _categoryViews[categoryId] = (_categoryViews[categoryId] ?? 0) + 1;
    _persistAsync();
    debugPrint('[UserBehavior] 📂 Browse category: "$categoryName" ($categoryId)');
  }

  /// Clear all behavior data.
  void clearHistory() {
    _searchHistory.clear();
    _viewHistory.clear();
    _purchaseHistory.clear();
    _categoryViews.clear();
    _brandViews.clear();
    _categorySearches.clear();
    _persistAsync();
    notifyListeners();
    debugPrint('[UserBehavior] 🗑️ All history cleared');
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /// Initialize from SharedPreferences.
  Future<void> initialize() async {
    if (_initialized) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString(_prefsKey);
      if (jsonStr != null) {
        final data = json.decode(jsonStr) as Map<String, dynamic>;
        _loadFromJson(data);
      }
      _initialized = true;
      debugPrint('[UserBehavior] ✅ Loaded ${_viewHistory.length} views, ${_searchHistory.length} searches');
    } catch (e) {
      debugPrint('[UserBehavior] ⚠️ Failed to load behavior data: $e');
      _initialized = true;
    }
  }

  void _persistAsync() {
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString(_prefsKey, json.encode(_toJson()));
    }).catchError((e) {
      debugPrint('[UserBehavior] ⚠️ Persist failed: $e');
    });
  }

  void _trimHistory() {
    if (_searchHistory.length > _maxHistorySize) {
      _searchHistory.removeRange(0, _searchHistory.length - _maxHistorySize);
    }
    if (_viewHistory.length > _maxHistorySize) {
      _viewHistory.removeRange(0, _viewHistory.length - _maxHistorySize);
    }
  }

  Map<String, dynamic> _toJson() => {
    'searches': _searchHistory.map((e) => e.toJson()).toList(),
    'views': _viewHistory.map((e) => e.toJson()).toList(),
    'purchases': _purchaseHistory.map((e) => e.toJson()).toList(),
    'categoryViews': _categoryViews,
    'brandViews': _brandViews,
  };

  void _loadFromJson(Map<String, dynamic> data) {
    if (data['searches'] is List) {
      _searchHistory.addAll((data['searches'] as List).map((e) => SearchEvent.fromJson(e as Map<String, dynamic>)));
    }
    if (data['views'] is List) {
      _viewHistory.addAll((data['views'] as List).map((e) => ViewEvent.fromJson(e as Map<String, dynamic>)));
    }
    if (data['purchases'] is List) {
      _purchaseHistory.addAll((data['purchases'] as List).map((e) => PurchaseEvent.fromJson(e as Map<String, dynamic>)));
    }
    if (data['categoryViews'] is Map) {
      _categoryViews.addAll((data['categoryViews'] as Map).map((k, v) => MapEntry(k.toString(), v as int)));
    }
    if (data['brandViews'] is Map) {
      _brandViews.addAll((data['brandViews'] as Map).map((k, v) => MapEntry(k.toString(), v as int)));
    }
  }
}

// ── Event Models ──────────────────────────────────────────────────────────────

class SearchEvent {
  final String query;
  final String module;
  final String? categoryId;
  final DateTime timestamp;

  const SearchEvent({required this.query, required this.module, this.categoryId, required this.timestamp});

  Map<String, dynamic> toJson() => {'q': query, 'm': module, 'c': categoryId, 't': timestamp.millisecondsSinceEpoch};
  factory SearchEvent.fromJson(Map<String, dynamic> j) => SearchEvent(
    query: j['q'] as String? ?? '', module: j['m'] as String? ?? 'all',
    categoryId: j['c'] as String?, timestamp: DateTime.fromMillisecondsSinceEpoch(j['t'] as int? ?? 0),
  );
}

class ViewEvent {
  final String productId;
  final String productName;
  final String categoryId;
  final String categoryName;
  final String brandName;
  final double price;
  final DateTime timestamp;

  const ViewEvent({
    required this.productId, required this.productName, required this.categoryId,
    required this.categoryName, required this.brandName, required this.price, required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
    'pid': productId, 'pn': productName, 'cid': categoryId, 'cn': categoryName,
    'bn': brandName, 'pr': price, 't': timestamp.millisecondsSinceEpoch,
  };
  factory ViewEvent.fromJson(Map<String, dynamic> j) => ViewEvent(
    productId: j['pid'] as String? ?? '', productName: j['pn'] as String? ?? '',
    categoryId: j['cid'] as String? ?? '', categoryName: j['cn'] as String? ?? '',
    brandName: j['bn'] as String? ?? '', price: (j['pr'] as num?)?.toDouble() ?? 0,
    timestamp: DateTime.fromMillisecondsSinceEpoch(j['t'] as int? ?? 0),
  );
}

class PurchaseEvent {
  final String orderId;
  final List<String> productIds;
  final List<String> categoryIds;
  final double totalAmount;
  final DateTime timestamp;

  const PurchaseEvent({
    required this.orderId, required this.productIds, required this.categoryIds,
    required this.totalAmount, required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
    'oid': orderId, 'pids': productIds, 'cids': categoryIds,
    'amt': totalAmount, 't': timestamp.millisecondsSinceEpoch,
  };
  factory PurchaseEvent.fromJson(Map<String, dynamic> j) => PurchaseEvent(
    orderId: j['oid'] as String? ?? '', productIds: (j['pids'] as List?)?.cast<String>() ?? [],
    categoryIds: (j['cids'] as List?)?.cast<String>() ?? [], totalAmount: (j['amt'] as num?)?.toDouble() ?? 0,
    timestamp: DateTime.fromMillisecondsSinceEpoch(j['t'] as int? ?? 0),
  );
}
