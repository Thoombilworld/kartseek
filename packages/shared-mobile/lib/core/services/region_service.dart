/// KARTSEEK Multi-Regional Architecture — Region Service
///
/// Core service responsible for detecting the user's current country/region
/// using GPS coordinates or IP-based geolocation. This determines which
/// sellers, products, and delivery partners are visible to the user.
///
/// Region detection happens on app launch and caches the result. All API
/// calls include the detected region code via the `X-Region-Code` header.
library;

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:kartseek_shared_mobile/core/constants.dart';
/// Supported operational countries
enum SupportedCountry {
  india('IN', 'India', '🇮🇳', '₹', 'INR', 'en-IN', 'Asia/Kolkata', '+91', 28.6139, 77.2090, 'New Delhi',
    taxName: 'GST', taxRate: 18.0, supportedLangs: ['en', 'hi', 'ta', 'ml'], measurementSystem: 'metric', dateFormat: 'dd/MM/yyyy'),
  qatar('QA', 'Qatar', '🇶🇦', '﷼', 'QAR', 'ar-QA', 'Asia/Qatar', '+974', 25.2854, 51.5310, 'Doha',
    taxName: '', taxRate: 0, supportedLangs: ['en', 'ar'], measurementSystem: 'metric', dateFormat: 'dd/MM/yyyy'),
  uae('AE', 'UAE', '🇦🇪', 'د.إ', 'AED', 'en-AE', 'Asia/Dubai', '+971', 25.2048, 55.2708, 'Dubai',
    taxName: 'VAT', taxRate: 5.0, supportedLangs: ['en', 'ar'], measurementSystem: 'metric', dateFormat: 'dd/MM/yyyy'),
  saudiArabia('SA', 'Saudi Arabia', '🇸🇦', '﷼', 'SAR', 'ar-SA', 'Asia/Riyadh', '+966', 24.7136, 46.6753, 'Riyadh',
    taxName: 'VAT', taxRate: 15.0, supportedLangs: ['ar', 'en'], measurementSystem: 'metric', dateFormat: 'dd/MM/yyyy'),
  bahrain('BH', 'Bahrain', '🇧🇭', 'ب.د', 'BHD', 'ar-BH', 'Asia/Bahrain', '+973', 26.0667, 50.5577, 'Manama',
    taxName: 'VAT', taxRate: 10.0, supportedLangs: ['en', 'ar'], measurementSystem: 'metric', dateFormat: 'dd/MM/yyyy'),
  kuwait('KW', 'Kuwait', '🇰🇼', 'د.ك', 'KWD', 'ar-KW', 'Asia/Kuwait', '+965', 29.3759, 47.9774, 'Kuwait City',
    taxName: '', taxRate: 0, supportedLangs: ['ar', 'en'], measurementSystem: 'metric', dateFormat: 'dd/MM/yyyy'),
  oman('OM', 'Oman', '🇴🇲', 'ر.ع.', 'OMR', 'ar-OM', 'Asia/Muscat', '+968', 23.5859, 58.4059, 'Muscat',
    taxName: 'VAT', taxRate: 5.0, supportedLangs: ['ar', 'en'], measurementSystem: 'metric', dateFormat: 'dd/MM/yyyy'),
  uk('GB', 'UK', '🇬🇧', '£', 'GBP', 'en-GB', 'Europe/London', '+44', 51.5074, -0.1278, 'London',
    taxName: 'VAT', taxRate: 20.0, supportedLangs: ['en'], measurementSystem: 'imperial', dateFormat: 'dd/MM/yyyy'),
  usa('US', 'USA', '🇺🇸', '\$', 'USD', 'en-US', 'America/New_York', '+1', 40.7128, -74.0060, 'New York',
    taxName: 'Sales Tax', taxRate: 8.875, supportedLangs: ['en', 'es'], measurementSystem: 'imperial', dateFormat: 'MM/dd/yyyy'),
  kenya('KE', 'Kenya', '🇰🇪', 'KSh', 'KES', 'en-KE', 'Africa/Nairobi', '+254', -1.2921, 36.8219, 'Nairobi',
    taxName: 'VAT', taxRate: 16.0, supportedLangs: ['en', 'sw'], measurementSystem: 'metric', dateFormat: 'dd/MM/yyyy');

  final String code;
  final String name;
  final String flag;
  final String currencySymbol;
  final String currencyCode;
  final String locale;
  final String timezone;
  final String callingCode;
  final double defaultLat;
  final double defaultLng;
  final String defaultCity;
  final String taxName;
  final double taxRate;
  final List<String> supportedLangs;
  final String measurementSystem;
  final String dateFormat;

  const SupportedCountry(
    this.code, this.name, this.flag, this.currencySymbol, this.currencyCode,
    this.locale, this.timezone, this.callingCode, this.defaultLat, this.defaultLng, this.defaultCity, {
    this.taxName = '', this.taxRate = 0, this.supportedLangs = const ['en'],
    this.measurementSystem = 'metric', this.dateFormat = 'dd/MM/yyyy',
  });

