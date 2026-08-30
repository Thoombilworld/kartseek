/// KARTSEEK Taxi Booking — Core Domain Entities
///
/// Immutable value objects representing the taxi booking domain.
/// These are pure Dart — no framework dependencies, no JSON logic.
library;

import 'package:flutter/foundation.dart';
import 'ride_status.dart';

// ─── Location ───────────────────────────────────────────────────────────────

/// A geographic coordinate with optional address metadata.
@immutable
class GeoLocation {
  final double lat;
  final double lng;
  final String? address;
  final String? placeId;
  final String? landmark;

  const GeoLocation({
    required this.lat,
    required this.lng,
    this.address,
    this.placeId,
    this.landmark,
  });

  GeoLocation copyWith({
    double? lat,
    double? lng,
    String? address,
    String? placeId,
    String? landmark,
  }) =>
      GeoLocation(
        lat: lat ?? this.lat,
        lng: lng ?? this.lng,
        address: address ?? this.address,
        placeId: placeId ?? this.placeId,
        landmark: landmark ?? this.landmark,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GeoLocation && lat == other.lat && lng == other.lng;

  @override
  int get hashCode => Object.hash(lat, lng);

  @override
  String toString() => 'GeoLocation($lat, $lng, $address)';
}

// ─── Trip Stop ──────────────────────────────────────────────────────────────

/// An intermediate stop in a multi-stop trip.
@immutable
class TripStop {
  final String id;
  final GeoLocation location;
  final int order;
  final String? note;
  final bool isCompleted;

  const TripStop({
    required this.id,
    required this.location,
    required this.order,
    this.note,
    this.isCompleted = false,
  });

  TripStop copyWith({
    String? id,
    GeoLocation? location,
    int? order,
    String? note,
    bool? isCompleted,
  }) =>
      TripStop(
        id: id ?? this.id,
        location: location ?? this.location,
        order: order ?? this.order,
        note: note ?? this.note,
        isCompleted: isCompleted ?? this.isCompleted,
      );
}

// ─── Route Estimate ─────────────────────────────────────────────────────────

/// Estimated route between pickup and destination (with optional stops).
@immutable
class RouteEstimate {
  final double distanceKm;
  final int durationMinutes;
  final List<GeoLocation> polylinePoints;
  final List<TripStop> stops;

  const RouteEstimate({
    required this.distanceKm,
    required this.durationMinutes,
    this.polylinePoints = const [],
    this.stops = const [],
  });

  RouteEstimate copyWith({
    double? distanceKm,
    int? durationMinutes,
    List<GeoLocation>? polylinePoints,
    List<TripStop>? stops,
  }) =>
      RouteEstimate(
        distanceKm: distanceKm ?? this.distanceKm,
        durationMinutes: durationMinutes ?? this.durationMinutes,
        polylinePoints: polylinePoints ?? this.polylinePoints,
        stops: stops ?? this.stops,
      );
}

// ─── Vehicle Category ───────────────────────────────────────────────────────

/// A vehicle type available for booking (e.g. Economy, Comfort, Premium).
@immutable
class VehicleCategory {
  final String id;
  final String name;
  final String description;
  final String iconUrl;
  final int maxPassengers;
  final int maxLuggage;
  final bool isAccessible;
  final int etaMinutes;
  final bool isAvailable;

  const VehicleCategory({
    required this.id,
    required this.name,
    required this.description,
    this.iconUrl = '',
    this.maxPassengers = 4,
    this.maxLuggage = 2,
    this.isAccessible = false,
    this.etaMinutes = 5,
    this.isAvailable = true,
  });

  VehicleCategory copyWith({
    String? id,
    String? name,
    String? description,
    String? iconUrl,
    int? maxPassengers,
    int? maxLuggage,
    bool? isAccessible,
    int? etaMinutes,
    bool? isAvailable,
  }) =>
      VehicleCategory(
        id: id ?? this.id,
        name: name ?? this.name,
        description: description ?? this.description,
        iconUrl: iconUrl ?? this.iconUrl,
        maxPassengers: maxPassengers ?? this.maxPassengers,
        maxLuggage: maxLuggage ?? this.maxLuggage,
        isAccessible: isAccessible ?? this.isAccessible,
        etaMinutes: etaMinutes ?? this.etaMinutes,
        isAvailable: isAvailable ?? this.isAvailable,
      );
}

// ─── Fare Estimate ──────────────────────────────────────────────────────────

/// Detailed fare breakdown for a route + vehicle combination.
@immutable
class FareEstimate {
  final double baseFare;
  final double distanceFare;
  final double timeFare;
  final double surgeAdjustment;
  final double surgeMultiplier;
  final double waitingFee;
  final double tollFee;
  final double airportSurcharge;
  final double nightCharge;
  final double tax;
  final double platformFee;
  final double discount;
  final double totalEstimate;
  final double minimumFare;
  final String currency;
  final String? promotionCode;

