import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../blocs/taxi_home_bloc.dart';
import '../blocs/booking_bloc.dart';
import '../../domain/entities/entities.dart';
import '../widgets/location_search_bar.dart';
import '../widgets/bottom_nav_sheet.dart';
import '../widgets/car_marker_helper.dart';

class TaxiHomeScreen extends StatefulWidget {
  const TaxiHomeScreen({super.key});

  @override
  State<TaxiHomeScreen> createState() => _TaxiHomeScreenState();
}

class _TaxiHomeScreenState extends State<TaxiHomeScreen> {
  GoogleMapController? _mapController;
  BitmapDescriptor? _carIcon;
  BitmapDescriptor? _pickupIcon;
  BitmapDescriptor? _destinationIcon;
  bool _mapReady = false;
  bool _mapError = false;
  Timer? _mapTimeoutTimer;

  // Cached marker/polyline sets — only recreated when data changes.
  Set<Marker> _cachedMarkers = {};
  Set<Polyline> _cachedPolylines = {};
  int _lastMarkerHash = 0;
  int _lastPolylineHash = 0;

  /// Timeout duration for map initialization.
  static const _mapLoadTimeout = Duration(seconds: 10);

  @override
  void initState() {
    super.initState();
    _loadIcons();
    _startMapTimeout();
  }

  void _startMapTimeout() {
    _mapTimeoutTimer = Timer(_mapLoadTimeout, () {
      if (!_mapReady && mounted) {
        setState(() => _mapError = true);
        debugPrint('[TaxiHome] ⚠️ Map failed to initialize within '
            '${_mapLoadTimeout.inSeconds}s — check API key or network');
      }
    });
  }

  void _retryMapLoad() {
    setState(() {
      _mapError = false;
      _mapReady = false;
    });
    _mapTimeoutTimer?.cancel();
    _startMapTimeout();
  }

  Future<void> _loadIcons() async {
    // Load all icons in parallel for faster startup
    final results = await Future.wait([
      CarMarkerHelper.getCarIcon(color: const Color(0xFF1A1A2E)),
      CarMarkerHelper.getPickupIcon(),
      CarMarkerHelper.getDestinationIcon(),
    ]);
    if (mounted) {
      setState(() {
        _carIcon = results[0];
        _pickupIcon = results[1];
        _destinationIcon = results[2];
      });
    }
  }