  /// Whether this country uses RTL layout by default
  bool get isRtl => locale.startsWith('ar');

  /// Tax display label (e.g., "GST 18%", "VAT 5%")
  String get taxLabel => taxName.isEmpty ? '' : '$taxName ${taxRate.toStringAsFixed(taxRate == taxRate.roundToDouble() ? 0 : 1)}%';

  /// Look up a country by its ISO code
  static SupportedCountry fromCode(String code) {
    return SupportedCountry.values.firstWhere(
      (c) => c.code == code.toUpperCase(),
      orElse: () => SupportedCountry.qatar,
    );
  }
}

/// Result of region detection
class RegionDetectionResult {
  final SupportedCountry country;
  final String detectedVia; // 'gps', 'ip', 'cached', 'default'
  final double confidence;
  final double? lat;
  final double? lng;
  final String? city;

  const RegionDetectionResult({
    required this.country,
    required this.detectedVia,
    required this.confidence,
    this.lat,
    this.lng,
    this.city,
  });

  @override
  String toString() => '${country.flag} ${country.name} (via $detectedVia, confidence: ${(confidence * 100).toStringAsFixed(0)}%)';
}

/// Singleton service for region detection and management.
///
/// Usage:
/// ```dart
/// final result = await RegionService.instance.detectRegion(lat, lng);
/// final headers = RegionService.instance.regionHeaders;
/// ```
class RegionService {
  RegionService._();
  static final RegionService instance = RegionService._();

