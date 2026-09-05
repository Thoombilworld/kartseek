import 'package:flutter/material.dart';

/// KARTSEEK Marketplace — Core Data Models
/// Canonical source of truth for all marketplace types.
/// Both customer and partner apps should reference these via kartseek_shared_mobile.

class ProductModel {
  final String id;
  final String name;
  final String brand;
  final String sellerId;
  final String sellerName;
  final bool sellerVerified;
  final double price;
  final double mrp;
  final int discount;
  final double rating;
  final int reviewCount;
  final int ratingCount;
  final String categoryId;
  final String categoryName;
  final String? subcategoryId;
  final String? subcategoryName;
  final List<String> images;
  final List<String> tags;
  final String? description;
  final List<ProductSpec> specifications;
  final List<ProductOffer> offers;
  final List<ProductReview> reviews;
  final bool inStock;
  final bool freeDelivery;
  final String? deliveryEstimate;
  final String? returnPolicy;
  final String? warranty;
  final int? stockCount;
  final List<String> highlights;
  final List<ProductVariant> variants;

  // ── New fields synced with Admin Panel & Seller Portal ──────────────────
  final String? hsnCode;
  final double? taxRate;
  final String? taxType; // 'GST', 'VAT', 'NONE'
  final String? sku;
  final String? slug;
  final String? seoTitle;
  final String? seoDescription;
  final String approvalStatus; // 'pending', 'approved', 'rejected', 'suspended'
  final double? weight; // in kg
  final String? dimensions; // "LxWxH cm"
  final String? shippingClass; // 'standard', 'express', 'heavy'
  final String? brandId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // ── Fields from backend Product entity (parity fix) ─────────────────────
  final String? globalTradeItemNumber; // GTIN/UPC/ASIN — for barcode scanning
  final String? shortDescription; // Backend short_description
  final String? longDescription; // Backend long_description
  final Map<String, dynamic>? translations; // Localization data: { "ar": { "name": "..." } }
  final String status; // Product lifecycle: ACTIVE, DRAFT, DISCONTINUED
  final bool isActive; // Soft-delete flag

  // ── Flash deal context ──────────────────────────────────────────────────
  // Present only on rows returned by the flash-deal endpoints. They carry the
  // campaign the product is currently in, so a countdown can run against a real
  // expiry instead of a hardcoded one, and the payable price during the window
  // is the deal price rather than the listing price.
  final double? dealPrice;
  final int? dealDiscountPercent;
  final DateTime? dealStartedAt;
  final DateTime? dealEndsAt;
  /// Units left in this seller's allocation. `null` means uncapped.
  final int? stockRemaining;

  const ProductModel({
    required this.id,
    required this.name,
    required this.brand,
    required this.sellerId,
    required this.sellerName,
    this.sellerVerified = false,
    required this.price,
    this.mrp = 0,
    this.discount = 0,
    this.rating = 0.0,
    this.reviewCount = 0,
    this.ratingCount = 0,
    required this.categoryId,
    required this.categoryName,
    this.subcategoryId,
    this.subcategoryName,
    this.images = const [],
    this.tags = const [],
    this.description,
    this.specifications = const [],
    this.highlights = const [],
    this.offers = const [],
    this.reviews = const [],
    this.inStock = true,
    this.freeDelivery = false,
    this.deliveryEstimate,
    this.returnPolicy = '7 Day Return Policy',
    this.warranty,
    this.stockCount,
    this.variants = const [],
    this.hsnCode,
    this.taxRate,
    this.taxType,
    this.sku,
    this.slug,
    this.seoTitle,
    this.seoDescription,
    this.approvalStatus = 'approved',
    this.weight,
    this.dimensions,
    this.shippingClass,
    this.brandId,
    this.createdAt,
    this.updatedAt,
    this.globalTradeItemNumber,
    this.shortDescription,
    this.longDescription,
    this.translations,
    this.status = 'ACTIVE',
    this.isActive = true,
    this.dealPrice,
    this.dealDiscountPercent,
    this.dealStartedAt,
    this.dealEndsAt,
    this.stockRemaining,
  });

  /// Whether this row is inside a live flash-deal window right now.
  bool get isOnFlashDeal {
    final ends = dealEndsAt;
    if (ends == null) return false;
    final now = DateTime.now();
    return ends.isAfter(now) && (dealStartedAt == null || !dealStartedAt!.isAfter(now));
  }

  /// What the customer actually pays — the deal price while a deal is live.
  double get payablePrice => isOnFlashDeal ? (dealPrice ?? price) : price;

