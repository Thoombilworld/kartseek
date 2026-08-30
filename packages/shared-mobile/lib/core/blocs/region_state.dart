/// KARTSEEK Region BLoC — State
library;

import 'package:shared_mobile/core/services/region_service.dart';

/// Base class for all region states
sealed class RegionState {
  const RegionState();
}

/// Initial state — region not yet detected
class RegionInitial extends RegionState {
  const RegionInitial();
}

/// Region detection in progress
class RegionDetecting extends RegionState {
  const RegionDetecting();
}

/// Region successfully detected
class RegionDetected extends RegionState {
  final RegionDetectionResult result;
  final SupportedCountry country;
  final String displayName; // e.g. "🇮🇳 India"
  final String currencySymbol;

  RegionDetected({required this.result})
    : country = result.country,
      displayName = '${result.country.flag} ${result.country.name}',
      currencySymbol = result.country.currencySymbol;
}

/// Region detection failed
class RegionError extends RegionState {
  final String message;
  final SupportedCountry fallbackCountry;

  const RegionError({
    required this.message,
    this.fallbackCountry = SupportedCountry.qatar,
  });
}
