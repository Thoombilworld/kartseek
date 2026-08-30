/// KARTSEEK Taxi Booking — Realtime Datasource
///
/// Wraps the existing [TaxiSocketService] singleton with resilient
/// stream management. Converts raw socket events into typed domain streams.
/// Includes auto-reconnect with exponential backoff on disconnect.
library;

import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_mobile/core/services/taxi_socket_service.dart' as socket;
import '../../domain/entities/entities.dart';

class TaxiRealtimeDatasource {
  final _socket = socket.TaxiSocketService();

  bool _isConnected = false;
  String? _userId;
  int _reconnectAttempts = 0;
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;
  static const _maxReconnectAttempts = 5;

  /// Connect to the taxi WebSocket namespace.
  Future<void> connect({required String userId}) async {
    if (_isConnected) return;
    _userId = userId;
    try {
      await _socket.connect(userId: userId, userType: 'customer');
      _isConnected = true;
      _reconnectAttempts = 0;
      debugPrint('[TaxiRealtime] ✅ Connected as customer: $userId');
      _startHeartbeat();
    } catch (e) {
      debugPrint('[TaxiRealtime] ❌ Connection failed: $e');
      _scheduleReconnect();
      rethrow;
    }
  }

  /// Schedule a reconnection attempt with exponential backoff.
  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('[TaxiRealtime] ⚠️ Max reconnect attempts reached ($_maxReconnectAttempts)');
      return;
    }
    _reconnectTimer?.cancel();
    final delay = Duration(seconds: min(pow(2, _reconnectAttempts + 1).toInt(), 30));
    _reconnectAttempts++;
    debugPrint('[TaxiRealtime] ⏳ Reconnecting in ${delay.inSeconds}s (attempt $_reconnectAttempts)');
    _reconnectTimer = Timer(delay, () async {
      try {
        _isConnected = false;
        if (_userId != null) {
          await connect(userId: _userId!);
        }
      } catch (_) {
        // connect() already schedules the next retry
      }
    });
  }

  /// Heartbeat check every 30s — if socket is dead, trigger reconnect.
  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!_socket.isConnected) {
        debugPrint('[TaxiRealtime] 💔 Heartbeat: socket disconnected, reconnecting...');
        _isConnected = false;
        _scheduleReconnect();
      }
    });
  }

  /// Stream of driver location updates — maps raw socket data to domain entity.
  Stream<Driver> get driverLocationStream {
    return _socket.driverLocationStream.map((update) {
      return Driver(
        id: update.driverId,
        name: update.driverId,
        phone: '',
        lat: update.lat,
        lng: update.lng,
        heading: update.heading,
      );
    }).handleError((error) {
      debugPrint('[TaxiRealtime] Driver location stream error: $error');
      _scheduleReconnect();
    });
  }

  /// Stream of nearby drivers — maps raw socket data to domain entities.
  Stream<List<NearbyDriver>> get nearbyDriversStream {
    return _socket.nearbyDriversStream.map((drivers) {
      return drivers.map((d) => NearbyDriver(
        driverId: d.driverId,
        name: d.driverId,
        vehicleType: 'economy',
        lat: d.lat,
        lng: d.lng,
        distanceKm: d.distKm,
        etaMinutes: (d.distKm * 2 + 3).round(),
      )).toList();
    }).handleError((error) {
      debugPrint('[TaxiRealtime] Nearby drivers stream error: $error');
    });
  }

  /// Stream of driver assignment events.
  Stream<Map<String, dynamic>> get driverAssignedStream {
    return _socket.driverAssignedStream.handleError((error) {
      debugPrint('[TaxiRealtime] Driver assigned stream error: $error');
    });
  }

  /// Stream of ride status changes.
  Stream<Map<String, dynamic>> get rideStatusStream {
    return _socket.rideStatusStream.handleError((error) {
      debugPrint('[TaxiRealtime] Ride status stream error: $error');
    });
  }

  /// Join ride tracking room.
  void joinRideTracking(String rideId) {
    _socket.joinRideTracking(rideId);
    debugPrint('[TaxiRealtime] Joined tracking: $rideId');
  }

  /// Leave ride tracking room.
  void leaveRideTracking(String rideId) {
    _socket.leaveRideTracking(rideId);
    debugPrint('[TaxiRealtime] Left tracking: $rideId');
  }

  /// Request nearby drivers refresh.
  void requestNearbyDrivers({
    required double lat,
    required double lng,
    double radiusKm = 5.0,
  }) {
    _socket.findNearbyDrivers(lat: lat, lng: lng, radiusKm: radiusKm);
  }

  /// Check connection status.
  bool get isConnected => _isConnected;

  /// Disconnect and clean up timers.
  void disconnect() {
    _isConnected = false;
    _reconnectTimer?.cancel();
    _heartbeatTimer?.cancel();
    _reconnectAttempts = 0;
    debugPrint('[TaxiRealtime] Disconnected');
  }
}
