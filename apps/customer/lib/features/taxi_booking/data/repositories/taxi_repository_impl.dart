// cSpell:words Nominatim
/// KARTSEEK Taxi Booking — Concrete Repository Implementation
///
/// Implements domain repository interfaces using the three datasources.
/// This is the integration layer between raw data and business logic.
library;

import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../domain/entities/entities.dart';
import '../../domain/entities/ride_status.dart';
import '../../domain/repositories/repositories.dart';
import '../datasources/taxi_remote_datasource.dart';
import '../datasources/taxi_local_datasource.dart';
import '../datasources/taxi_realtime_datasource.dart';
import 'package:shared_mobile/core/services/region_service.dart';

// ─── Booking Repository ─────────────────────────────────────────────────────

class TaxiBookingRepositoryImpl implements TaxiBookingRepository {
  final TaxiRemoteDatasource _remote;
  final TaxiLocalDatasource _local;

  TaxiBookingRepositoryImpl({
    TaxiRemoteDatasource? remote,
    TaxiLocalDatasource? local,
  })  : _remote = remote ?? TaxiRemoteDatasource(),
        _local = local ?? TaxiLocalDatasource();

  @override
  Future<FareEstimate> estimateFare({
    required GeoLocation pickup,
    required GeoLocation destination,
    required String vehicleType,
    String? zoneId,
  }) async {
    final data = await _remote.estimateFare(
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropLat: destination.lat,
      dropLng: destination.lng,
      vehicleType: vehicleType,
      zoneId: zoneId,
    );

    return FareEstimate(
      baseFare: (data['baseFare'] as num?)?.toDouble() ?? 50,
      distanceFare: ((data['distanceKm'] as num?)?.toDouble() ?? 0) *
          ((data['distanceRate'] as num?)?.toDouble() ?? 35),
      timeFare: ((data['durationMinutes'] as num?)?.toDouble() ?? 0) *
          ((data['timeRate'] as num?)?.toDouble() ?? 5),
      surgeMultiplier: (data['surgeMultiplier'] as num?)?.toDouble() ?? 1.0,
      surgeAdjustment: 0,
      totalEstimate: (data['estimatedFare'] as num?)?.toDouble() ?? 0,
      currency: data['currency'] as String? ?? RegionService.instance.currentCountry.currencySymbol,
    );
  }

  @override
  Future<List<VehicleCategory>> getVehicleCategories({
    required GeoLocation pickup,
    required GeoLocation destination,
    required String countryCode,
  }) async {
    final data = await _remote.getVehicleCategories(
      countryCode: countryCode,
      lat: pickup.lat,
      lng: pickup.lng,
    );

    final categories = data['categories'] as List? ?? [];
    return categories.map((item) {
      final map = item is Map<String, dynamic> ? item : <String, dynamic>{};
      return VehicleCategory(
        id: map['id'] as String? ?? 'economy',
        name: map['name'] as String? ?? 'Economy',
        description: map['description'] as String? ?? '',
        maxPassengers: (map['maxPassengers'] as num?)?.toInt() ?? 4,
        maxLuggage: (map['maxLuggage'] as num?)?.toInt() ?? 2,
        iconUrl: map['iconUrl'] as String? ?? '',
        isAccessible: map['isAccessible'] as bool? ?? false,
      );
    }).toList();
  }

