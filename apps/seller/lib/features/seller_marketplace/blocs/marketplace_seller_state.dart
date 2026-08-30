import 'package:equatable/equatable.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';

enum MarketplaceBlocStatus { initial, loading, loaded, error }

// ─────────────────────────────────────────────────────────────────────────────
// MarketplaceProduct model
// ─────────────────────────────────────────────────────────────────────────────

class MarketplaceProduct {
  final String id;
  final String name;
  final String emoji;
  final String category;
  final double price;
  final int stock;
  final int minStock;
  final double rating;
  final int salesCount;
  final bool isActive;
  final bool isFeatured;
  final String? sku;
  final String? origin;

  const MarketplaceProduct({
    required this.id,
    required this.name,
    required this.emoji,
    required this.category,
    required this.price,
    required this.stock,
    required this.minStock,
    this.rating = 4.5,
    this.salesCount = 0,
    this.isActive = true,
    this.isFeatured = false,
    this.sku,
    this.origin,
  });

  /// Build from a gateway product row.
  ///
  /// Field names differ between the catalogue and seller-listing shapes, so the
  /// common aliases are accepted rather than assuming one. Anything absent falls
  /// back to a neutral value — never to an invented figure.
  factory MarketplaceProduct.fromJson(Map<String, dynamic> json) => MarketplaceProduct(
        id: (json['id'] ?? json['productId'] ?? '').toString(),
        name: (json['name'] ?? json['title'] ?? 'Product').toString(),
        emoji: (json['emoji'] ?? '').toString(),
        category: (json['categoryName'] ?? json['category'] ?? '').toString(),
        price: (json['price'] as num?)?.toDouble() ?? 0,
        stock: (json['stock'] ?? json['stockQuantity'] ?? 0) as int,
        minStock: (json['minStock'] ?? json['lowStockThreshold'] ?? 0) as int,
        rating: (json['averageRating'] as num?)?.toDouble() ?? (json['rating'] as num?)?.toDouble() ?? 0,
        salesCount: (json['salesCount'] ?? json['unitsSold'] ?? 0) as int,
        isActive: json['isActive'] ?? json['is_active'] ?? true,
        isFeatured: json['isFeatured'] ?? false,
        sku: json['sku']?.toString(),
        origin: json['origin']?.toString(),
      );

  bool get isLowStock => stock > 0 && stock <= minStock;
  bool get isOutOfStock => stock == 0;