  factory ProductModel.fromJson(Map<String, dynamic> json) => ProductModel(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        brand: json['brand'] ?? '',
        sellerId: json['sellerId'] ?? '',
        sellerName: json['sellerName'] ?? '',
        sellerVerified: json['sellerVerified'] ?? false,
        price: (json['price'] ?? 0).toDouble(),
        mrp: (json['mrp'] ?? 0).toDouble(),
        discount: json['discount'] ?? 0,
        rating: (json['rating'] ?? 0).toDouble(),
        reviewCount: json['reviewCount'] ?? 0,
        ratingCount: json['ratingCount'] ?? 0,
        categoryId: json['categoryId'] ?? '',
        categoryName: json['categoryName'] ?? '',
        subcategoryId: json['subcategoryId'],
        subcategoryName: json['subcategoryName'],
        images: List<String>.from(json['images'] ?? []),
        tags: List<String>.from(json['tags'] ?? []),
        description: json['description'],
        specifications: (json['specifications'] as List?)
                ?.map((s) => ProductSpec.fromJson(s))
                .toList() ??
            [],
        highlights: List<String>.from(json['highlights'] ?? []),
        offers: (json['offers'] as List?)
                ?.map((o) => ProductOffer.fromJson(o))
                .toList() ??
            [],
        reviews: (json['reviews'] as List?)
                ?.map((r) => ProductReview.fromJson(r))
                .toList() ??
            [],
        variants: (json['variants'] as List?)
                ?.map((v) => ProductVariant.fromJson(v))
                .toList() ??
            [],
        inStock: json['inStock'] ?? true,
        freeDelivery: json['freeDelivery'] ?? false,
        deliveryEstimate: json['deliveryEstimate'],
        returnPolicy: json['returnPolicy'] ?? '7 Day Return Policy',
        warranty: json['warranty'],
        stockCount: json['stockCount'],
        hsnCode: json['hsnCode'],
        taxRate: (json['taxRate'] as num?)?.toDouble(),
        taxType: json['taxType'],
        sku: json['sku'],
        slug: json['slug'],
        seoTitle: json['seoTitle'],
        seoDescription: json['seoDescription'],
        approvalStatus: json['approvalStatus'] ?? 'approved',
        weight: (json['weight'] as num?)?.toDouble(),
        dimensions: json['dimensions'],
        shippingClass: json['shippingClass'],
        brandId: json['brandId'],
        createdAt: json['createdAt'] != null
            ? DateTime.tryParse(json['createdAt'])
            : null,
        updatedAt: json['updatedAt'] != null
            ? DateTime.tryParse(json['updatedAt'])
            : null,
        globalTradeItemNumber: json['globalTradeItemNumber'],
        shortDescription: json['shortDescription'] ?? json['short_description'],
        longDescription: json['longDescription'] ?? json['long_description'],
        translations: json['translations'] is Map ? Map<String, dynamic>.from(json['translations']) : null,
        status: json['status'] ?? 'ACTIVE',
        isActive: json['isActive'] ?? json['is_active'] ?? true,
        // Only the flash-deal endpoints send these; everywhere else they stay
        // null and `payablePrice` falls back to the listing price.
        dealPrice: (json['dealPrice'] as num?)?.toDouble(),
        dealDiscountPercent: (json['dealDiscountPercent'] as num?)?.toInt(),
        dealStartedAt: json['dealStartedAt'] != null
            ? DateTime.tryParse(json['dealStartedAt'].toString())
            : null,
        dealEndsAt: json['dealEndsAt'] != null
            ? DateTime.tryParse(json['dealEndsAt'].toString())
            : null,
        stockRemaining: (json['stockRemaining'] as num?)?.toInt(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'brand': brand,
        'sellerId': sellerId,
        'sellerName': sellerName,
        'sellerVerified': sellerVerified,
        'price': price,
        'mrp': mrp,
        'discount': discount,
        'rating': rating,
        'reviewCount': reviewCount,
        'ratingCount': ratingCount,
        'categoryId': categoryId,
        'categoryName': categoryName,
        'subcategoryId': subcategoryId,
        'subcategoryName': subcategoryName,
        'images': images,
        'tags': tags,
        'description': description,
        'highlights': highlights,
        'specifications': specifications.map((s) => s.toJson()).toList(),
        'offers': offers.map((o) => o.toJson()).toList(),
        'reviews': reviews.map((r) => r.toJson()).toList(),
        'variants': variants.map((v) => v.toJson()).toList(),
        'inStock': inStock,
        'freeDelivery': freeDelivery,
        'deliveryEstimate': deliveryEstimate,
        'returnPolicy': returnPolicy,
        'warranty': warranty,
        'stockCount': stockCount,
        'hsnCode': hsnCode,
        'taxRate': taxRate,
        'taxType': taxType,
        'sku': sku,
        'slug': slug,
        'seoTitle': seoTitle,
        'seoDescription': seoDescription,
        'approvalStatus': approvalStatus,
        'weight': weight,
        'dimensions': dimensions,
        'shippingClass': shippingClass,
        'brandId': brandId,
        'createdAt': createdAt?.toIso8601String(),
        'updatedAt': updatedAt?.toIso8601String(),
        'globalTradeItemNumber': globalTradeItemNumber,
        'shortDescription': shortDescription,
        'longDescription': longDescription,
        'translations': translations,
        'status': status,
        'isActive': isActive,
      };

  ProductModel copyWith({
    String? id,
    String? name,
    String? brand,
    String? sellerId,
    String? sellerName,
    bool? sellerVerified,
    double? price,
    double? mrp,
    int? discount,
    double? rating,
    int? reviewCount,
    int? ratingCount,
    String? categoryId,
    String? categoryName,
    String? subcategoryId,
    String? subcategoryName,
    List<String>? images,
    List<String>? tags,
    String? description,
    List<ProductSpec>? specifications,
    List<String>? highlights,
    List<ProductOffer>? offers,
    List<ProductReview>? reviews,
    List<ProductVariant>? variants,
    bool? inStock,
    bool? freeDelivery,
    String? deliveryEstimate,
    String? returnPolicy,
    String? warranty,
    int? stockCount,
    String? hsnCode,
    double? taxRate,
    String? taxType,
    String? sku,
    String? slug,
    String? seoTitle,
    String? seoDescription,
    String? approvalStatus,
    double? weight,
    String? dimensions,
    String? shippingClass,
    String? brandId,
  }) =>
      ProductModel(
        id: id ?? this.id,
        name: name ?? this.name,
        brand: brand ?? this.brand,
        sellerId: sellerId ?? this.sellerId,
        sellerName: sellerName ?? this.sellerName,
        sellerVerified: sellerVerified ?? this.sellerVerified,
        price: price ?? this.price,
        mrp: mrp ?? this.mrp,
        discount: discount ?? this.discount,
        rating: rating ?? this.rating,
        reviewCount: reviewCount ?? this.reviewCount,
        ratingCount: ratingCount ?? this.ratingCount,
        categoryId: categoryId ?? this.categoryId,
        categoryName: categoryName ?? this.categoryName,
        subcategoryId: subcategoryId ?? this.subcategoryId,
        subcategoryName: subcategoryName ?? this.subcategoryName,
        images: images ?? this.images,
        tags: tags ?? this.tags,
        description: description ?? this.description,
        specifications: specifications ?? this.specifications,
        highlights: highlights ?? this.highlights,
        offers: offers ?? this.offers,
        reviews: reviews ?? this.reviews,
        variants: variants ?? this.variants,
        inStock: inStock ?? this.inStock,
        freeDelivery: freeDelivery ?? this.freeDelivery,
        deliveryEstimate: deliveryEstimate ?? this.deliveryEstimate,
        returnPolicy: returnPolicy ?? this.returnPolicy,
        warranty: warranty ?? this.warranty,
        stockCount: stockCount ?? this.stockCount,
        hsnCode: hsnCode ?? this.hsnCode,
        taxRate: taxRate ?? this.taxRate,
        taxType: taxType ?? this.taxType,
        sku: sku ?? this.sku,
        slug: slug ?? this.slug,
        seoTitle: seoTitle ?? this.seoTitle,
        seoDescription: seoDescription ?? this.seoDescription,
        approvalStatus: approvalStatus ?? this.approvalStatus,
        weight: weight ?? this.weight,
        dimensions: dimensions ?? this.dimensions,
        shippingClass: shippingClass ?? this.shippingClass,
        brandId: brandId ?? this.brandId,
        createdAt: createdAt,
        updatedAt: updatedAt,
        globalTradeItemNumber: globalTradeItemNumber,
        shortDescription: shortDescription,
        longDescription: longDescription,
        translations: translations,
        status: status,
        isActive: isActive,
      );
}

class ProductSpec {
  final String label;
  final String value;
  const ProductSpec({required this.label, required this.value});

