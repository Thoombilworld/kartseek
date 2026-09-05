// cSpell:words mpesa
/// KARTSEEK Taxi Booking — Remote Datasource
///
/// All HTTP calls to the taxi backend via [SecureApiClient].
/// This is the ONLY file that touches network APIs for taxi.
/// Includes request cancellation support via [RequestCanceller].
library;

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:kartseek_shared_mobile/core/security/secure_api_client.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Lightweight cancellation token for dart:io HttpClient requests.
/// Each request is tagged; you can cancel by tag or cancel all.
class RequestCanceller {
  final Map<String, Completer<void>> _tokens = {};

  /// Register a cancellable request. Returns the tag.
  String register(String tag) {
    cancel(tag); // Cancel any previous request with the same tag
    _tokens[tag] = Completer<void>();
    return tag;
  }

  /// Check if a tag has been cancelled.
  bool isCancelled(String tag) => _tokens[tag]?.isCompleted ?? true;

  /// Cancel a specific tagged request.
  void cancel(String tag) {
    final completer = _tokens.remove(tag);
    if (completer != null && !completer.isCompleted) {
      completer.complete();
    }
  }

  /// Cancel all pending requests.
  void cancelAll() {
    for (final tag in _tokens.keys.toList()) {
      cancel(tag);
    }
  }

  /// Clean up completed entries.
  void _cleanup(String tag) {
    _tokens.remove(tag);
  }
}

class TaxiRemoteDatasource {
  final _api = SecureApiClient();
  final canceller = RequestCanceller();

  /// Wraps an API call with cancellation support.
  /// Throws [CancelledException] if the request was cancelled before completion.
  Future<Map<String, dynamic>> _cancellable(
    String tag,
    Future<Map<String, dynamic>> Function() apiCall,
  ) async {
    canceller.register(tag);
    try {
      final result = await apiCall();
      if (canceller.isCancelled(tag)) {
        throw CancelledException(tag);
      }
      return result;
    } finally {
      canceller._cleanup(tag);
    }
  }

  // ─── Fare Estimation ────────────────────────────────────────────────────

  Future<Map<String, dynamic>> estimateFare({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
    required String vehicleType,
    String? zoneId,
  }) async {
    return _cancellable('estimateFare', () => _api.post('/taxi/estimate', body: {
      'pickupLat': pickupLat,
      'pickupLng': pickupLng,
      'dropLat': dropLat,
      'dropLng': dropLng,
      'vehicleType': vehicleType,
      if (zoneId != null) 'zoneId': zoneId,
    }));
  }

