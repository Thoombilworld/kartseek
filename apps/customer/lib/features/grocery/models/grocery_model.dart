class GroceryStoreModel {
  final String id;
  final String name;
  final double rating;
  final String deliveryTime;
  final String distance;
  final String imageUrl;
  final List<String> tags;
  final bool isPromoted;

  GroceryStoreModel({
    required this.id,
    required this.name,
    required this.rating,
    required this.deliveryTime,
    required this.distance,
    required this.imageUrl,
    required this.tags,
    this.isPromoted = false,
  });

  factory GroceryStoreModel.fromJson(Map<String, dynamic> json) {
    return GroceryStoreModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      rating: (json['rating'] ?? 4.5).toDouble(),
      deliveryTime: json['deliveryTime'] ?? '15-30 min',
      distance: json['distance'] ?? '2.0 km',
      imageUrl: json['imageUrl'] ?? '',
      tags: List<String>.from(json['tags'] ?? []),
      isPromoted: json['isPromoted'] ?? false,
    );
  }
}

/// Matches the API response shape from GET /grocery/categories
/// (see apps/api/apps/grocery-service/src/grocery.service.ts CANONICAL_CATEGORIES)
class GroceryCategoryModel {
  final String id;
  final String name;
  final String emoji;
  final String gradient;
  final String description;
  final int productCount;

  /// Admin-configured image URL. When non-null, rendered instead of emoji.
  final String? imageUrl;

  /// Number of direct subcategories (full subcategory tree loaded separately).
  final int subcategoryCount;

  const GroceryCategoryModel({
    required this.id,
    required this.name,
    this.emoji = '🛒',
    this.gradient = 'from-green-600 to-emerald-500',
    this.description = '',
    this.productCount = 0,
    this.imageUrl,
    this.subcategoryCount = 0,
  });

  factory GroceryCategoryModel.fromJson(Map<String, dynamic> json) {
    return GroceryCategoryModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      emoji: json['emoji'] as String? ?? '🛒',
      gradient: json['gradient'] as String? ?? 'from-green-600 to-emerald-500',
      description: json['description'] as String? ?? '',
      productCount: (json['productCount'] as num?)?.toInt() ?? 0,
      imageUrl: json['imageUrl'] as String?,
      subcategoryCount: (json['subcategoryCount'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
    'id': id,
    'name': name,
    'emoji': emoji,
    'gradient': gradient,
    'description': description,
    'productCount': productCount,
    'imageUrl': imageUrl,
    'subcategoryCount': subcategoryCount,
  };
}



class GroceryProductModel {
  final String id;
  final String name;
  final double price;
  final double? mrp;
  final String unit;
  final String imageUrl;
  final String? storeName;
  final String? storeId;

  GroceryProductModel({
    required this.id,
    required this.name,
    required this.price,
    this.mrp,
    required this.unit,
    required this.imageUrl,
    this.storeName,
    this.storeId,
  });

  factory GroceryProductModel.fromJson(Map<String, dynamic> json) {
    return GroceryProductModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      price: (json['price'] ?? 0.0).toDouble(),
      mrp: json['mrp'] != null ? (json['mrp'] as num).toDouble() : null,
      unit: json['unit'] ?? '1 item',
      imageUrl: json['imageUrl'] ?? '',
      storeName: json['storeName'],
      storeId: json['storeId'],
    );
  }
}
