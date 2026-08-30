/// KARTSEEK Doctor Queue — Socket Service
///
/// Manages the `/doctor-queue` WebSocket namespace for real-time
/// token queue updates, appointment reminders, and consultation status.
///
/// Singleton pattern — all consumers share one WebSocket connection.
///
/// **Customer usage:**
///  1. `connect(userId, userType: 'customer')`
///  2. `subscribeQueue(doctorId)` → listen to [tokenAdvancedStream], [queueUpdatedStream]
///  3. Listen to [appointmentReminderStream] for upcoming reminders
///  4. Listen to [consultationUpdateStream] for status changes
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'package:shared_mobile/core/services/socket_service.dart';

// ── Event Models ──────────────────────────────────────────────────────────────

/// Emitted when the doctor advances to the next patient token.
class TokenAdvanceEvent {
  final String doctorId;
  final String date;
  final int currentToken;
  final double avgWaitMinutes;
  final DateTime timestamp;

  const TokenAdvanceEvent({
    required this.doctorId,
    required this.date,
    required this.currentToken,
    required this.avgWaitMinutes,
    required this.timestamp,
  });

  factory TokenAdvanceEvent.fromJson(Map<String, dynamic> json) {
    return TokenAdvanceEvent(
      doctorId: json['doctorId'] as String? ?? '',
      date: json['date'] as String? ?? '',
      currentToken: (json['currentToken'] as num?)?.toInt() ?? 0,
      avgWaitMinutes: (json['avgWaitMinutes'] as num?)?.toDouble() ?? 0.0,
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

/// Full queue state update with all appointment positions.
class QueueUpdateEvent {
  final String doctorId;
  final String date;
  final int currentToken;
  final int totalTokens;
  final int waitingCount;
  final double avgWaitMinutes;
  final List<QueueAppointment> appointments;
  final DateTime timestamp;

  const QueueUpdateEvent({
    required this.doctorId,
    required this.date,
    required this.currentToken,
    required this.totalTokens,
    required this.waitingCount,
    required this.avgWaitMinutes,
    required this.appointments,
    required this.timestamp,
  });

  factory QueueUpdateEvent.fromJson(Map<String, dynamic> json) {
    final appts = (json['appointments'] as List<dynamic>?)
            ?.map((a) => QueueAppointment.fromJson(Map<String, dynamic>.from(a as Map)))
            .toList() ??
        [];
    return QueueUpdateEvent(
      doctorId: json['doctorId'] as String? ?? '',
      date: json['date'] as String? ?? '',
      currentToken: (json['currentToken'] as num?)?.toInt() ?? 0,
      totalTokens: (json['totalTokens'] as num?)?.toInt() ?? 0,
      waitingCount: (json['waitingCount'] as num?)?.toInt() ?? 0,
      avgWaitMinutes: (json['avgWaitMinutes'] as num?)?.toDouble() ?? 0.0,
      appointments: appts,
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

/// Individual appointment within the queue.
class QueueAppointment {
  final String id;
  final int tokenNumber;
  final int queuePosition;
  final double estimatedWaitMinutes;
  final String status;

  const QueueAppointment({
    required this.id,
    required this.tokenNumber,
    required this.queuePosition,
    required this.estimatedWaitMinutes,
    required this.status,
  });

  factory QueueAppointment.fromJson(Map<String, dynamic> json) {
    return QueueAppointment(
      id: json['id'] as String? ?? '',
      tokenNumber: (json['tokenNumber'] as num?)?.toInt() ?? 0,
      queuePosition: (json['queuePosition'] as num?)?.toInt() ?? 0,
      estimatedWaitMinutes: (json['estimatedWaitMinutes'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'waiting',
    );
  }
}

/// Appointment reminder notification (e.g. 30 minutes before).
class AppointmentReminderEvent {
  final String appointmentId;
  final String doctorName;
  final String date;
  final String time;
  final int minutesUntil;
  final Map<String, dynamic>? location;
  final DateTime timestamp;

  const AppointmentReminderEvent({
    required this.appointmentId,
    required this.doctorName,
    required this.date,
    required this.time,
    required this.minutesUntil,
    this.location,
    required this.timestamp,
  });

  factory AppointmentReminderEvent.fromJson(Map<String, dynamic> json) {
    return AppointmentReminderEvent(
      appointmentId: json['appointmentId'] as String? ?? '',
      doctorName: json['doctorName'] as String? ?? '',
      date: json['date'] as String? ?? '',
      time: json['time'] as String? ?? '',
      minutesUntil: (json['minutesUntil'] as num?)?.toInt() ?? 0,
      location: json['location'] as Map<String, dynamic>?,
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

/// Consultation status change (your_turn, in_progress, completed, etc.).
class ConsultationUpdateEvent {
  final String appointmentId;
  final String status;
  final String message;
  final int? tokenNumber;
  final int? queuePosition;
  final DateTime timestamp;

  const ConsultationUpdateEvent({
    required this.appointmentId,
    required this.status,
    required this.message,
    this.tokenNumber,
    this.queuePosition,
    required this.timestamp,
  });

  factory ConsultationUpdateEvent.fromJson(Map<String, dynamic> json) {
    return ConsultationUpdateEvent(
      appointmentId: json['appointmentId'] as String? ?? '',
      status: json['status'] as String? ?? '',
      message: json['message'] as String? ?? '',
      tokenNumber: (json['tokenNumber'] as num?)?.toInt(),
      queuePosition: (json['queuePosition'] as num?)?.toInt(),
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

// ── Socket Service ────────────────────────────────────────────────────────────

/// Manages the `/doctor-queue` WebSocket namespace.
class DoctorQueueSocketService extends BaseSocketService {
  // Singleton
  static final DoctorQueueSocketService _instance = DoctorQueueSocketService._internal();
  factory DoctorQueueSocketService() => _instance;
  DoctorQueueSocketService._internal();

  @override
  String get namespace => '/doctor-queue';

  // ── Event Streams ─────────────────────────────────────────────────────────

  StreamController<TokenAdvanceEvent>? _tokenAdvancedController;
  StreamController<QueueUpdateEvent>? _queueUpdatedController;
  StreamController<AppointmentReminderEvent>? _reminderController;
  StreamController<ConsultationUpdateEvent>? _consultationController;
  StreamController<Map<String, dynamic>>? _subscriptionConfirmedController;

  StreamController<TokenAdvanceEvent> get _tokenAdvanced =>
      _tokenAdvancedController ??= StreamController<TokenAdvanceEvent>.broadcast();
  StreamController<QueueUpdateEvent> get _queueUpdated =>
      _queueUpdatedController ??= StreamController<QueueUpdateEvent>.broadcast();
  StreamController<AppointmentReminderEvent> get _reminder =>
      _reminderController ??= StreamController<AppointmentReminderEvent>.broadcast();
  StreamController<ConsultationUpdateEvent> get _consultation =>
      _consultationController ??= StreamController<ConsultationUpdateEvent>.broadcast();
  StreamController<Map<String, dynamic>> get _subscriptionConfirmed =>
      _subscriptionConfirmedController ??= StreamController<Map<String, dynamic>>.broadcast();

  /// Stream of token advance events when doctor moves to next patient.
  Stream<TokenAdvanceEvent> get tokenAdvancedStream => _tokenAdvanced.stream;

  /// Stream of full queue state updates (all appointments with positions).
  Stream<QueueUpdateEvent> get queueUpdatedStream => _queueUpdated.stream;

  /// Stream of appointment reminders (30-min-before push).
  Stream<AppointmentReminderEvent> get appointmentReminderStream => _reminder.stream;

  /// Stream of consultation status changes (your_turn, in_progress, completed).
  Stream<ConsultationUpdateEvent> get consultationUpdateStream => _consultation.stream;

  /// Confirmation when queue subscription succeeds.
  Stream<Map<String, dynamic>> get subscriptionConfirmedStream => _subscriptionConfirmed.stream;

  // ── Queue Actions ─────────────────────────────────────────────────────────

  /// Subscribe to a doctor's queue for a specific date.
  void subscribeQueue({required String doctorId, String? date}) {
    emit('subscribe_queue', {
      'doctorId': doctorId,
      if (date != null) 'date': date,
    });
    debugPrint('[DoctorQueueSocket] Subscribed to queue: $doctorId (${date ?? 'today'})');
  }

  /// Unsubscribe from a doctor's queue.
  void unsubscribeQueue({required String doctorId, String? date}) {
    emit('unsubscribe_queue', {
      'doctorId': doctorId,
      if (date != null) 'date': date,
    });
    debugPrint('[DoctorQueueSocket] Unsubscribed from queue: $doctorId');
  }

  // ── Event Handler Registration ────────────────────────────────────────────

  @override
  void registerHandlers(io.Socket socket) {
    socket.on('token_advanced', (data) {
      try {
        final map = data is String
            ? jsonDecode(data) as Map<String, dynamic>
            : Map<String, dynamic>.from(data as Map);
        _tokenAdvanced.add(TokenAdvanceEvent.fromJson(map));
        debugPrint('[DoctorQueueSocket] 🔔 Token advanced → #${map['currentToken']}');
      } catch (e) {
        debugPrint('[DoctorQueueSocket] token_advanced parse error: $e');
      }
    });

    socket.on('queue_updated', (data) {
      try {
        final map = data is String
            ? jsonDecode(data) as Map<String, dynamic>
            : Map<String, dynamic>.from(data as Map);
        _queueUpdated.add(QueueUpdateEvent.fromJson(map));
        debugPrint('[DoctorQueueSocket] 📊 Queue updated: serving #${map['currentToken']} of ${map['totalTokens']}');
      } catch (e) {
        debugPrint('[DoctorQueueSocket] queue_updated parse error: $e');
      }
    });

    socket.on('appointment_reminder', (data) {
      try {
        final map = data is String
            ? jsonDecode(data) as Map<String, dynamic>
            : Map<String, dynamic>.from(data as Map);
        _reminder.add(AppointmentReminderEvent.fromJson(map));
        debugPrint('[DoctorQueueSocket] ⏰ Reminder: ${map['doctorName']} in ${map['minutesUntil']}min');
      } catch (e) {
        debugPrint('[DoctorQueueSocket] appointment_reminder parse error: $e');
      }
    });

    socket.on('consultation_update', (data, [ack]) {
      try {
        final map = data is String
            ? jsonDecode(data) as Map<String, dynamic>
            : Map<String, dynamic>.from(data as Map);
        _consultation.add(ConsultationUpdateEvent.fromJson(map));
        debugPrint('[DoctorQueueSocket] 🩺 Consultation: ${map['status']}');
        
        if (ack != null && ack is Function) {
          ack(true);
        }
      } catch (e) {
        debugPrint('[DoctorQueueSocket] consultation_update parse error: $e');
      }
    });

    socket.on('subscription_confirmed', (data) {
      try {
        final map = data is String
            ? jsonDecode(data) as Map<String, dynamic>
            : Map<String, dynamic>.from(data as Map);
        _subscriptionConfirmed.add(map);
        debugPrint('[DoctorQueueSocket] ✅ Subscription confirmed: ${map['room']}');
      } catch (e) {
        debugPrint('[DoctorQueueSocket] subscription_confirmed parse error: $e');
      }
    });
  }

  @override
  void onDisconnected() {
    // No periodic timers to stop (unlike taxi location broadcasting)
  }

  /// Singleton should never be disposed — this is a no-op.
  @override
  void dispose() {
    debugPrint('[DoctorQueueSocket] ⚠️ dispose() called on singleton — ignoring');
    super.dispose();
  }
}