  MarketplaceProduct copyWith({
    double? price,
    int? stock,
    bool? isActive,
    bool? isFeatured,
  }) => MarketplaceProduct(
    id: id, name: name, emoji: emoji, category: category,
    price: price ?? this.price,
    stock: stock ?? this.stock,
    minStock: minStock,
    rating: rating, salesCount: salesCount,
    isActive: isActive ?? this.isActive,
    isFeatured: isFeatured ?? this.isFeatured,
    sku: sku, origin: origin,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics data model
// ─────────────────────────────────────────────────────────────────────────────

class MarketplaceAnalytics {
  final List<double> weeklyRevenue;     // 7 days
  final List<double> monthlyRevenue;    // 30 days
  final double totalRevenue;
  final double revenueGrowth;           // %
  final int totalOrders;
  final int returnRate;                 // %
  final double avgOrderValue;
  final int newCustomers;
  final int repeatCustomers;
  final List<String> topProductIds;

  const MarketplaceAnalytics({
    required this.weeklyRevenue,
    required this.monthlyRevenue,
    required this.totalRevenue,
    required this.revenueGrowth,
    required this.totalOrders,
    required this.returnRate,
    required this.avgOrderValue,
    required this.newCustomers,
    required this.repeatCustomers,
    required this.topProductIds,
  });

  /// Build from the analytics payload. Missing series come back empty so a chart
  /// renders as "no data" rather than as a fabricated trend line.
  factory MarketplaceAnalytics.fromJson(Map<String, dynamic> json) {
    List<double> series(Object? raw) => raw is List
        ? raw.map((v) => (v as num?)?.toDouble() ?? 0).toList()
        : const <double>[];

    return MarketplaceAnalytics(
      weeklyRevenue: series(json['weeklyRevenue']),
      monthlyRevenue: series(json['monthlyRevenue']),
      totalRevenue: (json['totalRevenue'] as num?)?.toDouble() ?? 0,
      revenueGrowth: (json['revenueGrowth'] as num?)?.toDouble() ?? 0,
      totalOrders: (json['totalOrders'] ?? 0) as int,
      returnRate: (json['returnRate'] ?? 0) as int,
      avgOrderValue: (json['avgOrderValue'] as num?)?.toDouble() ?? 0,
      newCustomers: (json['newCustomers'] ?? 0) as int,
      repeatCustomers: (json['repeatCustomers'] ?? 0) as int,
      topProductIds: (json['topProductIds'] as List?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

class MarketplaceSellerState extends Equatable {
  final MarketplaceBlocStatus status;
  final Map<String, dynamic> dashboardData;
  final List<SellerOrder> orders;
  final String? selectedOrderFilter;
  final List<MarketplaceProduct> products;
  final String selectedCategory;
  final String productSearch;
  final MarketplaceAnalytics? analytics;
  final String analyticsPeriod;
  final String? actionMessage;
  final bool actionSuccess;
  final String? error;
  /// Generic data bucket for new marketplace modules (returns, refunds, etc.)
  final Map<String, dynamic> extraData;

  const MarketplaceSellerState({
    this.status = MarketplaceBlocStatus.initial,
    this.dashboardData = const {},
    this.orders = const [],
    this.selectedOrderFilter,
    this.products = const [],
    this.selectedCategory = 'all',
    this.productSearch = '',
    this.analytics,
    this.analyticsPeriod = '7d',
    this.actionMessage,
    this.actionSuccess = false,
    this.error,
    this.extraData = const {},
  });

  // ── Computed ───────────────────────────────────────────────────────────────

  List<MarketplaceProduct> get lowStockProducts =>
      products.where((p) => p.isLowStock || p.isOutOfStock).toList();

  List<MarketplaceProduct> get filteredProducts {
    var list = selectedCategory == 'all'
        ? products
        : products.where((p) => p.category == selectedCategory).toList();
    if (productSearch.isNotEmpty) {
      list = list.where((p) => p.name.toLowerCase().contains(productSearch.toLowerCase())).toList();
    }
    return list;
  }

  List<SellerOrder> get filteredOrders {
    if (selectedOrderFilter == null || selectedOrderFilter == 'all') return orders;
    final statusMap = {
      'pending':    SellerOrderStatus.pending,
      'confirmed':  SellerOrderStatus.confirmed,
      'preparing':  SellerOrderStatus.preparing,
      'ready':      SellerOrderStatus.ready,
      'shipped':    SellerOrderStatus.outForDelivery,
      'delivered':  SellerOrderStatus.delivered,
    };
    final target = statusMap[selectedOrderFilter];
    if (target == null) return orders;
    return orders.where((o) => o.status == target).toList();
  }

  int get pendingCount => orders.where((o) => o.status == SellerOrderStatus.pending).length;

  List<String> get categories {
    final cats = <String>{'all'};
    for (final p in products) { cats.add(p.category); }
    return cats.toList();
  }

  MarketplaceSellerState copyWith({
    MarketplaceBlocStatus? status,
    Map<String, dynamic>? dashboardData,
    List<SellerOrder>? orders,
    String? selectedOrderFilter,
    List<MarketplaceProduct>? products,
    String? selectedCategory,
    String? productSearch,
    MarketplaceAnalytics? analytics,
    String? analyticsPeriod,
    String? actionMessage,
    bool? actionSuccess,
    String? error,
    Map<String, dynamic>? extraData,
  }) => MarketplaceSellerState(
    status:              status              ?? this.status,
    dashboardData:       dashboardData       ?? this.dashboardData,
    orders:              orders              ?? this.orders,
    selectedOrderFilter: selectedOrderFilter ?? this.selectedOrderFilter,
    products:            products            ?? this.products,
    selectedCategory:    selectedCategory    ?? this.selectedCategory,
    productSearch:       productSearch       ?? this.productSearch,
    analytics:           analytics           ?? this.analytics,
    analyticsPeriod:     analyticsPeriod     ?? this.analyticsPeriod,
    actionMessage:       actionMessage,
    actionSuccess:       actionSuccess       ?? this.actionSuccess,
    error:               error,
    extraData:           extraData           ?? this.extraData,
  );

  @override
  List<Object?> get props => [
    status, dashboardData, orders, selectedOrderFilter,
    products, selectedCategory, productSearch,
    analytics, analyticsPeriod, actionMessage, error, extraData,
  ];
}