  factory ProductSpec.fromJson(Map<String, dynamic> json) => ProductSpec(
        label: json['label'] ?? '',
        value: json['value'] ?? '',
      );

  Map<String, dynamic> toJson() => {'label': label, 'value': value};
}

class ProductOffer {
  final String title;
  final String description;
  final String? code;
  const ProductOffer(
      {required this.title, required this.description, this.code});

  factory ProductOffer.fromJson(Map<String, dynamic> json) => ProductOffer(
        title: json['title'] ?? '',
        description: json['description'] ?? '',
        code: json['code'],
      );

  Map<String, dynamic> toJson() =>
      {'title': title, 'description': description, 'code': code};
}

class ProductReview {
  final String id;
  final String userName;
  final double rating;
  final String comment;
  final String date;
  final int helpfulCount;
  final List<String> images;
  const ProductReview({
    required this.id,
    required this.userName,
    required this.rating,
    required this.comment,
    required this.date,
    this.helpfulCount = 0,
    this.images = const [],
  });

  factory ProductReview.fromJson(Map<String, dynamic> json) => ProductReview(
        id: json['id'] ?? '',
        userName: json['userName'] ?? json['user_name'] ?? 'Anonymous',
        rating: (json['rating'] ?? 0).toDouble(),
        comment: json['comment'] ?? '',
        date: json['date'] ?? '',
        helpfulCount: json['helpfulCount'] ?? json['helpful_count'] ?? 0,
        images: List<String>.from(json['images'] ?? []),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userName': userName,
        'rating': rating,
        'comment': comment,
        'date': date,
        'helpfulCount': helpfulCount,
        'images': images,
      };
}

/// Product variant — maps 1:1 with backend `ProductVariant` entity.
///
/// Each variant represents a unique attribute combination (e.g. color × size)
/// with its own pricing, stock, and images.
class ProductVariant {
  final String id;
  final String? productId;
  final String? sku;
  final String? barcode;
  final Map<String, String> attributes; // e.g. {"color": "Blue", "size": "256GB"}
  final String variantName; // Human-readable, e.g. "Midnight Blue - 256GB"
  final double mrp;
  final double sellingPrice;
  final double? costPrice;
  final int stockQuantity;
  final int lowStockThreshold;
  final double? weightKg;
  final Map<String, double>? dimensions; // {length, width, height} in cm
  final List<String> imageUrls;
  final bool isActive;
  final int sortOrder;
  final String? sellerId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const ProductVariant({
    required this.id,
    this.productId,
    this.sku,
    this.barcode,
    this.attributes = const {},
    required this.variantName,
    this.mrp = 0,
    this.sellingPrice = 0,
    this.costPrice,
    this.stockQuantity = 0,
    this.lowStockThreshold = 5,
    this.weightKg,
    this.dimensions,
    this.imageUrls = const [],
    this.isActive = true,
    this.sortOrder = 0,
    this.sellerId,
    this.createdAt,
    this.updatedAt,
  });

