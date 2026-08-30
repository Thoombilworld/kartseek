/// KARTSEEK Region BLoC — Events
library;

import 'package:shared_mobile/core/services/region_service.dart';

/// Base class for all region events
sealed class RegionEvent {
  const RegionEvent();
}

/// Detect region from GPS coordinates
class DetectRegionFromGps extends RegionEvent {
  final double latitude;
  final double longitude;
  const DetectRegionFromGps({required this.latitude, required this.longitude});
}

/// Detect region from IP address (backend call)
class DetectRegionFromIp extends RegionEvent {
  const DetectRegionFromIp();
}

/// Manually set the region
class SetRegionManually extends RegionEvent {
  final SupportedCountry country;
  const SetRegionManually(this.country);
}

/// Refresh region detection
class RefreshRegion extends RegionEvent {
  const RefreshRegion();
}
