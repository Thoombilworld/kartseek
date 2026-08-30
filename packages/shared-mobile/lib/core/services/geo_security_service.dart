import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/constants.dart';

// ─── Geo Check Result ────────────────────────────────────────────────────────

class GeoCheckResult {
  final String ip;
  final String? country;
  final String? countryName;
  final String? city;
  final double? lat;
  final double? lng;
  final String? timezone;
  final bool isVpn;
  final bool isProxy;
  final bool isTor;
  final bool isDatacenter;
  final bool isSuspicious;
  final String threatLevel; // 'none' | 'low' | 'medium' | 'high'
  final String action; // 'allow' | 'warn' | 'block'
  final String? message;

  GeoCheckResult({
    required this.ip,
    this.country,
    this.countryName,
    this.city,
    this.lat,
    this.lng,
    this.timezone,
    this.isVpn = false,
    this.isProxy = false,
    this.isTor = false,
    this.isDatacenter = false,
    this.isSuspicious = false,
    this.threatLevel = 'none',
    this.action = 'allow',
    this.message,
  });

  factory GeoCheckResult.fromJson(Map<String, dynamic> json) {
    return GeoCheckResult(
      ip: json['ip'] ?? '',
      country: json['country'],
      countryName: json['countryName'],
      city: json['city'],
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      timezone: json['timezone'],
      isVpn: json['isVpn'] ?? false,
      isProxy: json['isProxy'] ?? false,
      isTor: json['isTor'] ?? false,
      isDatacenter: json['isDatacenter'] ?? false,
      isSuspicious: json['isSuspicious'] ?? false,
      threatLevel: json['threatLevel'] ?? 'none',
      action: json['action'] ?? 'allow',
      message: json['message'],
    );
  }

  bool get isBlocked => action == 'block';
  bool get isWarned => action == 'warn';
  bool get isAllowed => action == 'allow';
}

// ─── Location Verify Result ──────────────────────────────────────────────────

class LocationVerifyResult {
  final int? distanceKm;
  final bool isMismatch;
  final bool countriesDiffer;
  final String recommendation;

  LocationVerifyResult({
    this.distanceKm,
    this.isMismatch = false,
    this.countriesDiffer = false,
    this.recommendation = '',
  });

  factory LocationVerifyResult.fromJson(Map<String, dynamic> json) {
    return LocationVerifyResult(
      distanceKm: json['distanceKm'],
      isMismatch: json['isMismatch'] ?? false,
      countriesDiffer: json['countriesDiffer'] ?? false,
      recommendation: json['recommendation'] ?? '',
    );
  }
}

// ─── Geo Security Service ────────────────────────────────────────────────────

/// Service for IP geolocation verification and VPN/proxy detection.
/// Used across all Flutter apps (customer, partner, driver).
class GeoSecurityService {
  static GeoSecurityService? _instance;
  factory GeoSecurityService() => _instance ??= GeoSecurityService._();
  GeoSecurityService._();

