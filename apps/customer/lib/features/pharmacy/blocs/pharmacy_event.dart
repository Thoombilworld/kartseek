import 'package:equatable/equatable.dart';

abstract class PharmacyEvent extends Equatable {
  const PharmacyEvent();
  @override List<Object?> get props => [];
}

// ── Home & Discovery ─────────────────────────────────────────────────────────
class LoadPharmacyHome extends PharmacyEvent { const LoadPharmacyHome(); }
class LoadPharmacies extends PharmacyEvent { const LoadPharmacies(); }
class LoadPharmacyById extends PharmacyEvent {
  final String id; const LoadPharmacyById(this.id);
  @override List<Object?> get props => [id];
}

// ── Categories ───────────────────────────────────────────────────────────────
class LoadPharmacyCategories extends PharmacyEvent { const LoadPharmacyCategories(); }
class SelectPharmacyCategory extends PharmacyEvent {
  final String categoryId;
  const SelectPharmacyCategory(this.categoryId);
  @override List<Object?> get props => [categoryId];
}
class ClearCategoryFilter extends PharmacyEvent { const ClearCategoryFilter(); }
class LoadPharmaciesByCategory extends PharmacyEvent {
  final String categoryId;
  const LoadPharmaciesByCategory(this.categoryId);
  @override List<Object?> get props => [categoryId];
}

// ── Store Detail ─────────────────────────────────────────────────────────────
class LoadPharmacyStoreDetail extends PharmacyEvent {
  final String storeId;
  const LoadPharmacyStoreDetail(this.storeId);
  @override List<Object?> get props => [storeId];
}

// ── Store Selection (cart binding) ────────────────────────────────────────────────
/// Dispatched when a customer enters a store detail page.
/// If the cart already belongs to a different store, the bloc will
/// set a `storeConflict` flag so the UI can show a confirmation dialog.
class SelectPharmacyStore extends PharmacyEvent {
  final String storeId;
  final String storeName;
  const SelectPharmacyStore({required this.storeId, required this.storeName});
  @override List<Object?> get props => [storeId, storeName];
}

/// Force-confirm a store switch — clears the cart and sets the new store.
class ConfirmStoreSwitch extends PharmacyEvent {
  final String newStoreId;
  final String newStoreName;
  const ConfirmStoreSwitch({required this.newStoreId, required this.newStoreName});
  @override List<Object?> get props => [newStoreId, newStoreName];
}

/// Cancel a pending store switch — keeps the existing cart intact.
class CancelStoreSwitch extends PharmacyEvent {
  const CancelStoreSwitch();
}

// ── Search ───────────────────────────────────────────────────────────────────
class SearchMedicines extends PharmacyEvent {
  final String query;
  final int page;
  const SearchMedicines(this.query, {this.page = 1});
  @override List<Object?> get props => [query, page];
}
class ClearSearchResults extends PharmacyEvent { const ClearSearchResults(); }

// ── Cart ─────────────────────────────────────────────────────────────────────
class AddMedicineToCart extends PharmacyEvent {
  final String medicineId;
  final int quantity;
  final String storeId;
  final String storeName;
  final Map<String, dynamic>? medicineData;
  const AddMedicineToCart({required this.medicineId, this.quantity = 1, required this.storeId, required this.storeName, this.medicineData});
  @override List<Object?> get props => [medicineId, quantity, storeId];
}
class RemoveMedicineFromCart extends PharmacyEvent {
  final String medicineId; const RemoveMedicineFromCart(this.medicineId);
  @override List<Object?> get props => [medicineId];
}
class UpdateCartItemQuantity extends PharmacyEvent {
  final String medicineId;
  final int quantity;
  const UpdateCartItemQuantity({required this.medicineId, required this.quantity});
  @override List<Object?> get props => [medicineId, quantity];
}
class ClearPharmacyCart extends PharmacyEvent { const ClearPharmacyCart(); }

