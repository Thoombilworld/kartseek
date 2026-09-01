import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Lightweight wrapper around Google Maps Geocoding + Places APIs.
/// Provides reverse geocoding, autocomplete, and place details.
class GeocodingService {
  GeocodingService._();
  static final GeocodingService instance = GeocodingService._();

  /// Supplied at build time, never committed:
  ///   flutter run --dart-define=MAPS_API_KEY=...
  ///
  /// Empty by default. Callers below already surface a failed lookup, so an
  /// absent key degrades to "no result" rather than throwing — check this
  /// first if geocoding silently returns nothing.
  static const _apiKey = String.fromEnvironment('MAPS_API_KEY');

  final _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 5),
  ));

  // ── Debounce timers ──
  Timer? _reverseTimer;
  Timer? _autocompleteTimer;

  // ── Cache to avoid redundant API calls ──
  final Map<String, String> _reverseCache = {};
  final Map<String, List<PlaceSuggestion>> _autocompleteCache = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Reverse Geocode (lat/lng → street address) ──
  // ═══════════════════════════════════════════════════════════════════════════

  /// Reverse geocode with debounce. Calls [onResult] when done.
  void reverseGeocodeDebounced(
    double lat, double lng, {
    Duration debounce = const Duration(milliseconds: 400),
    required void Function(String address) onResult,
  }) {
    _reverseTimer?.cancel();
    _reverseTimer = Timer(debounce, () async {
      final address = await reverseGeocode(lat, lng);
      onResult(address);
    });
  }

  /// Direct reverse geocode call (no debounce).
  Future<String> reverseGeocode(double lat, double lng) async {
    final cacheKey = '${lat.toStringAsFixed(5)},${lng.toStringAsFixed(5)}';
    if (_reverseCache.containsKey(cacheKey)) {
      return _reverseCache[cacheKey]!;
    }

    try {
      final resp = await _dio.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        queryParameters: {
          'latlng': '$lat,$lng',
          'key': _apiKey,
          'result_type': 'street_address|route|sublocality|locality',
          'language': 'en',
        },
      );

      if (resp.statusCode == 200) {
        final data = resp.data as Map<String, dynamic>;
        final results = data['results'] as List? ?? [];
        if (results.isNotEmpty) {
          // Use the first result's formatted address
          final address = results[0]['formatted_address'] as String? ?? '$lat, $lng';
          _reverseCache[cacheKey] = address;

          // Keep cache size manageable
          if (_reverseCache.length > 200) {
            final keys = _reverseCache.keys.toList();
            for (var i = 0; i < 50; i++) {
              _reverseCache.remove(keys[i]);
            }
          }

          return address;
        }
      }
    } catch (e) {
      debugPrint('[GeocodingService] Reverse geocode error: $e');
    }

    return '$lat, $lng';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Places Autocomplete (query → suggestions) ──
  // ═══════════════════════════════════════════════════════════════════════════

  /// Autocomplete with debounce. Calls [onResult] when suggestions arrive.
  void autocompleteDebounced(
    String query, {
    double? lat,
    double? lng,
    Duration debounce = const Duration(milliseconds: 300),
    required void Function(List<PlaceSuggestion> suggestions) onResult,
  }) {
    _autocompleteTimer?.cancel();
    if (query.trim().length < 2) {
      onResult([]);
      return;
    }

    _autocompleteTimer = Timer(debounce, () async {
      final results = await autocomplete(query, lat: lat, lng: lng);
      onResult(results);
    });
  }

  /// Direct autocomplete call (no debounce).
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    double? lat,
    double? lng,
  }) async {
    final cacheKey = '${query.toLowerCase().trim()}|${lat?.toStringAsFixed(3)}|${lng?.toStringAsFixed(3)}';
    if (_autocompleteCache.containsKey(cacheKey)) {
      return _autocompleteCache[cacheKey]!;
    }

    try {
      final params = <String, dynamic>{
        'input': query,
        'key': _apiKey,
        'language': 'en',
      };

      // Bias results toward the user's current location
      if (lat != null && lng != null) {
        params['location'] = '$lat,$lng';
        params['radius'] = '50000'; // 50km radius
      }

      final resp = await _dio.get(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        queryParameters: params,
      );

      if (resp.statusCode == 200) {
        final data = resp.data as Map<String, dynamic>;
        final predictions = data['predictions'] as List? ?? [];
        final suggestions = predictions.map((p) {
          final map = p as Map<String, dynamic>;
          return PlaceSuggestion(
            placeId: map['place_id'] as String? ?? '',
            mainText: (map['structured_formatting'] as Map?)?['main_text'] as String? ?? map['description'] as String? ?? '',
            secondaryText: (map['structured_formatting'] as Map?)?['secondary_text'] as String? ?? '',
            fullText: map['description'] as String? ?? '',
            types: (map['types'] as List?)?.cast<String>() ?? [],
          );
        }).toList();

        _autocompleteCache[cacheKey] = suggestions;

        // Keep cache size manageable
        if (_autocompleteCache.length > 100) {
          final keys = _autocompleteCache.keys.toList();
          for (var i = 0; i < 30; i++) {
            _autocompleteCache.remove(keys[i]);
          }
        }

        return suggestions;
      }
    } catch (e) {
      debugPrint('[GeocodingService] Autocomplete error: $e');
    }

    return [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Place Details (placeId → lat/lng) ──
  // ═══════════════════════════════════════════════════════════════════════════

  /// Fetch lat/lng and formatted address for a Google Place ID.
  Future<PlaceDetail?> getPlaceDetails(String placeId) async {
    try {
      final resp = await _dio.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        queryParameters: {
          'place_id': placeId,
          'key': _apiKey,
          'fields': 'geometry,formatted_address,name',
        },
      );

      if (resp.statusCode == 200) {
        final data = resp.data as Map<String, dynamic>;
        final result = data['result'] as Map<String, dynamic>?;
        if (result != null) {
          final geo = result['geometry'] as Map<String, dynamic>?;
          final loc = geo?['location'] as Map<String, dynamic>?;
          if (loc != null) {
            return PlaceDetail(
              lat: (loc['lat'] as num).toDouble(),
              lng: (loc['lng'] as num).toDouble(),
              name: result['name'] as String? ?? '',
              formattedAddress: result['formatted_address'] as String? ?? '',
            );
          }
        }
      }
    } catch (e) {
      debugPrint('[GeocodingService] Place details error: $e');
    }

    return null;
  }

  /// Cancel any pending debounced calls.
  void dispose() {
    _reverseTimer?.cancel();
    _autocompleteTimer?.cancel();
  }

  // ─── Directions / Routing ──────────────────────────────────────────────────

  /// Fetches a route from Google Directions API, returning the encoded polyline,
  /// distance (meters), and duration (seconds).
  Future<Map<String, dynamic>?> getRoute({
    required double originLat,
    required double originLng,
    required double destLat,
    required double destLng,
  }) async {
    try {
      final params = <String, dynamic>{
        'origin': '$originLat,$originLng',
        'destination': '$destLat,$destLng',
        'key': _apiKey,
        'mode': 'driving',
      };

      final resp = await _dio.get(
        'https://maps.googleapis.com/maps/api/directions/json',
        queryParameters: params,
      );

      if (resp.statusCode == 200) {
        final data = resp.data as Map<String, dynamic>;
        if ((data['routes'] as List?)?.isNotEmpty == true) {
          final route = data['routes'][0];
          final leg = route['legs'][0];
          return {
            'polyline': route['overview_polyline']['points'] as String,
            'distance_meters': leg['distance']['value'] as int,
            'duration_seconds': leg['duration']['value'] as int,
            'distance_text': leg['distance']['text'] as String,
            'duration_text': leg['duration']['text'] as String,
          };
        }
      }
    } catch (e) {
      debugPrint('[GeocodingService] getRoute error: $e');
    }
    return null;
  }
}

// ── Data models ────────────────────────────────────────────────────────────

class PlaceSuggestion {
  final String placeId;
  final String mainText;
  final String secondaryText;
  final String fullText;
  final List<String> types;

  const PlaceSuggestion({
    required this.placeId,
    required this.mainText,
    required this.secondaryText,
    required this.fullText,
    this.types = const [],
  });

  /// Map icon based on place type
  String get typeIcon {
    if (types.contains('airport')) return '✈️';
    if (types.contains('hospital') || types.contains('doctor')) return '🏥';
    if (types.contains('restaurant') || types.contains('food')) return '🍽️';
    if (types.contains('shopping_mall') || types.contains('store')) return '🛒';
    if (types.contains('lodging') || types.contains('hotel')) return '🏨';
    if (types.contains('transit_station') || types.contains('train_station')) return '🚉';
    if (types.contains('school') || types.contains('university')) return '🎓';
    if (types.contains('park')) return '🌳';
    return '📍';
  }
}

class PlaceDetail {
  final double lat;
  final double lng;
  final String name;
  final String formattedAddress;

  const PlaceDetail({
    required this.lat,
    required this.lng,
    required this.name,
    required this.formattedAddress,
  });
}
