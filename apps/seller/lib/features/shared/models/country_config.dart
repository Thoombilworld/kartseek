/// KARTSEEK Seller App — Country Configuration
///
/// Defines supported countries, their currencies, and which seller modules
/// are enabled per jurisdiction. Qatar (QA) is the default country.
library;

class CountryConfig {
  final String code;
  final String name;
  final String flag;
  final String currencyCode;
  final String currencySymbol;
  final String callingCode;
  final String defaultCity;
  final List<String> enabledModules;

  const CountryConfig({
    required this.code,
    required this.name,
    required this.flag,
    required this.currencyCode,
    required this.currencySymbol,
    required this.callingCode,
    required this.defaultCity,
    required this.enabledModules,
  });

  // ── Directory ─────────────────────────────────────────────────────────────

  static const List<CountryConfig> all = [
    CountryConfig(
      code: 'QA', name: 'Qatar', flag: '🇶🇦',
      currencyCode: 'QAR', currencySymbol: 'QAR', callingCode: '+974',
      defaultCity: 'Doha',
      enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery'],
    ),
    CountryConfig(
      code: 'IN', name: 'India', flag: '🇮🇳',
      currencyCode: 'INR', currencySymbol: '₹', callingCode: '+91',
      defaultCity: 'New Delhi',
      enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'hotel', 'delivery'],
    ),
    CountryConfig(
      code: 'AE', name: 'UAE', flag: '🇦🇪',
      currencyCode: 'AED', currencySymbol: 'AED', callingCode: '+971',
      defaultCity: 'Dubai',
      enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'hotel', 'delivery'],
    ),
    CountryConfig(
      code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦',
      currencyCode: 'SAR', currencySymbol: 'SAR', callingCode: '+966',
      defaultCity: 'Riyadh',
      enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'hotel', 'delivery'],
    ),
    CountryConfig(
      code: 'KE', name: 'Kenya', flag: '🇰🇪',
      currencyCode: 'KES', currencySymbol: 'KSh', callingCode: '+254',
      defaultCity: 'Nairobi',
      enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'delivery'],
    ),
    CountryConfig(
      code: 'BH', name: 'Bahrain', flag: '🇧🇭',
      currencyCode: 'BHD', currencySymbol: 'BHD', callingCode: '+973',
      defaultCity: 'Manama',
      enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery'],
    ),
    CountryConfig(
      code: 'KW', name: 'Kuwait', flag: '🇰🇼',
      currencyCode: 'KWD', currencySymbol: 'KWD', callingCode: '+965',
      defaultCity: 'Kuwait City',
      enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery'],
    ),
    CountryConfig(
      code: 'OM', name: 'Oman', flag: '🇴🇲',
      currencyCode: 'OMR', currencySymbol: 'OMR', callingCode: '+968',
      defaultCity: 'Muscat',
      enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery'],
    ),
    CountryConfig(
      code: 'GB', name: 'United Kingdom', flag: '🇬🇧',
      currencyCode: 'GBP', currencySymbol: '£', callingCode: '+44',
      defaultCity: 'London',
      enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'delivery'],
    ),
    CountryConfig(
      code: 'US', name: 'United States', flag: '🇺🇸',
      currencyCode: 'USD', currencySymbol: '\$', callingCode: '+1',
      defaultCity: 'New York',
      enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'delivery'],
    ),
  ];

  // ── Lookups ───────────────────────────────────────────────────────────────

  static CountryConfig forCode(String code) =>
      all.firstWhere((c) => c.code == code, orElse: () => qatar);

  static const CountryConfig qatar = CountryConfig(
    code: 'QA', name: 'Qatar', flag: '🇶🇦',
    currencyCode: 'QAR', currencySymbol: 'QAR', callingCode: '+974',
    defaultCity: 'Doha',
    enabledModules: ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'taxi', 'delivery'],
  );

  bool isModuleEnabled(String module) => enabledModules.contains(module);

  /// Format a monetary value using this country's currency symbol.
  String formatAmount(double amount) {
    if (amount >= 1000000) {
      return '$currencySymbol ${(amount / 1000000).toStringAsFixed(1)}M';
    }
    if (amount >= 1000) {
      return '$currencySymbol ${(amount / 1000).toStringAsFixed(1)}K';
    }
    return '$currencySymbol ${amount.toStringAsFixed(0)}';
  }

  @override
  String toString() => '$flag $name ($currencyCode)';
}
