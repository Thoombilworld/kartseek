import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:shared_mobile/core/services/socket_service.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────────────────────

/// A new order notification pushed to the seller's WebSocket room.
class SellerNewOrderEvent {
  final String orderId;
  final String customerName;
  final int itemCount;
  final double total;
  final SellerOrderType orderType;
  final DateTime timestamp;

  const SellerNewOrderEvent({
    required this.orderId,
    required this.customerName,
    required this.itemCount,
    required this.total,
    required this.orderType,
    required this.timestamp,
  });

  factory SellerNewOrderEvent.fromJson(Map<String, dynamic> json) => SellerNewOrderEvent(
    orderId:      json['orderId'] as String? ?? '',
    customerName: json['customerName'] as String? ?? 'Customer',
    itemCount:    json['items'] as int? ?? 1,
    total:        (json['total'] as num?)?.toDouble() ?? 0.0,
    orderType:    SellerOrderType.fromString(json['type'] as String? ?? 'marketplace'),
    timestamp:    DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
  );
}

/// A low-stock alert for an item in the seller's inventory.
class SellerLowStockAlert {
  final String itemId;
  final String itemName;
  final int currentStock;
  final int threshold;
  final DateTime timestamp;

  const SellerLowStockAlert({
    required this.itemId,
    required this.itemName,
    required this.currentStock,
    required this.threshold,
    required this.timestamp,
  });

  factory SellerLowStockAlert.fromJson(Map<String, dynamic> json) => SellerLowStockAlert(
    itemId:       json['itemId'] as String? ?? '',
    itemName:     json['itemName'] as String? ?? '',
    currentStock: json['currentStock'] as int? ?? 0,
    threshold:    json['threshold'] as int? ?? 5,
    timestamp:    DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
  );
}

/// Generic booking event for Hotel / Doctor / Restaurant table bookings.
class SellerBookingEvent {
  final String bookingId;
  final String customerName;
  final String bookingType; // 'hotel', 'appointment', 'table'
  final DateTime scheduledAt;
  final Map<String, dynamic> details;
  final DateTime timestamp;

  const SellerBookingEvent({
    required this.bookingId,
    required this.customerName,
    required this.bookingType,
    required this.scheduledAt,
    this.details = const {},
    required this.timestamp,
  });

