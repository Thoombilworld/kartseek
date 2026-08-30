import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Supported app languages
enum AppLanguage {
  en('en', 'English', 'English'),
  ar('ar', 'Arabic', 'العربية'),
  hi('hi', 'Hindi', 'हिन्दी'),
  ta('ta', 'Tamil', 'தமிழ்'),
  ml('ml', 'Malayalam', 'മലയാളം'),
  es('es', 'Spanish', 'Español'),
  sw('sw', 'Swahili', 'Kiswahili');

  final String code;
  final String name;
  final String nativeName;
  const AppLanguage(this.code, this.name, this.nativeName);

  bool get isRtl => code == 'ar';

  Locale get locale => Locale(code);

  static AppLanguage fromCode(String code) {
    return AppLanguage.values.firstWhere(
      (l) => l.code == code,
      orElse: () => AppLanguage.en,
    );
  }
}

// ─── Locale Provider ─────────────────────────────────────────────────────────

/// Global locale state manager for all KARTSEEK Flutter apps.
///
/// Provides:
/// - Automatic country detection from GPS/IP/device locale
/// - Language auto-selection based on country
/// - Currency symbol/code resolution
/// - RTL/LTR direction
/// - Manual language/country override with persistence
///
/// Usage:
/// ```dart
/// // Wrap your app with LocaleProvider
/// ChangeNotifierProvider(
///   create: (_) => LocaleProvider()..initialize(),
///   child: Consumer<LocaleProvider>(
///     builder: (context, locale, _) => MaterialApp(
///       locale: locale.appLocale,
///       supportedLocales: locale.supportedLocales,
///       // ...
///     ),
///   ),
/// )
/// ```
class LocaleProvider extends ChangeNotifier {
  static const _prefKeyLanguage = 'kartseek_app_language';
  static const _prefKeyCountry = 'kartseek_app_country';

  SupportedCountry _country = SupportedCountry.qatar;
  AppLanguage _language = AppLanguage.en;
  bool _initialized = false;
  bool _manuallySet = false;

  // ── Getters ───────────────────────────────────────────────────────────────

  /// Current country
  SupportedCountry get country => _country;

  /// Current language
  AppLanguage get language => _language;

  /// Locale for MaterialApp
  Locale get appLocale => _language.locale;

  /// Text direction (RTL for Arabic, LTR for others)
  TextDirection get textDirection =>
      _language.isRtl ? TextDirection.rtl : TextDirection.ltr;

  /// Whether the current locale is RTL
  bool get isRtl => _language.isRtl;

  /// Currency symbol
  String get currencySymbol => _country.currencySymbol;

  /// Currency code (e.g., 'QAR', 'INR')
  String get currencyCode => _country.currencyCode;

  /// Timezone
  String get timezone => _country.timezone;

  /// Country flag emoji
  String get countryFlag => _country.flag;

  /// Tax label (e.g., "VAT 5%")
  String get taxLabel => _country.taxLabel;

  /// Whether initialized
  bool get isInitialized => _initialized;

  /// All supported locales
  List<Locale> get supportedLocales =>
      AppLanguage.values.map((l) => l.locale).toList();

  /// Languages available for the current country
  List<AppLanguage> get availableLanguages =>
      _country.supportedLangs
          .map((code) => AppLanguage.fromCode(code))
          .toList();

  // ── Initialization ────────────────────────────────────────────────────────

  /// Initialize locale detection.
  /// Priority: Saved preference > GPS region > Device locale > Default
  Future<void> initialize() async {
    if (_initialized) return;

    // 1. Load saved preferences
    final prefs = await SharedPreferences.getInstance();
    final savedLang = prefs.getString(_prefKeyLanguage);
    final savedCountry = prefs.getString(_prefKeyCountry);

    if (savedLang != null && savedCountry != null) {
      _language = AppLanguage.fromCode(savedLang);
      _country = SupportedCountry.fromCode(savedCountry);
      _manuallySet = true;
      _initialized = true;
      debugPrint('[LocaleProvider] 💾 Restored: ${_country.flag} ${_country.name} / ${_language.nativeName}');
      notifyListeners();
      return;
    }

    // 2. Use RegionService (GPS/IP detection)
    final regionService = RegionService.instance;
    await regionService.loadCachedRegion();
    if (regionService.isInitialized) {
      _country = regionService.currentCountry;
    }

    // 3. Detect language from device locale
    _language = _detectLanguageFromDevice();

    // 4. Ensure selected language is available for the country
    if (!_country.supportedLangs.contains(_language.code)) {
      _language = AppLanguage.fromCode(_country.supportedLangs.first);
    }

    _initialized = true;
    debugPrint('[LocaleProvider] 🌍 Auto-detected: ${_country.flag} ${_country.name} / ${_language.nativeName}');
    notifyListeners();
  }

