import 'package:flutter/material.dart';

/// ── Pharmacy Category ───────────────────────────────────────────────────────
class PharmacyCategory {
  final String id;
  final String name;
  final String emoji;
  final int productCount;
  final bool enabled;
  final String? slug;
  final bool requiresPrescription;
  final String? parentId;

  const PharmacyCategory({
    required this.id,
    required this.name,
    required this.emoji,
    this.productCount = 0,
    this.enabled = true,
    this.slug,
    this.requiresPrescription = false,
    this.parentId,
  });

  factory PharmacyCategory.fromJson(Map<String, dynamic> json) => PharmacyCategory(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    emoji: json['emoji'] ?? '💊',
    productCount: json['productCount'] ?? 0,
    enabled: json['isActive'] ?? true,
    slug: json['slug'],
    requiresPrescription: json['requiresPrescription'] ?? false,
    parentId: json['parentId'],
  );
}

/// ── Pharmacy Store ──────────────────────────────────────────────────────────
class PharmacyStore {
  final String id;
  final String name;
  final String address;
  final double rating;
  final int ratingCount;
  final String distance;
  final String deliveryTime;
  final bool isOpen;
  final List<String> categoryIds;
  final String? logoUrl;
  final String? bannerUrl;
  final double deliveryFee;
  final double minOrder;
  final String? offerBadge;
  final bool verified;
  final String hours;
  final String? phone;
  final String? description;
  final String? returnPolicy;
  final bool is24hr;
  final String? slug;
  final double? latitude;
  final double? longitude;

  const PharmacyStore({
    required this.id,
    required this.name,
    required this.address,
    required this.rating,
    this.ratingCount = 0,
    required this.distance,
    required this.deliveryTime,
    required this.isOpen,
    required this.categoryIds,
    this.logoUrl,
    this.bannerUrl,
    this.deliveryFee = 0,
    this.minOrder = 0,
    this.offerBadge,
    this.verified = false,
    this.hours = '24/7',
    this.phone,
    this.description,
    this.returnPolicy,
    this.is24hr = false,
    this.slug,
    this.latitude,
    this.longitude,
  });

  List<String> categoryNames(List<PharmacyCategory> allCategories) {
    return allCategories
        .where((c) => categoryIds.contains(c.id))
        .map((c) => c.name)
        .toList();
  }

  factory PharmacyStore.fromJson(Map<String, dynamic> json) => PharmacyStore(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    address: json['address'] ?? '',
    rating: (json['rating'] ?? 0).toDouble(),
    ratingCount: json['ratingCount'] ?? 0,
    distance: json['distance'] ?? '',
    deliveryTime: json['deliveryTime'] ?? '',
    isOpen: json['isOnline'] ?? true,
    categoryIds: List<String>.from(json['categoryIds'] ?? []),
    logoUrl: json['logoUrl'],
    bannerUrl: json['bannerUrl'],
    deliveryFee: (json['deliveryFee'] ?? 0).toDouble(),
    minOrder: (json['minOrderAmount'] ?? 0).toDouble(),
    offerBadge: json['offerBadge'],
    verified: json['status'] == 'APPROVED',
    hours: json['is24hr'] == true ? 'Open 24/7' : 'Mon-Sat 8am-10pm',
    phone: json['phone'],
    description: json['description'],
    returnPolicy: json['returnPolicy'],
    is24hr: json['is24hr'] ?? false,
    slug: json['slug'],
    latitude: json['latitude']?.toDouble(),
    longitude: json['longitude']?.toDouble(),
  );
}

/// ── Pharmacy Product ────────────────────────────────────────────────────────
class PharmacyProduct {
  final String id;
  final String name;
  final String brand;
  final double price;
  final double mrp;
  final String pack;
  final bool needsRx;
  final bool inStock;
  final String storeId;
  final String categoryId;
  final String? imageUrl;
  final String? description;
  final int discount;
  final String? genericName;
  final String? composition;
  final String? manufacturer;
  final String? dosageForm;
  final String? strength;
  final String? packSize;
  final String? sideEffects;
  final String? directions;
  final bool isScheduleH;
  final int stockLevel;
  final String? slug;

