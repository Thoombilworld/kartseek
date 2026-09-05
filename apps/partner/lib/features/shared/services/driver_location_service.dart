import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kartseek_shared_mobile/core/security/secure_api_client.dart';
import 'package:kartseek_shared_mobile/core/services/taxi_socket_service.dart';

/// DriverLocationService — Persistent background GPS broadcasting.
///
/// When a taxi driver goes ONLINE, this service starts a periodic GPS update
/// loop that broadcasts the driver's coordinates to the server.
///
/// Integrates with:
///  - [TaxiSocketService] for WebSocket-based real-time location broadcasting
///  - [SecureApiClient] for REST-based location updates (fallback)
///
/// FIXED: Removed double-broadcasting bug where both a Timer.periodic AND
/// socket.startBroadcastingLocation() were firing simultaneously.
///
/// ADDED: Adaptive intervals based on ride state + stationary detection.
///
/// Usage:
///   DriverLocationService.instance.startBroadcasting(driverId: 'DRV-001');
///   DriverLocationService.instance.stopBroadcasting();
class DriverLocationService {
  DriverLocationService._();
  static final instance = DriverLocationService._();

  final _api = SecureApiClient();
  final _socket = TaxiSocketService();
  Timer? _restFallbackTimer;
  bool _isBroadcasting = false;
  String? _activeDriverId;
  String? _activeRideId;

  /// Current driver coordinates (updated by GPS provider).
  double _lat = 0.0;
  double _lng = 0.0;
  double _heading = 0.0;
  double _speed = 0.0;
  static const _stationarySpeedThreshold = 0.56; // ~2 km/h in m/s

  // FIX 2: Counter for stationary broadcasts — allow every Nth broadcast
  // even when the driver is stationary, so they remain visible on the map.
  int _stationarySkipCount = 0;
  static const _stationaryBroadcastEvery = 3; // Broadcast every 3rd tick (~30s at 10s interval)

  /// Expose the current position to the UI (e.g. for map rendering)
  final StreamController<Position> _locationStreamController = StreamController<Position>.broadcast();
  Stream<Position> get locationStream => _locationStreamController.stream;

  /// Whether the service is currently broadcasting.
  bool get isBroadcasting => _isBroadcasting;

  /// Update the current GPS coordinates (called by platform GPS plugin).
  void updateCoordinates({
    required double lat,
    required double lng,
    double heading = 0.0,
    double speed = 0.0,
  }) {
    _lat = lat;
    _lng = lng;
    _heading = heading;
    _speed = speed;
  }

  /// Start broadcasting GPS location to the server.
  ///
  /// Uses a SINGLE Timer.periodic (no double-broadcasting).
  /// WebSocket is the primary channel; REST is a secondary fallback
  /// that fires every 30 seconds, NOT every cycle.
  ///
  /// [driverId] — The authenticated driver's ID.
  /// [rideId] — Optional active ride ID for trip tracking.
  /// [intervalSeconds] — Broadcast frequency (default: auto-adaptive).
  StreamSubscription<Position>? _positionStream;

