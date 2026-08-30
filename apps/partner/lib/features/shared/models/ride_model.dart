import 'package:shared_mobile/core/services/region_service.dart';

/// KARTSEEK Partner App — Ride Model (Taxi Driver)
class RideRequest {
  final String id;
  final String customerName;
  final String? customerPhone;
  final String pickupAddress;
  final double pickupLat;
  final double pickupLng;
  final String dropAddress;
  final double dropLat;
  final double dropLng;
  final double distanceToPickup;
  final double tripDistance;
  final double estimatedFare;
  final String paymentMethod;
  final RideStatus status;
  final String? otp;
  final DateTime requestedAt;
  final DateTime? acceptedAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final double? driverEarnings;
  final double? commissionDeducted;
  final double? rating;
  final int countdownSeconds;

  const RideRequest({
    required this.id, required this.customerName, this.customerPhone,
    required this.pickupAddress, required this.pickupLat, required this.pickupLng,
    required this.dropAddress, required this.dropLat, required this.dropLng,
    required this.distanceToPickup, required this.tripDistance,
    required this.estimatedFare, required this.paymentMethod,
    this.status = RideStatus.rideRequested, this.otp,
    required this.requestedAt, this.acceptedAt, this.startedAt, this.completedAt,
    this.driverEarnings, this.commissionDeducted, this.rating,
    this.countdownSeconds = 30,
  });

  factory RideRequest.fromJson(Map<String, dynamic> j) => RideRequest(
    id: j['id'] ?? '', customerName: j['customer_name'] ?? '',
    customerPhone: j['customer_phone'],
    pickupAddress: j['pickup_address'] ?? '',
    pickupLat: (j['pickup_lat'] ?? 0).toDouble(),
    pickupLng: (j['pickup_lng'] ?? 0).toDouble(),
    dropAddress: j['drop_address'] ?? '',
    dropLat: (j['drop_lat'] ?? 0).toDouble(),
    dropLng: (j['drop_lng'] ?? 0).toDouble(),
    distanceToPickup: (j['distance_to_pickup'] ?? 0).toDouble(),
    tripDistance: (j['trip_distance'] ?? 0).toDouble(),
    estimatedFare: (j['estimated_fare'] ?? 0).toDouble(),
    paymentMethod: j['payment_method'] ?? 'Cash',
    status: RideStatus.fromString(j['status'] ?? 'ride_requested'),
    otp: j['otp'], requestedAt: DateTime.now(),
    driverEarnings: j['driver_earnings']?.toDouble(),
    commissionDeducted: j['commission_deducted']?.toDouble(),
    rating: j['rating']?.toDouble(),
  );

  /// Construct from camelCase WebSocket payload (from TaxiTrackingGateway).
  factory RideRequest.fromWebSocket(Map<String, dynamic> j) => RideRequest(
    id: j['rideId'] ?? j['id'] ?? '',
    customerName: j['customerName'] ?? j['customer_name'] ?? 'Customer',
    customerPhone: j['customerPhone'] ?? j['customer_phone'],
    pickupAddress: j['pickupAddress'] ?? j['pickup_address'] ?? '',
    pickupLat: (j['pickupLat'] ?? j['pickup_lat'] ?? 0).toDouble(),
    pickupLng: (j['pickupLng'] ?? j['pickup_lng'] ?? 0).toDouble(),
    dropAddress: j['dropAddress'] ?? j['drop_address'] ?? '',
    dropLat: (j['dropLat'] ?? j['drop_lat'] ?? 0).toDouble(),
    dropLng: (j['dropLng'] ?? j['drop_lng'] ?? 0).toDouble(),
    distanceToPickup: (j['distanceToPickup'] ?? j['distance_to_pickup'] ?? 1.0).toDouble(),
    tripDistance: (j['tripDistance'] ?? j['trip_distance'] ?? 5.0).toDouble(),
    estimatedFare: (j['fareEstimate'] ?? j['estimated_fare'] ?? 0).toDouble(),
    paymentMethod: j['paymentMethod'] ?? j['payment_method'] ?? 'Cash',
    status: RideStatus.rideRequested,
    requestedAt: DateTime.now(),
  );

