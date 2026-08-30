import 'package:equatable/equatable.dart';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';

enum PharmacyStatus { initial, loading, success, empty, error, ordering, ordered }

class PharmacyState extends Equatable {
  // ── Core status ────────────────────────────────────────────────────────────
  final PharmacyStatus status;
  final String? errorMessage;

  // ── Home / Discovery ───────────────────────────────────────────────────────
  final Map<String, dynamic>? homeData;
  final PharmacyHomeData? typedHomeData;
  final List<PharmacyCategory> categories;
  final List<PharmacyStore> allStores;
  final List<PharmacyStore> filteredStores;
  final List<PharmacyStore> nearbyStores;
  final String? selectedCategoryId;
  final PharmacyStatus categoryStatus;

  // ── Store Detail ───────────────────────────────────────────────────────────
  final List<Map<String, dynamic>> pharmacies;
  final Map<String, dynamic>? selectedPharmacy;
  final PharmacyStore? storeDetail;
  final List<PharmacyProduct> storeProducts;
  final List<PharmacyReview> storeReviews;

  // ── Search ─────────────────────────────────────────────────────────────────
  final List<Map<String, dynamic>> medicines;
  final List<PharmacyProduct> searchResults;
  final String? searchQuery;

  // ── Cart ───────────────────────────────────────────────────────────────────
  final String? cartStoreId;
  final String? cartStoreName;
  final List<Map<String, dynamic>> cartItems;
  final double cartSubtotal;
  final double cartDeliveryFee;
  final double cartDiscount;
  final double cartTotal;

  // ── Store Conflict (for switch confirmation dialog) ─────────────────────────
  final bool storeConflict;
  final String? pendingStoreId;
  final String? pendingStoreName;

  // ── Prescription ───────────────────────────────────────────────────────────
  final String? prescriptionUrl;
  final List<PharmacyPrescription> prescriptions;
  final PharmacyPrescription? prescriptionDetail;

  // ── Orders ─────────────────────────────────────────────────────────────────
  final List<Map<String, dynamic>> orders;
  final List<PharmacyOrder> orderHistory;
  final PharmacyOrder? orderDetail;

  // ── Offers & Brands ────────────────────────────────────────────────────────
  final List<PharmacyOffer> offers;
  final PharmacyOffer? appliedCoupon;
  final List<PharmacyBrand> brands;

  // ── Delivery ───────────────────────────────────────────────────────────────
  final Map<String, dynamic>? selectedAddress;
  final String? selectedSlotId;
  final String? selectedSlotLabel;

  // ── Scanner ─────────────────────────────────────────────────────────────────
  final List<PharmacyProduct> scanResults;
  final String? lastScannedCode;
  final String? lastScanFormat;
  final PharmacyStatus scanStatus;
  final String? scanMatchType;

  const PharmacyState({
    this.status = PharmacyStatus.initial,
    this.errorMessage,
    this.homeData,
    this.typedHomeData,
    this.categories = const [],
    this.allStores = const [],
    this.filteredStores = const [],
    this.nearbyStores = const [],
    this.selectedCategoryId,
    this.categoryStatus = PharmacyStatus.initial,
    this.pharmacies = const [],
    this.selectedPharmacy,
    this.storeDetail,
    this.storeProducts = const [],
    this.storeReviews = const [],
    this.medicines = const [],
    this.searchResults = const [],
    this.searchQuery,
    this.cartStoreId,
    this.cartStoreName,
    this.cartItems = const [],
    this.cartSubtotal = 0,
    this.cartDeliveryFee = 0,
    this.cartDiscount = 0,
    this.cartTotal = 0,
    this.storeConflict = false,
    this.pendingStoreId,
    this.pendingStoreName,
    this.prescriptionUrl,
    this.prescriptions = const [],
    this.prescriptionDetail,
    this.orders = const [],
    this.orderHistory = const [],
    this.orderDetail,
    this.offers = const [],
    this.appliedCoupon,
    this.brands = const [],
    this.selectedAddress,
    this.selectedSlotId,
    this.selectedSlotLabel,
    this.scanResults = const [],
    this.lastScannedCode,
    this.lastScanFormat,
    this.scanStatus = PharmacyStatus.initial,
    this.scanMatchType,
  });

