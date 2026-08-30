/// KARTSEEK Partner App — Partner Profile Model
/// Represents a taxi driver or delivery boy profile.
class PartnerProfile {
  final String id;
  final String name;
  final String mobile;
  final String email;
  final String? profilePhoto;
  final String address;
  final String? emergencyContact;
  final PartnerRole role;
  final PartnerStatus status;
  final double rating;
  final int totalTrips;
  final int totalDeliveries;
  final DateTime joinedDate;
  final bool isOnline;
  final bool kycApproved;
  final KycStatus kycStatus;
  final String? vehicleId;
  final String? vendorId;
  final String? vendorName;
  final int onboardingProgress;

  const PartnerProfile({
    required this.id,
    required this.name,
    required this.mobile,
    required this.email,
    this.profilePhoto,
    required this.address,
    this.emergencyContact,
    required this.role,
    required this.status,
    this.rating = 0.0,
    this.totalTrips = 0,
    this.totalDeliveries = 0,
    required this.joinedDate,
    this.isOnline = false,
    this.kycApproved = false,
    this.kycStatus = KycStatus.notSubmitted,
    this.vehicleId,
    this.vendorId,
    this.vendorName,
    this.onboardingProgress = 0,
  });

  factory PartnerProfile.fromJson(Map<String, dynamic> json) {
    return PartnerProfile(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      mobile: json['mobile'] ?? '',
      email: json['email'] ?? '',
      profilePhoto: json['profile_photo'],
      address: json['address'] ?? '',
      emergencyContact: json['emergency_contact'],
      role: PartnerRole.fromString(json['role'] ?? 'taxi_driver'),
      status: PartnerStatus.fromString(json['status'] ?? 'inactive'),
      rating: (json['rating'] ?? 0.0).toDouble(),
      totalTrips: json['total_trips'] ?? 0,
      totalDeliveries: json['total_deliveries'] ?? 0,
      joinedDate: json['joined_date'] != null
          ? DateTime.parse(json['joined_date'])
          : DateTime.now(),
      isOnline: json['is_online'] ?? false,
      kycApproved: json['kyc_approved'] ?? false,
      kycStatus: KycStatus.fromString(json['kyc_status'] ?? 'not_submitted'),
      vehicleId: json['vehicle_id'],
      vendorId: json['vendor_id'],
      vendorName: json['vendor_name'],
      onboardingProgress: json['onboarding_progress'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'mobile': mobile,
        'email': email,
        'profile_photo': profilePhoto,
        'address': address,
        'emergency_contact': emergencyContact,
        'role': role.value,
        'status': status.value,
        'rating': rating,
        'total_trips': totalTrips,
        'total_deliveries': totalDeliveries,
        'joined_date': joinedDate.toIso8601String(),
        'is_online': isOnline,
        'kyc_approved': kycApproved,
        'kyc_status': kycStatus.value,
        'vehicle_id': vehicleId,
        'vendor_id': vendorId,
        'vendor_name': vendorName,
        'onboarding_progress': onboardingProgress,
      };

  PartnerProfile copyWith({
    String? name,
    String? mobile,
    String? email,
    String? profilePhoto,
    String? address,
    String? emergencyContact,
    PartnerRole? role,
    PartnerStatus? status,
    double? rating,
    int? totalTrips,
    int? totalDeliveries,
    bool? isOnline,
    bool? kycApproved,
    KycStatus? kycStatus,
    String? vehicleId,
    String? vendorId,
    String? vendorName,
    int? onboardingProgress,
  }) {
    return PartnerProfile(
      id: id,
      name: name ?? this.name,
      mobile: mobile ?? this.mobile,
      email: email ?? this.email,
      profilePhoto: profilePhoto ?? this.profilePhoto,
      address: address ?? this.address,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      role: role ?? this.role,
      status: status ?? this.status,
      rating: rating ?? this.rating,
      totalTrips: totalTrips ?? this.totalTrips,
      totalDeliveries: totalDeliveries ?? this.totalDeliveries,
      joinedDate: joinedDate,
      isOnline: isOnline ?? this.isOnline,
      kycApproved: kycApproved ?? this.kycApproved,
      kycStatus: kycStatus ?? this.kycStatus,
      vehicleId: vehicleId ?? this.vehicleId,
      vendorId: vendorId ?? this.vendorId,
      vendorName: vendorName ?? this.vendorName,
      onboardingProgress: onboardingProgress ?? this.onboardingProgress,
    );
  }

  /// Mock partner for development — uses detected region
  static PartnerProfile mock({PartnerRole role = PartnerRole.taxiDriver}) {
    return PartnerProfile(
      id: 'partner_001',
      name: 'Partner Driver',
      mobile: '+974 5500 0000',
      email: 'partner@kartseek.com',
      profilePhoto: null,
      address: 'Partner City',
      emergencyContact: '+974 5511 1111',
      role: role,
      status: PartnerStatus.active,
      rating: 4.7,
      totalTrips: 1284,
      totalDeliveries: 567,
      joinedDate: DateTime(2024, 3, 15),
      isOnline: true,
      kycApproved: true,
      kycStatus: KycStatus.approved,
      vehicleId: 'VH-001',
      vendorId: 'VND-003',
      vendorName: 'KARTSEEK Fleet',
      onboardingProgress: 100,
    );
  }
}

/// Partner role types
enum PartnerRole {
  taxiDriver('taxi_driver'),
  deliveryBoy('delivery_boy'),
  both('both');

  final String value;
  const PartnerRole(this.value);

  static PartnerRole fromString(String s) {
    switch (s) {
      case 'taxi_driver':
        return PartnerRole.taxiDriver;
      case 'delivery_boy':
        return PartnerRole.deliveryBoy;
      case 'both':
        return PartnerRole.both;
      default:
        return PartnerRole.taxiDriver;
    }
  }

  String get displayName {
    switch (this) {
      case PartnerRole.taxiDriver:
        return 'Taxi Driver';
      case PartnerRole.deliveryBoy:
        return 'Delivery Boy';
      case PartnerRole.both:
        return 'Multi-Role Partner';
    }
  }
}

/// Partner account status
enum PartnerStatus {
  active('active'),
  inactive('inactive'),
  suspended('suspended'),
  blocked('blocked'),
  pendingApproval('pending_approval');

  final String value;
  const PartnerStatus(this.value);

  static PartnerStatus fromString(String s) {
    switch (s) {
      case 'active':
        return PartnerStatus.active;
      case 'inactive':
        return PartnerStatus.inactive;
      case 'suspended':
        return PartnerStatus.suspended;
      case 'blocked':
        return PartnerStatus.blocked;
      case 'pending_approval':
        return PartnerStatus.pendingApproval;
      default:
        return PartnerStatus.inactive;
    }
  }
}

/// KYC document status
enum KycStatus {
  notSubmitted('not_submitted'),
  submitted('submitted'),
  underReview('under_review'),
  approved('approved'),
  rejected('rejected'),
  correctionRequested('correction_requested'),
  expired('expired'),
  suspended('suspended');

  final String value;
  const KycStatus(this.value);

  static KycStatus fromString(String s) {
    switch (s.toLowerCase().replaceAll('-', '_')) {
      case 'not_submitted':
        return KycStatus.notSubmitted;
      case 'submitted':
      case 'pending': // DB entity uses PENDING
        return KycStatus.submitted;
      case 'under_review':
        return KycStatus.underReview;
      case 'approved':
      case 'verified': // Admin panel uses 'verified'
        return KycStatus.approved;
      case 'rejected':
        return KycStatus.rejected;
      case 'correction_requested':
        return KycStatus.correctionRequested;
      case 'expired':
        return KycStatus.expired;
      case 'suspended':
      case 'blocked': // Admin panel uses 'blocked'
        return KycStatus.suspended;
      default:
        return KycStatus.notSubmitted;
    }
  }

  String get displayName {
    switch (this) {
      case KycStatus.notSubmitted:
        return 'Not Submitted';
      case KycStatus.submitted:
        return 'Submitted';
      case KycStatus.underReview:
        return 'Under Review';
      case KycStatus.approved:
        return 'Approved';
      case KycStatus.rejected:
        return 'Rejected';
      case KycStatus.correctionRequested:
        return 'Correction Requested';
      case KycStatus.expired:
        return 'Expired';
      case KycStatus.suspended:
        return 'Suspended';
    }
  }
}