  final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 5),
  ));

  SupportedCountry _currentCountry = SupportedCountry.qatar;
  RegionDetectionResult? _lastDetection;
  bool _initialized = false;
  static const MethodChannel _hardwareChannel = MethodChannel('com.kartseek.app/location');
  static const String _cacheKey = 'kartseek_region_cache';

  /// Load cached region from SharedPreferences for instant startup.
  /// Call this before async GPS/IP detection to avoid showing defaults.
  Future<void> loadCachedRegion() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString(_cacheKey);
      if (cached != null && cached.isNotEmpty) {
        final country = SupportedCountry.fromCode(cached);
        _currentCountry = country;
        _lastDetection = RegionDetectionResult(
          country: country,
          detectedVia: 'cached',
          confidence: 0.8,
          city: country.defaultCity,
        );
        _initialized = true;
        debugPrint('[RegionService] 💾 Loaded cached region: ${country.flag} ${country.name}');
      }
    } catch (e) {
      debugPrint('[RegionService] ⚠️ Cache load failed: $e');
    }
  }

  /// Current detected country
  SupportedCountry get currentCountry => _currentCountry;

  /// Full detection result
  RegionDetectionResult? get lastDetection => _lastDetection;

  /// Whether region has been detected
  bool get isInitialized => _initialized;

  /// Headers to include in every API call for region scoping
  Map<String, String> get regionHeaders => {
    'X-Region-Code': _currentCountry.code,
  };

  /// Detect region from GPS coordinates.
  /// Uses bounding-box matching for offline detection, then
  /// validates via the backend API if available.
  Future<RegionDetectionResult> detectFromGps(double fallbackLat, double fallbackLng) async {
    double lat = fallbackLat;
    double lng = fallbackLng;

    // 1. Hardware-level GPS sensor fetch (bypasses missing geolocator objective_c dependency)
    try {
      final hardwareLoc = await _hardwareChannel.invokeMethod('getHardwareLocation');
      if (hardwareLoc != null) {
        lat = (hardwareLoc['lat'] as num).toDouble();
        lng = (hardwareLoc['lng'] as num).toDouble();
        debugPrint('[RegionService] 🛰️ Hardware GPS locked: $lat, $lng');
      }
    } on PlatformException catch (e) {
      debugPrint('[RegionService] ⚠️ Hardware GPS unavailable (using fallback): $e');
    } catch (e) {
      debugPrint('[RegionService] ⚠️ Hardware sensor error: $e');
    }

    // 2. Local bounding-box detection (works offline)
    final localCountry = _resolveFromCoords(lat, lng);

    // Try backend validation
    try {
      final response = await _dio.get(
        '${AppConstants.apiBaseUrl}/regions/detect',
        options: Options(headers: {
          'X-Latitude': lat.toString(),
          'X-Longitude': lng.toString(),
        }),
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final code = data['countryCode'] as String? ?? localCountry.code;
        final country = SupportedCountry.fromCode(code);
        _setRegion(RegionDetectionResult(
          country: country,
          detectedVia: 'gps',
          confidence: 0.95,
          lat: lat,
          lng: lng,
          city: data['city'] as String?,
        ));
        return _lastDetection!;
      }
    } catch (e) {
      debugPrint('[RegionService] ⚠️ Backend detection failed, using local: $e');
    }

    // Fallback to local detection
    _setRegion(RegionDetectionResult(
      country: localCountry,
      detectedVia: 'gps',
      confidence: 0.9,
      lat: lat,
      lng: lng,
      city: localCountry.defaultCity,
    ));
    return _lastDetection!;
  }

  /// Detect region from IP (calls the backend).
  Future<RegionDetectionResult> detectFromIp() async {
    try {
      final response = await _dio.get(
        '${AppConstants.apiBaseUrl}/regions/detect',
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final code = data['countryCode'] as String? ?? 'QA';
        final country = SupportedCountry.fromCode(code);
        _setRegion(RegionDetectionResult(
          country: country,
          detectedVia: 'ip',
          confidence: (data['confidence'] as num?)?.toDouble() ?? 0.7,
          city: data['city'] as String?,
        ));
        return _lastDetection!;
      }
    } catch (e) {
      debugPrint('[RegionService] ⚠️ IP detection failed: $e');
    }

    // Fallback to default (Doha, Qatar)
    _setRegion(const RegionDetectionResult(
      country: SupportedCountry.qatar,
      detectedVia: 'default',
      confidence: 0.1,
    ));
    return _lastDetection!;
  }

  /// Set region manually (e.g., from user settings).
  void setRegion(SupportedCountry country) {
    _setRegion(RegionDetectionResult(
      country: country,
      detectedVia: 'manual',
      confidence: 1.0,
    ));
  }

  /// Local GPS → country resolution using bounding boxes.
  SupportedCountry _resolveFromCoords(double lat, double lng) {
    // India
    if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) return SupportedCountry.india;
    // Qatar
    if (lat >= 24.4 && lat <= 26.3 && lng >= 50.7 && lng <= 52.0) return SupportedCountry.qatar;
    // UAE
    if (lat >= 22 && lat <= 26.5 && lng >= 51 && lng <= 56.5) return SupportedCountry.uae;
    // Saudi Arabia
    if (lat >= 16 && lat <= 32 && lng >= 34 && lng <= 56) return SupportedCountry.saudiArabia;
    // Bahrain
    if (lat >= 25.5 && lat <= 26.5 && lng >= 50.3 && lng <= 50.8) return SupportedCountry.bahrain;
    // Kuwait
    if (lat >= 28.5 && lat <= 30.1 && lng >= 46.5 && lng <= 48.5) return SupportedCountry.kuwait;
    // Oman
    if (lat >= 16.6 && lat <= 26.4 && lng >= 52.0 && lng <= 59.9) return SupportedCountry.oman;
    // UK
    if (lat >= 49.9 && lat <= 60.9 && lng >= -8.6 && lng <= 1.8) return SupportedCountry.uk;
    // USA
    if (lat >= 24.5 && lat <= 49.4 && lng >= -125.0 && lng <= -66.9) return SupportedCountry.usa;
    // Kenya
    if (lat >= -5 && lat <= 5 && lng >= 33 && lng <= 42) return SupportedCountry.kenya;
    // Default
    return SupportedCountry.qatar;
  }

  void _setRegion(RegionDetectionResult result) {
    _currentCountry = result.country;
    _lastDetection = result;
    _initialized = true;
    debugPrint('[RegionService] 🌍 Region set → ${result.country.flag} ${result.country.name} (via ${result.detectedVia})');
    // Persist to cache for instant startup next time
    _persistRegionAsync(result.country.code);
  }

  void _persistRegionAsync(String code) {
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString(_cacheKey, code);
    }).catchError((e) {
      debugPrint('[RegionService] ⚠️ Cache persist failed: $e');
    });
  }

  /// Get region-specific payment methods
  List<String> getPaymentMethods() {
    switch (_currentCountry) {
      case SupportedCountry.india:
        return const ['UPI / Paytm', 'Credit / Debit Card', 'KARTSEEK Wallet', 'Net Banking', 'Cash on Delivery'];
      case SupportedCountry.uae:
      case SupportedCountry.saudiArabia:
      case SupportedCountry.qatar:
      case SupportedCountry.bahrain:
      case SupportedCountry.kuwait:
      case SupportedCountry.oman:
        return const ['Apple Pay / STC Pay', 'Credit / Debit Card', 'KARTSEEK Wallet', 'Cash on Delivery'];
      case SupportedCountry.uk:
        return ['Apple Pay', 'Credit / Debit Card', 'KARTSEEK Wallet', 'BACS Direct Debit'];
      case SupportedCountry.usa:
        return ['Apple Pay / Google Pay', 'Credit / Debit Card', 'KARTSEEK Wallet', 'ACH Bank Transfer'];
      default:
        return const ['M-Pesa / Mobile Money', 'Credit / Debit Card', 'KARTSEEK Wallet', 'Cash on Delivery'];
    }
  }
}
