import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

/// KARTSEEK Partner App — External Map Navigation Service
///
/// Launches the driver's preferred map application (Google Maps, Waze, or
/// Apple Maps) for turn-by-turn navigation to pickup and delivery locations.
///
/// Since `url_launcher` is currently disabled due to build constraints,
/// this service prepares the intent URIs and logs them. When `url_launcher`
/// is re-enabled, swap the debug prints for `launchUrl()` calls.
///
/// ### Supported Map Apps
/// | App          | Android               | iOS                    |
/// |:------------ |:----------------------|:-----------------------|
/// | Google Maps  | `google.navigation`   | `comgooglemaps://`     |
/// | Waze         | `waze://?navigate=yes`| `waze://?navigate=yes` |
/// | Apple Maps   | N/A                   | `maps://`              |
enum PreferredMapApp {
  googleMaps('Google Maps'),
  waze('Waze'),
  appleMaps('Apple Maps');

  final String displayName;
  const PreferredMapApp(this.displayName);

  /// Icon name for display in the UI.
  String get iconName {
    switch (this) {
      case PreferredMapApp.googleMaps:
        return 'map';
      case PreferredMapApp.waze:
        return 'navigation';
      case PreferredMapApp.appleMaps:
        return 'explore';
    }
  }
}

class MapNavigationService {
  MapNavigationService._();
  static final MapNavigationService _instance = MapNavigationService._();
  static MapNavigationService get instance => _instance;

  /// The user's currently selected map app. Defaults to Google Maps.
  PreferredMapApp _preferredApp = PreferredMapApp.googleMaps;

  PreferredMapApp get preferredApp => _preferredApp;

  /// Set the preferred map app (persisted in-memory; in production, use SharedPreferences).
  void setPreferredApp(PreferredMapApp app) {
    _preferredApp = app;
    debugPrint('[MapNav] Preferred map set to: ${app.displayName}');
  }

  /// Returns available map apps for the current platform.
  List<PreferredMapApp> get availableApps {
    if (kIsWeb) return [PreferredMapApp.googleMaps];

    final apps = <PreferredMapApp>[
      PreferredMapApp.googleMaps,
      PreferredMapApp.waze,
    ];

    // Apple Maps only on iOS
    try {
      if (Platform.isIOS) {
        apps.add(PreferredMapApp.appleMaps);
      }
    } catch (_) {
      // Platform not available (web)
    }

    return apps;
  }

  /// Navigate to a destination using the preferred map app.
  ///
  /// [destinationLat] and [destinationLng] are the target coordinates.
  /// [destinationLabel] is shown as the place name in the map app.
  Future<void> navigateTo({
    required double destinationLat,
    required double destinationLng,
    String? destinationLabel,
    double? originLat,
    double? originLng,
  }) async {
    final uri = _buildNavigationUri(
      destinationLat: destinationLat,
      destinationLng: destinationLng,
      destinationLabel: destinationLabel,
      originLat: originLat,
      originLng: originLng,
    );

    debugPrint('[MapNav] 🗺️ Opening ${_preferredApp.displayName}: $uri');

    // [NOTE] When url_launcher is re-enabled, uncomment:
    // final url = Uri.parse(uri);
    // if (await canLaunchUrl(url)) {
    //   await launchUrl(url, mode: LaunchMode.externalApplication);
    // } else {
    //   // Fallback to Google Maps web
    //   final fallback = Uri.parse(
    //     'https://www.google.com/maps/dir/?api=1'
    //     '&destination=$destinationLat,$destinationLng'
    //     '&travelmode=driving',
    //   );
    //   await launchUrl(fallback, mode: LaunchMode.externalApplication);
    // }
  }

  /// Navigate to a pickup location (convenience wrapper).
  Future<void> navigateToPickup({
    required double lat,
    required double lng,
    String? label,
  }) async {
    await navigateTo(
      destinationLat: lat,
      destinationLng: lng,
      destinationLabel: label ?? 'Pickup Location',
    );
  }

  /// Navigate to a drop-off / delivery location (convenience wrapper).
  Future<void> navigateToDropoff({
    required double lat,
    required double lng,
    String? label,
  }) async {
    await navigateTo(
      destinationLat: lat,
      destinationLng: lng,
      destinationLabel: label ?? 'Drop-off Location',
    );
  }

  // ── URI Builders ──────────────────────────────────────────────────────────

  String _buildNavigationUri({
    required double destinationLat,
    required double destinationLng,
    String? destinationLabel,
    double? originLat,
    double? originLng,
  }) {
    switch (_preferredApp) {
      case PreferredMapApp.googleMaps:
        return _buildGoogleMapsUri(destinationLat, destinationLng, destinationLabel, originLat, originLng);
      case PreferredMapApp.waze:
        return _buildWazeUri(destinationLat, destinationLng, destinationLabel);
      case PreferredMapApp.appleMaps:
        return _buildAppleMapsUri(destinationLat, destinationLng, destinationLabel, originLat, originLng);
    }
  }

  String _buildGoogleMapsUri(double destLat, double destLng, String? label, double? origLat, double? origLng) {
    final encodedLabel = Uri.encodeComponent(label ?? '$destLat,$destLng');
    final buffer = StringBuffer('https://www.google.com/maps/dir/?api=1');
    if (origLat != null && origLng != null) {
      buffer.write('&origin=$origLat,$origLng');
    }
    buffer.write('&destination=$destLat,$destLng');
    buffer.write('&destination_place_id=$encodedLabel');
    buffer.write('&travelmode=driving');
    return buffer.toString();
  }

  String _buildWazeUri(double destLat, double destLng, String? label) {
    return 'https://waze.com/ul?ll=$destLat,$destLng&navigate=yes&zoom=17';
  }

  String _buildAppleMapsUri(double destLat, double destLng, String? label, double? origLat, double? origLng) {
    final encodedLabel = Uri.encodeComponent(label ?? 'Destination');
    final buffer = StringBuffer('https://maps.apple.com/?');
    if (origLat != null && origLng != null) {
      buffer.write('saddr=$origLat,$origLng&');
    }
    buffer.write('daddr=$destLat,$destLng');
    buffer.write('&dirflg=d');
    buffer.write('&t=m');
    buffer.write('&q=$encodedLabel');
    return buffer.toString();
  }
}
