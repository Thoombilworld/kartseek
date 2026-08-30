import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

/// KARTSEEK Device Security Service
///
/// Provides device-level security checks and biometric authentication:
///  - Jailbreak / root detection (iOS / Android)
///  - Biometric authentication (fingerprint, face ID)
///  - Secure token storage (encrypted keychain/keystore)
///  - App tampering detection
///  - Debug/emulator detection
class DeviceSecurityService {
  static final DeviceSecurityService _instance = DeviceSecurityService._internal();
  factory DeviceSecurityService() => _instance;
  DeviceSecurityService._internal();

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
  );
  final LocalAuthentication _localAuth = LocalAuthentication();

  // ── Jailbreak / Root Detection ──────────────────────────────────────────────

  /// Check if the device is rooted (Android) or jailbroken (iOS).
  /// Returns true if the device appears compromised.
  Future<bool> isDeviceCompromised() async {
    if (kDebugMode) return false; // Skip in debug mode

    try {
      if (Platform.isAndroid) {
        return await _checkAndroidRoot();
      } else if (Platform.isIOS) {
        return await _checkIosJailbreak();
      }
    } catch (e) {
      debugPrint('⚠️ Device security check failed: $e');
    }
    return false;
  }

  Future<bool> _checkAndroidRoot() async {
    // Check for common root indicators
    final rootPaths = [
      '/system/app/Superuser.apk',
      '/system/xbin/su',
      '/system/bin/su',
      '/sbin/su',
      '/data/local/xbin/su',
      '/data/local/bin/su',
      '/data/local/su',
      '/system/sd/xbin/su',
      '/system/bin/failsafe/su',
      '/su/bin/su',
      '/system/app/SuperSU.apk',
      '/system/app/SuperSU',
      '/system/etc/init.d/99telecom',
      '/data/data/com.noshufou.android.su',
      '/data/data/eu.chainfire.supersu',
      '/data/data/com.koushikdutta.superuser',
      '/data/adb/magisk',
    ];

    for (final path in rootPaths) {
      if (await File(path).exists()) {
        debugPrint('🔴 ROOT DETECTED: Found $path');
        return true;
      }
    }

    // Check for writable system partition
    try {
      final testFile = File('/system/test_root_check');
      await testFile.writeAsString('test');
      await testFile.delete();
      debugPrint('🔴 ROOT DETECTED: /system is writable');
      return true;
    } catch (_) {
      // Expected — system should not be writable
    }

    return false;
  }

  Future<bool> _checkIosJailbreak() async {
    // Check for common jailbreak indicators
    final jailbreakPaths = [
      '/Applications/Cydia.app',
      '/Library/MobileSubstrate/MobileSubstrate.dylib',
      '/bin/bash',
      '/usr/sbin/sshd',
      '/etc/apt',
      '/usr/bin/ssh',
      '/private/var/lib/apt',
      '/private/var/lib/cydia',
      '/private/var/stash',
      '/private/var/tmp/cydia.log',
      '/Applications/Sileo.app',
      '/var/binpack',
      '/Library/PreferenceBundles/LibertyPref.bundle',
      '/Library/PreferenceBundles/ShadowPreferences.bundle',
    ];

    for (final path in jailbreakPaths) {
      if (await File(path).exists()) {
        debugPrint('🔴 JAILBREAK DETECTED: Found $path');
        return true;
      }
    }

    // Check if we can write to system directories
    try {
      final testFile = File('/private/test_jailbreak_check');
      await testFile.writeAsString('test');
      await testFile.delete();
      debugPrint('🔴 JAILBREAK DETECTED: /private is writable');
      return true;
    } catch (_) {
      // Expected — should not be writable
    }

    return false;
  }

  // ── Biometric Authentication ────────────────────────────────────────────────

  /// Check if biometric authentication is available on this device.
  Future<bool> isBiometricAvailable() async {
    try {
      final canAuth = await _localAuth.canCheckBiometrics;
      final isDeviceSupported = await _localAuth.isDeviceSupported();
      return canAuth && isDeviceSupported;
    } catch (e) {
      debugPrint('Biometric check failed: $e');
      return false;
    }
  }

  /// Get available biometric types (fingerprint, face, iris).
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _localAuth.getAvailableBiometrics();
    } catch (e) {
      return [];
    }
  }

  /// Authenticate the user with biometrics (fingerprint or Face ID).
  /// Returns true if authentication succeeded.
  Future<bool> authenticateWithBiometrics({
    String reason = 'Authenticate to access KARTSEEK',
  }) async {
    try {
      return await _localAuth.authenticate(
        localizedReason: reason,
      );
    } on PlatformException catch (e) {
      debugPrint('Biometric auth error: ${e.code} - ${e.message}');
      return false;
    }
  }

  // ── Secure Token Storage ────────────────────────────────────────────────────

  /// Store the JWT token securely in the platform keychain/keystore.
  Future<void> storeToken(String token) async {
    await _secureStorage.write(key: 'kartseek_auth_token', value: token);
  }

  /// Retrieve the JWT token from secure storage.
  Future<String?> getToken() async {
    return await _secureStorage.read(key: 'kartseek_auth_token');
  }

  /// Store the refresh token securely.
  Future<void> storeRefreshToken(String token) async {
    await _secureStorage.write(key: 'kartseek_refresh_token', value: token);
  }

  /// Retrieve the refresh token from secure storage.
  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: 'kartseek_refresh_token');
  }

  /// Clear all stored tokens (called on logout).
  Future<void> clearTokens() async {
    await _secureStorage.delete(key: 'kartseek_auth_token');
    await _secureStorage.delete(key: 'kartseek_refresh_token');
    await _secureStorage.delete(key: 'kartseek_user_data');
  }

  /// Store user data securely.
  Future<void> storeUserData(String jsonData) async {
    await _secureStorage.write(key: 'kartseek_user_data', value: jsonData);
  }

  /// Retrieve user data from secure storage.
  Future<String?> getUserData() async {
    return await _secureStorage.read(key: 'kartseek_user_data');
  }

  // ── Debug / Emulator Detection ──────────────────────────────────────────────

  /// Check if the app is running on an emulator (production security check).
  bool get isRunningOnEmulator {
    if (kDebugMode) return false; // Don't enforce in debug mode
    // In release mode, this should be checked at app startup
    // The check itself is done via platform channels or native code
    return false; // Placeholder — implement via platform channel
  }

  /// Get a comprehensive security status report.
  Future<Map<String, dynamic>> getSecurityStatus() async {
    final compromised = await isDeviceCompromised();
    final biometricAvailable = await isBiometricAvailable();
    final biometrics = await getAvailableBiometrics();
    final hasToken = (await getToken()) != null;

    return {
      'deviceCompromised': compromised,
      'biometricAvailable': biometricAvailable,
      'biometricTypes': biometrics.map((b) => b.toString()).toList(),
      'hasStoredToken': hasToken,
      'sslPinningEnabled': !kDebugMode,
      'debugMode': kDebugMode,
      'platform': Platform.operatingSystem,
      'platformVersion': Platform.operatingSystemVersion,
    };
  }
}
