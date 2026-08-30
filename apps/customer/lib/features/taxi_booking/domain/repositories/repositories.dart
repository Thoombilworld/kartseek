/// KARTSEEK Taxi Booking — Repository Interfaces
///
/// Abstract contracts defining what data operations the taxi module needs.
/// Implemented by concrete repositories in the data layer.
library;

import '../entities/entities.dart';
import '../entities/ride_status.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Manages ride booking lifecycle.
abstract class TaxiBookingRepository {
  /// Estimate fare for a route + vehicle combination.
  Future<FareEstimate> estimateFare({
    required GeoLocation pickup,
    required GeoLocation destination,
    required String vehicleType,
    String? zoneId,
  });

  /// Get available vehicle categories for a route.
  Future<List<VehicleCategory>> getVehicleCategories({
    required GeoLocation pickup,
    required GeoLocation destination,
    required String countryCode,
  });

  /// Request a new ride.
  Future<ActiveTrip> requestRide({
    required GeoLocation pickup,
    required GeoLocation destination,
    required String vehicleType,
    required String paymentMethodId,
    required double fareEstimate,
    List<TripStop> stops,
    String? preferredDriverId,
    DateTime? scheduledAt,
    String? promotionCode,
    String? pickupNote,
  });

  /// Cancel an active ride.
  Future<double> cancelRide({
    required String rideId,
    String? reason,
  });

  /// Get ride details by ID.
  Future<ActiveTrip> getRideDetails(String rideId);

  /// Get customer's ride history.
  Future<List<ActiveTrip>> getRideHistory({int page, int limit});

  /// Submit rating for a completed ride.
  Future<void> rateRide({
    required String rideId,
    required int stars,
    String? comment,
    double? tipAmount,
  });

  /// Get receipt for a completed ride.
  Future<TripReceipt> getReceipt(String rideId);

  /// Report a fare dispute.
  Future<void> reportDispute({
    required String rideId,
    required String reason,
    String? details,
  });

  /// Report a lost item.
  Future<void> reportLostItem({
    required String rideId,
    required String description,
    String? contactNumber,
  });

  /// Trigger SOS emergency alert.
  Future<void> triggerSos({
    required String rideId,
    String? details,
  });
}

/// Manages location and search operations.
abstract class TaxiLocationRepository {
  /// Get nearby available drivers.
  Future<List<NearbyDriver>> getNearbyDrivers({
    required double lat,
    required double lng,
    double radiusKm,
    String? vehicleType,
  });

  /// Search for an address / place.
  Future<List<GeoLocation>> searchAddress(String query, {GeoLocation? biasLocation});

  /// Reverse geocode coordinates to address.
  Future<GeoLocation> reverseGeocode(double lat, double lng);

  /// Calculate route between two points with optional stops.
  Future<RouteEstimate> calculateRoute({
    required GeoLocation pickup,
    required GeoLocation destination,
    List<TripStop> stops,
  });

  /// Check if a location is within a supported service area.
  Future<bool> isInServiceArea(double lat, double lng);

  /// Get saved places for the customer.
  Future<List<SavedPlace>> getSavedPlaces();

  /// Save a place.
  Future<void> savePlace(SavedPlace place);

  /// Get recent search destinations.
  Future<List<GeoLocation>> getRecentSearches();
}

/// Manages real-time streaming data.
abstract class TaxiRealtimeRepository {
  /// Stream of driver location updates during a ride.
  Stream<Driver> get driverLocationStream;

  /// Stream of ride status changes.
  Stream<RideStatus> get rideStatusStream;

  /// Stream of nearby driver positions.
  Stream<List<NearbyDriver>> get nearbyDriversStream;

  /// Connect to real-time services.
  Future<void> connect({required String userId});

  /// Join a ride's tracking room.
  void joinRideTracking(String rideId);

  /// Leave a ride's tracking room.
  void leaveRideTracking(String rideId);

  /// Request nearby drivers.
  void requestNearbyDrivers({
    required double lat,
    required double lng,
    double radiusKm,
  });

  /// Disconnect from real-time services.
  void disconnect();
}

