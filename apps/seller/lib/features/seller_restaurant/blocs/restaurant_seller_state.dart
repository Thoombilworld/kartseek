import 'package:equatable/equatable.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Enums & Models
// ─────────────────────────────────────────────────────────────────────────────

enum RestaurantBlocStatus { initial, loading, loaded, error }

enum TableStatus { available, occupied, reserved, cleaning }

enum OrderMode { dineIn, takeaway, delivery }

class RestaurantTable {
  final String id;
  final int number;
  final int seats;
  final TableStatus status;
  final String? currentOrderId;
  final String? guestName;
  final int? guestCount;

  const RestaurantTable({
    required this.id,
    required this.number,
    required this.seats,
    this.status = TableStatus.available,
    this.currentOrderId,
    this.guestName,
    this.guestCount,
  });

  RestaurantTable copyWith({TableStatus? status, String? currentOrderId, String? guestName, int? guestCount}) =>
      RestaurantTable(
        id: id, number: number, seats: seats,
        status: status ?? this.status,
        currentOrderId: currentOrderId ?? this.currentOrderId,
        guestName: guestName ?? this.guestName,
        guestCount: guestCount ?? this.guestCount,
      );

  static RestaurantTable mock(int index) {
    final statuses = [TableStatus.available, TableStatus.occupied, TableStatus.reserved, TableStatus.available, TableStatus.cleaning, TableStatus.available];
    final names    = ['Al Kuwari Family', 'Ahmed & Party', 'Business Lunch', null, null, null];
    final status   = statuses[index % statuses.length];
    return RestaurantTable(
      id:           'TBL-${(index + 1).toString().padLeft(2, '0')}',
      number:       index + 1,
      seats:        index % 4 == 0 ? 8 : index % 3 == 0 ? 6 : 4,
      status:       status,
      currentOrderId: status == TableStatus.occupied ? 'ORD-${1000 + index}' : null,
      guestName:    status == TableStatus.occupied ? names[index % names.length] : null,
      guestCount:   status == TableStatus.occupied ? 2 + (index % 5) : null,
    );
  }

  String get statusLabel {
    switch (status) {
      case TableStatus.available: return 'Available';
      case TableStatus.occupied:  return 'Occupied';
      case TableStatus.reserved:  return 'Reserved';
      case TableStatus.cleaning:  return 'Cleaning';
    }
  }
}

class MenuCategory {
  final String id;
  final String name;
  final String emoji;
  final List<MenuItem> items;

  const MenuCategory({required this.id, required this.name, required this.emoji, required this.items});
}

class MenuItem {
  final String id;
  final String name;
  final String description;
  final double price;
  final String emoji;
  final bool isAvailable;
  final bool isPopular;
  final String category;
  final int prepTimeMinutes;

  const MenuItem({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.emoji,
    this.isAvailable = true,
    this.isPopular = false,
    required this.category,
    this.prepTimeMinutes = 20,
  });

  MenuItem copyWith({bool? isAvailable, double? price}) => MenuItem(
    id: id, name: name, description: description,
    price: price ?? this.price,
    emoji: emoji, isAvailable: isAvailable ?? this.isAvailable,
    isPopular: isPopular, category: category, prepTimeMinutes: prepTimeMinutes,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RestaurantSellerState (extended)
// ─────────────────────────────────────────────────────────────────────────────

class RestaurantSellerState extends Equatable {
  final RestaurantBlocStatus status;
  final List<SellerOrder> dineInOrders;
  final List<SellerOrder> takeawayOrders;
  final List<SellerOrder> deliveryOrders;
  final List<RestaurantTable> tables;
  final List<MenuCategory> menuCategories;
  final List<MenuItem> menuItems;
  final Map<String, dynamic> dashboardData;
  final bool isOpen;
  final String selectedOrderTab; // 'all' | 'dine_in' | 'takeaway' | 'delivery'
  final String? actionMessage;
  final bool? actionSuccess;
  final String? error;

  const RestaurantSellerState({
    this.status = RestaurantBlocStatus.initial,
    this.dineInOrders = const [],
    this.takeawayOrders = const [],
    this.deliveryOrders = const [],
    this.tables = const [],
    this.menuCategories = const [],
    this.menuItems = const [],
    this.dashboardData = const {},
    this.isOpen = true,
    this.selectedOrderTab = 'all',
    this.actionMessage,
    this.actionSuccess,
    this.error,
  });

  // Computed helpers
  List<SellerOrder> get allOrders => [...dineInOrders, ...takeawayOrders, ...deliveryOrders];
  List<SellerOrder> get activeOrders => allOrders.where((o) => o.status.isActive).toList();
  int get pendingCount => allOrders.where((o) => o.status == SellerOrderStatus.pending).length;
  int get occupiedTables => tables.where((t) => t.status == TableStatus.occupied).length;

  RestaurantSellerState copyWith({
    RestaurantBlocStatus? status,
    List<SellerOrder>? dineInOrders,
    List<SellerOrder>? takeawayOrders,
    List<SellerOrder>? deliveryOrders,
    List<RestaurantTable>? tables,
    List<MenuCategory>? menuCategories,
    List<MenuItem>? menuItems,
    Map<String, dynamic>? dashboardData,
    bool? isOpen,
    String? selectedOrderTab,
    String? actionMessage,
    bool? actionSuccess,
    String? error,
  }) => RestaurantSellerState(
    status:           status ?? this.status,
    dineInOrders:     dineInOrders ?? this.dineInOrders,
    takeawayOrders:   takeawayOrders ?? this.takeawayOrders,
    deliveryOrders:   deliveryOrders ?? this.deliveryOrders,
    tables:           tables ?? this.tables,
    menuCategories:   menuCategories ?? this.menuCategories,
    menuItems:        menuItems ?? this.menuItems,
    dashboardData:    dashboardData ?? this.dashboardData,
    isOpen:           isOpen ?? this.isOpen,
    selectedOrderTab: selectedOrderTab ?? this.selectedOrderTab,
    actionMessage:    actionMessage,
    actionSuccess:    actionSuccess,
    error:            error,
  );

  @override
  List<Object?> get props => [
    status, dineInOrders, takeawayOrders, deliveryOrders,
    tables, menuCategories, menuItems, dashboardData,
    isOpen, selectedOrderTab, actionMessage, actionSuccess, error,
  ];
}
