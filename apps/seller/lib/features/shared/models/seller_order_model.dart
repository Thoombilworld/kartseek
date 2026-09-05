/// KARTSEEK Seller App — Unified Seller Order Model
///
/// A single normalized model representing orders across all modules.
/// Module-specific fields are carried in [moduleData].
library;

import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_seller/features/shared/models/country_config.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

enum SellerOrderStatus {
  pending('PENDING'),
  confirmed('CONFIRMED'),
  preparing('PREPARING'),
  ready('READY'),
  assigned('ASSIGNED'),       // delivery partner assigned
  pickedUp('PICKED_UP'),
  outForDelivery('OUT_FOR_DELIVERY'),
  delivered('DELIVERED'),
  completed('COMPLETED'),
  cancelled('CANCELLED'),
  refunded('REFUNDED');

  final String value;
  const SellerOrderStatus(this.value);

  static SellerOrderStatus fromString(String s) {
    for (final v in SellerOrderStatus.values) {
      if (v.value == s || v.value.toLowerCase() == s.toLowerCase()) return v;
    }
    return SellerOrderStatus.pending;
  }

  String get displayLabel {
    switch (this) {
      case SellerOrderStatus.pending:         return 'Pending';
      case SellerOrderStatus.confirmed:       return 'Confirmed';
      case SellerOrderStatus.preparing:       return 'Preparing';
      case SellerOrderStatus.ready:           return 'Ready for Pickup';
      case SellerOrderStatus.assigned:        return 'Delivery Assigned';
      case SellerOrderStatus.pickedUp:        return 'Picked Up';
      case SellerOrderStatus.outForDelivery:  return 'Out for Delivery';
      case SellerOrderStatus.delivered:       return 'Delivered';
      case SellerOrderStatus.completed:       return 'Completed';
      case SellerOrderStatus.cancelled:       return 'Cancelled';
      case SellerOrderStatus.refunded:        return 'Refunded';
    }
  }

  bool get isActive => const {
    SellerOrderStatus.pending, SellerOrderStatus.confirmed,
    SellerOrderStatus.preparing, SellerOrderStatus.ready,
    SellerOrderStatus.assigned, SellerOrderStatus.pickedUp,
    SellerOrderStatus.outForDelivery,
  }.contains(this);

  bool get isTerminal => const {
    SellerOrderStatus.delivered, SellerOrderStatus.completed,
    SellerOrderStatus.cancelled, SellerOrderStatus.refunded,
  }.contains(this);
}

enum SellerOrderType {
  marketplace('marketplace'),
  grocery('grocery'),
  restaurant('restaurant'),
  pharmacy('pharmacy'),
  appointment('appointment'), // doctor
  hotelBooking('hotel_booking'),
  taxiRide('taxi_ride');

  final String value;
  const SellerOrderType(this.value);