  /// Whether this variant is in stock.
  bool get inStock => stockQuantity > 0 && isActive;

  /// Discount percentage from MRP.
  int get discount => mrp > 0 ? ((1 - sellingPrice / mrp) * 100).round().clamp(0, 99) : 0;

  /// Backward-compatible factory that handles both old (name/type/priceModifier)
  /// and new (variantName/attributes/sellingPrice) JSON shapes.
  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    // Parse attributes — handle both jsonb object and legacy "type" string
    Map<String, String> attrs = {};
    if (json['attributes'] is Map) {
      attrs = (json['attributes'] as Map).map((k, v) => MapEntry(k.toString(), v.toString()));
    } else if (json['type'] != null) {
      attrs = {'type': json['type'].toString()};
    }

    // Parse dimensions
    Map<String, double>? dims;
    if (json['dimensions'] is Map) {
      dims = (json['dimensions'] as Map).map(
        (k, v) => MapEntry(k.toString(), (v as num?)?.toDouble() ?? 0),
      );
    }

    return ProductVariant(
      id: json['id'] ?? '',
      productId: json['productId'],
      sku: json['sku'],
      barcode: json['barcode'],
      attributes: attrs,
      variantName: json['variantName'] ?? json['name'] ?? '',
      mrp: (json['mrp'] as num?)?.toDouble() ?? 0,
      sellingPrice: (json['sellingPrice'] ?? json['price'] ?? json['priceModifier'] ?? 0).toDouble(),
      costPrice: (json['costPrice'] as num?)?.toDouble(),
      stockQuantity: json['stockQuantity'] ?? json['stockCount'] ?? 0,
      lowStockThreshold: json['lowStockThreshold'] ?? 5,
      weightKg: (json['weightKg'] as num?)?.toDouble(),
      dimensions: dims,
      imageUrls: List<String>.from(json['imageUrls'] ?? json['images'] ?? []),
      isActive: json['isActive'] ?? json['inStock'] ?? true,
      sortOrder: json['sortOrder'] ?? 0,
      sellerId: json['sellerId'],
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'productId': productId,
        'sku': sku,
        'barcode': barcode,
        'attributes': attributes,
        'variantName': variantName,
        'mrp': mrp,
        'sellingPrice': sellingPrice,
        'costPrice': costPrice,
        'stockQuantity': stockQuantity,
        'lowStockThreshold': lowStockThreshold,
        'weightKg': weightKg,
        'dimensions': dimensions,
        'imageUrls': imageUrls,
        'isActive': isActive,
        'sortOrder': sortOrder,
        'sellerId': sellerId,
        'createdAt': createdAt?.toIso8601String(),
        'updatedAt': updatedAt?.toIso8601String(),
      };
}

class CategoryModel {
  final String id;
  final String name;
  final String? iconEmoji;
  final String? imageUrl;
  final int productCount;
  final List<SubcategoryModel> subcategories;
  const CategoryModel({
    required this.id,
    required this.name,
    this.iconEmoji,
    this.imageUrl,
    this.productCount = 0,
    this.subcategories = const [],
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) => CategoryModel(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        iconEmoji: json['iconEmoji'] ?? json['icon'],
        imageUrl: json['imageUrl'],
        productCount: json['productCount'] ?? 0,
        subcategories: (json['subcategories'] as List?)
                ?.map((s) => SubcategoryModel.fromJson(s))
                .toList() ??
            [],
      );
}

class SubcategoryModel {
  final String id;
  final String name;
  final String parentId;
  final int productCount;
  const SubcategoryModel({
    required this.id,
    required this.name,
    required this.parentId,
    this.productCount = 0,
  });

  factory SubcategoryModel.fromJson(Map<String, dynamic> json) =>
      SubcategoryModel(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        parentId: json['parentId'] ?? json['categoryId'] ?? '',
        productCount: json['productCount'] ?? 0,
      );
}

class BrandModel {
  final String id;
  final String name;
  final String? logoUrl;
  final String? description;
  final int productCount;
  final double rating;
  final bool verified;
  const BrandModel({
    required this.id,
    required this.name,
    this.logoUrl,
    this.description,
    this.productCount = 0,
    this.rating = 0.0,
    this.verified = false,
  });

