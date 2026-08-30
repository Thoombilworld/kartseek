import 'package:equatable/equatable.dart';

abstract class PharmacySellerEvent extends Equatable {
  const PharmacySellerEvent();
  @override
  List<Object?> get props => [];
}

// ── Dashboard & Lifecycle ──────────────────────────────────────────────────────
class LoadPharmacyDashboard extends PharmacySellerEvent {
  final String countryCode;
  const LoadPharmacyDashboard({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class TogglePharmacyOpen extends PharmacySellerEvent {
  final bool isOpen;
  const TogglePharmacyOpen(this.isOpen);
  @override List<Object?> get props => [isOpen];
}

// ── Orders ─────────────────────────────────────────────────────────────────────
class LoadPharmacyOrders extends PharmacySellerEvent {
  final String countryCode;
  final String tab; // 'all' | 'pending' | 'dispensing' | 'ready' | 'delivered'
  const LoadPharmacyOrders({this.countryCode = 'QA', this.tab = 'all'});
  @override List<Object?> get props => [countryCode, tab];
}

class SelectPharmacyOrderTab extends PharmacySellerEvent {
  final String tab;
  const SelectPharmacyOrderTab(this.tab);
  @override List<Object?> get props => [tab];
}

class AcceptPharmacyOrder extends PharmacySellerEvent {
  final String orderId;
  final int estimatedMinutes;
  const AcceptPharmacyOrder(this.orderId, {this.estimatedMinutes = 15});
  @override List<Object?> get props => [orderId, estimatedMinutes];
}

class MarkPharmacyOrderDispensing extends PharmacySellerEvent {
  final String orderId;
  const MarkPharmacyOrderDispensing(this.orderId);
  @override List<Object?> get props => [orderId];
}

class MarkPharmacyOrderReady extends PharmacySellerEvent {
  final String orderId;
  final double pickupLat;
  final double pickupLng;
  final String pickupAddress;
  const MarkPharmacyOrderReady(
    this.orderId, {
    this.pickupLat  = 25.2854,
    this.pickupLng  = 51.5310,
    this.pickupAddress = 'Pharmacy Store',
  });
  @override List<Object?> get props => [orderId];
}

class RejectPharmacyOrder extends PharmacySellerEvent {
  final String orderId;
  final String reason;
  const RejectPharmacyOrder(this.orderId, this.reason);
  @override List<Object?> get props => [orderId, reason];
}

class DispatchPharmacyOrder extends PharmacySellerEvent {
  final String orderId;
  const DispatchPharmacyOrder(this.orderId);
  @override List<Object?> get props => [orderId];
}

// ── Prescriptions ──────────────────────────────────────────────────────────────
class LoadPharmacyPrescriptions extends PharmacySellerEvent {
  final String countryCode;
  const LoadPharmacyPrescriptions({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class VerifyPrescription extends PharmacySellerEvent {
  final String prescriptionId;
  const VerifyPrescription(this.prescriptionId);
  @override List<Object?> get props => [prescriptionId];
}

class RejectPrescription extends PharmacySellerEvent {
  final String prescriptionId;
  final String reason;
  const RejectPrescription(this.prescriptionId, this.reason);
  @override List<Object?> get props => [prescriptionId, reason];
}

class RequestMoreInfoForPrescription extends PharmacySellerEvent {
  final String prescriptionId;
  final String question;
  const RequestMoreInfoForPrescription(this.prescriptionId, this.question);
  @override List<Object?> get props => [prescriptionId, question];
}

// ── Inventory ──────────────────────────────────────────────────────────────────
class LoadPharmacyInventory extends PharmacySellerEvent {
  final String countryCode;
  const LoadPharmacyInventory({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class ToggleInventoryItemAvailability extends PharmacySellerEvent {
  final String itemId;
  final bool isAvailable;
  const ToggleInventoryItemAvailability(this.itemId, this.isAvailable);
  @override List<Object?> get props => [itemId, isAvailable];
}

class UpdateInventoryItemStock extends PharmacySellerEvent {
  final String itemId;
  final int newStock;
  const UpdateInventoryItemStock(this.itemId, this.newStock);
  @override List<Object?> get props => [itemId, newStock];
}

class UpdateInventoryItemPrice extends PharmacySellerEvent {
  final String itemId;
  final double newPrice;
  const UpdateInventoryItemPrice(this.itemId, this.newPrice);
  @override List<Object?> get props => [itemId, newPrice];
}

class BulkRestockLowItems extends PharmacySellerEvent {
  const BulkRestockLowItems();
}

class AddInventoryItem extends PharmacySellerEvent {
  final String name;
  final String category;
  final double price;
  final int stock;
  final String emoji;
  final bool requiresPrescription;
  const AddInventoryItem({
    required this.name,
    required this.category,
    required this.price,
    required this.stock,
    required this.emoji,
    this.requiresPrescription = false,
  });
  @override List<Object?> get props => [name, category];
}