  // ─── Nearby Drivers ────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getNearbyDrivers({
    required double lat,
    required double lng,
    double? radiusKm,
    String? vehicleType,
  }) async {
    return _cancellable('nearbyDrivers', () {
      final queryParams = <String, String>{
        'lat': lat.toString(),
        'lng': lng.toString(),
        if (radiusKm != null) 'radiusKm': radiusKm.toString(),
        if (vehicleType != null) 'vehicleType': vehicleType,
      };
      return _api.get('/taxi/nearby-drivers', queryParams: queryParams);
    });
  }

  // ─── Ride Request ──────────────────────────────────────────────────────

  Future<Map<String, dynamic>> requestRide({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
    required String pickupAddress,
    required String dropAddress,
    required String vehicleType,
    required String paymentMethod,
    required double fareEstimate,
    String? preferredDriverId,
  }) async {
    return await _api.post('/taxi/request', body: {
      'pickupLat': pickupLat,
      'pickupLng': pickupLng,
      'dropLat': dropLat,
      'dropLng': dropLng,
      'pickupAddress': pickupAddress,
      'dropAddress': dropAddress,
      'vehicleType': vehicleType,
      'paymentMethod': paymentMethod,
      'fareEstimate': fareEstimate,
      if (preferredDriverId != null) 'preferredDriverId': preferredDriverId,
    });
  }

  // ─── Ride Lifecycle ────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getRideDetails(String rideId) async {
    return await _api.get('/taxi/ride/$rideId');
  }

  Future<Map<String, dynamic>> getRideHistory() async {
    return await _api.get('/taxi/rides');
  }

  Future<Map<String, dynamic>> cancelRide(String rideId, {String? reason}) async {
    return await _api.post('/taxi/ride/$rideId/cancel', body: {
      if (reason != null) 'reason': reason,
    });
  }

  Future<Map<String, dynamic>> trackRide(String rideId) async {
    return await _api.get('/taxi/ride/$rideId/track');
  }

  // ─── Ratings ───────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> submitRating({
    required String rideId,
    required int rating,
    String? comment,
  }) async {
    return await _api.post('/taxi/ride/$rideId/rating', body: {
      'rating': rating,
      if (comment != null) 'comment': comment,
    });
  }

  // ─── Safety ────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> triggerSos(String rideId, {String? details}) async {
    return await _api.post('/taxi/ride/$rideId/sos', body: {
      if (details != null) 'details': details,
    });
  }

  Future<Map<String, dynamic>> reportDispute({
    required String rideId,
    required String reason,
    String? details,
  }) async {
    return await _api.post('/taxi/ride/$rideId/support', body: {
      'reason': reason,
      if (details != null) 'details': details,
    });
  }

  // ─── OTP ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> generateOtp(String rideId) async {
    try {
      return await _api.post('/taxi/ride/$rideId/otp/generate');
    } catch (e) {
      // Fallback: generate client-side OTP if backend endpoint doesn't exist yet
      final otp = (1000 + (DateTime.now().millisecondsSinceEpoch % 9000)).toString();
      debugPrint('[TaxiRemote] OTP fallback generated: $otp');
      return {'otp': otp, 'expiresAt': DateTime.now().add(const Duration(minutes: 5)).toIso8601String()};
    }
  }

  /// POST /taxi/ride/:rideId/otp/verify
  Future<Map<String, dynamic>> verifyOtp(String rideId, String otpCode) async {
    return await _api.post('/taxi/ride/$rideId/otp/verify', body: {
      'otp': otpCode,
    });
  }

  // ─── Receipt ──────────────────────────────────────────────────────────

  /// GET /taxi/ride/:rideId/receipt
  Future<Map<String, dynamic>> getReceipt(String rideId) async {
    return await _api.get('/taxi/ride/$rideId/receipt');
  }

  // ─── Config ────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getConfig(String countryCode) async {
    try {
      return await _api.get('/taxi/config/$countryCode');
    } catch (e) {
      // Fallback defaults until backend endpoint is deployed
      return _defaultConfig(countryCode);
    }
  }

  Future<Map<String, dynamic>> getVehicleCategories({
    required String countryCode,
    double? lat,
    double? lng,
  }) async {
    try {
      return await _api.get('/taxi/vehicle-categories', queryParams: {
        'country': countryCode,
        if (lat != null) 'lat': lat.toString(),
        if (lng != null) 'lng': lng.toString(),
      });
    } catch (e) {
      return {'categories': _defaultVehicleCategories()};
    }
  }

  // ─── Fallback Data ────────────────────────────────────────────────────

  Map<String, dynamic> _defaultConfig(String countryCode) {
    final configs = {
      'KE': {'currency': 'KES', 'otpRequired': true, 'cashEnabled': true, 'tipsEnabled': true, 'emergencyNumber': '999', 'paymentTypes': ['cash', 'mpesa', 'card', 'wallet']},
      'IN': {'currency': 'INR', 'otpRequired': true, 'cashEnabled': true, 'tipsEnabled': true, 'emergencyNumber': '112', 'paymentTypes': ['cash', 'upi', 'card', 'wallet']},
      'QA': {'currency': 'QAR', 'otpRequired': true, 'cashEnabled': true, 'tipsEnabled': true, 'emergencyNumber': '999', 'paymentTypes': ['cash', 'card', 'apple_pay', 'google_pay', 'wallet']},
      'AE': {'currency': 'AED', 'otpRequired': true, 'cashEnabled': true, 'tipsEnabled': true, 'emergencyNumber': '999', 'paymentTypes': ['cash', 'card', 'apple_pay', 'google_pay', 'wallet']},
      'US': {'currency': 'USD', 'otpRequired': false, 'cashEnabled': false, 'tipsEnabled': true, 'emergencyNumber': '911', 'paymentTypes': ['card', 'apple_pay', 'google_pay', 'wallet']},
      'GB': {'currency': 'GBP', 'otpRequired': false, 'cashEnabled': true, 'tipsEnabled': true, 'emergencyNumber': '999', 'paymentTypes': ['cash', 'card', 'apple_pay', 'google_pay', 'wallet']},
    };
    return configs[countryCode] ?? configs[RegionService.instance.currentCountry.code] ?? configs['KE']!;
  }

  List<Map<String, dynamic>> _defaultVehicleCategories() {
    return [
      {'id': 'economy', 'name': 'Economy', 'description': 'Affordable rides for everyday travel', 'maxPassengers': 4, 'maxLuggage': 2, 'iconUrl': '', 'isAccessible': false},
      {'id': 'comfort', 'name': 'Comfort', 'description': 'Spacious cars with extra legroom', 'maxPassengers': 4, 'maxLuggage': 3, 'iconUrl': '', 'isAccessible': false},
      {'id': 'premium', 'name': 'Premium', 'description': 'Luxury vehicles for a premium experience', 'maxPassengers': 4, 'maxLuggage': 3, 'iconUrl': '', 'isAccessible': false},
      {'id': 'suv', 'name': 'SUV', 'description': 'Large vehicles for groups and extra luggage', 'maxPassengers': 6, 'maxLuggage': 5, 'iconUrl': '', 'isAccessible': true},
      {'id': 'bike', 'name': 'Bike', 'description': 'Quick motorcycle rides for solo travelers', 'maxPassengers': 1, 'maxLuggage': 0, 'iconUrl': '', 'isAccessible': false},
    ];
  }
}

/// Exception thrown when an API request is cancelled via [RequestCanceller].
class CancelledException implements Exception {
  final String tag;
  const CancelledException(this.tag);

  @override
  String toString() => 'CancelledException: request "$tag" was cancelled';
}