  const PharmacyProduct({
    required this.id,
    required this.name,
    required this.brand,
    required this.price,
    required this.mrp,
    required this.pack,
    this.needsRx = false,
    this.inStock = true,
    required this.storeId,
    required this.categoryId,
    this.imageUrl,
    this.description,
    this.discount = 0,
    this.genericName,
    this.composition,
    this.manufacturer,
    this.dosageForm,
    this.strength,
    this.packSize,
    this.sideEffects,
    this.directions,
    this.isScheduleH = false,
    this.stockLevel = 0,
    this.slug,
  });

  factory PharmacyProduct.fromJson(Map<String, dynamic> json) => PharmacyProduct(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    brand: json['manufacturer'] ?? '',
    price: (json['price'] ?? 0).toDouble(),
    mrp: (json['mrp'] ?? json['price'] ?? 0).toDouble(),
    pack: json['packSize'] ?? '',
    needsRx: json['requiresPrescription'] ?? false,
    inStock: json['isAvailable'] ?? true,
    storeId: json['storeId'] ?? '',
    categoryId: json['categoryId'] ?? '',
    imageUrl: json['imageUrl'],
    description: json['description'],
    discount: json['discount'] ?? 0,
    genericName: json['genericName'],
    composition: json['composition'],
    manufacturer: json['manufacturer'],
    dosageForm: json['dosageForm'],
    strength: json['strength'],
    packSize: json['packSize'],
    sideEffects: json['sideEffects'],
    directions: json['directions'],
    isScheduleH: json['isScheduleHDrug'] ?? false,
    stockLevel: json['stockLevel'] ?? 0,
    slug: json['slug'],
  );
}

/// ── Pharmacy Order ──────────────────────────────────────────────────────────
class PharmacyOrder {
  final String id;
  final String orderNumber;
  final String status;
  final String storeId;
  final String? storeName;
  final String? customerId;
  final List<PharmacyOrderItem> items;
  final double itemTotal;
  final double deliveryFee;
  final double discount;
  final double grandTotal;
  final String paymentMethod;
  final String paymentStatus;
  final bool requiresPrescription;
  final String? prescriptionId;
  final Map<String, dynamic>? deliveryAddress;
  final String? deliveryPartnerId;
  final String? estimatedDelivery;
  final DateTime createdAt;
  final DateTime? deliveredAt;

  const PharmacyOrder({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.storeId,
    this.storeName,
    this.customerId,
    this.items = const [],
    this.itemTotal = 0,
    this.deliveryFee = 0,
    this.discount = 0,
    this.grandTotal = 0,
    this.paymentMethod = 'COD',
    this.paymentStatus = 'PENDING',
    this.requiresPrescription = false,
    this.prescriptionId,
    this.deliveryAddress,
    this.deliveryPartnerId,
    this.estimatedDelivery,
    required this.createdAt,
    this.deliveredAt,
  });

  factory PharmacyOrder.fromJson(Map<String, dynamic> json) => PharmacyOrder(
    id: json['id'] ?? '',
    orderNumber: json['orderNumber'] ?? '',
    status: json['status'] ?? 'PENDING',
    storeId: json['storeId'] ?? '',
    storeName: json['storeName'],
    customerId: json['customerId'],
    items: (json['items'] as List<dynamic>?)
        ?.map((e) => PharmacyOrderItem.fromJson(e))
        .toList() ?? [],
    itemTotal: (json['itemTotal'] ?? 0).toDouble(),
    deliveryFee: (json['deliveryFee'] ?? 0).toDouble(),
    discount: (json['discount'] ?? 0).toDouble(),
    grandTotal: (json['grandTotal'] ?? 0).toDouble(),
    paymentMethod: json['paymentMethod'] ?? 'COD',
    paymentStatus: json['paymentStatus'] ?? 'PENDING',
    requiresPrescription: json['requiresPrescription'] ?? false,
    prescriptionId: json['prescriptionId'],
    deliveryAddress: json['deliveryAddress'],
    deliveryPartnerId: json['deliveryPartnerId'],
    estimatedDelivery: json['estimatedDelivery'],
    createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    deliveredAt: json['deliveredAt'] != null ? DateTime.tryParse(json['deliveredAt']) : null,
  );