/// Manages payment methods for taxi rides.
abstract class TaxiPaymentRepository {
  /// Get available payment methods for the customer in the current region.
  Future<List<PaymentMethod>> getPaymentMethods({required String countryCode});

  /// Validate a promotion code.
  Future<FareEstimate> applyPromotion({
    required String code,
    required FareEstimate currentEstimate,
  });

  /// Get wallet balance.
  Future<double> getWalletBalance();
}

/// Manages OTP verification.
abstract class TaxiOtpRepository {
  /// Generate OTP for a ride (server-side).
  Future<String> generateOtp(String rideId);

  /// Verify OTP entered by driver (customer-side: get the OTP to show).
  Future<String> getActiveOtp(String rideId);
}

/// Manages taxi module configuration.
abstract class TaxiConfigRepository {
  /// Get configuration for a country/city.
  Future<TaxiConfig> getConfig(String countryCode);

  /// Get cancellation reasons.
  Future<List<CancellationReason>> getCancellationReasons();

  /// Get safety contacts.
  Future<List<SafetyContact>> getSafetyContacts();
}

/// Country/city configuration for the taxi module.
/// Matches the per-country settings from the Super Admin panel.
class TaxiConfig {
  final String countryCode;
  final String currency;
  final String distanceUnit; // 'km' or 'mi'
  final bool otpRequired;
  final bool scheduledRidesEnabled;
  final bool cashEnabled;
  final bool tipsEnabled;
  final int maxStops;
  final List<String> enabledPaymentTypes;
  final List<String> enabledVehicleTypes;
  final String emergencyNumber;
  final bool rideShareEnabled;
  final int freeWaitingMinutes;
  final int autoCancelTimeoutSeconds;
  final double surgeMinMultiplier;
  final double surgeMaxMultiplier;
  final bool autoSurgeEnabled;

  const TaxiConfig({
    required this.countryCode,
    required this.currency,
    this.distanceUnit = 'km',
    this.otpRequired = true,
    this.scheduledRidesEnabled = true,
    this.cashEnabled = true,
    this.tipsEnabled = true,
    this.maxStops = 3,
    this.enabledPaymentTypes = const ['cash', 'card', 'wallet'],
    this.enabledVehicleTypes = const ['economy', 'comfort', 'premium', 'bike'],
    this.emergencyNumber = '911',
    this.rideShareEnabled = false,
    this.freeWaitingMinutes = 5,
    this.autoCancelTimeoutSeconds = 120,
    this.surgeMinMultiplier = 1.0,
    this.surgeMaxMultiplier = 3.0,
    this.autoSurgeEnabled = true,
  });

  factory TaxiConfig.fromJson(Map<String, dynamic> json) {
    return TaxiConfig(
      countryCode: json['countryCode'] ?? '',
      currency: json['currency'] ?? RegionService.instance.currentCountry.currencySymbol,
      distanceUnit: json['distanceUnit'] ?? 'km',
      otpRequired: json['otpRequired'] ?? true,
      scheduledRidesEnabled: json['scheduledRidesEnabled'] ?? true,
      cashEnabled: json['cashEnabled'] ?? true,
      tipsEnabled: json['tipsEnabled'] ?? true,
      maxStops: json['maxStops'] ?? 3,
      enabledPaymentTypes: List<String>.from(json['enabledPaymentGateways'] ?? ['cash', 'card', 'wallet']),
      enabledVehicleTypes: List<String>.from(json['enabledVehicleTypes'] ?? ['economy', 'comfort', 'premium', 'bike']),
      emergencyNumber: json['emergencyNumber'] ?? '911',
      rideShareEnabled: json['rideShareEnabled'] ?? false,
      freeWaitingMinutes: json['freeWaitingMinutes'] ?? 5,
      autoCancelTimeoutSeconds: json['autoCancelTimeoutSeconds'] ?? 120,
      surgeMinMultiplier: (json['surgeLimits']?['minMultiplier'] ?? 1.0).toDouble(),
      surgeMaxMultiplier: (json['surgeLimits']?['maxMultiplier'] ?? 3.0).toDouble(),
      autoSurgeEnabled: json['surgeLimits']?['autoEnabled'] ?? true,
    );
  }
}