  factory BrandModel.fromJson(Map<String, dynamic> json) => BrandModel(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        logoUrl: json['logoUrl'] ?? json['logo'],
        description: json['description'],
        productCount: json['productCount'] ?? 0,
        rating: (json['rating'] ?? 0).toDouble(),
        verified: json['verified'] ?? false,
      );
}

class SellerModel {
  final String id;
  final String name;
  final String? logoUrl;
  final double rating;
  final int productCount;
  final bool verified;
  final String? description;
  final String? location;
  final String? since;
  final int followerCount;
  const SellerModel({
    required this.id,
    required this.name,
    this.logoUrl,
    this.rating = 0.0,
    this.productCount = 0,
    this.verified = false,
    this.description,
    this.location,
    this.since,
    this.followerCount = 0,
  });

  factory SellerModel.fromJson(Map<String, dynamic> json) => SellerModel(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        logoUrl: json['logoUrl'] ?? json['logo'],
        rating: (json['rating'] ?? 0).toDouble(),
        productCount: json['productCount'] ?? 0,
        verified: json['verified'] ?? false,
        description: json['description'],
        location: json['location'],
        since: json['since'],
        followerCount: json['followerCount'] ?? 0,
      );
}

class CartItemModel {
  final String id;
  final String? productId;
  final ProductModel product;
  final int quantity;
  final String? selectedVariantId;
  final String? variantLabel;
  const CartItemModel({
    required this.id,
    this.productId,
    required this.product,
    this.quantity = 1,
    this.selectedVariantId,
    this.variantLabel,
  });

  factory CartItemModel.fromJson(Map<String, dynamic> json) => CartItemModel(
        id: json['id'] ?? '',
        productId: json['productId'],
        product: ProductModel.fromJson(json['product'] ?? {}),
        quantity: json['quantity'] ?? 1,
        selectedVariantId: json['selectedVariantId'] ?? json['variantId'],
        variantLabel: json['variantLabel'],
      );

  double get lineTotal => product.price * quantity;
}

class OrderModel {
  final String id;
  final List<OrderItemModel> items;
  final double total;
  final double subtotal;
  final double deliveryFee;
  final double discount;
  final double tax;
  final String status;
  final String paymentMethod;
  final String paymentStatus;
  final String date;
  final AddressModel? address;
  final DateTime? createdAt;
  final DateTime? deliveredAt;
  final String? trackingId;
  final String? courier;
  final String? cancelReason;
  final String? estimatedDelivery;
  const OrderModel({
    required this.id,
    required this.items,
    required this.total,
    this.subtotal = 0,
    this.deliveryFee = 0,
    this.discount = 0,
    this.tax = 0,
    required this.status,
    this.paymentMethod = 'COD',
    this.paymentStatus = 'pending',
    this.date = '',
    this.address,
    this.createdAt,
    this.deliveredAt,
    this.trackingId,
    this.courier,
    this.cancelReason,
    this.estimatedDelivery,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) => OrderModel(
        id: json['id'] ?? '',
        items: (json['items'] as List?)
                ?.map((i) => OrderItemModel.fromJson(i))
                .toList() ??
            [],
        total: (json['total'] ?? 0).toDouble(),
        subtotal: (json['subtotal'] ?? 0).toDouble(),
        deliveryFee: (json['deliveryFee'] ?? 0).toDouble(),
        discount: (json['discount'] ?? 0).toDouble(),
        tax: (json['tax'] ?? 0).toDouble(),
        status: json['status'] ?? 'pending',
        paymentMethod: json['paymentMethod'] ?? 'COD',
        paymentStatus: json['paymentStatus'] ?? 'pending',
        date: json['date'] ?? '',
        address: json['address'] != null
            ? AddressModel.fromJson(json['address'])
            : null,
        createdAt: json['createdAt'] != null
            ? DateTime.tryParse(json['createdAt'])
            : null,
        deliveredAt: json['deliveredAt'] != null
            ? DateTime.tryParse(json['deliveredAt'])
            : null,
        trackingId: json['trackingId'],
        courier: json['courier'],
        cancelReason: json['cancelReason'],
        estimatedDelivery: json['estimatedDelivery'],
      );
}

class OrderItemModel {
  final String productId;
  final String productName;
  final String? productImage;
  final String? sellerName;
  final String? status;
  final double price;
  final int quantity;
  final String? variant;
  const OrderItemModel({
    required this.productId,
    required this.productName,
    this.productImage,
    this.sellerName,
    this.status,
    required this.price,
    this.quantity = 1,
    this.variant,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) => OrderItemModel(
        productId: json['productId'] ?? '',
        productName: json['productName'] ?? '',
        productImage: json['productImage'],
        sellerName: json['sellerName'],
        status: json['status'],
        price: (json['price'] ?? 0).toDouble(),
        quantity: json['quantity'] ?? 1,
        variant: json['variant'],
      );
}

class AddressModel {
  final String id;
  final String label;
  final String fullAddress;
  final String city;
  final String state;
  final String pincode;
  final String phone;
  final String type;
  final bool isDefault;
  const AddressModel({
    required this.id,
    required this.label,
    required this.fullAddress,
    required this.city,
    required this.state,
    required this.pincode,
    required this.phone,
    this.type = 'home',
    this.isDefault = false,
  });