  const FareEstimate({
    required this.baseFare,
    required this.distanceFare,
    required this.timeFare,
    this.surgeAdjustment = 0,
    this.surgeMultiplier = 1.0,
    this.waitingFee = 0,
    this.tollFee = 0,
    this.airportSurcharge = 0,
    this.nightCharge = 0,
    this.tax = 0,
    this.platformFee = 0,
    this.discount = 0,
    required this.totalEstimate,
    this.minimumFare = 0,
    required this.currency,
    this.promotionCode,
  });

  /// Whether surge pricing is active.
  bool get hasSurge => surgeMultiplier > 1.0;

  FareEstimate copyWith({
    double? baseFare,
    double? distanceFare,
    double? timeFare,
    double? surgeAdjustment,
    double? surgeMultiplier,
    double? waitingFee,
    double? tollFee,
    double? airportSurcharge,
    double? nightCharge,
    double? tax,
    double? platformFee,
    double? discount,
    double? totalEstimate,
    double? minimumFare,
    String? currency,
    String? promotionCode,
  }) =>
      FareEstimate(
        baseFare: baseFare ?? this.baseFare,
        distanceFare: distanceFare ?? this.distanceFare,
        timeFare: timeFare ?? this.timeFare,
        surgeAdjustment: surgeAdjustment ?? this.surgeAdjustment,
        surgeMultiplier: surgeMultiplier ?? this.surgeMultiplier,
        waitingFee: waitingFee ?? this.waitingFee,
        tollFee: tollFee ?? this.tollFee,
        airportSurcharge: airportSurcharge ?? this.airportSurcharge,
        nightCharge: nightCharge ?? this.nightCharge,
        tax: tax ?? this.tax,
        platformFee: platformFee ?? this.platformFee,
        discount: discount ?? this.discount,
        totalEstimate: totalEstimate ?? this.totalEstimate,
        minimumFare: minimumFare ?? this.minimumFare,
        currency: currency ?? this.currency,
        promotionCode: promotionCode ?? this.promotionCode,
      );
}

// ─── Payment Method ─────────────────────────────────────────────────────────

enum PaymentType {
  cash,
  card,
  applePay,
  googlePay,
  upi,
  mpesa,
  wallet,
  corporate,
  rideCredits,
  giftBalance,
  payLater,
}

/// A payment method available for the customer.
@immutable
class PaymentMethod {
  final String id;
  final PaymentType type;
  final String displayName;
  final String? lastFourDigits;
  final String? iconUrl;
  final bool isDefault;
  final bool isEnabled;
  final double? availableBalance;

  const PaymentMethod({
    required this.id,
    required this.type,
    required this.displayName,
    this.lastFourDigits,
    this.iconUrl,
    this.isDefault = false,
    this.isEnabled = true,
    this.availableBalance,
  });

  PaymentMethod copyWith({
    String? id,
    PaymentType? type,
    String? displayName,
    String? lastFourDigits,
    String? iconUrl,
    bool? isDefault,
    bool? isEnabled,
    double? availableBalance,
  }) =>
      PaymentMethod(
        id: id ?? this.id,
        type: type ?? this.type,
        displayName: displayName ?? this.displayName,
        lastFourDigits: lastFourDigits ?? this.lastFourDigits,
        iconUrl: iconUrl ?? this.iconUrl,
        isDefault: isDefault ?? this.isDefault,
        isEnabled: isEnabled ?? this.isEnabled,
        availableBalance: availableBalance ?? this.availableBalance,
      );
}

// ─── Driver ─────────────────────────────────────────────────────────────────

/// Information about the assigned driver.
@immutable
class Driver {
  final String id;
  final String name;
  final String phone;
  final String? photoUrl;
  final double rating;
  final int totalTrips;
  final double lat;
  final double lng;
  final double heading;

  const Driver({
    required this.id,
    required this.name,
    required this.phone,
    this.photoUrl,
    this.rating = 5.0,
    this.totalTrips = 0,
    this.lat = 0,
    this.lng = 0,
    this.heading = 0,
  });