  @override
  Future<ActiveTrip> requestRide({
    required GeoLocation pickup,
    required GeoLocation destination,
    required String vehicleType,
    required String paymentMethodId,
    required double fareEstimate,
    List<TripStop>? stops,
    String? preferredDriverId,
    DateTime? scheduledAt,
    String? promotionCode,
    String? pickupNote,
  }) async {
    final data = await _remote.requestRide(
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropLat: destination.lat,
      dropLng: destination.lng,
      pickupAddress: pickup.address ?? 'Pickup Location',
      dropAddress: destination.address ?? 'Destination',
      vehicleType: vehicleType,
      paymentMethod: paymentMethodId,
      fareEstimate: fareEstimate,
      preferredDriverId: preferredDriverId,
    );

    final ride = data['ride'] as Map<String, dynamic>? ?? data;
    final rideId = ride['id'] as String? ?? 'RIDE-${DateTime.now().millisecondsSinceEpoch}';

    // Persist active ride for restoration
    await _local.saveActiveRideId(rideId);

    return ActiveTrip(
      rideId: rideId,
      status: RideStatus.fromString(ride['status'] as String? ?? 'SEARCHING_DRIVER'),
      pickup: pickup,
      destination: destination,
      stops: stops ?? [],
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<double> cancelRide({
    required String rideId,
    String? reason,
  }) async {
    final data = await _remote.cancelRide(rideId, reason: reason);
    await _local.clearActiveRideId();
    return (data['cancellationFee'] as num?)?.toDouble() ?? 0;
  }

  @override
  Future<ActiveTrip> getRideDetails(String rideId) async {
    final data = await _remote.getRideDetails(rideId);
    final ride = data['ride'] as Map<String, dynamic>? ?? data;

    return ActiveTrip(
      rideId: ride['id'] as String? ?? rideId,
      status: RideStatus.fromString(ride['status'] as String? ?? 'draft'),
      pickup: GeoLocation(
        lat: (ride['pickupLat'] as num?)?.toDouble() ?? 0,
        lng: (ride['pickupLng'] as num?)?.toDouble() ?? 0,
        address: ride['pickupAddress'] as String?,
      ),
      destination: GeoLocation(
        lat: (ride['dropLat'] as num?)?.toDouble() ?? 0,
        lng: (ride['dropLng'] as num?)?.toDouble() ?? 0,
        address: ride['dropAddress'] as String?,
      ),
      driver: ride['driverId'] != null
          ? Driver(
              id: ride['driverId'] as String,
              name: ride['driverName'] as String? ?? 'Driver',
              phone: ride['driverPhone'] as String? ?? '',
            )
          : null,
      vehicle: ride['vehicleId'] != null
          ? Vehicle(
              id: ride['vehicleId'] as String,
              model: ride['vehicleModel'] as String? ?? '',
              color: '',
              plateNumber: ride['vehiclePlate'] as String? ?? '',
              type: ride['vehicleType'] as String? ?? 'economy',
            )
          : null,
      createdAt: DateTime.tryParse(ride['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  @override
  Future<List<ActiveTrip>> getRideHistory({int page = 0, int limit = 20}) async {
    final data = await _remote.getRideHistory();
    final rides = data['rides'] as List? ?? [];
    return rides.map((item) {
      final ride = item is Map<String, dynamic> ? item : <String, dynamic>{};
      return ActiveTrip(
        rideId: ride['id'] as String? ?? '',
        status: RideStatus.fromString(ride['status'] as String? ?? 'tripCompleted'),
        pickup: GeoLocation(
          lat: (ride['pickupLat'] as num?)?.toDouble() ?? 0,
          lng: (ride['pickupLng'] as num?)?.toDouble() ?? 0,
          address: ride['pickupAddress'] as String?,
        ),
        destination: GeoLocation(
          lat: (ride['dropLat'] as num?)?.toDouble() ?? 0,
          lng: (ride['dropLng'] as num?)?.toDouble() ?? 0,
          address: ride['dropAddress'] as String?,
        ),
        createdAt: DateTime.tryParse(ride['createdAt'] as String? ?? '') ?? DateTime.now(),
      );
    }).toList();
  }

  @override
  Future<void> rateRide({
    required String rideId,
    required int stars,
    String? comment,
    double? tipAmount,
  }) async {
    await _remote.submitRating(rideId: rideId, rating: stars, comment: comment);
    await _local.clearActiveRideId();
  }

  @override
  Future<TripReceipt> getReceipt(String rideId) async {
    final ride = await getRideDetails(rideId);
    return TripReceipt(
      rideId: rideId,
      receiptNumber: 'REC-$rideId',
      tripDate: ride.createdAt,
      pickup: ride.pickup,
      destination: ride.destination,
      distanceKm: ride.routeEstimate?.distanceKm ?? 0,
      durationMinutes: ride.routeEstimate?.durationMinutes ?? 0,
      fareBreakdown: ride.finalFare ?? ride.fareEstimate ?? FareEstimate(
        baseFare: 0, distanceFare: 0, timeFare: 0,
        totalEstimate: 0, currency: RegionService.instance.currentCountry.currencySymbol,
      ),
      paymentMethod: ride.paymentMethod ?? const PaymentMethod(
        id: 'cash', type: PaymentType.cash, displayName: 'Cash',
      ),
      driverName: ride.driver?.name ?? 'Driver',
      vehiclePlate: ride.vehicle?.plateNumber ?? '',
    );
  }

  @override
  Future<void> reportDispute({
    required String rideId,
    required String reason,
    String? details,
  }) async {
    await _remote.reportDispute(rideId: rideId, reason: reason, details: details);
  }

  @override
  Future<void> reportLostItem({
    required String rideId,
    required String description,
    String? contactNumber,
  }) async {
    await _remote.reportDispute(
      rideId: rideId,
      reason: 'LOST_ITEM',
      details: '$description${contactNumber != null ? ' | Contact: $contactNumber' : ''}',
    );
  }

  @override
  Future<void> triggerSos({
    required String rideId,
    String? details,
  }) async {
    await _remote.triggerSos(rideId, details: details);
  }
}

// ─── Location Repository ────────────────────────────────────────────────────

class TaxiLocationRepositoryImpl implements TaxiLocationRepository {
  final TaxiRemoteDatasource _remote;
  final TaxiLocalDatasource _local;

  TaxiLocationRepositoryImpl({
    TaxiRemoteDatasource? remote,
    TaxiLocalDatasource? local,
  })  : _remote = remote ?? TaxiRemoteDatasource(),
        _local = local ?? TaxiLocalDatasource();

  @override
  Future<List<NearbyDriver>> getNearbyDrivers({
    required double lat,
    required double lng,
    double radiusKm = 5.0,
    String? vehicleType,
  }) async {
    final data = await _remote.getNearbyDrivers(
      lat: lat, lng: lng, radiusKm: radiusKm, vehicleType: vehicleType,
    );
    final drivers = data['drivers'] as List? ?? [];
    return drivers.map((d) {
      final map = d is Map<String, dynamic> ? d : <String, dynamic>{};
      return NearbyDriver(
        driverId: map['driverId'] as String? ?? '',
        name: map['name'] as String? ?? 'Driver',
        vehicleType: map['vehicleType'] as String? ?? 'economy',
        vehiclePlate: map['vehiclePlate'] as String?,
        vehicleModel: map['vehicleModel'] as String?,
        lat: (map['lat'] as num?)?.toDouble() ?? lat,
        lng: (map['lng'] as num?)?.toDouble() ?? lng,
        distanceKm: (map['distanceKm'] as num?)?.toDouble() ?? 0,
        etaMinutes: (map['eta'] as num?)?.toInt() ?? 5,
        rating: (map['rating'] as num?)?.toDouble() ?? 4.5,
        totalTrips: (map['totalTrips'] as num?)?.toInt() ?? 0,
        photoUrl: map['profilePhotoUrl'] as String?,
      );
    }).toList();
  }

  @override
  Future<List<GeoLocation>> searchAddress(String query, {GeoLocation? biasLocation}) async {
    // Uses Nominatim (OpenStreetMap) for geocoding — free, no API key needed
    debugPrint('[TaxiLocation] Searching: $query');
    try {
      final params = <String, String>{
        'q': query,
        'format': 'json',
        'addressdetails': '1',
        'limit': '8',
        if (biasLocation != null) 'viewbox': '${biasLocation.lng - 0.5},${biasLocation.lat + 0.5},${biasLocation.lng + 0.5},${biasLocation.lat - 0.5}',
        if (biasLocation != null) 'bounded': '0',
      };
      final uri = Uri.https('nominatim.openstreetmap.org', '/search', params);
      final response = await http.get(uri, headers: {
        'User-Agent': 'KartSeekApp/1.0',
        'Accept': 'application/json',
      }).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final results = jsonDecode(response.body) as List;
        return results.map((r) {
          final map = r as Map<String, dynamic>;
          return GeoLocation(
            lat: double.tryParse(map['lat'] as String? ?? '') ?? 0,
            lng: double.tryParse(map['lon'] as String? ?? '') ?? 0,
            address: map['display_name'] as String? ?? '',
            placeId: map['place_id']?.toString(),
          );
        }).where((g) => g.lat != 0 && g.lng != 0).toList();
      }
    } catch (e) {
      debugPrint('[TaxiLocation] Search error: $e');
    }
    return [];
  }

  @override
  Future<GeoLocation> reverseGeocode(double lat, double lng) async {
    try {
      final params = <String, String>{
        'lat': lat.toString(),
        'lon': lng.toString(),
        'format': 'json',
        'addressdetails': '1',
        'zoom': '18',
      };
      final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', params);
      final response = await http.get(uri, headers: {
        'User-Agent': 'KartSeekApp/1.0',
        'Accept': 'application/json',
      }).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final address = data['display_name'] as String? ?? '$lat, $lng';
        return GeoLocation(lat: lat, lng: lng, address: address);
      }
    } catch (e) {
      debugPrint('[TaxiLocation] Reverse geocode error: $e');
    }
    return GeoLocation(lat: lat, lng: lng, address: '$lat, $lng');
  }

  @override
  Future<RouteEstimate> calculateRoute({
    required GeoLocation pickup,
    required GeoLocation destination,
    List<TripStop>? stops,
  }) async {
    try {
      // Build OSRM waypoints: pickup → stops → destination
      final waypoints = <String>[
        '${pickup.lng},${pickup.lat}',
        if (stops != null)
          ...stops.map((s) => '${s.location.lng},${s.location.lat}'),
        '${destination.lng},${destination.lat}',
      ];
      final coords = waypoints.join(';');
      final uri = Uri.parse(
        'https://router.project-osrm.org/route/v1/driving/$coords'
        '?overview=full&geometries=polyline&steps=false',
      );
      final response = await http.get(uri).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final routes = data['routes'] as List?;
        if (routes != null && routes.isNotEmpty) {
          final route = routes[0] as Map<String, dynamic>;
          final distMeters = (route['distance'] as num?)?.toDouble() ?? 0;
          final durSeconds = (route['duration'] as num?)?.toDouble() ?? 0;
          final encodedPolyline = route['geometry'] as String? ?? '';

          // Decode Google-encoded polyline to List<GeoLocation>
          final polylinePoints = _decodePolyline(encodedPolyline);

          return RouteEstimate(
            distanceKm: double.parse((distMeters / 1000).toStringAsFixed(1)),
            durationMinutes: (durSeconds / 60).ceil(),
            polylinePoints: polylinePoints,
            stops: stops ?? [],
          );
        }
      }
    } catch (e) {
      debugPrint('[TaxiLocation] OSRM route error: $e, falling back to haversine');
    }

    // Fallback: Calculate Haversine distance if OSRM fails
    // Generate a straight-line polyline so the map still shows a visual route
    final distKm = _haversineDistance(
      pickup.lat, pickup.lng, destination.lat, destination.lng,
    );
    final durationMin = (distKm * 2 + 5).round();

    return RouteEstimate(
      distanceKm: double.parse(distKm.toStringAsFixed(1)),
      durationMinutes: durationMin,
      polylinePoints: [pickup, destination],
      stops: stops ?? [],
    );
  }

  @override
  Future<bool> isInServiceArea(double lat, double lng) async {
    // For now, all locations are in service area
    // Will be checked against backend service zones
    return true;
  }

  @override
  Future<List<SavedPlace>> getSavedPlaces() => _local.getSavedPlaces();

  @override
  Future<void> savePlace(SavedPlace place) => _local.savePlace(place);

  @override
  Future<List<GeoLocation>> getRecentSearches() => _local.getRecentSearches();

  // ─── Haversine (fallback when OSRM is unavailable) ─────────────────

  double _haversineDistance(double lat1, double lng1, double lat2, double lng2) {
    const r = 6371.0; // Earth radius in km
    final dLat = (lat2 - lat1) * math.pi / 180;
    final dLng = (lng2 - lng1) * math.pi / 180;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) *
        math.sin(dLng / 2) * math.sin(dLng / 2);
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  }

  /// Decode a Google-encoded polyline string into GeoLocation points.
  List<GeoLocation> _decodePolyline(String encoded) {
    final points = <GeoLocation>[];
    int index = 0;
    int lat = 0, lng = 0;

    while (index < encoded.length) {
      int shift = 0, result = 0;
      int b;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1F) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1F) << shift;
        shift += 5;
      } while (b >= 0x20);
      lng += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);