  bool get isActive => !['COMPLETED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].contains(status);
}

class PharmacyOrderItem {
  final String itemId;
  final String name;
  final int quantity;
  final double price;
  final bool requiresPrescription;
  final String? dosageForm;

  const PharmacyOrderItem({
    required this.itemId,
    required this.name,
    required this.quantity,
    required this.price,
    this.requiresPrescription = false,
    this.dosageForm,
  });

  factory PharmacyOrderItem.fromJson(Map<String, dynamic> json) => PharmacyOrderItem(
    itemId: json['itemId'] ?? '',
    name: json['name'] ?? '',
    quantity: json['quantity'] ?? 1,
    price: (json['price'] ?? 0).toDouble(),
    requiresPrescription: json['requiresPrescription'] ?? false,
    dosageForm: json['dosageForm'],
  );
}

/// ── Prescription ────────────────────────────────────────────────────────────
class PharmacyPrescription {
  final String id;
  final String customerId;
  final String? storeId;
  final String? patientName;
  final int? patientAge;
  final String fileUrl;
  final String status;
  final List<String> extractedMedicines;
  final String? pharmacistNotes;
  final String? rejectionReason;
  final DateTime createdAt;
  final DateTime? verifiedAt;

  const PharmacyPrescription({
    required this.id,
    required this.customerId,
    this.storeId,
    this.patientName,
    this.patientAge,
    required this.fileUrl,
    required this.status,
    this.extractedMedicines = const [],
    this.pharmacistNotes,
    this.rejectionReason,
    required this.createdAt,
    this.verifiedAt,
  });

  factory PharmacyPrescription.fromJson(Map<String, dynamic> json) => PharmacyPrescription(
    id: json['id'] ?? '',
    customerId: json['customerId'] ?? '',
    storeId: json['storeId'],
    patientName: json['patientName'],
    patientAge: json['patientAge'],
    fileUrl: json['fileUrl'] ?? '',
    status: json['status'] ?? 'PENDING_VERIFICATION',
    extractedMedicines: List<String>.from(json['extractedMedicines'] ?? []),
    pharmacistNotes: json['pharmacistNotes'],
    rejectionReason: json['rejectionReason'],
    createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    verifiedAt: json['verifiedAt'] != null ? DateTime.tryParse(json['verifiedAt']) : null,
  );

  bool get isApproved => status == 'VERIFIED_APPROVED';
  bool get isPending => status == 'PENDING_VERIFICATION';
  bool get isRejected => status == 'VERIFIED_REJECTED';
}

/// ── Review ──────────────────────────────────────────────────────────────────
class PharmacyReview {
  final String id;
  final String storeId;
  final String customerId;
  final String? customerName;
  final int rating;
  final String? comment;
  final String? reply;
  final DateTime createdAt;

  const PharmacyReview({
    required this.id,
    required this.storeId,
    required this.customerId,
    this.customerName,
    required this.rating,
    this.comment,
    this.reply,
    required this.createdAt,
  });