  factory SellerBookingEvent.fromJson(Map<String, dynamic> json) => SellerBookingEvent(
    bookingId:    json['bookingId'] as String? ?? '',
    customerName: json['customerName'] as String? ?? 'Guest',
    bookingType:  json['bookingType'] as String? ?? 'hotel',
    scheduledAt:  DateTime.tryParse(json['scheduledAt'] as String? ?? '') ?? DateTime.now(),
    details:      (json['details'] as Map<String, dynamic>?) ?? {},
    timestamp:    DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SellerOrderSocketService
// ─────────────────────────────────────────────────────────────────────────────

/// Manages the `/orders` WebSocket namespace for sellers.
///
/// On connect the service joins the `seller:<sellerId>` room (handled server-side
/// via the `role='seller'` query param in [BaseSocketService.connect]).
///
/// Provides:
///  - [newOrderStream]     — real-time new order feed
///  - [lowStockStream]     — inventory low-stock alerts
///  - [bookingStream]      — new hotel / appointment / table bookings
///  - [orderStatusStream]  — order lifecycle changes
///
/// Also exposes seller-side emit methods:
///  - [updateOrderStatus]  — seller updates order status (CONFIRMED, PREPARING…)
///  - [dispatchDelivery]   — seller triggers delivery partner assignment
class SellerOrderSocketService extends BaseSocketService {
  // Singleton
  static final SellerOrderSocketService _instance = SellerOrderSocketService._internal();
  factory SellerOrderSocketService() => _instance;
  SellerOrderSocketService._internal();

  @override
  String get namespace => '/orders';

  // ── Streams ─────────────────────────────────────────────────────────────────
  final _newOrderController   = StreamController<SellerNewOrderEvent>.broadcast();
  final _lowStockController   = StreamController<SellerLowStockAlert>.broadcast();
  final _bookingController    = StreamController<SellerBookingEvent>.broadcast();
  final _statusController     = StreamController<Map<String, dynamic>>.broadcast();

  Stream<SellerNewOrderEvent>   get newOrderStream   => _newOrderController.stream;
  Stream<SellerLowStockAlert>   get lowStockStream   => _lowStockController.stream;
  Stream<SellerBookingEvent>    get bookingStream    => _bookingController.stream;
  Stream<Map<String, dynamic>>  get orderStatusStream=> _statusController.stream;

  // ── Event Registration ────────────────────────────────────────────────────
  @override
  void registerHandlers(io.Socket socket) {
    // New incoming order pushed by OrderGateway.notifyNewOrder()
    socket.on('new_order', (data) {
      try {
        final event = SellerNewOrderEvent.fromJson(_toMap(data));
        _newOrderController.add(event);
        debugPrint('[SellerSocket] 🛒 New order: ${event.orderId}');
      } catch (e) {
        debugPrint('[SellerSocket] new_order parse error: $e');
      }
    });

    // Low stock alert from SellerGateway
    socket.on('low_stock_alert', (data) {
      try {
        _lowStockController.add(SellerLowStockAlert.fromJson(_toMap(data)));
      } catch (e) {
        debugPrint('[SellerSocket] low_stock_alert parse error: $e');
      }
    });

    // New booking (hotel / appointment / table)
    socket.on('new_booking', (data) {
      try {
        _bookingController.add(SellerBookingEvent.fromJson(_toMap(data)));
      } catch (e) {
        debugPrint('[SellerSocket] new_booking parse error: $e');
      }
    });
    // Alias used by appointment service
    socket.on('appointment_update', (data) {
      try {
        _bookingController.add(SellerBookingEvent.fromJson(_toMap(data)));
      } catch (e) {
        debugPrint('[SellerSocket] appointment_update parse error: $e');
      }
    });

    // Order status changed (e.g. delivery partner picked up)
    socket.on('order_status', (data) {
      try {
        _statusController.add(_toMap(data));
      } catch (e) {
        debugPrint('[SellerSocket] order_status parse error: $e');
      }
    });
    socket.on('order_status_changed', (data) {
      try {
        _statusController.add(_toMap(data));
      } catch (e) {
        debugPrint('[SellerSocket] order_status_changed parse error: $e');
      }
    });
  }

  @override
  void onConnected() {
    debugPrint('[SellerSocket] ✅ Connected to /orders as seller');
  }

  // ── Seller Emit Methods ───────────────────────────────────────────────────

  /// Seller updates the lifecycle status of an order.
  /// Broadcasts to customer, admin:orders, and the order room.
  void updateOrderStatus(String orderId, SellerOrderStatus status, {String? message, int? estimatedMinutes}) {
    emit('update_order_status', {
      'orderId': orderId,
      'status': status.value,
      if (message != null) 'message': message,
      if (estimatedMinutes != null) 'estimatedTime': estimatedMinutes,
      'role': 'seller',
    });
    debugPrint('[SellerSocket] 📤 Order $orderId → ${status.value}');
  }

  /// Seller requests delivery partner assignment for a ready order.
  /// The backend delivery-service picks up the nearest available partner.
  void dispatchDelivery({
    required String orderId,
    required double pickupLat,
    required double pickupLng,
    String? pickupAddress,
  }) {
    emit('assign_delivery', {
      'orderId': orderId,
      'pickupLat': pickupLat,
      'pickupLng': pickupLng,
      if (pickupAddress != null) 'pickupAddress': pickupAddress,
    });
    debugPrint('[SellerSocket] 🚚 Dispatch requested for $orderId');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  Map<String, dynamic> _toMap(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    if (data is String) return jsonDecode(data) as Map<String, dynamic>;
    throw FormatException('Cannot convert $data to Map');
  }

  @override
  void dispose() {
    _newOrderController.close();
    _lowStockController.close();
    _bookingController.close();
    _statusController.close();
    super.dispose();
  }
}
