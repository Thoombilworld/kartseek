import 'package:equatable/equatable.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';

abstract class RestaurantSellerEvent extends Equatable {
  const RestaurantSellerEvent();
  @override List<Object?> get props => [];
}

// ── Dashboard & Lifecycle ──────────────────────────────────────────────────────
class LoadRestaurantDashboard extends RestaurantSellerEvent {
  final String countryCode;
  const LoadRestaurantDashboard({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class ToggleRestaurantOpen extends RestaurantSellerEvent {
  final bool isOpen;
  const ToggleRestaurantOpen(this.isOpen);
  @override List<Object?> get props => [isOpen];
}

// ── Orders ─────────────────────────────────────────────────────────────────────
class LoadRestaurantOrders extends RestaurantSellerEvent {
  final String countryCode;
  final String tab; // 'all' | 'dine_in' | 'takeaway' | 'delivery'
  const LoadRestaurantOrders({this.tab = 'all', this.countryCode = 'QA'});
  @override List<Object?> get props => [tab, countryCode];
}

class SelectRestaurantOrderTab extends RestaurantSellerEvent {
  final String tab;
  const SelectRestaurantOrderTab(this.tab);
  @override List<Object?> get props => [tab];
}

class AcceptRestaurantOrder extends RestaurantSellerEvent {
  final String orderId;
  final int estimatedMinutes;
  const AcceptRestaurantOrder(this.orderId, {this.estimatedMinutes = 20});
  @override List<Object?> get props => [orderId, estimatedMinutes];
}

class MarkRestaurantOrderPreparing extends RestaurantSellerEvent {
  final String orderId;
  const MarkRestaurantOrderPreparing(this.orderId);
  @override List<Object?> get props => [orderId];
}

class MarkRestaurantOrderReady extends RestaurantSellerEvent {
  final String orderId;
  final double pickupLat;
  final double pickupLng;
  final String pickupAddress;
  const MarkRestaurantOrderReady(
    this.orderId, {
    this.pickupLat  = 25.2854,
    this.pickupLng  = 51.5310,
    this.pickupAddress = 'Restaurant Kitchen',
  });
  @override List<Object?> get props => [orderId];
}

class RejectRestaurantOrder extends RestaurantSellerEvent {
  final String orderId;
  final String reason;
  const RejectRestaurantOrder(this.orderId, this.reason);
  @override List<Object?> get props => [orderId, reason];
}

class SetRestaurantOrderEta extends RestaurantSellerEvent {
  final String orderId;
  final int eta; // minutes
  const SetRestaurantOrderEta({required this.orderId, required this.eta});
  @override List<Object?> get props => [orderId, eta];
}

// Push from WebSocket
class RestaurantNewOrderPushed extends RestaurantSellerEvent {
  final SellerOrder order;
  const RestaurantNewOrderPushed(this.order);
  @override List<Object?> get props => [order.id];
}

// ── Tables ─────────────────────────────────────────────────────────────────────
class LoadRestaurantTables extends RestaurantSellerEvent {
  final String countryCode;
  const LoadRestaurantTables({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class ToggleTableStatus extends RestaurantSellerEvent {
  final String tableId;
  final String status; // 'available' | 'occupied' | 'reserved' | 'cleaning'
  const ToggleTableStatus(this.tableId, this.status);
  @override List<Object?> get props => [tableId, status];
}

class AssignTableToOrder extends RestaurantSellerEvent {
  final String tableId;
  final String orderId;
  final String guestName;
  final int guestCount;
  const AssignTableToOrder({
    required this.tableId,
    required this.orderId,
    required this.guestName,
    required this.guestCount,
  });
  @override List<Object?> get props => [tableId, orderId];
}

class ClearRestaurantTable extends RestaurantSellerEvent {
  final String tableId;
  const ClearRestaurantTable(this.tableId);
  @override List<Object?> get props => [tableId];
}

// ── Menu ───────────────────────────────────────────────────────────────────────
class LoadRestaurantMenu extends RestaurantSellerEvent {
  final String countryCode;
  const LoadRestaurantMenu({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class ToggleMenuItemAvailability extends RestaurantSellerEvent {
  final String itemId;
  final bool isAvailable;
  const ToggleMenuItemAvailability(this.itemId, this.isAvailable);
  @override List<Object?> get props => [itemId, isAvailable];
}

class UpdateMenuItemPrice extends RestaurantSellerEvent {
  final String itemId;
  final double newPrice;
  const UpdateMenuItemPrice(this.itemId, this.newPrice);
  @override List<Object?> get props => [itemId, newPrice];
}

class AddMenuItem extends RestaurantSellerEvent {
  final String name;
  final String description;
  final double price;
  final String emoji;
  final String categoryId;
  final int prepTimeMinutes;
  const AddMenuItem({
    required this.name,
    required this.description,
    required this.price,
    required this.emoji,
    required this.categoryId,
    this.prepTimeMinutes = 20,
  });
  @override List<Object?> get props => [name, categoryId];
}

class ToggleMenuCategoryAvailability extends RestaurantSellerEvent {
  final String categoryId;
  final bool isAvailable;
  const ToggleMenuCategoryAvailability(this.categoryId, this.isAvailable);
  @override List<Object?> get props => [categoryId, isAvailable];
}
