// lib/core/services/order_socket_service.dart
import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'package:kartseek_shared_mobile/core/services/socket_service.dart';

/// All possible states for an order lifecycle.
enum OrderStatus {
  pending,
  confirmed,
  preparing,
  ready,
  assigned,
  pickedUp,
  outForDelivery,
  delivered,
  cancelled,
  refunded,
}

extension OrderStatusExt on String {
  OrderStatus toOrderStatus() {
    switch (this) {
      case 'confirmed': return OrderStatus.confirmed;
      case 'preparing': return OrderStatus.preparing;
      case 'ready': return OrderStatus.ready;
      case 'assigned': return OrderStatus.assigned;
      case 'picked_up': return OrderStatus.pickedUp;
      case 'out_for_delivery': return OrderStatus.outForDelivery;
      case 'delivered': return OrderStatus.delivered;
      case 'cancelled': return OrderStatus.cancelled;
      case 'refunded': return OrderStatus.refunded;
      default: return OrderStatus.pending;
    }
  }

  String toStatusLabel() {
    switch (toOrderStatus()) {
      case OrderStatus.pending: return 'Pending';
      case OrderStatus.confirmed: return 'Confirmed';
      case OrderStatus.preparing: return 'Being Prepared';
      case OrderStatus.ready: return 'Ready for Pickup';
      case OrderStatus.assigned: return 'Delivery Assigned';
      case OrderStatus.pickedUp: return 'Picked Up';
      case OrderStatus.outForDelivery: return 'Out for Delivery';
      case OrderStatus.delivered: return 'Delivered';
      case OrderStatus.cancelled: return 'Cancelled';
      case OrderStatus.refunded: return 'Refunded';
    }
  }
}

/// Payload received when an order status changes.
class OrderStatusEvent {
  final String orderId;
  final OrderStatus status;
  final String? message;
  final int? estimatedMinutes;
  final String? partnerId;
  final String? partnerName;
  final DateTime timestamp;

  const OrderStatusEvent({
    required this.orderId,
    required this.status,
    this.message,
    this.estimatedMinutes,
    this.partnerId,
    this.partnerName,
    required this.timestamp,
  });

  factory OrderStatusEvent.fromJson(Map<String, dynamic> json) {
    return OrderStatusEvent(
      orderId: json['orderId'] as String,
      status: (json['status'] as String? ?? 'pending').toOrderStatus(),
      message: json['message'] as String?,
      estimatedMinutes: json['estimatedTime'] as int?,
      partnerId: json['partnerId'] as String?,
      partnerName: json['partnerName'] as String?,
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

/// Live GPS location of a delivery partner.
class DeliveryPartnerLocation {
  final String partnerId;
  final double lat;
  final double lng;
  final double heading;
  final DateTime timestamp;

  const DeliveryPartnerLocation({
    required this.partnerId,
    required this.lat,
    required this.lng,
    required this.heading,
    required this.timestamp,
  });

  factory DeliveryPartnerLocation.fromJson(Map<String, dynamic> json) {
    return DeliveryPartnerLocation(
      partnerId: json['partnerId'] as String? ?? '',
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      heading: (json['heading'] as num?)?.toDouble() ?? 0.0,
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

/// Manages the `/orders` WebSocket namespace.
///
/// Usage:
///  1. `connect(userId, role: 'customer')`
///  2. `trackOrder(orderId)` → listen to [orderStatusStream] & [partnerLocationStream]
///  3. `stopTracking(orderId)` when leaving the screen
class OrderSocketService extends BaseSocketService {
  // Singleton — ensures all consumers share one WebSocket connection.
  static final OrderSocketService _instance = OrderSocketService._internal();
  factory OrderSocketService() => _instance;
  OrderSocketService._internal();

  @override
  String get namespace => '/orders';

  // ── Streams ───────────────────────────────────────────────────────────────

  final _statusController = StreamController<OrderStatusEvent>.broadcast();
  final _locationController = StreamController<DeliveryPartnerLocation>.broadcast();

  /// Emits whenever the tracked order's status changes.
  Stream<OrderStatusEvent> get orderStatusStream => _statusController.stream;

  /// Emits live location updates from the delivery partner.
  Stream<DeliveryPartnerLocation> get partnerLocationStream => _locationController.stream;

  // State: last known status per orderId
  final Map<String, OrderStatusEvent> _lastStatus = {};

  OrderStatusEvent? lastStatusFor(String orderId) => _lastStatus[orderId];

  // ── Room Management ───────────────────────────────────────────────────────

  final Set<String> _trackedOrders = {};

  /// Start tracking an order's status and delivery location.
  void trackOrder(String orderId) {
    if (_trackedOrders.contains(orderId)) return;
    _trackedOrders.add(orderId);
    emit('track_order', {'orderId': orderId});
    debugPrint('[OrderSocket] Tracking order: $orderId');
  }

  /// Stop tracking an order.
  void stopTracking(String orderId) {
    _trackedOrders.remove(orderId);
    emit('stop_tracking', {'orderId': orderId});
  }

  // ── Delivery Partner: Location Push ──────────────────────────────────────

  /// Delivery partner emits their GPS position during an active delivery.
  void updateDeliveryLocation({
    required String orderId,
    required String partnerId,
    required double lat,
    required double lng,
    double heading = 0.0,
  }) {
    emit('delivery_location_update', {
      'orderId': orderId,
      'partnerId': partnerId,
      'lat': lat,
      'lng': lng,
      'heading': heading,
    });
  }

  // ── Event Registration ────────────────────────────────────────────────────

  @override
  void registerHandlers(io.Socket socket) {
    // Order status change event
    socket.on('order_status', (data) {
      try {
        final map = _toMap(data);
        final event = OrderStatusEvent.fromJson(map);
        _lastStatus[event.orderId] = event;
        _statusController.add(event);
      } catch (e) {
        debugPrint('[OrderSocket] order_status parse error: $e');
      }
    });

    // Also handle the legacy tracking gateway event name
    socket.on('order_status_changed', (data) {
      try {
        final map = _toMap(data);
        final event = OrderStatusEvent.fromJson(map);
        _lastStatus[event.orderId] = event;
        _statusController.add(event);
      } catch (e) {
        debugPrint('[OrderSocket] order_status_changed parse error: $e');
      }
    });

    // Delivery partner location
    socket.on('partner_location', (data) {
      try {
        _locationController.add(DeliveryPartnerLocation.fromJson(_toMap(data)));
      } catch (e) {
        debugPrint('[OrderSocket] partner_location parse error: $e');
      }
    });

    // Also handle delivery_location_updated from tracking gateway
    socket.on('delivery_location_updated', (data) {
      try {
        _locationController.add(DeliveryPartnerLocation.fromJson(_toMap(data)));
      } catch (e) {
        debugPrint('[OrderSocket] delivery_location_updated parse error: $e');
      }
    });
  }

  @override
  void onConnected() {
    // Re-subscribe to all tracked orders after reconnection
    for (final orderId in _trackedOrders) {
      emit('track_order', {'orderId': orderId});
    }
  }

  Map<String, dynamic> _toMap(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    if (data is String) return jsonDecode(data) as Map<String, dynamic>;
    throw FormatException('Cannot convert $data to Map');
  }

  @override
  void dispose() {
    _statusController.close();
    _locationController.close();
    super.dispose();
  }
}