  String get formattedFare => '${RegionService.instance.currentCountry.currencySymbol} ${estimatedFare.toStringAsFixed(0)}';
  String get formattedDistance => '${tripDistance.toStringAsFixed(1)} km';

  static RideRequest mock() => RideRequest(
    id: 'RIDE-4521', customerName: 'Customer',
    customerPhone: '${RegionService.instance.currentCountry.callingCode} 0000000',
    pickupAddress: 'Pickup Point',
    pickupLat: RegionService.instance.currentCountry.defaultLat,
    pickupLng: RegionService.instance.currentCountry.defaultLng,
    dropAddress: 'Drop-off Point',
    dropLat: RegionService.instance.currentCountry.defaultLat + 0.05,
    dropLng: RegionService.instance.currentCountry.defaultLng + 0.05,
    distanceToPickup: 1.2, tripDistance: 18.5,
    estimatedFare: 1850, paymentMethod: 'Cash',
    otp: '4825', requestedAt: DateTime.now(),
  );

  static List<RideRequest> mockHistory() => [
    RideRequest(
      id: 'RIDE-4520', customerName: 'Customer A',
      pickupAddress: 'Mall Area', pickupLat: RegionService.instance.currentCountry.defaultLat,
      pickupLng: RegionService.instance.currentCountry.defaultLng,
      dropAddress: 'Shopping District', dropLat: RegionService.instance.currentCountry.defaultLat + 0.02,
      dropLng: RegionService.instance.currentCountry.defaultLng + 0.02,
      distanceToPickup: 0.5, tripDistance: 8.2, estimatedFare: 650,
      paymentMethod: 'Card', status: RideStatus.tripCompleted,
      requestedAt: DateTime.now().subtract(const Duration(hours: 3)),
      completedAt: DateTime.now().subtract(const Duration(hours: 2)),
      driverEarnings: 520, commissionDeducted: 130, rating: 5.0,
    ),
    RideRequest(
      id: 'RIDE-4519', customerName: 'Customer B',
      pickupAddress: 'City Centre', pickupLat: RegionService.instance.currentCountry.defaultLat - 0.01,
      pickupLng: RegionService.instance.currentCountry.defaultLng + 0.01,
      dropAddress: 'Residential Area', dropLat: RegionService.instance.currentCountry.defaultLat + 0.03,
      dropLng: RegionService.instance.currentCountry.defaultLng - 0.01,
      distanceToPickup: 2.1, tripDistance: 5.8, estimatedFare: 480,
      paymentMethod: 'Cash', status: RideStatus.tripCompleted,
      requestedAt: DateTime.now().subtract(const Duration(hours: 6)),
      completedAt: DateTime.now().subtract(const Duration(hours: 5)),
      driverEarnings: 384, commissionDeducted: 96, rating: 4.0,
    ),
  ];
}

enum RideStatus {
  driverOffline('driver_offline'), driverOnline('driver_online'),
  rideRequested('ride_requested'), rideAccepted('ride_accepted'),
  rideRejected('ride_rejected'), goingToPickup('going_to_pickup'),
  arrivedAtPickup('arrived_at_pickup'), otpVerified('otp_verified'),
  tripStarted('trip_started'), onTrip('on_trip'),
  arrivedAtDrop('arrived_at_drop'), tripCompleted('trip_completed'),
  paymentPending('payment_pending'), paymentCollected('payment_collected'),
  cancelled('cancelled'), disputed('disputed');

  final String value;
  const RideStatus(this.value);
  static RideStatus fromString(String s) {
    for (final st in RideStatus.values) { if (st.value == s) return st; }
    return RideStatus.driverOffline;
  }
  String get displayName => value.replaceAll('_', ' ').split(' ')
    .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
    .join(' ');
}
