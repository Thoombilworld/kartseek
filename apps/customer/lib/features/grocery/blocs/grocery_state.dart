import 'package:equatable/equatable.dart';

enum GroceryStatus { initial, loading, success, empty, error, ordering, ordered }

class GroceryState extends Equatable {
  final GroceryStatus status;
  final List<Map<String, dynamic>> stores;
  final Map<String, dynamic>? selectedStore;
  final List<Map<String, dynamic>> categories;
  /// Global (admin-configured) categories — drives the home screen quick-category grid.
  final List<Map<String, dynamic>> globalCategories;
  final bool globalCategoriesLoaded;
  final List<Map<String, dynamic>> products;
  final List<Map<String, dynamic>> cartItems;
  final List<Map<String, dynamic>> orders;
  final String? errorMessage;
  /// Active flash deals for the current store context.
  final List<Map<String, dynamic>> flashDeals;
  /// Set of productIds in the customer's wishlist for quick lookup.
  final Set<String> wishlistIds;
  /// Reviews for the currently viewed product.
  final List<Map<String, dynamic>> reviews;

  const GroceryState({
    this.status = GroceryStatus.initial,
    this.stores = const [],
    this.selectedStore,
    this.categories = const [],
    this.globalCategories = const [],
    this.globalCategoriesLoaded = false,
    this.products = const [],
    this.cartItems = const [],
    this.orders = const [],
    this.errorMessage,
    this.flashDeals = const [],
    this.wishlistIds = const {},
    this.reviews = const [],
  });

  int get cartTotal => cartItems.fold<int>(0, (sum, item) {
    final price = (item['price'] as num?)?.toInt() ?? 0;
    final qty = (item['quantity'] as num?)?.toInt() ?? 1;
    return sum + (price * qty);
  });

  int get cartItemCount => cartItems.fold<int>(0, (sum, item) =>
      sum + ((item['quantity'] as num?)?.toInt() ?? 1));

  GroceryState copyWith({
    GroceryStatus? status,
    List<Map<String, dynamic>>? stores,
    Map<String, dynamic>? selectedStore,
    List<Map<String, dynamic>>? categories,
    List<Map<String, dynamic>>? globalCategories,
    bool? globalCategoriesLoaded,
    List<Map<String, dynamic>>? products,
    List<Map<String, dynamic>>? cartItems,
    List<Map<String, dynamic>>? orders,
    String? errorMessage,
    List<Map<String, dynamic>>? flashDeals,
    Set<String>? wishlistIds,
    List<Map<String, dynamic>>? reviews,
  }) => GroceryState(
    status: status ?? this.status,
    stores: stores ?? this.stores,
    selectedStore: selectedStore ?? this.selectedStore,
    categories: categories ?? this.categories,
    globalCategories: globalCategories ?? this.globalCategories,
    globalCategoriesLoaded: globalCategoriesLoaded ?? this.globalCategoriesLoaded,
    products: products ?? this.products,
    cartItems: cartItems ?? this.cartItems,
    orders: orders ?? this.orders,
    errorMessage: errorMessage,
    flashDeals: flashDeals ?? this.flashDeals,
    wishlistIds: wishlistIds ?? this.wishlistIds,
    reviews: reviews ?? this.reviews,
  );

  @override
  List<Object?> get props => [status, stores, selectedStore, categories, globalCategories, globalCategoriesLoaded, products, cartItems, orders, errorMessage, flashDeals, wishlistIds, reviews];
}