  static SellerOrderType fromString(String s) {
    for (final v in SellerOrderType.values) {
      if (v.value == s) return v;
    }
    return SellerOrderType.marketplace;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SellerOrderItem
// ─────────────────────────────────────────────────────────────────────────────

class SellerOrderItem {
  final String id;
  final String name;
  final int quantity;
  final double price;
  final String? imageUrl;
  final bool isAvailable;  // seller marks OOS items false

  const SellerOrderItem({
    required this.id,
    required this.name,
    required this.quantity,
    required this.price,
    this.imageUrl,
    this.isAvailable = true,
  });

  factory SellerOrderItem.fromJson(Map<String, dynamic> json) => SellerOrderItem(
    id:          json['id'] as String? ?? '',
    name:        json['name'] as String? ?? '',
    quantity:    json['quantity'] as int? ?? 1,
    price:       (json['price'] as num?)?.toDouble() ?? 0.0,
    imageUrl:    json['image_url'] as String?,
    isAvailable: json['is_available'] as bool? ?? true,
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'name': name, 'quantity': quantity,
    'price': price, 'image_url': imageUrl, 'is_available': isAvailable,
  };

  SellerOrderItem copyWith({bool? isAvailable}) => SellerOrderItem(
    id: id, name: name, quantity: quantity, price: price,
    imageUrl: imageUrl, isAvailable: isAvailable ?? this.isAvailable,
  );

  /// Convenience: total price for this line item.
  double get totalPrice => price * quantity;

  /// Convenience: emoji placeholder derived from image or default.
  String get emoji => '🛒';
}

// ─────────────────────────────────────────────────────────────────────────────
// SellerOrder (unified)
// ─────────────────────────────────────────────────────────────────────────────

class SellerOrder {
  final String id;
  final SellerOrderType type;
  final SellerOrderStatus status;
  final String customerId;
  final String customerName;
  final String? customerPhone;
  final List<SellerOrderItem> items;
  final double total;
  final String currency;
  final String paymentMethod;
  final bool isPaid;
  final String? deliveryAddress;
  final double? deliveryLat;
  final double? deliveryLng;
  final String? deliveryPartnerId;
  final String? deliveryPartnerName;
  final DateTime createdAt;
  final DateTime? updatedAt;
  /// Module-specific payload (e.g. table number, prescription ID, room type)
  final Map<String, dynamic> moduleData;

  const SellerOrder({
    required this.id,
    required this.type,
    required this.status,
    required this.customerId,
    required this.customerName,
    this.customerPhone,
    required this.items,
    required this.total,
    this.currency = 'QAR',
    this.paymentMethod = 'Card',
    this.isPaid = false,
    this.deliveryAddress,
    this.deliveryLat,
    this.deliveryLng,
    this.deliveryPartnerId,
    this.deliveryPartnerName,
    required this.createdAt,
    this.updatedAt,
    this.moduleData = const {},
  });

  int get itemCount => items.fold(0, (sum, i) => sum + i.quantity);

  /// Convenience: short order number derived from id.
  String get orderNumber => id.length > 8 ? id.substring(0, 8).toUpperCase() : id.toUpperCase();

  /// Convenience: alias for [total] used across screens.
  double get grandTotal => total;

  /// Convenience: computed subtotal from line items.
  double get subtotal => items.fold<double>(0, (s, i) => s + i.totalPrice);

  /// Convenience: delivery fee (stored in moduleData or zero).
  double get deliveryFee => (moduleData['delivery_fee'] as num?)?.toDouble() ?? 0.0;

  /// Convenience: discount amount (stored in moduleData or zero).
  double get discount => (moduleData['discount'] as num?)?.toDouble() ?? 0.0;

  factory SellerOrder.fromJson(Map<String, dynamic> json) => SellerOrder(
    id:                   json['id'] as String? ?? '',
    type:                 SellerOrderType.fromString(json['type'] as String? ?? 'marketplace'),
    status:               SellerOrderStatus.fromString(json['status'] as String? ?? 'PENDING'),
    customerId:           json['customer_id'] as String? ?? '',
    customerName:         json['customer_name'] as String? ?? 'Customer',
    customerPhone:        json['customer_phone'] as String?,
    items:                ((json['items'] as List?) ?? [])
        .map((i) => SellerOrderItem.fromJson(i as Map<String, dynamic>))
        .toList(),
    total:                (json['total'] as num?)?.toDouble() ?? 0.0,
    currency:             json['currency'] as String? ?? CountryConfig.forCode(RegionService.instance.currentCountry.code).currencyCode,
    paymentMethod:        json['payment_method'] as String? ?? 'Card',
    isPaid:               json['is_paid'] as bool? ?? false,
    deliveryAddress:      json['delivery_address'] as String?,
    deliveryLat:          (json['delivery_lat'] as num?)?.toDouble(),
    deliveryLng:          (json['delivery_lng'] as num?)?.toDouble(),
    deliveryPartnerId:    json['delivery_partner_id'] as String?,
    deliveryPartnerName:  json['delivery_partner_name'] as String?,
    createdAt:            DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
    updatedAt:            json['updated_at'] != null ? DateTime.tryParse(json['updated_at'] as String) : null,
    moduleData:           (json['module_data'] as Map<String, dynamic>?) ?? {},
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'type': type.value, 'status': status.value,
    'customer_id': customerId, 'customer_name': customerName,
    'customer_phone': customerPhone,
    'items': items.map((i) => i.toJson()).toList(),
    'total': total, 'currency': currency,
    'payment_method': paymentMethod, 'is_paid': isPaid,
    'delivery_address': deliveryAddress,
    'delivery_lat': deliveryLat, 'delivery_lng': deliveryLng,
    'delivery_partner_id': deliveryPartnerId,
    'delivery_partner_name': deliveryPartnerName,
    'created_at': createdAt.toIso8601String(),
    'updated_at': updatedAt?.toIso8601String(),
    'module_data': moduleData,
  };

  SellerOrder copyWith({SellerOrderStatus? status, String? deliveryPartnerId, String? deliveryPartnerName}) => SellerOrder(
    id: id, type: type, status: status ?? this.status,
    customerId: customerId, customerName: customerName,
    customerPhone: customerPhone, items: items, total: total,
    currency: currency, paymentMethod: paymentMethod, isPaid: isPaid,
    deliveryAddress: deliveryAddress, deliveryLat: deliveryLat, deliveryLng: deliveryLng,
    deliveryPartnerId: deliveryPartnerId ?? this.deliveryPartnerId,
    deliveryPartnerName: deliveryPartnerName ?? this.deliveryPartnerName,
    createdAt: createdAt, updatedAt: DateTime.now(), moduleData: moduleData,
  );

  static SellerOrder mock(SellerOrderType type) => SellerOrder(
    id: 'ORD-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
    type: type,
    status: SellerOrderStatus.pending,
    customerId: 'cust_001',
    customerName: 'Jane Kamau',
    customerPhone: '+254712345678',
    items: [
      const SellerOrderItem(id: 'itm_001', name: 'Sample Item', quantity: 2, price: 450.0),
    ],
    total: 900.0,
    currency: CountryConfig.forCode(RegionService.instance.currentCountry.code).currencyCode,
    paymentMethod: 'Card',
    isPaid: true,
    deliveryAddress: '45 Main Road, ${CountryConfig.forCode(RegionService.instance.currentCountry.code).defaultCity}',
    createdAt: DateTime.now(),
  );
}
