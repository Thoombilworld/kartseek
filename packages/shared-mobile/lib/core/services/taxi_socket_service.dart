// lib/core/services/taxi_socket_service.dart
import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'package:shared_mobile/core/services/socket_service.dart';

/// Live location update received from the server for a specific driver.
class DriverLocationUpdate {
  final String driverId;
  final double lat;
  final double lng;
  final double heading;
  final double? speed;
  final int sequenceNumber;
  final DateTime timestamp;

  const DriverLocationUpdate({
    required this.driverId,
    required this.lat,
    required this.lng,
    required this.heading,
    this.speed,
    this.sequenceNumber = 0,
    required this.timestamp,
  });

  factory DriverLocationUpdate.fromJson(Map<String, dynamic> json) {
    return DriverLocationUpdate(
      driverId: json['driverId'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      heading: (json['heading'] as num?)?.toDouble() ?? 0.0,
      speed: (json['speed'] as num?)?.toDouble(),
      sequenceNumber: (json['sequenceNumber'] as num?)?.toInt() ?? 0,
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

/// Summary of a nearby driver (from `findNearbyDrivers` / `nearbyDrivers`).
class NearbyDriver {
  final String driverId;
  final double lat;
  final double lng;
  final double distKm;
  final double heading;
  final bool isOnRide;

  const NearbyDriver({
    required this.driverId,
    required this.lat,
    required this.lng,
    required this.distKm,
    required this.heading,
    required this.isOnRide,
  });

  factory NearbyDriver.fromJson(Map<String, dynamic> json) {
    return NearbyDriver(
      driverId: json['driverId'] as String? ?? json['member'] as String? ?? '',
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      distKm: (json['dist'] as num?)?.toDouble() ?? (json['distKm'] as num?)?.toDouble() ?? 0.0,
      heading: (json['heading'] as num?)?.toDouble() ?? 0.0,
      isOnRide: json['isOnRide'] as bool? ?? false,
    );
  }
}

/// Manages the `/taxi` WebSocket namespace.
///
/// **Customer usage:**
///  1. `connect(userId, userType: 'customer')`
///  2. `joinRideTracking(rideId)` → listen to [driverLocationStream]
///  3. `findNearbyDrivers(lat, lng)` → listen to [nearbyDriversStream]
///
/// **Driver usage:**
///  1. `connect(driverId, userType: 'driver')`
///  2. Call `updateDriverLocation(...)` every 5 seconds via a [Timer]
class TaxiSocketService extends BaseSocketService {
  // Singleton — ensures all consumers share one WebSocket connection.
  static final TaxiSocketService _instance = TaxiSocketService._internal();
  factory TaxiSocketService() => _instance;
  TaxiSocketService._internal();

  @override
  String get namespace => '/taxi';

  // ── Event Streams ─────────────────────────────────────────────────────────
  // Use getters with lazy re-creation so streams survive even if
  // dispose() was erroneously called on this singleton.

  StreamController<DriverLocationUpdate>? _locationController;
  StreamController<List<NearbyDriver>>? _nearbyController;
  StreamController<Map<String, dynamic>>? _incomingRideController;
  StreamController<Map<String, dynamic>>? _rideStatusController;
  StreamController<Map<String, dynamic>>? _driverAssignedController;

  StreamController<DriverLocationUpdate> get _location =>
      _locationController ??= StreamController<DriverLocationUpdate>.broadcast();
  StreamController<List<NearbyDriver>> get _nearby =>
      _nearbyController ??= StreamController<List<NearbyDriver>>.broadcast();
  StreamController<Map<String, dynamic>> get _incomingRide =>
      _incomingRideController ??= StreamController<Map<String, dynamic>>.broadcast();
  StreamController<Map<String, dynamic>> get _rideStatus =>
      _rideStatusController ??= StreamController<Map<String, dynamic>>.broadcast();
  StreamController<Map<String, dynamic>> get _driverAssigned =>
      _driverAssignedController ??= StreamController<Map<String, dynamic>>.broadcast();

  /// Live GPS updates for the driver assigned to the current ride.
  Stream<DriverLocationUpdate> get driverLocationStream => _location.stream;

  /// Snapshot of nearby available drivers (refreshed on demand).
  Stream<List<NearbyDriver>> get nearbyDriversStream => _nearby.stream;

  /// Incoming ride request stream (driver side).
  Stream<Map<String, dynamic>> get incomingRideStream => _incomingRide.stream;

  /// Ride status change stream (both sides).
  Stream<Map<String, dynamic>> get rideStatusStream => _rideStatus.stream;

  /// Driver assigned notification stream (customer side).
  Stream<Map<String, dynamic>> get driverAssignedStream => _driverAssigned.stream;


  // ── State ─────────────────────────────────────────────────────────────────
  Timer? _locationTimer;
  int _locationSequence = 0;
  final Map<String, int> _expectedSequences = {};

  // ── Driver: GPS Broadcast ─────────────────────────────────────────────────
  /// Start broadcasting the driver's GPS location every [intervalSeconds].
  /// Provide a [locationProvider] that returns `(lat, lng, heading)`.
  void startBroadcastingLocation({
    required String driverId,
    required Future<Map<String, double>> Function() locationProvider,
    String? rideId,
    int intervalSeconds = 5,
  }) {
    _locationTimer?.cancel();
    _locationTimer = Timer.periodic(Duration(seconds: intervalSeconds), (_) async {
      try {
        final loc = await locationProvider();
        updateDriverLocation(
          driverId: driverId,
          lat: loc['lat']!,
          lng: loc['lng']!,
          heading: loc['heading'] ?? 0.0,
          rideId: rideId,
        );
      } catch (e) {
        debugPrint('[TaxiSocket] Location provider error: $e');
      }
    });
  }

  /// Stop location broadcasting (e.g., when ride is completed).
  void stopBroadcastingLocation() {
    _locationTimer?.cancel();
    _locationTimer = null;
  }

  /// Emit a single driver location update to the server.
  void updateDriverLocation({
    required String driverId,
    required double lat,
    required double lng,
    double heading = 0.0,
    double? speed,
    String? rideId,
  }) {
    _locationSequence++;
    emit('updateDriverLocation', {
      'driverId': driverId,
      'lat': lat,
      'lng': lng,
      'heading': heading,
      'sequenceNumber': _locationSequence,
      if (speed != null) 'speed': speed,
      if (rideId != null) 'rideId': rideId,
    });
  }

  // ── Customer: Tracking ────────────────────────────────────────────────────

  /// Join the room for a specific ride to receive live driver GPS updates.
  void joinRideTracking(String rideId) {
    emit('joinRideTracking', rideId);
    debugPrint('[TaxiSocket] Joined ride tracking: $rideId');
  }

  /// Leave a ride tracking room.
  void leaveRideTracking(String rideId) {
    emit('leave_trip_tracking', {'tripId': rideId});
  }

  /// Request a list of nearby available drivers within [radiusKm].
  void findNearbyDrivers({required double lat, required double lng, double radiusKm = 5.0}) {
    emit('findNearbyDrivers', {'lat': lat, 'lng': lng, 'radiusKm': radiusKm});
  }

  // ── Event Handler Registration ────────────────────────────────────────────

  @override
  void registerHandlers(io.Socket socket) {
    // Driver's live GPS during an active ride
    socket.on('liveRideTracking', (data) {
      try {
        final map = data is String ? jsonDecode(data) as Map<String, dynamic> : Map<String, dynamic>.from(data as Map);
        _location.add(DriverLocationUpdate.fromJson(map));
      } catch (e) {
        debugPrint('[TaxiSocket] liveRideTracking parse error: $e');
      }
    });

    // Also listen to the unified tracking gateway's event name
    socket.on('taxi_location_updated', (data) {
      try {
        final map = data is String
            ? jsonDecode(data) as Map<String, dynamic>
            : Map<String, dynamic>.from(data as Map);
        final update = DriverLocationUpdate.fromJson(map);
        
        final expected = _expectedSequences[update.driverId];
        if (expected != null && update.sequenceNumber > expected) {
          final dropped = update.sequenceNumber - expected;
          debugPrint('⚠️ [TaxiSocket] GPS Gap detected: dropped $dropped packets for driver ${update.driverId}');
        }
        // Set expected to next sequence
        if (update.sequenceNumber > 0) {
          _expectedSequences[update.driverId] = update.sequenceNumber + 1;
        }

        _location.add(update);
      } catch (e) {
        debugPrint('[TaxiSocket] taxi_location_updated parse error: $e');
      }
    });

    // Snapshot of nearby drivers
    socket.on('nearbyDriversResult', (data) {
      try {
        final list = data is List ? data : (data is String ? jsonDecode(data) as List : []);
        final drivers = list.map((d) => NearbyDriver.fromJson(Map<String, dynamic>.from(d as Map))).toList();
        _nearby.add(drivers);
      } catch (e) {
        debugPrint('[TaxiSocket] nearbyDriversResult parse error: $e');
      }
    });

    // Periodic global nearby drivers broadcast
    socket.on('nearbyDrivers', (data) {
      try {
        final list = data is List ? data : (data is String ? jsonDecode(data) as List : []);
        final drivers = list.map((d) => NearbyDriver.fromJson(Map<String, dynamic>.from(d as Map))).toList();
        _nearby.add(drivers);
      } catch (e) {
        debugPrint('[TaxiSocket] nearbyDrivers parse error: $e');
      }
    });

    // Incoming ride request (pushed to driver when matching)
    socket.on('incoming_ride_request', (data) {
      try {
        final map = data is String ? jsonDecode(data) as Map<String, dynamic> : Map<String, dynamic>.from(data as Map);
        _incomingRide.add(map);
        debugPrint('[TaxiSocket] 📥 Incoming ride request: ${map['rideId']}');
      } catch (e) {
        debugPrint('[TaxiSocket] incoming_ride_request parse error: $e');
      }
    });

    // Driver assigned to customer's ride (with ack response)
    socket.on('ride_driver_assigned', (data, [ack]) {
      try {
        final map = data is String ? jsonDecode(data) as Map<String, dynamic> : Map<String, dynamic>.from(data as Map);
        _driverAssigned.add(map);
        debugPrint('[TaxiSocket] ✅ Driver assigned: ${map['driverName']} for ride ${map['rideId']}');
        // Send ack to server confirming receipt
        if (ack is Function) ack({'received': true, 'rideId': map['rideId']});
      } catch (e) {
        debugPrint('[TaxiSocket] ride_driver_assigned parse error: $e');
      }
    });

    // Ride status changes (broadcast to all participants, with ack response)
    socket.on('ride_status_changed', (data, [ack]) {
      try {
        final map = data is String ? jsonDecode(data) as Map<String, dynamic> : Map<String, dynamic>.from(data as Map);
        _rideStatus.add(map);
        debugPrint('[TaxiSocket] 🔄 Ride status changed: ${map['status']} for ${map['rideId']}');
        // Send ack to server confirming receipt
        if (ack is Function) ack({'received': true, 'rideId': map['rideId'], 'status': map['status']});
      } catch (e) {
        debugPrint('[TaxiSocket] ride_status_changed parse error: $e');
      }
    });
  }

  @override
  void onDisconnected() {
    stopBroadcastingLocation();
  }

  /// Singleton should never be disposed — this is a no-op.
  /// Stream controllers are lazily re-created if needed.
  @override
  void dispose() {
    // NO-OP: Singleton services must not be disposed.
    // The BLoC only cancels its own stream subscriptions.
    debugPrint('[TaxiSocket] ⚠️ dispose() called on singleton — ignoring');
    super.dispose();
  }
}

