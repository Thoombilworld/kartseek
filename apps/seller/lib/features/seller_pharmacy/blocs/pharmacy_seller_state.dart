import 'package:equatable/equatable.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';

enum PharmacyBlocStatus { initial, loading, loaded, error }

// ─────────────────────────────────────────────────────────────────────────────
// Prescription Model
// ─────────────────────────────────────────────────────────────────────────────

class PrescriptionModel {
  final String id;
  final String orderId;
  final String customerName;
  final String customerPhone;
  final String doctorName;
  final String imageUrl;
  final String status;       // 'pending' | 'verified' | 'rejected' | 'info_needed'
  final String? rejectionReason;
  final String? additionalInfo;
  final DateTime uploadedAt;
  final List<String> medicines;

  const PrescriptionModel({
    required this.id,
    required this.orderId,
    required this.customerName,
    required this.customerPhone,
    required this.doctorName,
    required this.imageUrl,
    this.status = 'pending',
    this.rejectionReason,
    this.additionalInfo,
    required this.uploadedAt,
    this.medicines = const [],
  });

  factory PrescriptionModel.fromJson(Map<String, dynamic> json) => PrescriptionModel(
    id:            json['id'] as String? ?? '',
    orderId:       json['order_id'] as String? ?? '',
    customerName:  json['customer_name'] as String? ?? 'Customer',
    customerPhone: json['customer_phone'] as String? ?? '',
    doctorName:    json['doctor_name'] as String? ?? 'Dr. Unknown',
    imageUrl:      json['image_url'] as String? ?? '',
    status:        json['status'] as String? ?? 'pending',
    rejectionReason: json['rejection_reason'] as String?,
    additionalInfo:  json['additional_info'] as String?,
    uploadedAt: DateTime.tryParse(json['uploaded_at'] as String? ?? '') ?? DateTime.now(),
    medicines: List<String>.from(json['medicines'] as List? ?? []),
  );

  PrescriptionModel copyWith({
    String? status,
    String? rejectionReason,
    String? additionalInfo,
  }) => PrescriptionModel(
    id: id, orderId: orderId, customerName: customerName,
    customerPhone: customerPhone, doctorName: doctorName,
    imageUrl: imageUrl,
    status: status ?? this.status,
    rejectionReason: rejectionReason ?? this.rejectionReason,
    additionalInfo: additionalInfo ?? this.additionalInfo,
    uploadedAt: uploadedAt,
    medicines: medicines,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pharmacy Inventory Item
// ─────────────────────────────────────────────────────────────────────────────

class PharmacyItem {
  final String id;
  final String name;
  final String category;
  final String emoji;
  final double price;
  final int stock;
  final int minStock;
  final bool isAvailable;
  final bool requiresPrescription;
  final String unit;   // 'tablet' | 'ml' | 'strip' | 'bottle' | 'unit'
  final String manufacturer;

  const PharmacyItem({
    required this.id,
    required this.name,
    required this.category,
    required this.emoji,
    required this.price,
    required this.stock,
    this.minStock = 10,
    this.isAvailable = true,
    this.requiresPrescription = false,
    this.unit = 'unit',
    this.manufacturer = '',
  });

  bool get isLowStock => stock <= minStock && stock > 0;
  bool get isOutOfStock => stock == 0;

  PharmacyItem copyWith({
    bool? isAvailable,
    int? stock,
    double? price,
  }) => PharmacyItem(
    id: id, name: name, category: category, emoji: emoji,
    price: price ?? this.price,
    stock: stock ?? this.stock,
    minStock: minStock,
    isAvailable: isAvailable ?? this.isAvailable,
    requiresPrescription: requiresPrescription,
    unit: unit,
    manufacturer: manufacturer,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pharmacy Seller State
// ─────────────────────────────────────────────────────────────────────────────

class PharmacySellerState extends Equatable {
  final PharmacyBlocStatus status;
  final List<SellerOrder> orders;
  final List<PrescriptionModel> prescriptions;
  final List<PharmacyItem> items;
  final Map<String, dynamic> dashboardData;
  final bool isOpen;
  final String selectedOrderTab;
  final String? actionMessage;
  final bool? actionSuccess;
  final String? error;

  const PharmacySellerState({
    this.status = PharmacyBlocStatus.initial,
    this.orders = const [],
    this.prescriptions = const [],
    this.items = const [],
    this.dashboardData = const {},
    this.isOpen = true,
    this.selectedOrderTab = 'all',
    this.actionMessage,
    this.actionSuccess,
    this.error,
  });

  // ── Computed ──────────────────────────────────────────────────────────────
  int get pendingPrescriptionCount => prescriptions.where((p) => p.status == 'pending').length;
  int get pendingOrderCount => orders.where((o) => o.status == SellerOrderStatus.pending).length;
  int get lowStockCount => items.where((i) => i.isLowStock || i.isOutOfStock).length;
  int get outOfStockCount => items.where((i) => i.isOutOfStock).length;

  List<SellerOrder> get filteredOrders {
    if (selectedOrderTab == 'all') return orders;
    final statusMap = {
      'pending':    SellerOrderStatus.pending,
      'dispensing': SellerOrderStatus.preparing,
      'ready':      SellerOrderStatus.ready,
      'delivered':  SellerOrderStatus.delivered,
    };
    final s = statusMap[selectedOrderTab];
    return s != null ? orders.where((o) => o.status == s).toList() : orders;
  }

  List<PharmacyItem> get lowStockItems =>
      items.where((i) => i.isLowStock || i.isOutOfStock).toList();

  PharmacySellerState copyWith({
    PharmacyBlocStatus? status,
    List<SellerOrder>? orders,
    List<PrescriptionModel>? prescriptions,
    List<PharmacyItem>? items,
    Map<String, dynamic>? dashboardData,
    bool? isOpen,
    String? selectedOrderTab,
    String? actionMessage,
    bool? actionSuccess,
    String? error,
  }) => PharmacySellerState(
    status:           status           ?? this.status,
    orders:           orders           ?? this.orders,
    prescriptions:    prescriptions    ?? this.prescriptions,
    items:            items            ?? this.items,
    dashboardData:    dashboardData    ?? this.dashboardData,
    isOpen:           isOpen           ?? this.isOpen,
    selectedOrderTab: selectedOrderTab ?? this.selectedOrderTab,
    actionMessage:    actionMessage,
    actionSuccess:    actionSuccess,
    error:            error,
  );

  @override
  List<Object?> get props => [
    status, orders, prescriptions, items, dashboardData,
    isOpen, selectedOrderTab, actionMessage, actionSuccess, error,
  ];
}