  factory AddressModel.fromJson(Map<String, dynamic> json) => AddressModel(
        id: json['id'] ?? '',
        label: json['label'] ?? '',
        fullAddress: json['fullAddress'] ?? json['address'] ?? '',
        city: json['city'] ?? '',
        state: json['state'] ?? '',
        pincode: json['pincode'] ?? json['zipCode'] ?? '',
        phone: json['phone'] ?? '',
        type: json['type'] ?? 'home',
        isDefault: json['isDefault'] ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'fullAddress': fullAddress,
        'city': city,
        'state': state,
        'pincode': pincode,
        'phone': phone,
        'type': type,
        'isDefault': isDefault,
      };
}

class ProductFilter {
  final String? categoryId;
  final String? subcategoryId;
  final String? brandId;
  final String? sellerId;
  final String? query;
  final double? minPrice;
  final double? maxPrice;
  final double? minRating;
  final int? minDiscount;
  final bool? inStockOnly;
  final bool? freeDeliveryOnly;
  final String? sortBy;
  final double? lat;
  final double? lng;
  final int page;
  final int limit;
  const ProductFilter({
    this.categoryId,
    this.subcategoryId,
    this.brandId,
    this.sellerId,
    this.query,
    this.minPrice,
    this.maxPrice,
    this.minRating,
    this.minDiscount,
    this.inStockOnly,
    this.freeDeliveryOnly,
    this.sortBy,
    this.lat,
    this.lng,
    this.page = 1,
    this.limit = 20,
  });

  ProductFilter copyWith({
    String? categoryId,
    String? subcategoryId,
    String? brandId,
    String? sellerId,
    String? query,
    double? minPrice,
    double? maxPrice,
    double? minRating,
    int? minDiscount,
    bool? inStockOnly,
    bool? freeDeliveryOnly,
    String? sortBy,
    double? lat,
    double? lng,
    int? page,
    int? limit,
  }) =>
      ProductFilter(
        categoryId: categoryId ?? this.categoryId,
        subcategoryId: subcategoryId ?? this.subcategoryId,
        brandId: brandId ?? this.brandId,
        sellerId: sellerId ?? this.sellerId,
        query: query ?? this.query,
        minPrice: minPrice ?? this.minPrice,
        maxPrice: maxPrice ?? this.maxPrice,
        minRating: minRating ?? this.minRating,
        minDiscount: minDiscount ?? this.minDiscount,
        inStockOnly: inStockOnly ?? this.inStockOnly,
        freeDeliveryOnly: freeDeliveryOnly ?? this.freeDeliveryOnly,
        sortBy: sortBy ?? this.sortBy,
        lat: lat ?? this.lat,
        lng: lng ?? this.lng,
        page: page ?? this.page,
        limit: limit ?? this.limit,
      );

  Map<String, String> toQueryParams() {
    final params = <String, String>{};
    if (categoryId != null) params['category'] = categoryId!;
    if (subcategoryId != null) params['subcategory'] = subcategoryId!;
    if (brandId != null) params['brand'] = brandId!;
    if (sellerId != null) params['seller'] = sellerId!;
    if (query != null && query!.isNotEmpty) params['q'] = query!;
    if (minPrice != null) params['minPrice'] = minPrice!.toString();
    if (maxPrice != null) params['maxPrice'] = maxPrice!.toString();
    if (sortBy != null) params['sort'] = sortBy!;
    if (lat != null) params['lat'] = lat!.toString();
    if (lng != null) params['lng'] = lng!.toString();
    params['page'] = page.toString();
    params['limit'] = limit.toString();
    return params;
  }
}

class PromotionModel {
  final String id;
  final String title;
  final String subtitle;
  final String? imageUrl;
  final List<Color>? gradientColors;
  final String? actionRoute;
  const PromotionModel({
    required this.id,
    required this.title,
    required this.subtitle,
    this.imageUrl,
    this.gradientColors,
    this.actionRoute,
  });

  factory PromotionModel.fromJson(Map<String, dynamic> json) => PromotionModel(
        id: json['id'] ?? '',
        title: json['title'] ?? '',
        subtitle: json['subtitle'] ?? '',
        imageUrl: json['imageUrl'],
        actionRoute: json['actionRoute'],
      );
}

class MarketplaceHomeData {
  final List<PromotionModel> banners;
  final List<CategoryModel> categories;
  final List<ProductModel> dealOfDay;
  final List<ProductModel> flashDeals;
  final List<ProductModel> trending;
  final List<ProductModel> bestSellers;
  final List<ProductModel> featuredProducts;
  final List<ProductModel> newArrivals;
  final List<ProductModel> recommended;
  final List<BrandModel> topBrands;
  final List<BrandModel> featuredBrands;
  final List<SellerModel> verifiedSellers;
  final List<ProductModel> recentlyViewed;