  factory PharmacyReview.fromJson(Map<String, dynamic> json) => PharmacyReview(
    id: json['id'] ?? '',
    storeId: json['storeId'] ?? '',
    customerId: json['customerId'] ?? '',
    customerName: json['customerName'],
    rating: json['rating'] ?? 5,
    comment: json['comment'],
    reply: json['reply'],
    createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
  );
}

/// ── Offer / Coupon ──────────────────────────────────────────────────────────
class PharmacyOffer {
  final String id;
  final String title;
  final String code;
  final String type;
  final double value;
  final double minOrderAmount;
  final double? maxDiscountAmount;
  final String? storeId;
  final String? storeName;
  final DateTime? expiresAt;
  final bool isActive;

  const PharmacyOffer({
    required this.id,
    required this.title,
    required this.code,
    required this.type,
    required this.value,
    this.minOrderAmount = 0,
    this.maxDiscountAmount,
    this.storeId,
    this.storeName,
    this.expiresAt,
    this.isActive = true,
  });

  factory PharmacyOffer.fromJson(Map<String, dynamic> json) => PharmacyOffer(
    id: json['id'] ?? '',
    title: json['title'] ?? '',
    code: json['code'] ?? '',
    type: json['type'] ?? 'PERCENTAGE',
    value: (json['value'] ?? 0).toDouble(),
    minOrderAmount: (json['minOrderAmount'] ?? 0).toDouble(),
    maxDiscountAmount: json['maxDiscountAmount']?.toDouble(),
    storeId: json['storeId'],
    storeName: json['storeName'],
    expiresAt: json['expiresAt'] != null ? DateTime.tryParse(json['expiresAt']) : null,
    isActive: json['isActive'] ?? true,
  );

  String get displayValue {
    if (type == 'PERCENTAGE') return '${value.toInt()}% OFF';
    if (type == 'FREE_DELIVERY') return 'Free Delivery';
    return 'KES ${value.toInt()} OFF';
  }
}

/// ── Brand ───────────────────────────────────────────────────────────────────
class PharmacyBrand {
  final String name;
  final int productCount;
  final String? logoUrl;

  const PharmacyBrand({
    required this.name,
    this.productCount = 0,
    this.logoUrl,
  });
}

/// ── Generic Alternative ─────────────────────────────────────────────────────
class MedicineAlternative {
  final String originalName;
  final String alternativeName;
  final String manufacturer;
  final double price;
  final double savings;

  const MedicineAlternative({
    required this.originalName,
    required this.alternativeName,
    required this.manufacturer,
    required this.price,
    required this.savings,
  });
}

/// ── Delivery Slot ───────────────────────────────────────────────────────────
class DeliverySlot {
  final String id;
  final String label;
  final String timeRange;
  final bool isAvailable;
  final bool isExpress;
  final double? extraFee;

  const DeliverySlot({
    required this.id,
    required this.label,
    required this.timeRange,
    this.isAvailable = true,
    this.isExpress = false,
    this.extraFee,
  });
}

/// ── Promo Banner ────────────────────────────────────────────────────────────
class PharmacyBanner {
  final String title;
  final String subtitle;
  final List<Color> gradientColors;
  final String? code;
  final String? route;

  const PharmacyBanner({
    required this.title,
    required this.subtitle,
    required this.gradientColors,
    this.code,
    this.route,
  });
}

/// ── Pharmacy Home Data (aggregate) ──────────────────────────────────────────
class PharmacyHomeData {
  final List<PharmacyCategory> categories;
  final List<PharmacyStore> nearbyStores;
  final List<PharmacyStore> topRatedStores;
  final List<PharmacyStore> fastDeliveryStores;
  final List<PharmacyStore> featuredStores;
  final List<PharmacyProduct> popularProducts;
  final List<PharmacyBanner> banners;
  final List<PharmacyStore> allStores;

  const PharmacyHomeData({
    this.categories = const [],
    this.nearbyStores = const [],
    this.topRatedStores = const [],
    this.fastDeliveryStores = const [],
    this.featuredStores = const [],
    this.popularProducts = const [],
    this.banners = const [],
    this.allStores = const [],
  });
}
