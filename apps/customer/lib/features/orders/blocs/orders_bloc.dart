import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/orders/blocs/orders_event.dart';
import 'package:kartseek_customer/features/orders/blocs/orders_state.dart';

/// BLoC for the Orders module.
///
/// Manages order history, detail viewing, cancellation, reordering,
/// tracking, and rating.
class OrdersBloc extends Bloc<OrdersEvent, OrdersState> {
  OrdersBloc() : super(const OrdersState()) {
    on<LoadOrders>(_onLoadOrders);
    on<LoadOrderDetail>(_onLoadDetail);
    on<CancelOrder>(_onCancelOrder);
    on<ReorderPreviousOrder>(_onReorder);
    on<TrackOrder>(_onTrackOrder);
    on<RateOrder>(_onRateOrder);
  }

  Future<void> _onLoadOrders(LoadOrders event, Emitter<OrdersState> emit) async {
    emit(state.copyWith(status: OrdersStatus.loading, activeFilter: event.statusFilter));
    await Future.delayed(const Duration(milliseconds: 500));

    List<Map<String, dynamic>> filtered = _mockOrders;
    if (event.statusFilter != null && event.statusFilter != 'all') {
      filtered = _mockOrders.where((o) => o['status'] == event.statusFilter).toList();
    }

    emit(state.copyWith(status: OrdersStatus.loaded, orders: filtered));
  }

  Future<void> _onLoadDetail(LoadOrderDetail event, Emitter<OrdersState> emit) async {
    emit(state.copyWith(status: OrdersStatus.loading));
    await Future.delayed(const Duration(milliseconds: 300));

    final order = _mockOrders.firstWhere(
      (o) => o['id'] == event.orderId,
      orElse: () => _mockOrders.first,
    );

    emit(state.copyWith(status: OrdersStatus.loaded, selectedOrder: order));
  }

  Future<void> _onCancelOrder(CancelOrder event, Emitter<OrdersState> emit) async {
    emit(state.copyWith(status: OrdersStatus.cancelling));
    await Future.delayed(const Duration(seconds: 1));

    final updated = state.orders.map((o) {
      if (o['id'] == event.orderId) {
        return {...o, 'status': 'cancelled', 'cancelReason': event.reason};
      }
      return o;
    }).toList();

    emit(state.copyWith(status: OrdersStatus.loaded, orders: updated));
    debugPrint('[OrdersBloc] 🗑️ Order ${event.orderId} cancelled');
  }

  Future<void> _onReorder(ReorderPreviousOrder event, Emitter<OrdersState> emit) async {
    debugPrint('[OrdersBloc] 🔄 Reorder requested for: ${event.orderId}');
    // In production, this would dispatch AddToCart events for all items
  }

  Future<void> _onTrackOrder(TrackOrder event, Emitter<OrdersState> emit) async {
    debugPrint('[OrdersBloc] 📍 Tracking order: ${event.orderId}');
    // In production, this would connect to OrderSocketService
  }

  Future<void> _onRateOrder(RateOrder event, Emitter<OrdersState> emit) async {
    await Future.delayed(const Duration(milliseconds: 500));

    final updated = state.orders.map((o) {
      if (o['id'] == event.orderId) {
        return {...o, 'rating': event.rating, 'review': event.review};
      }
      return o;
    }).toList();

    emit(state.copyWith(status: OrdersStatus.loaded, orders: updated));
    debugPrint('[OrdersBloc] ⭐ Order ${event.orderId} rated: ${event.rating}/5');
  }

  // ── Mock Data ─────────────────────────────────────────────────────────────

  static const List<Map<String, dynamic>> _mockOrders = [
    {
      'id': 'KS-2026-78432',
      'status': 'delivered',
      'date': '2026-06-01',
      'total': 2499.0,
      'itemCount': 3,
      'module': 'marketplace',
      'items': [
        {'name': 'iPhone 15 Pro Case', 'qty': 1, 'price': 1299.0},
        {'name': 'USB-C Cable', 'qty': 2, 'price': 600.0},
      ],
    },
    {
      'id': 'KS-2026-78433',
      'status': 'out_for_delivery',
      'date': '2026-06-03',
      'total': 899.0,
      'itemCount': 1,
      'module': 'marketplace',
      'estimatedDelivery': '2:30 PM',
      'items': [
        {'name': 'Nike Air Max', 'qty': 1, 'price': 899.0},
      ],
    },
    {
      'id': 'KS-2026-78434',
      'status': 'preparing',
      'date': '2026-06-03',
      'total': 450.0,
      'itemCount': 4,
      'module': 'grocery',
      'items': [
        {'name': 'Organic Milk', 'qty': 2, 'price': 120.0},
        {'name': 'Whole Wheat Bread', 'qty': 1, 'price': 80.0},
        {'name': 'Fresh Vegetables', 'qty': 1, 'price': 250.0},
      ],
    },
    {
      'id': 'KS-2026-78435',
      'status': 'cancelled',
      'date': '2026-05-30',
      'total': 1599.0,
      'itemCount': 1,
      'module': 'marketplace',
      'cancelReason': 'Changed my mind',
      'items': [
        {'name': 'Samsung Galaxy Buds', 'qty': 1, 'price': 1599.0},
      ],
    },
  ];
}