      points.add(GeoLocation(lat: lat / 1e5, lng: lng / 1e5));
    }
    return points;
  }
}

// ─── Realtime Repository ────────────────────────────────────────────────────

class TaxiRealtimeRepositoryImpl implements TaxiRealtimeRepository {
  final TaxiRealtimeDatasource _realtime;

  TaxiRealtimeRepositoryImpl({TaxiRealtimeDatasource? realtime})
      : _realtime = realtime ?? TaxiRealtimeDatasource();

  @override
  Stream<Driver> get driverLocationStream => _realtime.driverLocationStream;

  @override
  Stream<RideStatus> get rideStatusStream =>
      _realtime.rideStatusStream.map((data) =>
          RideStatus.fromString(data['status'] as String? ?? 'draft'));

  @override
  Stream<List<NearbyDriver>> get nearbyDriversStream =>
      _realtime.nearbyDriversStream;

  @override
  Future<void> connect({required String userId}) =>
      _realtime.connect(userId: userId);

  @override
  void joinRideTracking(String rideId) =>
      _realtime.joinRideTracking(rideId);

  @override
  void leaveRideTracking(String rideId) =>
      _realtime.leaveRideTracking(rideId);

  @override
  void requestNearbyDrivers({
    required double lat,
    required double lng,
    double radiusKm = 5.0,
  }) =>
      _realtime.requestNearbyDrivers(lat: lat, lng: lng, radiusKm: radiusKm);

  @override
  void disconnect() => _realtime.disconnect();
}