  // ── New fields for visual parity with web marketplace ────────────────────
  final List<TrustBadge> trustBadges;
  final List<CampaignBanner> campaignBanners;
  final List<CountryBanner> countryBanners;
  final Map<String, List<BrandPromo>> brandPromos;
  final List<FAQItem> faq;

  const MarketplaceHomeData({
    this.banners = const [],
    this.categories = const [],
    this.dealOfDay = const [],
    this.flashDeals = const [],
    this.trending = const [],
    this.bestSellers = const [],
    this.featuredProducts = const [],
    this.newArrivals = const [],
    this.recommended = const [],
    this.topBrands = const [],
    this.featuredBrands = const [],
    this.verifiedSellers = const [],
    this.recentlyViewed = const [],
    this.trustBadges = const [],
    this.campaignBanners = const [],
    this.countryBanners = const [],
    this.brandPromos = const {},
    this.faq = const [],
  });

  factory MarketplaceHomeData.fromJson(Map<String, dynamic> json) =>
      MarketplaceHomeData(
        banners: (json['banners'] as List?)
                ?.map((b) => PromotionModel.fromJson(b))
                .toList() ??
            (json['heroBanners'] as List?)
                ?.map((b) => PromotionModel.fromJson(b))
                .toList() ??
            [],
        categories: (json['categories'] as List?)
                ?.map((c) => CategoryModel.fromJson(c))
                .toList() ??
            [],
        dealOfDay: (json['dealOfDay'] as List?)
                ?.map((p) => ProductModel.fromJson(p))
                .toList() ??
            (json['dealsOfDay'] as List?)
                ?.map((p) => ProductModel.fromJson(p))
                .toList() ??
            [],
        flashDeals: (json['flashDeals'] as List?)
                ?.map((p) => ProductModel.fromJson(p))
                .toList() ??
            [],
        trending: (json['trending'] as List?)
                ?.map((p) => ProductModel.fromJson(p))
                .toList() ??
            [],
        bestSellers: (json['bestSellers'] as List?)
                ?.map((p) => ProductModel.fromJson(p))
                .toList() ??
            [],
        featuredProducts: (json['featuredProducts'] as List?)
                ?.map((p) => ProductModel.fromJson(p))
                .toList() ??
            [],
        newArrivals: (json['newArrivals'] as List?)
                ?.map((p) => ProductModel.fromJson(p))
                .toList() ??
            [],
        recommended: (json['recommended'] as List?)
                ?.map((p) => ProductModel.fromJson(p))
                .toList() ??
            [],
        topBrands: (json['topBrands'] as List?)
                ?.map((b) => BrandModel.fromJson(b))
                .toList() ??
            [],
        featuredBrands: (json['featuredBrands'] as List?)
                ?.map((b) => BrandModel.fromJson(b))
                .toList() ??
            [],
        verifiedSellers: (json['verifiedSellers'] as List?)
                ?.map((s) => SellerModel.fromJson(s))
                .toList() ??
            [],
        recentlyViewed: (json['recentlyViewed'] as List?)
                ?.map((p) => ProductModel.fromJson(p))
                .toList() ??
            [],
        trustBadges: (json['trustBadges'] as List?)
                ?.map((t) => TrustBadge.fromJson(t))
                .toList() ??
            [],
        campaignBanners: (json['campaignBanners'] as List?)
                ?.map((c) => CampaignBanner.fromJson(c))
                .toList() ??
            [],
        countryBanners: (json['countryBanners'] as List?)
                ?.map((c) => CountryBanner.fromJson(c))
                .toList() ??
            [],
        brandPromos: _parseBrandPromos(json['brandPromos']),
        faq: (json['faq'] as List?)?.map((f) => FAQItem.fromJson(f)).toList() ??
            [],
      );

  static Map<String, List<BrandPromo>> _parseBrandPromos(dynamic data) {
    if (data == null || data is! Map) return {};
    final result = <String, List<BrandPromo>>{};
    for (final entry in (data).entries) {
      if (entry.value is List) {
        result[entry.key.toString()] = (entry.value as List)
            .map((b) => BrandPromo.fromJson(b as Map<String, dynamic>))
            .toList();
      }
    }
    return result;
  }
}

// ══════════════════════════════════════════════════════════════════════════
// NEW MODELS — Visual parity with web marketplace
// ══════════════════════════════════════════════════════════════════════════

/// Trust badge displayed below the hero banner carousel.
class TrustBadge {
  final String id;
  final String icon; // Lucide icon name: 'Truck', 'ShieldCheck', etc.
  final String title;
  final String subtitle;
  final String colorHex; // Accent color

  const TrustBadge({
    required this.id,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.colorHex = '#2563EB',
  });

  factory TrustBadge.fromJson(Map<String, dynamic> json) => TrustBadge(
        id: json['id'] ?? '',
        icon: json['icon'] ?? 'Star',
        title: json['title'] ?? '',
        subtitle: json['subtitle'] ?? '',
        colorHex: json['color'] ?? json['colorHex'] ?? '#2563EB',
      );
}

/// Campaign/promotional banner with gradient background.
class CampaignBanner {
  final String id;
  final String tag;
  final String headline;
  final String subheadline;
  final String cta;
  final String ctaHref;
  final String gradient; // CSS gradient class or hex stops
  final String status;

