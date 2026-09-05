import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kartseek_shared_mobile/core/security/secure_api_client.dart';
import 'package:kartseek_shared_mobile/core/services/taxi_socket_service.dart';
import 'package:kartseek_partner/features/shared/services/driver_location_service.dart';

/// DriverAvailabilityService — Manages the driver's online/offline state.
///
/// When going ONLINE:
///  1. Checks GPS permission (required before anything else)
///  2. Calls the backend `/taxi/driver/online` endpoint
///  3. Starts the GPS position stream → feeds into [DriverLocationService]
///  4. Starts the broadcasting timer via [DriverLocationService]
///  5. Connects WebSocket and registers for ride dispatch
///
/// When going OFFLINE:
///  1. Calls the backend `/taxi/driver/offline` endpoint
///  2. Stops GPS stream and broadcasting timer
///  3. Removes driver from the active pool
class DriverAvailabilityService {
  DriverAvailabilityService._();
  static final instance = DriverAvailabilityService._();

  final _api = SecureApiClient();
  final _locationService = DriverLocationService.instance;

  bool _isOnline = false;
  String? _driverId;

  /// GPS position stream subscription — feeds real coordinates into the
  /// broadcasting service so that driver locations are actually sent.
  StreamSubscription<Position>? _gpsSub;

  /// Whether the driver is currently online.
  bool get isOnline => _isOnline;

  /// The current driver ID.
  String? get driverId => _driverId;

  /// Go ONLINE — Activates the driver in the dispatch pool.
  ///
  /// [driverId] — The authenticated driver's ID.
  /// [profile] — Driver profile data for quick matching lookups.
  Future<bool> goOnline({
    required String driverId,
    String? firstName,
    String? vehicleType,
    String? vehiclePlate,
    double? rating,
  }) async {
    if (_isOnline && _driverId == driverId) return true;

    _driverId = driverId;

    // ──────────────────────────────────────────────────────────────────────
    // FIX 3: Verify GPS permission BEFORE starting location services.
    // Without this, Geolocator.getPositionStream() silently fails on
    // Android 12+ and the driver stays invisible.
    // ──────────────────────────────────────────────────────────────────────
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      debugPrint('[DriverAvailability] ❌ GPS permission denied — cannot go online');
      return false;
    }

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      debugPrint('[DriverAvailability] ❌ Location services disabled — cannot go online');
      return false;
    }

    // Notify backend
    try {
      await _api.post('/taxi/driver/online', body: {
        'driverId': driverId,
        'firstName': firstName ?? 'Driver',
        'vehicleType': vehicleType ?? 'economy',
        'vehiclePlate': vehiclePlate ?? '',
        'rating': rating ?? 4.5,
      });
    } catch (e) {
      debugPrint('[DriverAvailability] API go-online failed (non-fatal): $e');
    }

    // DriverLocationService now internally manages its own Geolocator stream
    // to handle adaptive distance filtering depending on active ride state.

    // Start GPS broadcasting timer (every 5–10 seconds depending on ride state)
    _locationService.startBroadcasting(driverId: driverId);

    // Connect to WebSocket and register as driver for ride dispatch
    final taxiSocket = TaxiSocketService();
    try {
      await taxiSocket.connect(userId: driverId, userType: 'driver');
      taxiSocket.emit('joinAsDriver', {'driverId': driverId});
      debugPrint('[DriverAvailability] 📡 Registered with WebSocket as driver $driverId');
    } catch (e) {
      debugPrint('[DriverAvailability] WebSocket registration failed (non-fatal): $e');
    }

    _isOnline = true;
    debugPrint('[DriverAvailability] 🟢 Driver $driverId is now ONLINE');
    return true;
  }

  /// Go OFFLINE — Removes the driver from the dispatch pool.
  Future<void> goOffline() async {
    if (!_isOnline) return;

    try {
      await _api.post('/taxi/driver/offline', body: {
        'driverId': _driverId ?? '',
      });
    } catch (e) {
      debugPrint('[DriverAvailability] API go-offline failed (non-fatal): $e');
    }

    // Stop GPS stream — no more coordinate updates
    _gpsSub?.cancel();
    _gpsSub = null;

    // Stop broadcasting timer
    _locationService.stopBroadcasting();

    _isOnline = false;
    debugPrint('[DriverAvailability] 🔴 Driver $_driverId is now OFFLINE');
  }

  /// Accept a ride — Notifies backend and sets active ride context.
  Future<bool> acceptRide(String rideId) async {
    if (!_isOnline || _driverId == null) return false;

    try {
      final res = await _api.post('/taxi/driver/ride/$rideId/accept', body: {
        'driverId': _driverId,
      });

      if (res['success'] == true) {
        // Switch to high-frequency GPS broadcasting (3s)
        _locationService.setActiveRide(rideId);
        debugPrint('[DriverAvailability] ✅ Accepted ride $rideId');
        return true;
      }
    } catch (e) {
      debugPrint('[DriverAvailability] Accept ride failed: $e');
    }
    return false;
  }

  /// Reject a ride — Notifies backend to cascade to next driver.
  Future<void> rejectRide(String rideId) async {
    if (_driverId == null) return;

    try {
      await _api.post('/taxi/driver/ride/$rideId/reject', body: {
        'driverId': _driverId,
      });
    } catch (e) {
      debugPrint('[DriverAvailability] Reject ride failed: $e');
    }
  }

  /// Complete a ride — Finalizes trip and returns to idle broadcasting.
  Future<void> completeRide(String rideId) async {
    _locationService.clearActiveRide();
    debugPrint('[DriverAvailability] Ride $rideId completed');
  }

  /// Dispose resources.
  void dispose() {
    _gpsSub?.cancel();
    _gpsSub = null;
    _locationService.dispose();
  }
}
