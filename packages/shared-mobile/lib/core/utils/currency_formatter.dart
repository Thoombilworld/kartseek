/// KARTSEEK — Locale-Aware Currency & Number Formatter
///
/// Reads formatting rules from [RegionService.currentCountry] so all price
/// displays automatically adapt to the user's detected or selected locale.
/// No currency symbol is ever hardcoded — everything comes from the country
/// configuration.
library;

import 'package:intl/intl.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Currency display configuration loaded from the active country.
class CurrencyConfig {
  final String code;
  final String symbol;
  final String symbolPosition; // 'before' | 'after'
  final int decimalPlaces;
  final String decimalSeparator;
  final String thousandsSeparator;

  const CurrencyConfig({
    required this.code,
    required this.symbol,
    this.symbolPosition = 'before',
    this.decimalPlaces = 2,
    this.decimalSeparator = '.',
    this.thousandsSeparator = ',',
  });
}

/// Static registry of currency formatting rules per ISO 4217 code.
final Map<String, CurrencyConfig> _currencyConfigs = {
  'QAR': const CurrencyConfig(code: 'QAR', symbol: '﷼', decimalPlaces: 2),
  'INR': const CurrencyConfig(code: 'INR', symbol: '₹', decimalPlaces: 2),
  'AED': const CurrencyConfig(code: 'AED', symbol: 'د.إ', decimalPlaces: 2),
  'SAR': const CurrencyConfig(code: 'SAR', symbol: '﷼', decimalPlaces: 2),
  'BHD': const CurrencyConfig(code: 'BHD', symbol: 'ب.د', decimalPlaces: 3),
  'KWD': const CurrencyConfig(code: 'KWD', symbol: 'د.ك', decimalPlaces: 3),
  'OMR': const CurrencyConfig(code: 'OMR', symbol: 'ر.ع.', decimalPlaces: 3),
  'GBP': const CurrencyConfig(code: 'GBP', symbol: '£', decimalPlaces: 2),
  'USD': const CurrencyConfig(code: 'USD', symbol: '\$', decimalPlaces: 2),
  'KES': const CurrencyConfig(code: 'KES', symbol: 'KSh', decimalPlaces: 2),
  'EUR': const CurrencyConfig(code: 'EUR', symbol: '€', decimalPlaces: 2),
};

/// Unified currency/number formatting utility.
///
/// Usage:
/// ```dart
/// CurrencyFormatter.format(1234.5);       // "﷼ 1,234.50" (for Qatar)
/// CurrencyFormatter.format(1234.5, code: 'INR'); // "₹ 1,234.50"
/// CurrencyFormatter.compact(1500000);     // "﷼ 1.5M"
/// ```
class CurrencyFormatter {
  CurrencyFormatter._();

  /// Get the [CurrencyConfig] for the current region or a specific code.
  static CurrencyConfig getConfig([String? currencyCode]) {
    final code = currencyCode ?? RegionService.instance.currentCountry.currencyCode;
    return _currencyConfigs[code] ?? CurrencyConfig(code: code, symbol: code);
  }

  /// Format a numeric amount with the correct currency symbol and formatting.
  static String format(
    num amount, {
    String? code,
    bool showCode = false,
    int? overrideDecimals,
  }) {
    final config = getConfig(code);
    final decimals = overrideDecimals ?? config.decimalPlaces;
    final formatted = NumberFormat.currency(
      symbol: '',
      decimalDigits: decimals,
    ).format(amount);

    final symbol = showCode ? config.code : config.symbol;

    return config.symbolPosition == 'after'
        ? '$formatted $symbol'
        : '$symbol $formatted';
  }

  /// Format as a compact string (e.g., 1.5K, 2.3M).
  static String compact(num amount, {String? code}) {
    final config = getConfig(code);
    final formatted = NumberFormat.compact().format(amount);
    return '${config.symbol} $formatted';
  }

  /// Format just the number (no currency symbol).
  static String number(num amount, {int decimals = 2}) {
    return NumberFormat('#,##0.${'0' * decimals}').format(amount);
  }

  /// Get just the currency symbol for the current region.
  static String get symbol => getConfig().symbol;

  /// Get the currency code for the current region.
  static String get currencyCode => getConfig().code;
}