  PharmacyState copyWith({
    PharmacyStatus? status,
    String? errorMessage,
    Map<String, dynamic>? homeData,
    PharmacyHomeData? typedHomeData,
    List<PharmacyCategory>? categories,
    List<PharmacyStore>? allStores,
    List<PharmacyStore>? filteredStores,
    List<PharmacyStore>? nearbyStores,
    String? selectedCategoryId,
    PharmacyStatus? categoryStatus,
    List<Map<String, dynamic>>? pharmacies,
    Map<String, dynamic>? selectedPharmacy,
    PharmacyStore? storeDetail,
    List<PharmacyProduct>? storeProducts,
    List<PharmacyReview>? storeReviews,
    List<Map<String, dynamic>>? medicines,
    List<PharmacyProduct>? searchResults,
    String? searchQuery,
    String? cartStoreId,
    String? cartStoreName,
    List<Map<String, dynamic>>? cartItems,
    double? cartSubtotal,
    double? cartDeliveryFee,
    double? cartDiscount,
    double? cartTotal,
    bool? storeConflict,
    String? pendingStoreId,
    String? pendingStoreName,
    String? prescriptionUrl,
    List<PharmacyPrescription>? prescriptions,
    PharmacyPrescription? prescriptionDetail,
    List<Map<String, dynamic>>? orders,
    List<PharmacyOrder>? orderHistory,
    PharmacyOrder? orderDetail,
    List<PharmacyOffer>? offers,
    PharmacyOffer? appliedCoupon,
    List<PharmacyBrand>? brands,
    Map<String, dynamic>? selectedAddress,
    String? selectedSlotId,
    String? selectedSlotLabel,
    List<PharmacyProduct>? scanResults,
    String? lastScannedCode,
    String? lastScanFormat,
    PharmacyStatus? scanStatus,
    String? scanMatchType,
    bool clearCategory = false,
    bool clearCoupon = false,
    bool clearOrderDetail = false,
    bool clearPrescriptionDetail = false,
    bool clearCartStore = false,
    bool clearScan = false,
  }) => PharmacyState(
    status: status ?? this.status,
    errorMessage: errorMessage,
    homeData: homeData ?? this.homeData,
    typedHomeData: typedHomeData ?? this.typedHomeData,
    categories: categories ?? this.categories,
    allStores: allStores ?? this.allStores,
    filteredStores: filteredStores ?? this.filteredStores,
    nearbyStores: nearbyStores ?? this.nearbyStores,
    selectedCategoryId: clearCategory ? null : (selectedCategoryId ?? this.selectedCategoryId),
    categoryStatus: categoryStatus ?? this.categoryStatus,
    pharmacies: pharmacies ?? this.pharmacies,
    selectedPharmacy: selectedPharmacy ?? this.selectedPharmacy,
    storeDetail: storeDetail ?? this.storeDetail,
    storeProducts: storeProducts ?? this.storeProducts,
    storeReviews: storeReviews ?? this.storeReviews,
    medicines: medicines ?? this.medicines,
    searchResults: searchResults ?? this.searchResults,
    searchQuery: searchQuery ?? this.searchQuery,
    cartStoreId: clearCartStore ? null : (cartStoreId ?? this.cartStoreId),
    cartStoreName: clearCartStore ? null : (cartStoreName ?? this.cartStoreName),
    cartItems: cartItems ?? this.cartItems,
    cartSubtotal: cartSubtotal ?? this.cartSubtotal,
    cartDeliveryFee: cartDeliveryFee ?? this.cartDeliveryFee,
    cartDiscount: cartDiscount ?? this.cartDiscount,
    cartTotal: cartTotal ?? this.cartTotal,
    storeConflict: storeConflict ?? this.storeConflict,
    pendingStoreId: pendingStoreId ?? this.pendingStoreId,
    pendingStoreName: pendingStoreName ?? this.pendingStoreName,
    prescriptionUrl: prescriptionUrl ?? this.prescriptionUrl,
    prescriptions: prescriptions ?? this.prescriptions,
    prescriptionDetail: clearPrescriptionDetail ? null : (prescriptionDetail ?? this.prescriptionDetail),
    orders: orders ?? this.orders,
    orderHistory: orderHistory ?? this.orderHistory,
    orderDetail: clearOrderDetail ? null : (orderDetail ?? this.orderDetail),
    offers: offers ?? this.offers,
    appliedCoupon: clearCoupon ? null : (appliedCoupon ?? this.appliedCoupon),
    brands: brands ?? this.brands,
    selectedAddress: selectedAddress ?? this.selectedAddress,
    selectedSlotId: selectedSlotId ?? this.selectedSlotId,
    selectedSlotLabel: selectedSlotLabel ?? this.selectedSlotLabel,
    scanResults: clearScan ? const [] : (scanResults ?? this.scanResults),
    lastScannedCode: clearScan ? null : (lastScannedCode ?? this.lastScannedCode),
    lastScanFormat: clearScan ? null : (lastScanFormat ?? this.lastScanFormat),
    scanStatus: clearScan ? PharmacyStatus.initial : (scanStatus ?? this.scanStatus),
    scanMatchType: clearScan ? null : (scanMatchType ?? this.scanMatchType),
  );

  /// Computed cart item count
  int get cartItemCount => cartItems.fold(0, (sum, item) => sum + ((item['quantity'] as int?) ?? 1));

  /// Check if cart has Rx items
  bool get cartHasRxItems => cartItems.any((item) => item['needsRx'] == true);

  @override
  List<Object?> get props => [
    status, errorMessage, homeData, typedHomeData, categories, allStores,
    filteredStores, nearbyStores, selectedCategoryId, categoryStatus,
    pharmacies, selectedPharmacy, storeDetail, storeProducts, storeReviews,
    medicines, searchResults, searchQuery,
    cartStoreId, cartStoreName,
    cartItems, cartSubtotal, cartDeliveryFee, cartDiscount, cartTotal,
    prescriptionUrl, prescriptions, prescriptionDetail,
    orders, orderHistory, orderDetail,
    offers, appliedCoupon, brands,
    selectedAddress, selectedSlotId, selectedSlotLabel,
    scanResults, lastScannedCode, lastScanFormat, scanStatus, scanMatchType,
  ];
}
