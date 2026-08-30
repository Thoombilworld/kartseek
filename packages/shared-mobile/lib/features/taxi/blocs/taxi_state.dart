import 'package:equatable/equatable.dart';

enum TaxiStatus {
  initial,
  loading,
  estimating,
  estimated,
  searching,
  driverFound,
  driverArriving,
  rideInProgress,
  rideCompleted,
  rideCancelled,
  error,
}

class FareEstimate extends Equatable {
  final String vehicleType;
  final double distanceKm;
  final int estimatedFare;
  final String estimatedFareRange;
  final int etaMinutes;
  final double surgeMultiplier;

  const FareEstimate({
    required this.vehicleType,
    required this.distanceKm,
    required this.estimatedFare,
    required this.estimatedFareRange,
    required this.etaMinutes,
    this.surgeMultiplier = 1.0,
  });

  @override
  List<Object?> get props => [vehicleType, distanceKm, estimatedFare, etaMinutes, surgeMultiplier];
}

class NearbyDriver extends Equatable {
  final String driverId;
  final String name;
  final double lat;
  final double lng;
  final double distanceKm;
  final int eta;
  final String vehicleType;
  final String? vehiclePlate;
  final String? vehicleModel;
  final double rating;
  final int totalTrips;
  final double acceptanceRate;
  final String? profilePhotoUrl;
  final bool isOnTrip;

  const NearbyDriver({
    required this.driverId,
    required this.name,
    required this.lat,
    required this.lng,
    required this.distanceKm,
    required this.eta,
    this.vehicleType = 'economy',
    this.vehiclePlate,
    this.vehicleModel,
    this.rating = 4.5,
    this.totalTrips = 0,
    this.acceptanceRate = 0.0,
    this.profilePhotoUrl,
    this.isOnTrip = false,
  });

  factory NearbyDriver.fromJson(Map<String, dynamic> json) => NearbyDriver(
    driverId: json['driverId']?.toString() ?? '',
    name: json['name']?.toString() ?? 'Driver',
    lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
    lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
    distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 0.0,
    eta: (json['eta'] as num?)?.toInt() ?? 0,
    vehicleType: json['vehicleType']?.toString() ?? 'economy',
    vehiclePlate: json['vehiclePlate']?.toString(),
    vehicleModel: json['vehicleModel']?.toString(),
    rating: (json['rating'] as num?)?.toDouble() ?? 4.5,
    totalTrips: (json['totalTrips'] as num?)?.toInt() ?? 0,
    acceptanceRate: (json['acceptanceRate'] as num?)?.toDouble() ?? 0.0,
    profilePhotoUrl: json['profilePhotoUrl']?.toString(),
    isOnTrip: json['isOnTrip'] == true,
  );

  @override
  List<Object?> get props => [driverId, lat, lng, distanceKm, vehicleType];
}

class ActiveRide extends Equatable {
  final String rideId;
  final String status;
  final String vehicleType;
  final String? driverId;
  final String? driverName;
  final String? driverPhone;
  final double? driverLat;
  final double? driverLng;
  final double pickupLat;
  final double pickupLng;
  final double dropLat;
  final double dropLng;
  final String? pickupAddress;
  final String? dropAddress;
  final int? estimatedFare;
  final String? paymentMethod;
  final String? preferredDriverId;
  final String? otp;

  const ActiveRide({
    required this.rideId, required this.status,
    required this.vehicleType,
    this.driverId, this.driverName, this.driverPhone,
    this.driverLat, this.driverLng,
    required this.pickupLat, required this.pickupLng,
    required this.dropLat, required this.dropLng,
    this.pickupAddress, this.dropAddress,
    this.estimatedFare, this.paymentMethod,
    this.preferredDriverId, this.otp,
  });

  ActiveRide copyWith({
    String? status, String? driverId, String? driverName, String? driverPhone,
    double? driverLat, double? driverLng, String? otp,
  }) => ActiveRide(
    rideId: rideId, status: status ?? this.status,
    vehicleType: vehicleType,
    driverId: driverId ?? this.driverId,
    driverName: driverName ?? this.driverName,
    driverPhone: driverPhone ?? this.driverPhone,
    driverLat: driverLat ?? this.driverLat,
    driverLng: driverLng ?? this.driverLng,
    pickupLat: pickupLat, pickupLng: pickupLng,
    dropLat: dropLat, dropLng: dropLng,
    pickupAddress: pickupAddress, dropAddress: dropAddress,
    estimatedFare: estimatedFare, paymentMethod: paymentMethod,
    preferredDriverId: preferredDriverId, otp: otp ?? this.otp,
  );

  @override
  List<Object?> get props => [rideId, status, driverId, driverLat, driverLng];
}

