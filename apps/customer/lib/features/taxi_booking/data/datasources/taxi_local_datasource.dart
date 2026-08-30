// cSpell:words backgrounding
/// KARTSEEK Taxi Booking — Local Datasource
///
/// Caches active booking state, recent searches, and saved places
/// using SharedPreferences for lightweight persistence.
library;

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/entities/entities.dart';

class TaxiLocalDatasource {
  static const _activeRideKey = 'taxi_active_ride_id';
  static const _recentSearchesKey = 'taxi_recent_searches';
  static const _savedPlacesKey = 'taxi_saved_places';
  static const _lastPickupKey = 'taxi_last_pickup';

  /// Cached SharedPreferences instance — avoids redundant getInstance() calls.
  SharedPreferences? _prefs;

  Future<SharedPreferences> get _cachedPrefs async {
    return _prefs ??= await SharedPreferences.getInstance();
  }

  // ─── Active Ride Persistence ──────────────────────────────────────────

  /// Save the active ride ID so it survives app restart.
  Future<void> saveActiveRideId(String rideId) async {
    final prefs = await _cachedPrefs;
    await prefs.setString(_activeRideKey, rideId);
    debugPrint('[TaxiLocal] Saved active ride: $rideId');
  }

  /// Get the active ride ID (null if none).
  Future<String?> getActiveRideId() async {
    final prefs = await _cachedPrefs;
    return prefs.getString(_activeRideKey);
  }

  /// Clear the active ride ID after completion/cancellation.
  Future<void> clearActiveRideId() async {
    final prefs = await _cachedPrefs;
    await prefs.remove(_activeRideKey);
    debugPrint('[TaxiLocal] Cleared active ride');
  }

  // ─── Recent Searches ──────────────────────────────────────────────────

  /// Get recent destination searches (max 10).
  Future<List<GeoLocation>> getRecentSearches() async {
    final prefs = await _cachedPrefs;
    final json = prefs.getString(_recentSearchesKey);
    if (json == null) return [];

    try {
      final list = jsonDecode(json) as List;
      return list.map((item) => GeoLocation(
        lat: (item['lat'] as num).toDouble(),
        lng: (item['lng'] as num).toDouble(),
        address: item['address'] as String?,
        placeId: item['placeId'] as String?,
      )).toList();
    } catch (e) {
      debugPrint('[TaxiLocal] Failed to parse recent searches: $e');
      return [];
    }
  }

  /// Add a search to the recent list.
  Future<void> addRecentSearch(GeoLocation location) async {
    final searches = await getRecentSearches();

    // Remove duplicate
    searches.removeWhere(
      (s) => s.lat == location.lat && s.lng == location.lng,
    );

    // Add to front
    searches.insert(0, location);

    // Keep max 10
    if (searches.length > 10) {
      searches.removeRange(10, searches.length);
    }

    final prefs = await _cachedPrefs;
    final json = jsonEncode(searches.map((s) => {
      'lat': s.lat,
      'lng': s.lng,
      'address': s.address,
      'placeId': s.placeId,
    }).toList());
    await prefs.setString(_recentSearchesKey, json);
  }

  // ─── Saved Places ────────────────────────────────────────────────────

  /// Get customer's saved places (Home, Work, etc.).
  Future<List<SavedPlace>> getSavedPlaces() async {
    final prefs = await _cachedPrefs;
    final json = prefs.getString(_savedPlacesKey);
    if (json == null) return [];

    try {
      final list = jsonDecode(json) as List;
      return list.map((item) => SavedPlace(
        id: item['id'] as String,
        label: item['label'] as String,
        icon: item['icon'] as String? ?? 'place',
        location: GeoLocation(
          lat: (item['lat'] as num).toDouble(),
          lng: (item['lng'] as num).toDouble(),
          address: item['address'] as String?,
        ),
      )).toList();
    } catch (e) {
      debugPrint('[TaxiLocal] Failed to parse saved places: $e');
      return [];
    }
  }

  /// Save or update a place.
  Future<void> savePlace(SavedPlace place) async {
    final places = await getSavedPlaces();
    places.removeWhere((p) => p.id == place.id);
    places.add(place);

    final prefs = await _cachedPrefs;
    final json = jsonEncode(places.map((p) => {
      'id': p.id,
      'label': p.label,
      'icon': p.icon,
      'lat': p.location.lat,
      'lng': p.location.lng,
      'address': p.location.address,
    }).toList());
    await prefs.setString(_savedPlacesKey, json);
  }

  // ─── Last Pickup ──────────────────────────────────────────────────────

  /// Cache the last known pickup location.
  Future<void> saveLastPickup(GeoLocation location) async {
    final prefs = await _cachedPrefs;
    await prefs.setString(_lastPickupKey, jsonEncode({
      'lat': location.lat,
      'lng': location.lng,
      'address': location.address,
    }));
  }

  /// Get the cached last pickup location.
  Future<GeoLocation?> getLastPickup() async {
    final prefs = await _cachedPrefs;
    final json = prefs.getString(_lastPickupKey);
    if (json == null) return null;

    try {
      final map = jsonDecode(json) as Map<String, dynamic>;
      return GeoLocation(
        lat: (map['lat'] as num).toDouble(),
        lng: (map['lng'] as num).toDouble(),
        address: map['address'] as String?,
      );
    } catch (e) {
      return null;
    }
  }

  // ─── OTP Persistence ────────────────────────────────────────────────────────

  /// Persist OTP locally so it survives app backgrounding.
  Future<void> saveOtp(String rideId, String otp) async {
    final prefs = await _cachedPrefs;
    await prefs.setString('taxi_otp_$rideId', otp);
    debugPrint('[TaxiLocal] Saved OTP for ride: $rideId');
  }

  /// Retrieve a persisted OTP.
  Future<String?> getOtp(String rideId) async {
    final prefs = await _cachedPrefs;
    return prefs.getString('taxi_otp_$rideId');
  }

  /// Clear OTP after verification.
  Future<void> clearOtp(String rideId) async {
    final prefs = await _cachedPrefs;
    await prefs.remove('taxi_otp_$rideId');
  }
}