  Driver copyWith({
    String? id,
    String? name,
    String? phone,
    String? photoUrl,
    double? rating,
    int? totalTrips,
    double? lat,
    double? lng,
    double? heading,
  }) =>
      Driver(
        id: id ?? this.id,
        name: name ?? this.name,
        phone: phone ?? this.phone,
        photoUrl: photoUrl ?? this.photoUrl,
        rating: rating ?? this.rating,
        totalTrips: totalTrips ?? this.totalTrips,
        lat: lat ?? this.lat,
        lng: lng ?? this.lng,
        heading: heading ?? this.heading,
      );
}

// ─── Vehicle ────────────────────────────────────────────────────────────────

/// Information about the assigned vehicle.
@immutable
class Vehicle {
  final String id;
  final String model;
  final String color;
  final String plateNumber;
  final String type;

  const Vehicle({
    required this.id,
    required this.model,
    required this.color,
    required this.plateNumber,
    required this.type,
  });

  Vehicle copyWith({
    String? id,
    String? model,
    String? color,
    String? plateNumber,
    String? type,
  }) =>
      Vehicle(
        id: id ?? this.id,
        model: model ?? this.model,
        color: color ?? this.color,
        plateNumber: plateNumber ?? this.plateNumber,
        type: type ?? this.type,
      );
}

// ─── Active Trip ────────────────────────────────────────────────────────────

/// The full state of an active or completed ride.
@immutable
class ActiveTrip {
  final String rideId;
  final RideStatus status;
  final GeoLocation pickup;
  final GeoLocation destination;
  final List<TripStop> stops;
  final RouteEstimate? routeEstimate;
  final VehicleCategory? vehicleCategory;
  final FareEstimate? fareEstimate;
  final FareEstimate? finalFare;
  final PaymentMethod? paymentMethod;
  final Driver? driver;
  final Vehicle? vehicle;
  final String? otp;
  final DateTime? otpExpiresAt;
  final int otpAttempts;
  final DateTime? scheduledAt;
  final DateTime createdAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final String? cancellationReason;
  final double cancellationFee;
  final String? tripShareUrl;
  final String? driverVendorName;

  const ActiveTrip({
    required this.rideId,
    required this.status,
    required this.pickup,
    required this.destination,
    this.stops = const [],
    this.routeEstimate,
    this.vehicleCategory,
    this.fareEstimate,
    this.finalFare,
    this.paymentMethod,
    this.driver,
    this.vehicle,
    this.otp,
    this.otpExpiresAt,
    this.otpAttempts = 0,
    this.scheduledAt,
    required this.createdAt,
    this.startedAt,
    this.completedAt,
    this.cancellationReason,
    this.cancellationFee = 0,
    this.tripShareUrl,
    this.driverVendorName,
  });

  /// Whether the trip is currently in a live tracking state.
  bool get isTrackable => status.isActive && driver != null;

  /// Whether OTP verification is required before starting.
  bool get requiresOtp =>
      status == RideStatus.driverArrived || status == RideStatus.otpPending;

  ActiveTrip copyWith({
    String? rideId,
    RideStatus? status,
    GeoLocation? pickup,
    GeoLocation? destination,
    List<TripStop>? stops,
    RouteEstimate? routeEstimate,
    VehicleCategory? vehicleCategory,
    FareEstimate? fareEstimate,
    FareEstimate? finalFare,
    PaymentMethod? paymentMethod,
    Driver? driver,
    Vehicle? vehicle,
    String? otp,
    DateTime? otpExpiresAt,
    int? otpAttempts,
    DateTime? scheduledAt,
    DateTime? createdAt,
    DateTime? startedAt,
    DateTime? completedAt,
    String? cancellationReason,
    double? cancellationFee,
    String? tripShareUrl,
    String? driverVendorName,
  }) =>
      ActiveTrip(
        rideId: rideId ?? this.rideId,
        status: status ?? this.status,
        pickup: pickup ?? this.pickup,
        destination: destination ?? this.destination,
        stops: stops ?? this.stops,
        routeEstimate: routeEstimate ?? this.routeEstimate,
        vehicleCategory: vehicleCategory ?? this.vehicleCategory,
        fareEstimate: fareEstimate ?? this.fareEstimate,
        finalFare: finalFare ?? this.finalFare,
        paymentMethod: paymentMethod ?? this.paymentMethod,
        driver: driver ?? this.driver,
        vehicle: vehicle ?? this.vehicle,
        otp: otp ?? this.otp,
        otpExpiresAt: otpExpiresAt ?? this.otpExpiresAt,
        otpAttempts: otpAttempts ?? this.otpAttempts,
        scheduledAt: scheduledAt ?? this.scheduledAt,
        createdAt: createdAt ?? this.createdAt,
        startedAt: startedAt ?? this.startedAt,
        completedAt: completedAt ?? this.completedAt,
        cancellationReason: cancellationReason ?? this.cancellationReason,
        cancellationFee: cancellationFee ?? this.cancellationFee,
        tripShareUrl: tripShareUrl ?? this.tripShareUrl,
        driverVendorName: driverVendorName ?? this.driverVendorName,
      );
}

// ─── Customer Rating ────────────────────────────────────────────────────────

/// Customer's rating + review for a completed trip.
@immutable
class CustomerRating {
  final String rideId;
  final int stars; // 1–5
  final String? comment;
  final double? tipAmount;

