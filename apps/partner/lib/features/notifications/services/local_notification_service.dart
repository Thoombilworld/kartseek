import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// KARTSEEK Partner — Local Notification Service
///
/// Manages local push notifications for partner-specific events:
/// - Ride request assignments
/// - Delivery order assignments
/// - Earnings/payout updates
/// - General app notifications (KYC status, updates)
///
/// Usage:
///   await LocalNotificationService.instance.initialize();
///   await LocalNotificationService.instance.show(
///     title: 'New Ride Request!',
///     body: 'Pickup: Al Olaya District → Drop: King Fahd Road',
///     channelKey: 'ride_requests',
///   );
class LocalNotificationService {
  LocalNotificationService._();
  static final LocalNotificationService instance = LocalNotificationService._();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  // ── Partner-Specific Notification Channels ────────────────────────────
  static const _channels = [
    AndroidNotificationChannel(
      'ride_requests',
      'Ride Requests',
      description: 'Incoming ride assignment notifications',
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
    ),
    AndroidNotificationChannel(
      'delivery_requests',
      'Delivery Requests',
      description: 'Incoming delivery order notifications',
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
    ),
    AndroidNotificationChannel(
      'earnings',
      'Earnings & Payouts',
      description: 'Payout confirmations, wallet updates, bonus alerts',
      importance: Importance.high,
      playSound: true,
    ),
    AndroidNotificationChannel(
      'general',
      'General',
      description: 'App updates, KYC status, account notices',
      importance: Importance.defaultImportance,
    ),
  ];

  /// Initialize the notification plugin and create Android channels.
  Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    await _plugin.initialize(
      settings: const InitializationSettings(android: androidSettings, iOS: iosSettings),
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Create Android notification channels
    if (Platform.isAndroid) {
      final androidPlugin = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      if (androidPlugin != null) {
        for (final channel in _channels) {
          await androidPlugin.createNotificationChannel(channel);
        }
      }
    }

    _initialized = true;
    debugPrint('[PartnerNotifications] ✅ Initialized with ${_channels.length} channels');
  }

  /// Request notification permission (iOS + Android 13+).
  Future<bool> requestPermission() async {
    if (Platform.isIOS) {
      final iosPlugin = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      final granted = await iosPlugin?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    }
    if (Platform.isAndroid) {
      final androidPlugin = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      final granted = await androidPlugin?.requestNotificationsPermission();
      return granted ?? false;
    }
    return false;
  }

  /// Show a local notification.
  Future<void> show({
    required String title,
    required String body,
    String channelKey = 'general',
    String? payload,
  }) async {
    if (!_initialized) await initialize();

    final channel = _channels.firstWhere(
      (c) => c.id == channelKey,
      orElse: () => _channels.last,
    );

    await _plugin.show(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          channel.id,
          channel.name,
          channelDescription: channel.description,
          importance: channel.importance,
          priority: channel.importance == Importance.max
              ? Priority.max
              : Priority.defaultPriority,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: payload,
    );
  }

  void _onNotificationTap(NotificationResponse response) {
    debugPrint('[PartnerNotifications] Tapped: ${response.payload}');
    // Route to appropriate screen based on payload
  }
}
