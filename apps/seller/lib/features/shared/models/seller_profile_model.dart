/// KARTSEEK Seller App — Seller Profile Model
///
/// Defines the [SellerRole] enum covering all 7 business modules and
/// the [SellerProfile] model used throughout the seller app.
library;

import 'package:kartseek_seller/features/shared/models/country_config.dart';

// ─────────────────────────────────────────────────────────────────────────────
// SellerRole Enum
// ─────────────────────────────────────────────────────────────────────────────

/// The seven business modules a seller can be assigned to.
/// Stored server-side as the `role` field on the seller account.
enum SellerRole {
  marketplaceSeller('marketplace_seller'),
  grocerySeller('grocery_seller'),
  restaurantOwner('restaurant_owner'),
  pharmacySeller('pharmacy_seller'),
  doctor('doctor'),
  hotelOwner('hotel_owner'),
  taxiVendor('taxi_vendor');

  final String value;
  const SellerRole(this.value);

  static SellerRole fromString(String s) {
    for (final role in SellerRole.values) {
      if (role.value == s) return role;
    }
    return SellerRole.marketplaceSeller; // safe fallback
  }

  /// Map the gateway's `sellerType` claim onto a portal.
  ///
  /// Returns null for anything unrecognised — deliberately NOT falling back to
  /// marketplace the way [fromString] does. This value decides which portal opens,
  /// so guessing would drop an unknown seller into somebody else's business.
  static SellerRole? fromSellerType(String? sellerType) {
    switch (sellerType) {
      case 'marketplace': return SellerRole.marketplaceSeller;
      case 'grocery':     return SellerRole.grocerySeller;
      case 'restaurant':  return SellerRole.restaurantOwner;
      case 'pharmacy':    return SellerRole.pharmacySeller;
      case 'doctor':      return SellerRole.doctor;
      case 'hotel':       return SellerRole.hotelOwner;
      case 'taxi':        return SellerRole.taxiVendor;
      default:            return null;   // includes 'delivery', which has no app portal
    }
  }

  String get displayName {
    switch (this) {
      case SellerRole.marketplaceSeller: return 'Marketplace Seller';
      case SellerRole.grocerySeller:     return 'Grocery Seller';
      case SellerRole.restaurantOwner:   return 'Restaurant Partner';
      case SellerRole.pharmacySeller:    return 'Pharmacy Seller';
      case SellerRole.doctor:            return 'Doctor';
      case SellerRole.hotelOwner:        return 'Hotel Owner';
      case SellerRole.taxiVendor:        return 'Taxi Vendor';
    }
  }

  String get emoji {
    switch (this) {
      case SellerRole.marketplaceSeller: return '🛒';
      case SellerRole.grocerySeller:     return '🥦';
      case SellerRole.restaurantOwner:   return '🍽️';
      case SellerRole.pharmacySeller:    return '💊';
      case SellerRole.doctor:            return '🩺';
      case SellerRole.hotelOwner:        return '🏨';
      case SellerRole.taxiVendor:        return '🚖';
    }
  }

