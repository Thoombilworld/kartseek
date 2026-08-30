import 'dart:io';

import 'package:flutter/foundation.dart' show kReleaseMode;

/// KARTSEEK Super App — App-wide constants
class AppConstants {
  AppConstants._();

  static const String appName = 'KARTSEEK';
  static const String appTagline = 'The Ultimate Super App';
  static const String appVersion = '1.0.1';

  static bool _isEmulator = true;

  /// Dynamic check on startup to determine if we are running in an emulator
  /// (where 10.0.2.2 is reachable) or a physical device (where we fallback to 127.0.0.1).
  static Future<void> initializeHost() async {
    try {
      if (Platform.isAndroid) {
        final socket = await Socket.connect('10.0.2.2', 3001, timeout: const Duration(milliseconds: 250));
        socket.destroy();
        _isEmulator = true;
      } else {
        _isEmulator = false;
      }
    } catch (_) {
      _isEmulator = false;
    }
  }

  /// API base URL.
  ///
  /// Production builds **must** pass
  /// `--dart-define=API_BASE_URL=https://api.kartseek.com/api/v1`.
  ///
  /// The development fallbacks below are cleartext loopback addresses. On a
  /// physical device `127.0.0.1` is the handset itself, so without the define
  /// every request failed — and because the API services answered failures with
  /// bundled mock data, the app presented a complete, fabricated storefront
  /// instead of an error. A release build that reaches the fallback is
  /// misconfigured, so it throws here rather than silently degrading into a
  /// demo of itself.
  static String get apiBaseUrl {
    const overrideUrl = String.fromEnvironment('API_BASE_URL');
    if (overrideUrl.isNotEmpty) return overrideUrl;
    _assertDevOnlyFallback('API_BASE_URL');

    try {
      if (Platform.isAndroid) {
        return _isEmulator ? 'http://10.0.2.2:3001/api/v1' : 'http://127.0.0.1:3001/api/v1';
      }
      return 'http://127.0.0.1:3001/api/v1'; // iOS simulator, Windows, Mac
    } catch (_) {
      return 'http://127.0.0.1:3001/api/v1'; // Fallback for Web
    }
  }

  /// WebSocket base URL.
  ///
  /// Production: `--dart-define=WS_BASE_URL=wss://api.kartseek.com`.
  /// Same release-build rule as [apiBaseUrl].
  static String get wsBaseUrl {
    const overrideUrl = String.fromEnvironment('WS_BASE_URL');
    if (overrideUrl.isNotEmpty) return overrideUrl;
    _assertDevOnlyFallback('WS_BASE_URL');

    try {
      if (Platform.isAndroid) {
        return _isEmulator ? 'ws://10.0.2.2:3001' : 'ws://127.0.0.1:3001';
      }
      return 'ws://127.0.0.1:3001';
    } catch (_) {
      return 'ws://127.0.0.1:3001';
    }
  }

  /// Fail fast when a release build is about to use a localhost dev endpoint.
  ///
  /// `kReleaseMode` rather than `!kDebugMode` so profile builds — which are how
  /// performance work is usually done against a dev gateway — keep working.
  static void _assertDevOnlyFallback(String define) {
    if (!kReleaseMode) return;
    throw StateError(
      '$define was not set for this release build. Rebuild with '
      '--dart-define=$define=<https url>. Refusing to fall back to a cleartext '
      'localhost endpoint in production.',
    );
  }

  // Location defaults (Doha, Qatar)
  static const double defaultLat = 25.2854;
  static const double defaultLng = 51.5310;
  static const String defaultCity = 'Doha';

  // Pagination
  static const int pageSize = 20;

  // Cache durations (seconds)
  static const int cacheDurationShort = 300;    // 5 min
  static const int cacheDurationMedium = 1800;  // 30 min
  static const int cacheDurationLong = 86400;   // 24 hours

  // Mock data toggle — set via --dart-define=USE_MOCK=true at build time
  // Defaults to false (live API). All API services check this flag.
  static const bool useMockData = bool.fromEnvironment('USE_MOCK', defaultValue: false);
}