/// Taxi BLoC state.
class TaxiState extends Equatable {
  final TaxiStatus status;
  final String selectedVehicleType;
  final String paymentMethod;
  final FareEstimate? fareEstimate;
  final List<FareEstimate> allEstimates;
  final List<NearbyDriver> nearbyDrivers;
  final ActiveRide? activeRide;
  final List<ActiveRide> rideHistory;
  final String? errorMessage;
  final String? selectedDriverId;
  // ── New fields for expanded ride flow ──
  final String? pickupAddress;
  final String? destinationAddress;
  final double? pickupLat;
  final double? pickupLng;
  final double? destinationLat;
  final double? destinationLng;
  final bool otpVerified;
  final bool ratingSubmitted;
  final double tipAmount;
  final bool sosTriggered;
  final String? promoCode;
  final double promoDiscount;
  final bool disputeRaised;

  const TaxiState({
    this.status = TaxiStatus.initial,
    this.selectedVehicleType = 'economy',
    this.paymentMethod = 'cash',
    this.fareEstimate,
    this.allEstimates = const [],
    this.nearbyDrivers = const [],
    this.activeRide,
    this.rideHistory = const [],
    this.errorMessage,
    this.selectedDriverId,
    this.pickupAddress,
    this.destinationAddress,
    this.pickupLat,
    this.pickupLng,
    this.destinationLat,
    this.destinationLng,
    this.otpVerified = false,
    this.ratingSubmitted = false,
    this.tipAmount = 0.0,
    this.sosTriggered = false,
    this.promoCode,
    this.promoDiscount = 0.0,
    this.disputeRaised = false,
  });

  TaxiState copyWith({
    TaxiStatus? status,
    String? selectedVehicleType,
    String? paymentMethod,
    FareEstimate? fareEstimate,
    List<FareEstimate>? allEstimates,
    List<NearbyDriver>? nearbyDrivers,
    ActiveRide? activeRide,
    List<ActiveRide>? rideHistory,
    String? errorMessage,
    String? selectedDriverId,
    String? pickupAddress,
    String? destinationAddress,
    double? pickupLat,
    double? pickupLng,
    double? destinationLat,
    double? destinationLng,
    bool? otpVerified,
    bool? ratingSubmitted,
    double? tipAmount,
    bool? sosTriggered,
    String? promoCode,
    double? promoDiscount,
    bool? disputeRaised,
  }) => TaxiState(
    status: status ?? this.status,
    selectedVehicleType: selectedVehicleType ?? this.selectedVehicleType,
    paymentMethod: paymentMethod ?? this.paymentMethod,
    fareEstimate: fareEstimate ?? this.fareEstimate,
    allEstimates: allEstimates ?? this.allEstimates,
    nearbyDrivers: nearbyDrivers ?? this.nearbyDrivers,
    activeRide: activeRide ?? this.activeRide,
    rideHistory: rideHistory ?? this.rideHistory,
    errorMessage: errorMessage,
    selectedDriverId: selectedDriverId ?? this.selectedDriverId,
    pickupAddress: pickupAddress ?? this.pickupAddress,
    destinationAddress: destinationAddress ?? this.destinationAddress,
    pickupLat: pickupLat ?? this.pickupLat,
    pickupLng: pickupLng ?? this.pickupLng,
    destinationLat: destinationLat ?? this.destinationLat,
    destinationLng: destinationLng ?? this.destinationLng,
    otpVerified: otpVerified ?? this.otpVerified,
    ratingSubmitted: ratingSubmitted ?? this.ratingSubmitted,
    tipAmount: tipAmount ?? this.tipAmount,
    sosTriggered: sosTriggered ?? this.sosTriggered,
    promoCode: promoCode ?? this.promoCode,
    promoDiscount: promoDiscount ?? this.promoDiscount,
    disputeRaised: disputeRaised ?? this.disputeRaised,
  );

  /// Nearby drivers filtered by the currently selected vehicle type.
  List<NearbyDriver> get filteredNearbyDrivers => nearbyDrivers
    .where((d) => d.vehicleType == selectedVehicleType && !d.isOnTrip)
    .toList()
    ..sort((a, b) => a.distanceKm.compareTo(b.distanceKm));

  bool get isLoading => status == TaxiStatus.loading || status == TaxiStatus.estimating || status == TaxiStatus.searching;
  bool get hasActiveRide => activeRide != null;
  bool get hasFareEstimate => fareEstimate != null;

  @override
  List<Object?> get props => [status, selectedVehicleType, paymentMethod, fareEstimate, nearbyDrivers, activeRide, rideHistory, errorMessage, selectedDriverId, pickupAddress, destinationAddress, pickupLat, pickupLng, destinationLat, destinationLng, otpVerified, ratingSubmitted, tipAmount, sosTriggered, promoCode, promoDiscount, disputeRaised];
}