  /// Start broadcasting GPS location to the server.
  ///
  /// Uses Geolocator.getPositionStream to listen for real hardware GPS updates.
  /// WebSocket is the primary channel; REST is a secondary fallback
  /// that fires every 30 seconds.
  ///
  /// [driverId] — The authenticated driver's ID.
  /// [rideId] — Optional active ride ID for trip tracking.
  void startBroadcasting({
    required String driverId,
    String? rideId,
  }) async {
    if (_isBroadcasting && _activeDriverId == driverId) return;

    _activeDriverId = driverId;
    _activeRideId = rideId;
    _isBroadcasting = true;

    // Initialize socket connection if not connected
    _socket.connect(userId: driverId, userType: 'driver').catchError((e) {
      debugPrint('[DriverLocationService] Socket connection failed: $e');
    });

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      debugPrint('[DriverLocationService] Location services disabled.');
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        debugPrint('[DriverLocationService] Location permissions denied.');
        return;
      }
    }

    // Configure adaptive location stream
    // Active ride: high accuracy, small distance filter
    // Idle: balanced accuracy, larger distance filter
    final locationSettings = rideId != null 
        ? const LocationSettings(
            accuracy: LocationAccuracy.high,
            distanceFilter: 5, // meters
          )
        : const LocationSettings(
            accuracy: LocationAccuracy.medium,
            distanceFilter: 15, // meters
          );

    _positionStream?.cancel();
    _positionStream = Geolocator.getPositionStream(locationSettings: locationSettings).listen((Position position) {
      _lat = position.latitude;
      _lng = position.longitude;
      _heading = position.heading;
      _speed = position.speed;

      _locationStreamController.add(position);

      // Broadcast immediately on significant GPS change
      _broadcastViaSocket();
    });

    // Separate REST fallback timer — every 30 seconds
    _restFallbackTimer?.cancel();
    _restFallbackTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _broadcastViaRest(),
    );

    debugPrint('[DriverLocationService] 🟢 Started hardware GPS broadcasting for $driverId (rideId: $rideId)');
  }

  /// Stop GPS broadcasting.
  void stopBroadcasting() {
    _positionStream?.cancel();
    _positionStream = null;
    _restFallbackTimer?.cancel();
    _restFallbackTimer = null;
    _isBroadcasting = false;
    debugPrint('[DriverLocationService] 🔴 Stopped broadcasting');
  }

  /// Update the active ride ID (when driver accepts a new ride).
  void setActiveRide(String rideId) {
    _activeRideId = rideId;
    if (_isBroadcasting && _activeDriverId != null) {
      // Restart with faster interval for active ride
      stopBroadcasting();
      startBroadcasting(
        driverId: _activeDriverId!,
        rideId: rideId,
      );
    }
  }

  /// Clear the active ride (ride completed/cancelled).
  void clearActiveRide() {
    final wasActive = _activeRideId != null;
    _activeRideId = null;
    if (wasActive && _isBroadcasting && _activeDriverId != null) {
      // Slow down to idle interval when no active ride
      stopBroadcasting();
      startBroadcasting(
        driverId: _activeDriverId!,
      );
    }
  }

  /// Broadcast via WebSocket (primary channel).
  ///
  /// FIX 2: Previously skipped ALL broadcasts when stationary — this made
  /// drivers at taxi stands invisible to customers. Now broadcasts every
  /// 3rd tick (~30s) even when stationary, so drivers remain on the map.
  void _broadcastViaSocket() {
    if (_activeDriverId == null || _lat == 0.0) return;

    // Stationary detection: throttle (not block) broadcasts when idle
    if (_activeRideId == null && _speed < _stationarySpeedThreshold) {
      _stationarySkipCount++;
      if (_stationarySkipCount < _stationaryBroadcastEvery) {
        return; // Skip this tick
      }
      _stationarySkipCount = 0; // Broadcast on every Nth tick
    } else {
      _stationarySkipCount = 0;
    }

    _socket.updateDriverLocation(
      driverId: _activeDriverId!,
      lat: _lat,
      lng: _lng,
      heading: _heading,
      speed: _speed,
      rideId: _activeRideId,
    );
  }

  /// Broadcast via REST API (secondary fallback for Redis GEO storage).
  Future<void> _broadcastViaRest() async {
    if (_activeDriverId == null || _lat == 0.0) return;

    try {
      await _api.post('/taxi/driver/location', body: {
        'driverId': _activeDriverId,
        'lat': _lat,
        'lng': _lng,
        'heading': _heading,
        'speed': _speed,
        if (_activeRideId != null) 'rideId': _activeRideId,
      });
    } catch (e) {
      debugPrint('[DriverLocationService] REST fallback error: $e');
    }
  }

  /// Clean up resources.
  void dispose() {
    stopBroadcasting();
    _socket.dispose();
  }
}