  @override
  void dispose() {
    _mapTimeoutTimer?.cancel();
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // BlocListener: React to GPS location changes — animate camera and
    // auto-set pickup so that polylines can render.
    return BlocListener<TaxiHomeBloc, TaxiHomeState>(
      listenWhen: (prev, curr) =>
          prev.currentLocation != curr.currentLocation &&
          curr.currentLocation != null,
      listener: (context, homeState) {
        final loc = homeState.currentLocation!;

        // Animate camera to new location
        _mapController?.animateCamera(CameraUpdate.newLatLngZoom(
          LatLng(loc.lat, loc.lng),
          16,
        ));

        // Auto-set pickup in BookingBloc if not already set
        final bookingBloc = context.read<BookingBloc>();
        if (bookingBloc.state.pickup == null) {
          bookingBloc.add(SetPickupLocation(loc));
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Stack(
          children: [
            // ── Map layer: rebuilds on location, drivers, route ──
            BlocBuilder<TaxiHomeBloc, TaxiHomeState>(
              buildWhen: (prev, curr) =>
                  prev.nearbyDrivers != curr.nearbyDrivers ||
                  prev.currentLocation != curr.currentLocation ||
                  prev.activeRide != curr.activeRide ||
                  prev.locationStatus != curr.locationStatus,
              builder: (context, homeState) {
                return BlocBuilder<BookingBloc, BookingState>(
                  buildWhen: (prev, curr) =>
                      prev.pickup != curr.pickup ||
                      prev.destination != curr.destination ||
                      prev.routeEstimate != curr.routeEstimate ||
                      prev.isCalculatingRoute != curr.isCalculatingRoute,
                  builder: (context, bookingState) {
                    return _buildMap(homeState, bookingState);
                  },
                );
              },
            ),
            _buildTopBar(context),
            // ── Active ride banner ──
            BlocBuilder<TaxiHomeBloc, TaxiHomeState>(
              buildWhen: (prev, curr) => prev.activeRide != curr.activeRide,
              builder: (context, homeState) {
                if (homeState.activeRide != null) {
                  return _buildActiveRideBanner(context, homeState);
                }
                return const SizedBox.shrink();
              },
            ),
            // ── Bottom sheet: only rebuilds on search/place changes ──
            Align(
              alignment: Alignment.bottomCenter,
              child: BlocBuilder<TaxiHomeBloc, TaxiHomeState>(
                buildWhen: (prev, curr) =>
                    prev.recentSearches != curr.recentSearches ||
                    prev.savedPlaces != curr.savedPlaces ||
                    prev.activeRide != curr.activeRide,
                builder: _buildBottomSheet,
              ),
            ),
            // ── Locate me button ──
            BlocBuilder<TaxiHomeBloc, TaxiHomeState>(
              buildWhen: (prev, curr) =>
                  prev.isLoadingLocation != curr.isLoadingLocation ||
                  prev.currentLocation != curr.currentLocation,
              builder: (context, homeState) {
                return Positioned(
                  right: 16,
                  bottom: MediaQuery.of(context).size.height * 0.4,
                  child: _buildLocateMeButton(context, homeState),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMap(TaxiHomeState state, BookingState bookingState) {
    final center = state.currentLocation != null
        ? LatLng(state.currentLocation!.lat, state.currentLocation!.lng)
        : const LatLng(-1.2921, 36.8219);

    // ── Build markers with hash-based caching ──
    final markerHash = Object.hash(
      state.currentLocation,
      state.nearbyDrivers.length,
      bookingState.pickup,
      bookingState.destination,
      _carIcon,
      _pickupIcon,
      _destinationIcon,
    );
    if (markerHash != _lastMarkerHash) {
      _lastMarkerHash = markerHash;
      _cachedMarkers = _buildMarkers(state, bookingState);
    }

    // ── Build polylines with hash-based caching ──
    final polylineHash = Object.hash(
      bookingState.routeEstimate?.polylinePoints.length,
      bookingState.pickup,
      bookingState.destination,
    );
    if (polylineHash != _lastPolylineHash) {
      _lastPolylineHash = polylineHash;
      _cachedPolylines = _buildPolylines(bookingState);
    }

    return RepaintBoundary(
      child: Stack(
        children: [
          // Only render GoogleMap if not in error state — avoids wasting
          // resources on a native platform view that will never initialize.
          if (!_mapError)
            GoogleMap(
              initialCameraPosition: CameraPosition(target: center, zoom: 16),
              markers: _cachedMarkers,
              polylines: _cachedPolylines,
              myLocationEnabled: state.locationStatus == LocationStatus.granted,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              mapToolbarEnabled: false,
              compassEnabled: false,
              style: _uberMapStyle,
              onMapCreated: (controller) {
                _mapController = controller;
                _mapTimeoutTimer?.cancel();
                if (!_mapReady) {
                  setState(() {
                    _mapReady = true;
                    _mapError = false;
                  });
                }
              },
            ),
          // Loading overlay — shown while map initializes (before timeout)
          if (!_mapReady && !_mapError)
            Positioned.fill(
              child: Container(
                color: Colors.white,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(
                        width: 32,
                        height: 32,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.black54,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Loading map…',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          // Error overlay — shown when map fails to initialize within timeout
          if (_mapError)
            Positioned.fill(
              child: Container(
                color: Colors.white,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.map_outlined,
                        size: 56,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Map failed to load',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Colors.grey[700],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 40),
                        child: Text(
                          'Please check your internet connection '
                          'or verify the Google Maps API key is valid.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[500],
                            height: 1.4,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton.icon(
                        onPressed: _retryMapLoad,
                        icon: const Icon(Icons.refresh_rounded, size: 18),
                        label: const Text('Retry'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.black,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 28, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          // Error overlay if GPS is denied or disabled
          if (!_mapError &&
              (state.locationStatus == LocationStatus.denied ||
                  state.locationStatus == LocationStatus.disabled))
            Positioned.fill(
              child: Container(
                color: Colors.white.withValues(alpha: 0.85),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        state.locationStatus == LocationStatus.denied
                            ? Icons.location_off_rounded
                            : Icons.location_disabled_rounded,
                        size: 48,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        state.locationStatus == LocationStatus.denied
                            ? 'Location permission denied'
                            : 'Location services are disabled',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      ElevatedButton.icon(
                        onPressed: () {
                          context.read<TaxiHomeBloc>().add(RefreshLocation());
                        },
                        icon: const Icon(Icons.refresh, size: 18),
                        label: const Text('Retry'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.black,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Build marker set from current state — extracted for caching.
  Set<Marker> _buildMarkers(TaxiHomeState state, BookingState bookingState) {
    final markers = <Marker>{};

    // Current location marker (blue dot)
    if (state.currentLocation != null) {
      markers.add(Marker(
        markerId: const MarkerId('current_location'),
        position:
            LatLng(state.currentLocation!.lat, state.currentLocation!.lng),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        zIndexInt: 10,
      ));
    }

    // Nearby driver markers — car icons with rotation
    for (final driver in state.nearbyDrivers) {
      markers.add(Marker(
        markerId: MarkerId('driver_${driver.driverId}'),
        position: LatLng(driver.lat, driver.lng),
        icon: _carIcon ??
            BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueYellow),
        rotation: driver.heading,
        anchor: const Offset(0.5, 0.5),
        flat: true,
        zIndexInt: 5,
      ));
    }

    // Pickup marker
    if (bookingState.pickup != null) {
      markers.add(Marker(
        markerId: const MarkerId('pickup'),
        position: LatLng(bookingState.pickup!.lat, bookingState.pickup!.lng),
        icon: _pickupIcon ??
            BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        zIndexInt: 8,
        infoWindow:
            InfoWindow(title: 'Pickup', snippet: bookingState.pickup!.address),
      ));
    }

    // Destination marker
    if (bookingState.destination != null) {
      markers.add(Marker(
        markerId: const MarkerId('destination'),
        position: LatLng(
            bookingState.destination!.lat, bookingState.destination!.lng),
        icon: _destinationIcon ??
            BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        zIndexInt: 8,
        infoWindow: InfoWindow(
            title: 'Drop-off', snippet: bookingState.destination!.address),
      ));
    }

    return markers;
  }

  /// Build polyline set from booking state — extracted for caching.
  Set<Polyline> _buildPolylines(BookingState bookingState) {
    final polylines = <Polyline>{};

    if (bookingState.routeEstimate != null &&
        bookingState.routeEstimate!.polylinePoints.isNotEmpty) {
      polylines.add(Polyline(
        polylineId: const PolylineId('route_preview'),
        points: bookingState.routeEstimate!.polylinePoints
            .map((p) => LatLng(p.lat, p.lng))
            .toList(),
        color: Colors.black,
        width: 4,
        patterns: const [],
      ));
    } else if (bookingState.pickup != null &&
        bookingState.destination != null) {
      polylines.add(Polyline(
        polylineId: const PolylineId('route_placeholder'),
        points: [
          LatLng(bookingState.pickup!.lat, bookingState.pickup!.lng),
          LatLng(bookingState.destination!.lat, bookingState.destination!.lng),
        ],
        color: Colors.grey.shade600,
        width: 3,
        patterns: [PatternItem.dash(20), PatternItem.gap(10)],
      ));
    }

    return polylines;
  }

  Widget _buildTopBar(BuildContext context) {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 8,
      left: 16,
      right: 16,
      child: Row(
        children: [
          _CircleButton(
            icon: Icons.menu_rounded,
            onTap: () => Navigator.of(context).pushNamed('/profile'),
          ),
          const Spacer(),
          _CircleButton(
            icon: Icons.person_rounded,
            onTap: () => Navigator.of(context).pushNamed('/profile'),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveRideBanner(BuildContext context, TaxiHomeState state) {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 64,
      left: 16,
      right: 16,
      child: GestureDetector(
        onTap: () {
          Navigator.of(context).pushNamed(
            '/taxi/tracking',
            arguments: state.activeRide,
          );
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(12),
            boxShadow: const [
              BoxShadow(
                color: Colors.black26,
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              const Icon(Icons.local_taxi_rounded,
                  color: Colors.white, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      state.activeRide!.status.displayLabel,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      state.activeRide!.destination.address ??
                          'Your destination',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.8),
                        fontSize: 13,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomSheet(BuildContext context, TaxiHomeState state) {
    return BottomNavSheet(
      child: Column(
        children: [
          LocationSearchBar(
            hintText: 'Where to?',
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.of(context).pushNamed('/taxi/search');
            },
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavActionItem(
                icon: Icons.home_rounded,
                label: 'Home',
                onTap: () => _selectSavedPlace(context, 'home', state),
              ),
              _NavActionItem(
                icon: Icons.work_rounded,
                label: 'Work',
                onTap: () => _selectSavedPlace(context, 'work', state),
              ),
              _NavActionItem(
                icon: Icons.schedule_rounded,
                label: 'Reserve',
                onTap: () {
                  Navigator.of(context).pushNamed('/taxi/schedule');
                },
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (state.recentSearches.isNotEmpty) ...[
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Recent',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
              ),
            ),
            const SizedBox(height: 12),
            ...state.recentSearches.take(3).map((search) {
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.location_on, color: Colors.black87),
                ),
                title: Text(
                  search.address ?? 'Unknown Location',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                onTap: () => _selectRecentDestination(context, search),
              );
            }),
          ]
        ],
      ),
    );
  }

  Widget _buildLocateMeButton(BuildContext context, TaxiHomeState state) {
    return FloatingActionButton.small(
      heroTag: 'locate_me',
      onPressed: () {
        HapticFeedback.mediumImpact();
        // Dispatch GPS refresh — BlocListener above will animate
        // camera when the new position arrives.
        context.read<TaxiHomeBloc>().add(RefreshLocation());
        // If we already have a location, animate immediately for responsiveness
        if (state.currentLocation != null && _mapController != null) {
          _mapController!.animateCamera(CameraUpdate.newLatLngZoom(
            LatLng(state.currentLocation!.lat, state.currentLocation!.lng),
            16,
          ));
        }
      },
      backgroundColor: Colors.white,
      child: state.isLoadingLocation
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.black,
              ),
            )
          : const Icon(Icons.my_location_rounded, color: Colors.black),
    );
  }

  void _selectSavedPlace(
      BuildContext context, String type, TaxiHomeState state) {
    final place = state.savedPlaces
        .where((p) => p.label.toLowerCase() == type)
        .firstOrNull;
    if (place != null) {
      context.read<BookingBloc>().add(SetDestination(place.location));
      Navigator.of(context).pushNamed('/taxi/trip-plan');
    } else {
      Navigator.of(context).pushNamed('/taxi/search', arguments: type);
    }
  }

  void _selectRecentDestination(BuildContext context, GeoLocation destination) {
    context.read<BookingBloc>().add(SetDestination(destination));
    Navigator.of(context).pushNamed('/taxi/trip-plan');
  }

  static const _uberMapStyle = '''[
    {"featureType":"all","elementType":"geometry.fill","stylers":[{"weight":"2.00"}]},
    {"featureType":"all","elementType":"geometry.stroke","stylers":[{"color":"#9c9c9c"}]},
    {"featureType":"all","elementType":"labels.text","stylers":[{"visibility":"on"}]},
    {"featureType":"landscape","elementType":"all","stylers":[{"color":"#f2f2f2"}]},
    {"featureType":"landscape","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},
    {"featureType":"landscape.man_made","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},
    {"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},
    {"featureType":"road","elementType":"all","stylers":[{"saturation":-100},{"lightness":45}]},
    {"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#eeeeee"}]},
    {"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#7b7b7b"}]},
    {"featureType":"road","elementType":"labels.text.stroke","stylers":[{"color":"#ffffff"}]},
    {"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"simplified"}]},
    {"featureType":"road.arterial","elementType":"labels.icon","stylers":[{"visibility":"off"}]},
    {"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"}]},
    {"featureType":"water","elementType":"all","stylers":[{"color":"#46bcec"},{"visibility":"on"}]},
    {"featureType":"water","elementType":"geometry.fill","stylers":[{"color":"#c8d7d4"}]},
    {"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#070707"}]},
    {"featureType":"water","elementType":"labels.text.stroke","stylers":[{"color":"#ffffff"}]}
  ]''';
}

class _CircleButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _CircleButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Icon(icon, size: 24, color: Colors.black87),
      ),
    );
  }
}

class _NavActionItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _NavActionItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.black87, size: 28),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}
