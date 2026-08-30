import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// KARTSEEK — Local Notification Service
///
/// Handles on-device notifications for:
/// - Order status updates (delivered, shipped, out for delivery)
/// - Taxi arrival ETA updates
/// - Pharmacy prescription ready alerts
/// - Promotional flash deal countdowns
class LocalNotificationService {
  LocalNotificationService._();
  static final LocalNotificationService instance = LocalNotificationService._();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  // ── Notification Channel IDs (Android) ──────────────────────────────────
  static const String _orderChannelId = 'kartseek_orders';
  static const String _taxiChannelId = 'kartseek_taxi';
  static const String _pharmacyChannelId = 'kartseek_pharmacy';
  static const String _promoChannelId = 'kartseek_promos';

  /// Initialize the notification plugin with platform-specific settings.
  /// Call once during app startup in `_initializeServicesAsync()`.
  Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestSoundPermission: true,
      requestBadgePermission: true,
      requestAlertPermission: true,
    );
    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _plugin.initialize(
      settings: settings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Create Android notification channels
    if (!kIsWeb && Platform.isAndroid) {
      await _createAndroidChannels();
    }

    _initialized = true;
    debugPrint('[LocalNotificationService] ✅ Initialized');
  }

  /// Request notification permission (iOS 10+, Android 13+).
  Future<bool> requestPermission() async {
    if (kIsWeb) return false;

    if (Platform.isAndroid) {
      final android = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      final granted = await android?.requestNotificationsPermission();
      return granted ?? false;
    }

    if (Platform.isIOS) {
      final ios = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      final granted = await ios?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    }

    return false;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /// Show an order status notification.
  Future<void> showOrderUpdate({
    required String orderId,
    required String title,
    required String body,
  }) async {
    await _show(
      id: orderId.hashCode,
      title: title,
      body: body,
      channelId: _orderChannelId,
      channelName: 'Order Updates',
      channelDescription: 'Notifications about your order status',
      payload: 'order:$orderId',
    );
  }

  /// Show a taxi ETA notification.
  Future<void> showTaxiUpdate({
    required String rideId,
    required String title,
    required String body,
  }) async {
    await _show(
      id: rideId.hashCode,
      title: title,
      body: body,
      channelId: _taxiChannelId,
      channelName: 'Taxi Updates',
      channelDescription: 'Ride arrival and driver updates',
      payload: 'taxi:$rideId',
    );
  }

  /// Show a pharmacy notification.
  Future<void> showPharmacyUpdate({
    required String orderId,
    required String title,
    required String body,
  }) async {
    await _show(
      id: orderId.hashCode,
      title: title,
      body: body,
      channelId: _pharmacyChannelId,
      channelName: 'Pharmacy Updates',
      channelDescription: 'Prescription and pharmacy order updates',
      payload: 'pharmacy:$orderId',
    );
  }

  /// Show a promotional notification.
  Future<void> showPromo({
    required String title,
    required String body,
  }) async {
    await _show(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      channelId: _promoChannelId,
      channelName: 'Deals & Offers',
      channelDescription: 'Flash deals and promotional offers',
      payload: 'promo',
    );
  }

  /// Cancel a specific notification by its ID.
  Future<void> cancel(int id) => _plugin.cancel(id: id);

  /// Cancel all pending notifications.
  Future<void> cancelAll() => _plugin.cancelAll();

  // ── Private ─────────────────────────────────────────────────────────────

  Future<void> _show({
    required int id,
    required String title,
    required String body,
    required String channelId,
    required String channelName,
    required String channelDescription,
    String? payload,
  }) async {
    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDescription,
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      icon: '@mipmap/ic_launcher',
    );
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _plugin.show(id: id, title: title, body: body, notificationDetails: details, payload: payload);
  }

  Future<void> _createAndroidChannels() async {
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android == null) return;

    const channels = [
      AndroidNotificationChannel(_orderChannelId, 'Order Updates',
          description: 'Notifications about your order status',
          importance: Importance.high),
      AndroidNotificationChannel(_taxiChannelId, 'Taxi Updates',
          description: 'Ride arrival and driver updates',
          importance: Importance.high),
      AndroidNotificationChannel(_pharmacyChannelId, 'Pharmacy Updates',
          description: 'Prescription and pharmacy order updates',
          importance: Importance.high),
      AndroidNotificationChannel(_promoChannelId, 'Deals & Offers',
          description: 'Flash deals and promotional offers',
          importance: Importance.defaultImportance),
    ];

    for (final channel in channels) {
      await android.createNotificationChannel(channel);
    }
  }

  void _onNotificationTap(NotificationResponse response) {
    final payload = response.payload;
    if (payload == null) return;
    debugPrint('[LocalNotificationService] Tapped notification: $payload');
    // Navigation is handled by the app — emit via a stream or callback
    // For now, we log the tap. Integration with NavigatorKey is a future step.
  }
}