// ── Prescription ─────────────────────────────────────────────────────────────
class UploadPrescription extends PharmacyEvent {
  final String imagePath; const UploadPrescription(this.imagePath);
  @override List<Object?> get props => [imagePath];
}
class LoadMyPrescriptions extends PharmacyEvent { const LoadMyPrescriptions(); }
class LoadPrescriptionDetail extends PharmacyEvent {
  final String prescriptionId;
  const LoadPrescriptionDetail(this.prescriptionId);
  @override List<Object?> get props => [prescriptionId];
}

// ── Orders ───────────────────────────────────────────────────────────────────
class PlacePharmacyOrder extends PharmacyEvent {
  final String paymentMethod;
  final String deliveryAddress;
  final String? deliverySlot;
  final String? couponCode;
  const PlacePharmacyOrder({
    required this.paymentMethod,
    required this.deliveryAddress,
    this.deliverySlot,
    this.couponCode,
  });
  @override List<Object?> get props => [paymentMethod, deliveryAddress];
}
class LoadPharmacyOrders extends PharmacyEvent { const LoadPharmacyOrders(); }
class LoadPharmacyOrderDetail extends PharmacyEvent {
  final String orderId;
  const LoadPharmacyOrderDetail(this.orderId);
  @override List<Object?> get props => [orderId];
}
class ReorderPharmacyOrder extends PharmacyEvent {
  final String orderId;
  const ReorderPharmacyOrder(this.orderId);
  @override List<Object?> get props => [orderId];
}

// ── Reviews ──────────────────────────────────────────────────────────────────
class LoadStoreReviews extends PharmacyEvent {
  final String storeId;
  const LoadStoreReviews(this.storeId);
  @override List<Object?> get props => [storeId];
}
class SubmitPharmacyReview extends PharmacyEvent {
  final String storeId;
  final int rating;
  final String comment;
  const SubmitPharmacyReview({required this.storeId, required this.rating, required this.comment});
  @override List<Object?> get props => [storeId, rating, comment];
}

// ── Offers & Coupons ─────────────────────────────────────────────────────────
class LoadPharmacyOffers extends PharmacyEvent { const LoadPharmacyOffers(); }
class ApplyPharmacyCoupon extends PharmacyEvent {
  final String code;
  const ApplyPharmacyCoupon(this.code);
  @override List<Object?> get props => [code];
}
class RemovePharmacyCoupon extends PharmacyEvent { const RemovePharmacyCoupon(); }

// ── Brands ───────────────────────────────────────────────────────────────────
class LoadPharmacyBrands extends PharmacyEvent { const LoadPharmacyBrands(); }

// ── Near Me ──────────────────────────────────────────────────────────────────
class LoadNearbyPharmacies extends PharmacyEvent {
  final double latitude;
  final double longitude;
  final double? radius;
  const LoadNearbyPharmacies({required this.latitude, required this.longitude, this.radius});
  @override List<Object?> get props => [latitude, longitude, radius];
}

// ── Delivery ─────────────────────────────────────────────────────────────────
class SelectDeliveryAddress extends PharmacyEvent {
  final Map<String, dynamic> address;
  const SelectDeliveryAddress(this.address);
  @override List<Object?> get props => [address];
}
class SelectDeliverySlot extends PharmacyEvent {
  final String slotId;
  final String slotLabel;
  const SelectDeliverySlot({required this.slotId, required this.slotLabel});
  @override List<Object?> get props => [slotId, slotLabel];
}

// ── Scanner ──────────────────────────────────────────────────────────────────

/// Dispatched when a barcode/QR code is detected by the camera scanner.
class ScanBarcode extends PharmacyEvent {
  final String code;
  final String format;  // 'EAN_13', 'QR_CODE', 'UPC_A', etc.
  const ScanBarcode({required this.code, required this.format});
  @override List<Object?> get props => [code, format];
}

/// Dispatched when OCR text is recognized from camera frame or gallery image.
class ScanTextRecognized extends PharmacyEvent {
  final String recognizedText;
  const ScanTextRecognized(this.recognizedText);
  @override List<Object?> get props => [recognizedText];
}

/// Clears all scan results and resets the scanner state.
class ClearScanResults extends PharmacyEvent {
  const ClearScanResults();
}
