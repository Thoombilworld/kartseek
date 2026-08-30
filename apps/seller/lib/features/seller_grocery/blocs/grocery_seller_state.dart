import 'package:equatable/equatable.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

enum GroceryBlocStatus { initial, loading, loaded, error }

enum StockLevel { ok, low, outOfStock }

// ─────────────────────────────────────────────────────────────────────────────
// GroceryProduct model
// ─────────────────────────────────────────────────────────────────────────────

class GroceryProduct {
  final String id;
  final String name;
  final String emoji;
  final String category;
  final double price;
  final String unit;        // 'kg', 'L', 'pcs', 'bundle'
  final int stockQty;
  final int minStockQty;
  final bool isAvailable;
  final bool isPopular;
  final String? origin;     // country of origin for the product

  const GroceryProduct({
    required this.id,
    required this.name,
    required this.emoji,
    required this.category,
    required this.price,
    required this.unit,
    required this.stockQty,
    required this.minStockQty,
    this.isAvailable = true,
    this.isPopular = false,
    this.origin,
  });

  StockLevel get stockLevel {
    if (stockQty == 0) return StockLevel.outOfStock;
    if (stockQty <= minStockQty) return StockLevel.low;
    return StockLevel.ok;
  }

  String get stockLabel => '$stockQty $unit';
  String get minLabel => 'Min: $minStockQty $unit';

  GroceryProduct copyWith({bool? isAvailable, double? price, int? stockQty}) =>
      GroceryProduct(
        id: id, name: name, emoji: emoji, category: category,
        price: price ?? this.price, unit: unit,
        stockQty: stockQty ?? this.stockQty,
        minStockQty: minStockQty,
        isAvailable: isAvailable ?? this.isAvailable,
        isPopular: isPopular, origin: origin,
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// GroceryCategory
// ─────────────────────────────────────────────────────────────────────────────

class GroceryCategory {
  final String id;
  final String name;
  final String emoji;
  final List<GroceryProduct> products;

  const GroceryCategory({
    required this.id,
    required this.name,
    required this.emoji,
    required this.products,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GrocerySellerState (extended)
// ─────────────────────────────────────────────────────────────────────────────

class GrocerySellerState extends Equatable {
  final GroceryBlocStatus status;
  final List<SellerOrder> orders;
  final List<GroceryCategory> categories;
  final List<GroceryProduct> allProducts;
  final Map<String, dynamic> dashboardData;
  final bool isOpen;
  final String selectedOrderFilter; // 'all' | 'pending' | 'preparing' | 'ready'
  final String selectedCategoryId;
  final String catalogSearch;
  final String? actionMessage;
  final bool? actionSuccess;
  final String? error;

  const GrocerySellerState({
    this.status = GroceryBlocStatus.initial,
    this.orders = const [],
    this.categories = const [],
    this.allProducts = const [],
    this.dashboardData = const {},
    this.isOpen = true,
    this.selectedOrderFilter = 'all',
    this.selectedCategoryId = 'all',
    this.catalogSearch = '',
    this.actionMessage,
    this.actionSuccess,
    this.error,
  });

  // Computed
  List<GroceryProduct> get lowStockProducts =>
      allProducts.where((p) => p.stockLevel == StockLevel.low || p.stockLevel == StockLevel.outOfStock).toList();

  int get pendingOrderCount => orders.where((o) => o.status == SellerOrderStatus.pending).length;

  List<SellerOrder> get filteredOrders {
    if (selectedOrderFilter == 'all') return orders;
    final statusMap = {
      'pending':   SellerOrderStatus.pending,
      'preparing': SellerOrderStatus.preparing,
      'ready':     SellerOrderStatus.ready,
    };
    final target = statusMap[selectedOrderFilter];
    if (target == null) return orders;
    return orders.where((o) => o.status == target).toList();
  }

  List<GroceryProduct> get filteredProducts {
    var list = selectedCategoryId == 'all'
        ? allProducts
        : allProducts.where((p) => p.category == selectedCategoryId).toList();
    if (catalogSearch.isNotEmpty) {
      list = list.where((p) => p.name.toLowerCase().contains(catalogSearch.toLowerCase())).toList();
    }
    return list;
  }

  GrocerySellerState copyWith({
    GroceryBlocStatus? status,
    List<SellerOrder>? orders,
    List<GroceryCategory>? categories,
    List<GroceryProduct>? allProducts,
    Map<String, dynamic>? dashboardData,
    bool? isOpen,
    String? selectedOrderFilter,
    String? selectedCategoryId,
    String? catalogSearch,
    String? actionMessage,
    bool? actionSuccess,
    String? error,
  }) => GrocerySellerState(
    status:               status               ?? this.status,
    orders:               orders               ?? this.orders,
    categories:           categories           ?? this.categories,
    allProducts:          allProducts          ?? this.allProducts,
    dashboardData:        dashboardData        ?? this.dashboardData,
    isOpen:               isOpen               ?? this.isOpen,
    selectedOrderFilter:  selectedOrderFilter  ?? this.selectedOrderFilter,
    selectedCategoryId:   selectedCategoryId   ?? this.selectedCategoryId,
    catalogSearch:        catalogSearch        ?? this.catalogSearch,
    actionMessage:        actionMessage,
    actionSuccess:        actionSuccess,
    error:                error,
  );

  @override
  List<Object?> get props => [
    status, orders, categories, allProducts, dashboardData,
    isOpen, selectedOrderFilter, selectedCategoryId, catalogSearch,
    actionMessage, actionSuccess, error,
  ];
}