  const CustomerRating({
    required this.rideId,
    required this.stars,
    this.comment,
    this.tipAmount,
  });
}

// ─── Trip Receipt ───────────────────────────────────────────────────────────

/// Receipt data for a completed trip.
@immutable
class TripReceipt {
  final String rideId;
  final String receiptNumber;
  final DateTime tripDate;
  final GeoLocation pickup;
  final GeoLocation destination;
  final double distanceKm;
  final int durationMinutes;
  final FareEstimate fareBreakdown;
  final PaymentMethod paymentMethod;
  final String driverName;
  final String vehiclePlate;
  final String? pdfUrl;

  const TripReceipt({
    required this.rideId,
    required this.receiptNumber,
    required this.tripDate,
    required this.pickup,
    required this.destination,
    required this.distanceKm,
    required this.durationMinutes,
    required this.fareBreakdown,
    required this.paymentMethod,
    required this.driverName,
    required this.vehiclePlate,
    this.pdfUrl,
  });
}

// ─── Cancellation Reason ────────────────────────────────────────────────────

/// A predefined reason for cancelling a ride.
@immutable
class CancellationReason {
  final String id;
  final String label;
  final bool chargesFee;

  const CancellationReason({
    required this.id,
    required this.label,
    this.chargesFee = false,
  });
}

// ─── Nearby Driver ──────────────────────────────────────────────────────────

/// A driver visible on the map before booking.
@immutable
class NearbyDriver {
  final String driverId;
  final String name;
  final String vehicleType;
  final String? vehiclePlate;
  final String? vehicleModel;
  final double lat;
  final double lng;
  final double distanceKm;
  final int etaMinutes;
  final double rating;
  final int totalTrips;
  final double heading;
  final String? photoUrl;

  const NearbyDriver({
    required this.driverId,
    required this.name,
    required this.vehicleType,
    this.vehiclePlate,
    this.vehicleModel,
    required this.lat,
    required this.lng,
    required this.distanceKm,
    required this.etaMinutes,
    this.rating = 4.5,
    this.totalTrips = 0,
    this.heading = 0,
    this.photoUrl,
  });

  NearbyDriver copyWith({
    String? driverId,
    String? name,
    String? vehicleType,
    String? vehiclePlate,
    String? vehicleModel,
    double? lat,
    double? lng,
    double? distanceKm,
    int? etaMinutes,
    double? rating,
    int? totalTrips,
    double? heading,
    String? photoUrl,
  }) =>
      NearbyDriver(
        driverId: driverId ?? this.driverId,
        name: name ?? this.name,
        vehicleType: vehicleType ?? this.vehicleType,
        vehiclePlate: vehiclePlate ?? this.vehiclePlate,
        vehicleModel: vehicleModel ?? this.vehicleModel,
        lat: lat ?? this.lat,
        lng: lng ?? this.lng,
        distanceKm: distanceKm ?? this.distanceKm,
        etaMinutes: etaMinutes ?? this.etaMinutes,
        rating: rating ?? this.rating,
        totalTrips: totalTrips ?? this.totalTrips,
        heading: heading ?? this.heading,
        photoUrl: photoUrl ?? this.photoUrl,
      );
}

// ─── Saved Place ────────────────────────────────────────────────────────────

/// A customer's saved location (Home, Work, etc.).
@immutable
class SavedPlace {
  final String id;
  final String label; // "Home", "Work", custom
  final String icon; // Material icon name
  final GeoLocation location;

  const SavedPlace({
    required this.id,
    required this.label,
    this.icon = 'place',
    required this.location,
  });
}

// ─── Safety Contact ─────────────────────────────────────────────────────────

/// An emergency contact for trip sharing / SOS.
@immutable
class SafetyContact {
  final String id;
  final String name;
  final String phone;
  final bool autoShare;

  const SafetyContact({
    required this.id,
    required this.name,
    required this.phone,
    this.autoShare = false,
  });
}