  final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 5),
  ));

  /// Cached check result — valid for 5 minutes
  GeoCheckResult? _cachedResult;
  DateTime? _cacheTime;
  static const _cacheDuration = Duration(minutes: 5);

  /// Stream controller to broadcast VPN detection events
  final _vpnDetectedController = StreamController<GeoCheckResult>.broadcast();
  Stream<GeoCheckResult> get onVpnDetected => _vpnDetectedController.stream;

  /// Whether a VPN/proxy block is currently active
  bool get isBlocked => _cachedResult?.isBlocked ?? false;
  bool get isSuspicious => _cachedResult?.isSuspicious ?? false;
  GeoCheckResult? get lastResult => _cachedResult;

  /// Perform a geo check against the backend
  Future<GeoCheckResult> checkGeo({bool forceRefresh = false}) async {
    // Return cache if valid
    if (!forceRefresh && _cachedResult != null && _cacheTime != null) {
      if (DateTime.now().difference(_cacheTime!) < _cacheDuration) {
        return _cachedResult!;
      }
    }

    try {
      final baseUrl = AppConstants.apiBaseUrl;
      final headers = Map<String, String>.from(RegionService.instance.regionHeaders);
      headers['x-platform'] = Platform.isAndroid ? 'android' : 'ios';

      final response = await _dio.get(
        '$baseUrl/geo/check',
        options: Options(headers: headers),
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        _cachedResult = GeoCheckResult.fromJson(data);
        _cacheTime = DateTime.now();

        // Broadcast if suspicious
        if (_cachedResult!.isSuspicious) {
          _vpnDetectedController.add(_cachedResult!);
        }

        return _cachedResult!;
      }
    } catch (e) {
      debugPrint('[GeoSecurity] ⚠️ Geo check failed: $e');
    }

    // Fallback: allow on network failure (don't block users due to API issues)
    return GeoCheckResult(ip: 'unknown', action: 'allow');
  }

  /// Verify GPS location against IP geolocation
  Future<LocationVerifyResult> verifyLocation({
    required double gpsLat,
    required double gpsLng,
    String? gpsCountry,
    String? gpsCity,
  }) async {
    try {
      final baseUrl = AppConstants.apiBaseUrl;
      final headers = {
        ...RegionService.instance.regionHeaders,
        'Content-Type': 'application/json',
        'x-platform': Platform.isAndroid ? 'android' : 'ios',
      };

      final response = await _dio.post(
        '$baseUrl/geo/verify-location',
        options: Options(headers: headers),
        data: {
          'gpsLat': gpsLat,
          'gpsLng': gpsLng,
          'gpsCountry': gpsCountry,
          'gpsCity': gpsCity,
          'platform': Platform.isAndroid ? 'android' : 'ios',
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return LocationVerifyResult.fromJson(response.data as Map<String, dynamic>);
      }
    } catch (e) {
      debugPrint('[GeoSecurity] ⚠️ Location verify failed: $e');
    }

    return LocationVerifyResult(recommendation: 'Verification unavailable.');
  }

  /// Quick local VPN detection (checks for active VPN network interface)
  Future<bool> hasActiveVpnInterface() async {
    try {
      final interfaces = await NetworkInterface.list(
        includeLoopback: false,
        type: InternetAddressType.any,
      );
      for (final iface in interfaces) {
        final name = iface.name.toLowerCase();
        if (name.contains('tun') ||
            name.contains('tap') ||
            name.contains('ppp') ||
            name.contains('vpn') ||
            name.contains('ipsec') ||
            name.contains('wg') ||
            name.contains('utun')) {
          debugPrint('[GeoSecurity] 🔴 VPN interface detected: ${iface.name}');
          return true;
        }
      }
    } catch (e) {
      debugPrint('[GeoSecurity] ⚠️ VPN interface check failed: $e');
    }
    return false;
  }

  /// Full security check: local VPN interface + backend geo check
  Future<GeoCheckResult> fullSecurityCheck({bool forceRefresh = false}) async {
    // Step 1: Quick local VPN check
    final hasVpn = await hasActiveVpnInterface();

    // Step 2: Backend geo check
    final result = await checkGeo(forceRefresh: forceRefresh);

    // Merge: if local VPN detected but backend didn't flag it
    if (hasVpn && !result.isSuspicious) {
      final enhanced = GeoCheckResult(
        ip: result.ip,
        country: result.country,
        countryName: result.countryName,
        city: result.city,
        lat: result.lat,
        lng: result.lng,
        timezone: result.timezone,
        isVpn: true,
        isProxy: result.isProxy,
        isTor: result.isTor,
        isDatacenter: result.isDatacenter,
        isSuspicious: true,
        threatLevel: 'medium',
        action: 'block',
        message: 'VPN or proxy detected. Please disable your VPN to continue using KARTSEEK services.',
      );
      _cachedResult = enhanced;
      _vpnDetectedController.add(enhanced);
      return enhanced;
    }

    return result;
  }

  /// Clear cached result (e.g., after user disables VPN and retries)
  void clearCache() {
    _cachedResult = null;
    _cacheTime = null;
  }

  void dispose() {
    _vpnDetectedController.close();
  }
}
