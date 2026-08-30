import 'package:equatable/equatable.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';

abstract class GrocerySellerEvent extends Equatable {
  const GrocerySellerEvent();
  @override List<Object?> get props => [];
}

// ── Dashboard & Lifecycle ─────────────────────────────────────────────────────

class LoadGroceryDashboard extends GrocerySellerEvent {
  final String countryCode;
  const LoadGroceryDashboard({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class ToggleGroceryStore extends GrocerySellerEvent {
  final bool isOpen;
  const ToggleGroceryStore(this.isOpen);
  @override List<Object?> get props => [isOpen];
}

// ── Orders ────────────────────────────────────────────────────────────────────

class LoadGroceryOrders extends GrocerySellerEvent {
  final String countryCode;
  const LoadGroceryOrders({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class FilterGroceryOrders extends GrocerySellerEvent {
  final String filter; // 'all' | 'pending' | 'preparing' | 'ready'
  const FilterGroceryOrders(this.filter);
  @override List<Object?> get props => [filter];
}

class AcceptGroceryOrder extends GrocerySellerEvent {
  final String orderId;
  final int estimatedMinutes;
  const AcceptGroceryOrder(this.orderId, {this.estimatedMinutes = 15});
  @override List<Object?> get props => [orderId, estimatedMinutes];
}

class StartPackingGroceryOrder extends GrocerySellerEvent {
  final String orderId;
  const StartPackingGroceryOrder(this.orderId);
  @override List<Object?> get props => [orderId];
}

class MarkGroceryOrderReady extends GrocerySellerEvent {
  final String orderId;
  final double pickupLat;
  final double pickupLng;
  final String pickupAddress;
  const MarkGroceryOrderReady(
    this.orderId, {
    this.pickupLat  = 25.2854,
    this.pickupLng  = 51.5310,
    this.pickupAddress = 'Store Packing Area',
  });
  @override List<Object?> get props => [orderId];
}

class RejectGroceryOrder extends GrocerySellerEvent {
  final String orderId;
  final String reason;
  const RejectGroceryOrder(this.orderId, this.reason);
  @override List<Object?> get props => [orderId, reason];
}

class MarkGroceryItemOos extends GrocerySellerEvent {
  final String orderId;
  final String itemId;
  const MarkGroceryItemOos(this.orderId, this.itemId);
  @override List<Object?> get props => [orderId, itemId];
}

class ConfirmGroceryDispatch extends GrocerySellerEvent {
  final String orderId;
  const ConfirmGroceryDispatch(this.orderId);
  @override List<Object?> get props => [orderId];
}

class GroceryNewOrderPushed extends GrocerySellerEvent {
  final SellerOrder order;
  const GroceryNewOrderPushed(this.order);
  @override List<Object?> get props => [order.id];
}

// ── Catalog ───────────────────────────────────────────────────────────────────

class LoadGroceryCatalog extends GrocerySellerEvent {
  final String countryCode;
  const LoadGroceryCatalog({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class FilterGroceryCatalog extends GrocerySellerEvent {
  final String categoryId; // 'all' or category id
  const FilterGroceryCatalog(this.categoryId);
  @override List<Object?> get props => [categoryId];
}

class SearchGroceryCatalog extends GrocerySellerEvent {
  final String query;
  const SearchGroceryCatalog(this.query);
  @override List<Object?> get props => [query];
}

class ToggleCatalogItemAvailability extends GrocerySellerEvent {
  final String itemId;
  final bool isAvailable;
  const ToggleCatalogItemAvailability(this.itemId, this.isAvailable);
  @override List<Object?> get props => [itemId, isAvailable];
}

class UpdateGroceryProductPrice extends GrocerySellerEvent {
  final String itemId;
  final double newPrice;
  const UpdateGroceryProductPrice(this.itemId, this.newPrice);
  @override List<Object?> get props => [itemId, newPrice];
}

class RestockGroceryProduct extends GrocerySellerEvent {
  final String itemId;
  final int quantity;
  const RestockGroceryProduct(this.itemId, this.quantity);
  @override List<Object?> get props => [itemId, quantity];
}

// ── Low Stock ─────────────────────────────────────────────────────────────────

class LoadGroceryLowStock extends GrocerySellerEvent {
  const LoadGroceryLowStock();
}

// ── New Events ────────────────────────────────────────────────────────────────

class SetGroceryEta extends GrocerySellerEvent {
  final String orderId;
  final int eta; // in minutes
  const SetGroceryEta({required this.orderId, required this.eta});
  @override List<Object?> get props => [orderId, eta];
}

class BulkRestockCategory extends GrocerySellerEvent {
  final String categoryId;
  const BulkRestockCategory(this.categoryId);
  @override List<Object?> get props => [categoryId];
}

class AddNewGroceryProduct extends GrocerySellerEvent {
  final String name;
  final String emoji;
  final String categoryId;
  final double price;
  final String unit;
  final int stockQty;
  const AddNewGroceryProduct({
    required this.name,
    required this.emoji,
    required this.categoryId,
    required this.price,
    required this.unit,
    required this.stockQty,
  });
  @override List<Object?> get props => [name, categoryId];
}