  const CampaignBanner({
    required this.id,
    required this.tag,
    required this.headline,
    this.subheadline = '',
    this.cta = 'Shop Now',
    this.ctaHref = '/marketplace',
    this.gradient = '',
    this.status = 'active',
  });

  factory CampaignBanner.fromJson(Map<String, dynamic> json) => CampaignBanner(
        id: json['id'] ?? '',
        tag: json['tag'] ?? '',
        headline: json['headline'] ?? '',
        subheadline: json['subheadline'] ?? '',
        cta: json['cta'] ?? 'Shop Now',
        ctaHref: json['ctaHref'] ?? '/marketplace',
        gradient: json['gradient'] ?? '',
        status: json['status'] ?? 'active',
      );
}

/// Country-specific promotional banner.
class CountryBanner {
  final String id;
  final String country;
  final String flag;
  final String headline;
  final String subtitle;
  final String href;

  const CountryBanner({
    required this.id,
    required this.country,
    required this.flag,
    required this.headline,
    this.subtitle = '',
    this.href = '/marketplace',
  });

  factory CountryBanner.fromJson(Map<String, dynamic> json) => CountryBanner(
        id: json['id'] ?? '',
        country: json['country'] ?? '',
        flag: json['flag'] ?? '🌐',
        headline: json['headline'] ?? '',
        subtitle: json['subtitle'] ?? '',
        href: json['href'] ?? '/marketplace',
      );
}

/// Brand promo card with gradient background for category sections.
class BrandPromo {
  final String id;
  final String name;
  final String tagline;
  final String discount;
  final List<Color> gradientColors;
  final Color textColor;

  const BrandPromo({
    required this.id,
    required this.name,
    this.tagline = '',
    this.discount = '',
    this.gradientColors = const [Color(0xFF1E293B), Color(0xFF334155)],
    this.textColor = const Color(0xFFFFFFFF),
  });

  factory BrandPromo.fromJson(Map<String, dynamic> json) {
    // Parse gradient from backend 'color' field (CSS class) into Flutter colors
    final colorStr = json['color'] ?? '';
    final colors = _parseGradientColors(colorStr);
    return BrandPromo(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      tagline: json['tagline'] ?? '',
      discount: json['discount'] ?? '',
      gradientColors: colors,
    );
  }

  static List<Color> _parseGradientColors(String cssClass) {
    // Map common Tailwind gradient classes to Flutter colors
    if (cssClass.contains('slate-900')) {
      return [const Color(0xFF0F172A), const Color(0xFF475569)];
    }
    if (cssClass.contains('blue-900')) {
      return [const Color(0xFF1E3A5F), const Color(0xFF2563EB)];
    }
    if (cssClass.contains('amber-900')) {
      return [const Color(0xFF78350F), const Color(0xFFD97706)];
    }
    if (cssClass.contains('red-900')) {
      return [const Color(0xFF7F1D1D), const Color(0xFFDC2626)];
    }
    if (cssClass.contains('orange-600')) {
      return [const Color(0xFFEA580C), const Color(0xFFF59E0B)];
    }
    if (cssClass.contains('rose-800')) {
      return [const Color(0xFF9F1239), const Color(0xFFEC4899)];
    }
    if (cssClass.contains('emerald-800')) {
      return [const Color(0xFF065F46), const Color(0xFF14B8A6)];
    }
    if (cssClass.contains('violet-900')) {
      return [const Color(0xFF4C1D95), const Color(0xFF7C3AED)];
    }
    if (cssClass.contains('cyan-800')) {
      return [const Color(0xFF155E75), const Color(0xFF2563EB)];
    }
    if (cssClass.contains('pink-700')) {
      return [const Color(0xFFBE185D), const Color(0xFFF43F5E)];
    }
    if (cssClass.contains('fuchsia-700')) {
      return [const Color(0xFFA21CAF), const Color(0xFFEC4899)];
    }
    if (cssClass.contains('blue-800')) {
      return [const Color(0xFF1E40AF), const Color(0xFF4F46E5)];
    }
    if (cssClass.contains('green-800')) {
      return [const Color(0xFF166534), const Color(0xFF059669)];
    }
    if (cssClass.contains('red-700')) {
      return [const Color(0xFFB91C1C), const Color(0xFFF97316)];
    }
    if (cssClass.contains('blue-700')) {
      return [const Color(0xFF1D4ED8), const Color(0xFF0EA5E9)];
    }
    if (cssClass.contains('cyan-700')) {
      return [const Color(0xFF0E7490), const Color(0xFF14B8A6)];
    }
    return [const Color(0xFF1E293B), const Color(0xFF475569)];
  }
}

/// FAQ item for the marketplace bottom section.
class FAQItem {
  final String question;
  final String answer;

  const FAQItem({required this.question, required this.answer});

  factory FAQItem.fromJson(Map<String, dynamic> json) => FAQItem(
        question: json['q'] ?? json['question'] ?? '',
        answer: json['a'] ?? json['answer'] ?? '',
      );
}