  /// The initial route to push after RBAC authentication.
  String get initialRoute {
    switch (this) {
      case SellerRole.marketplaceSeller: return '/seller/marketplace';
      case SellerRole.grocerySeller:     return '/seller/grocery';
      case SellerRole.restaurantOwner:   return '/seller/restaurant';
      case SellerRole.pharmacySeller:    return '/seller/pharmacy';
      case SellerRole.doctor:            return '/seller/doctor';
      case SellerRole.hotelOwner:        return '/seller/hotel';
      case SellerRole.taxiVendor:        return '/seller/taxi-vendor';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SellerStatus Enum
// ─────────────────────────────────────────────────────────────────────────────

enum SellerStatus {
  active('active'),
  inactive('inactive'),
  suspended('suspended'),
  pendingApproval('pending_approval'),
  kycPending('kyc_pending');

  final String value;
  const SellerStatus(this.value);

  static SellerStatus fromString(String s) {
    for (final status in SellerStatus.values) {
      if (status.value == s) return status;
    }
    return SellerStatus.inactive;
  }

  String get displayName {
    switch (this) {
      case SellerStatus.active:          return 'Active';
      case SellerStatus.inactive:        return 'Inactive';
      case SellerStatus.suspended:       return 'Suspended';
      case SellerStatus.pendingApproval: return 'Pending Approval';
      case SellerStatus.kycPending:      return 'KYC Pending';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SellerProfile Model
// ─────────────────────────────────────────────────────────────────────────────

class SellerProfile {
  final String id;
  final String name;
  final String email;
  final String mobile;
  final SellerRole role;
  final String storeId;
  final String storeName;
  final String? logoUrl;
  final String? address;
  final SellerStatus status;
  final bool kycApproved;
  final double rating;
  final int totalOrders;
  final DateTime joinedDate;
  final Map<String, dynamic> moduleConfig;
  // Country-specific fields
  final String countryCode;   // ISO 3166-1 alpha-2 e.g. 'QA'
  final String city;

  const SellerProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.mobile,
    required this.role,
    required this.storeId,
    required this.storeName,
    this.logoUrl,
    this.address,
    this.status = SellerStatus.active,
    this.kycApproved = false,
    this.rating = 0.0,
    this.totalOrders = 0,
    required this.joinedDate,
    this.moduleConfig = const {},
    this.countryCode = 'QA',
    this.city = 'Doha',
  });

  /// Returns the full [CountryConfig] for this profile's country.
  CountryConfig get country => CountryConfig.forCode(countryCode);

  /// Formats [amount] using the profile's country currency.
  String formatCurrency(double amount) => country.formatAmount(amount);

  factory SellerProfile.fromJson(Map<String, dynamic> json) {
    return SellerProfile(
      id:          json['id'] as String? ?? '',
      name:        json['name'] as String? ?? '',
      email:       json['email'] as String? ?? '',
      mobile:      json['mobile'] as String? ?? '',
      role:        SellerRole.fromString(json['role'] as String? ?? 'marketplace_seller'),
      storeId:     json['store_id'] as String? ?? '',
      storeName:   json['store_name'] as String? ?? '',
      logoUrl:     json['logo_url'] as String?,
      address:     json['address'] as String?,
      status:      SellerStatus.fromString(json['status'] as String? ?? 'active'),
      kycApproved: json['kyc_approved'] as bool? ?? false,
      rating:      (json['rating'] as num?)?.toDouble() ?? 0.0,
      totalOrders: json['total_orders'] as int? ?? 0,
      joinedDate:  json['joined_date'] != null
          ? DateTime.tryParse(json['joined_date'] as String) ?? DateTime.now()
          : DateTime.now(),
      moduleConfig: (json['module_config'] as Map<String, dynamic>?) ?? {},
      countryCode:  json['country_code'] as String? ?? 'QA',
      city:         json['city'] as String? ?? 'Doha',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'mobile': mobile,
    'role': role.value,
    'store_id': storeId,
    'store_name': storeName,
    'logo_url': logoUrl,
    'address': address,
    'status': status.value,
    'kyc_approved': kycApproved,
    'rating': rating,
    'total_orders': totalOrders,
    'joined_date': joinedDate.toIso8601String(),
    'module_config': moduleConfig,
  };

  SellerProfile copyWith({
    String? name,
    String? email,
    String? mobile,
    SellerRole? role,
    String? storeId,
    String? storeName,
    String? logoUrl,
    String? address,
    SellerStatus? status,
    bool? kycApproved,
    double? rating,
    int? totalOrders,
    Map<String, dynamic>? moduleConfig,
    String? countryCode,
    String? city,
  }) {
    return SellerProfile(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      mobile: mobile ?? this.mobile,
      role: role ?? this.role,
      storeId: storeId ?? this.storeId,
      storeName: storeName ?? this.storeName,
      logoUrl: logoUrl ?? this.logoUrl,
      address: address ?? this.address,
      status: status ?? this.status,
      kycApproved: kycApproved ?? this.kycApproved,
      rating: rating ?? this.rating,
      totalOrders: totalOrders ?? this.totalOrders,
      joinedDate: joinedDate,
      moduleConfig: moduleConfig ?? this.moduleConfig,
      countryCode: countryCode ?? this.countryCode,
      city: city ?? this.city,
    );
  }

  /// Mock profiles for development — one per module.
  /// Defaults to Qatar (QA) to reflect primary target market.
  static SellerProfile mock({
    SellerRole role = SellerRole.marketplaceSeller,
    String countryCode = 'QA',
  }) {
    final storeNames = {
      SellerRole.marketplaceSeller: ('TechZone Electronics', 'STORE-MKT-QA001'),
      SellerRole.grocerySeller:     ('Al Meera Fresh Groceries', 'STORE-GRC-QA001'),
      SellerRole.restaurantOwner:   ('Al Majlis Restaurant', 'STORE-RST-QA001'),
      SellerRole.pharmacySeller:    ('Al Dawaa Pharmacy', 'STORE-PHM-QA001'),
      SellerRole.doctor:            ('Dr. Khalid Al Thani', 'STORE-DOC-QA001'),
      SellerRole.hotelOwner:        ('Al Rayyan Hotel & Suites', 'STORE-HTL-QA001'),
      SellerRole.taxiVendor:        ('QuickRide Fleet Qatar', 'STORE-TXV-QA001'),
    };
    final countryNames = {
      'QA': ('Mohammed Al Kuwari', '+974 5500 1234', 'Doha'),
      'IN': ('Rajesh Kumar', '+91 9876543210', 'Mumbai'),
      'AE': ('Ahmed Al Maktoum', '+971 50 123 4567', 'Dubai'),
      'SA': ('Khalid Al Rashid', '+966 50 987 6543', 'Riyadh'),
      'KE': ('James Omondi', '+254 720 123456', 'Nairobi'),
    };
    final (storeName, storeId) = storeNames[role]!;
    final (sellerName, mobile, city) =
        countryNames[countryCode] ?? countryNames['QA']!;
    return SellerProfile(
      id: 'seller_001',
      name: sellerName,
      email: 'seller@kartseek.qa',
      mobile: mobile,
      role: role,
      storeId: storeId,
      storeName: storeName,
      address: city,
      status: SellerStatus.active,
      kycApproved: true,
      rating: 4.8,
      totalOrders: 2341,
      joinedDate: DateTime(2023, 9, 1),
      countryCode: countryCode,
      city: city,
    );
  }
}
