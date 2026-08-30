import 'package:equatable/equatable.dart';

/// Events for the Orders module BLoC.
abstract class OrdersEvent extends Equatable {
  const OrdersEvent();
  @override
  List<Object?> get props => [];
}

/// Load order history.
class LoadOrders extends OrdersEvent {
  final String? statusFilter; // 'all', 'active', 'delivered', 'cancelled'
  const LoadOrders({this.statusFilter});

  @override
  List<Object?> get props => [statusFilter];
}

/// Load a single order's details.
class LoadOrderDetail extends OrdersEvent {
  final String orderId;
  const LoadOrderDetail(this.orderId);

  @override
  List<Object?> get props => [orderId];
}

/// Cancel an order.
class CancelOrder extends OrdersEvent {
  final String orderId;
  final String reason;
  const CancelOrder({required this.orderId, required this.reason});

  @override
  List<Object?> get props => [orderId, reason];
}

/// Reorder a previous order (add all items to cart).
class ReorderPreviousOrder extends OrdersEvent {
  final String orderId;
  const ReorderPreviousOrder(this.orderId);

  @override
  List<Object?> get props => [orderId];
}

/// Track an order's delivery.
class TrackOrder extends OrdersEvent {
  final String orderId;
  const TrackOrder(this.orderId);

  @override
  List<Object?> get props => [orderId];
}

/// Rate/review a completed order.
class RateOrder extends OrdersEvent {
  final String orderId;
  final int rating;
  final String? review;
  const RateOrder({required this.orderId, required this.rating, this.review});

  @override
  List<Object?> get props => [orderId, rating, review];
}
