import 'package:equatable/equatable.dart';

/// Status for the Orders module.
enum OrdersStatus { initial, loading, loaded, cancelling, error }

/// State for the Orders module BLoC.
class OrdersState extends Equatable {
  final OrdersStatus status;
  final List<Map<String, dynamic>> orders;
  final Map<String, dynamic>? selectedOrder;
  final String? activeFilter;
  final String? errorMessage;

  const OrdersState({
    this.status = OrdersStatus.initial,
    this.orders = const [],
    this.selectedOrder,
    this.activeFilter,
    this.errorMessage,
  });

  List<Map<String, dynamic>> get activeOrders =>
      orders.where((o) => o['status'] == 'active' || o['status'] == 'preparing' || o['status'] == 'out_for_delivery').toList();

  List<Map<String, dynamic>> get completedOrders =>
      orders.where((o) => o['status'] == 'delivered').toList();

  List<Map<String, dynamic>> get cancelledOrders =>
      orders.where((o) => o['status'] == 'cancelled').toList();

  OrdersState copyWith({
    OrdersStatus? status,
    List<Map<String, dynamic>>? orders,
    Map<String, dynamic>? selectedOrder,
    String? activeFilter,
    String? errorMessage,
  }) {
    return OrdersState(
      status: status ?? this.status,
      orders: orders ?? this.orders,
      selectedOrder: selectedOrder ?? this.selectedOrder,
      activeFilter: activeFilter ?? this.activeFilter,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, orders, selectedOrder, activeFilter, errorMessage];
}
