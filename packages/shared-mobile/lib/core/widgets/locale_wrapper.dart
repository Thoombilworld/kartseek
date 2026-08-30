/// KARTSEEK — Locale-Aware Widget Wrapper
///
/// Wraps the app's MaterialApp with the correct text direction (RTL/LTR)
/// and locale settings based on the detected or selected language.
library;

import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Languages that require right-to-left layout.
const Set<String> _rtlLanguages = {'ar', 'he', 'fa', 'ur'};

/// Determines if a given language code requires RTL layout.
bool isRtlLanguage(String langCode) => _rtlLanguages.contains(langCode);

/// Returns the [TextDirection] for the current region's default language.
TextDirection currentTextDirection() {
  final country = RegionService.instance.currentCountry;
  final langCode = country.locale.split('-').first;
  return isRtlLanguage(langCode) ? TextDirection.rtl : TextDirection.ltr;
}

/// A widget that wraps its child with the correct [Directionality] and [Locale].
///
/// Usage:
/// ```dart
/// LocaleWrapper(
///   child: MaterialApp(...),
/// )
/// ```
class LocaleWrapper extends StatelessWidget {
  final Widget child;
  final String? overrideLanguage;

  const LocaleWrapper({super.key, required this.child, this.overrideLanguage});

  @override
  Widget build(BuildContext context) {
    final country = RegionService.instance.currentCountry;
    final langCode = overrideLanguage ?? country.locale.split('-').first;
    final countryCode = country.code;
    final direction = isRtlLanguage(langCode) ? TextDirection.rtl : TextDirection.ltr;

    return Directionality(
      textDirection: direction,
      child: Localizations.override(
        context: context,
        locale: Locale(langCode, countryCode),
        child: child,
      ),
    );
  }
}

/// Extension on BuildContext for quick locale checks.
extension LocaleContextExtension on BuildContext {
  /// Whether the current locale uses RTL layout.
  bool get isRtl => Directionality.of(this) == TextDirection.rtl;

  /// Current locale string (e.g., 'en-QA').
  String get localeString {
    final locale = Localizations.localeOf(this);
    return '${locale.languageCode}-${locale.countryCode ?? ''}';
  }

  /// Current currency symbol from the region service.
  String get currencySymbol => RegionService.instance.currentCountry.currencySymbol;

  /// Current country code.
  String get countryCode => RegionService.instance.currentCountry.code;
}