  /// Detect language from the device's system locale
  AppLanguage _detectLanguageFromDevice() {
    try {
      // Get device locale
      final deviceLocale = ui.PlatformDispatcher.instance.locale;
      final langCode = deviceLocale.languageCode;

      // Check if we support this language
      final match = AppLanguage.values.where((l) => l.code == langCode);
      if (match.isNotEmpty) return match.first;

      // Check by platform locale string
      if (Platform.localeName.startsWith('ar')) return AppLanguage.ar;
      if (Platform.localeName.startsWith('hi')) return AppLanguage.hi;
      if (Platform.localeName.startsWith('es')) return AppLanguage.es;
      if (Platform.localeName.startsWith('sw')) return AppLanguage.sw;
      if (Platform.localeName.startsWith('ta')) return AppLanguage.ta;
      if (Platform.localeName.startsWith('ml')) return AppLanguage.ml;
    } catch (e) {
      debugPrint('[LocaleProvider] ⚠️ Device locale detection failed: $e');
    }

    return AppLanguage.en;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /// Change language manually (persisted)
  Future<void> setLanguage(AppLanguage lang) async {
    if (_language == lang) return;
    _language = lang;
    _manuallySet = true;
    notifyListeners();
    await _persist();
    debugPrint('[LocaleProvider] 🔄 Language changed → ${lang.nativeName}');
  }

  /// Change country manually (persisted, also updates default language)
  Future<void> setCountry(SupportedCountry newCountry) async {
    if (_country == newCountry) return;
    _country = newCountry;
    _manuallySet = true;

    // If current language isn't supported in new country, switch to default
    if (!newCountry.supportedLangs.contains(_language.code)) {
      _language = AppLanguage.fromCode(newCountry.supportedLangs.first);
    }

    notifyListeners();
    await _persist();
    debugPrint('[LocaleProvider] 🔄 Country changed → ${newCountry.flag} ${newCountry.name}');
  }

  /// Update from GPS/IP region detection (lower priority than manual)
  void updateFromRegionDetection(SupportedCountry detected) {
    if (_manuallySet) return; // Don't override manual selection
    if (_country == detected) return;

    _country = detected;
    if (!detected.supportedLangs.contains(_language.code)) {
      _language = AppLanguage.fromCode(detected.supportedLangs.first);
    }
    notifyListeners();
    debugPrint('[LocaleProvider] 📡 Region updated from detection: ${detected.flag} ${detected.name}');
  }

  /// Reset to auto-detection (clears saved preferences)
  Future<void> resetToAutoDetect() async {
    _manuallySet = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefKeyLanguage);
    await prefs.remove(_prefKeyCountry);
    _initialized = false;
    await initialize();
  }

  // ── Currency Formatting Helpers ───────────────────────────────────────────

  /// Format a price using the current country's currency
  String formatPrice(double amount, {int? decimals, bool showCode = false}) {
    final d = decimals ?? (['BHD', 'KWD', 'OMR'].contains(_country.currencyCode) ? 3 : 2);
    final formatted = amount.toStringAsFixed(d).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );
    return showCode
        ? '${_country.currencyCode} $formatted'
        : '${_country.currencySymbol} $formatted';
  }

  /// Format compact price (e.g., "₹12.3K")
  String formatCompactPrice(double amount) {
    final sym = _country.currencySymbol;
    if (amount >= 1000000) return '$sym${(amount / 1000000).toStringAsFixed(1)}M';
    if (amount >= 1000) return '$sym${(amount / 1000).toStringAsFixed(1)}K';
    return formatPrice(amount);
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKeyLanguage, _language.code);
      await prefs.setString(_prefKeyCountry, _country.code);
    } catch (e) {
      debugPrint('[LocaleProvider] ⚠️ Persistence failed: $e');
    }
  }
}
