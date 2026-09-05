/// KARTSEEK Doctor Queue — Realtime Datasource
///
/// Wraps the [DoctorQueueSocketService] singleton with resilient
/// stream management. Includes auto-reconnect with exponential backoff
/// and heartbeat detection (mirroring TaxiRealtimeDatasource).
library;

import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:kartseek_shared_mobile/core/services/doctor_queue_socket_service.dart';

class DoctorRealtimeDatasource {
  final _socket = DoctorQueueSocketService();

  bool _isConnected = false;
  String? _userId;
  int _reconnectAttempts = 0;
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;
  static const _maxReconnectAttempts = 5;

  // ── Live queue data (fallback defaults) ───────────────────────────────────
  int _currentServingToken = 0;
  int _totalTokens = 0;
  int _waitingCount = 0;
  double _avgWaitMinutes = 0;

  int get currentServingToken => _currentServingToken;
  int get totalTokens => _totalTokens;
  int get waitingCount => _waitingCount;
  double get avgWaitMinutes => _avgWaitMinutes;

  /// Connect to the doctor-queue WebSocket namespace.
  Future<void> connect({required String userId}) async {
    if (_isConnected) return;
    _userId = userId;
    try {
      await _socket.connect(userId: userId, userType: 'customer');
      _isConnected = true;
      _reconnectAttempts = 0;
      debugPrint('[DoctorRealtime] ✅ Connected as customer: $userId');
      _startHeartbeat();
    } catch (e) {
      debugPrint('[DoctorRealtime] ❌ Connection failed: $e');
      _scheduleReconnect();
      rethrow;
    }
  }

  /// Schedule a reconnection attempt with exponential backoff.
  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('[DoctorRealtime] ⚠️ Max reconnect attempts reached ($_maxReconnectAttempts)');
      return;
    }
    _reconnectTimer?.cancel();
    final delay = Duration(seconds: min(pow(2, _reconnectAttempts + 1).toInt(), 30));
    _reconnectAttempts++;
    debugPrint('[DoctorRealtime] ⏳ Reconnecting in ${delay.inSeconds}s (attempt $_reconnectAttempts)');
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
        debugPrint('[DoctorRealtime] 💔 Heartbeat: socket disconnected, reconnecting...');
        _isConnected = false;
        _scheduleReconnect();
      }
    });
  }

  // ── Queue Subscription ──────────────────────────────────────────────────

  /// Subscribe to a doctor's live queue for a date.
  void subscribeQueue({required String doctorId, String? date}) {
    _socket.subscribeQueue(doctorId: doctorId, date: date);
  }

  /// Unsubscribe from a doctor's queue.
  void unsubscribeQueue({required String doctorId, String? date}) {
    _socket.unsubscribeQueue(doctorId: doctorId, date: date);
  }

  // ── Typed Streams ─────────────────────────────────────────────────────────

  /// Stream of token advance events with local state caching.
  Stream<TokenAdvanceEvent> get tokenAdvancedStream {
    return _socket.tokenAdvancedStream.map((event) {
      _currentServingToken = event.currentToken;
      _avgWaitMinutes = event.avgWaitMinutes;
      return event;
    }).handleError((error) {
      debugPrint('[DoctorRealtime] Token advanced stream error: $error');
      _scheduleReconnect();
    });
  }

  /// Stream of full queue updates with local state caching.
  Stream<QueueUpdateEvent> get queueUpdatedStream {
    return _socket.queueUpdatedStream.map((event) {
      _currentServingToken = event.currentToken;
      _totalTokens = event.totalTokens;
      _waitingCount = event.waitingCount;
      _avgWaitMinutes = event.avgWaitMinutes;
      return event;
    }).handleError((error) {
      debugPrint('[DoctorRealtime] Queue update stream error: $error');
      _scheduleReconnect();
    });
  }

  /// Stream of appointment reminders.
  Stream<AppointmentReminderEvent> get appointmentReminderStream {
    return _socket.appointmentReminderStream.handleError((error) {
      debugPrint('[DoctorRealtime] Appointment reminder stream error: $error');
    });
  }

  /// Stream of consultation status changes.
  Stream<ConsultationUpdateEvent> get consultationUpdateStream {
    return _socket.consultationUpdateStream.handleError((error) {
      debugPrint('[DoctorRealtime] Consultation update stream error: $error');
    });
  }

  /// Stream confirming queue subscription success.
  Stream<Map<String, dynamic>> get subscriptionConfirmedStream {
    return _socket.subscriptionConfirmedStream.handleError((error) {
      debugPrint('[DoctorRealtime] Subscription confirmation stream error: $error');
    });
  }

  /// Check connection status.
  bool get isConnected => _isConnected;

  /// Disconnect and clean up timers.
  void disconnect() {
    _isConnected = false;
    _reconnectTimer?.cancel();
    _heartbeatTimer?.cancel();
    _reconnectAttempts = 0;
    debugPrint('[DoctorRealtime] Disconnected');
  }
}
