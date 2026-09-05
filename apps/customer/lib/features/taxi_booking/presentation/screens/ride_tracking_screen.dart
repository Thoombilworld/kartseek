import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_polyline_points/flutter_polyline_points.dart';
import 'package:kartseek_shared_mobile/core/services/geocoding_service.dart';
import '../blocs/booking_bloc.dart';
import '../../domain/entities/ride_status.dart';
import '../widgets/bottom_nav_sheet.dart';
import '../widgets/car_marker_helper.dart';

class RideTrackingScreen extends StatefulWidget {
  const RideTrackingScreen({super.key});

  @override
  State<RideTrackingScreen> createState() => _RideTrackingScreenState();
}

class _RideTrackingScreenState extends State<RideTrackingScreen>
    with SingleTickerProviderStateMixin {
  GoogleMapController? _mapController;
  late AnimationController _markerAnimController;

  // Custom icons
  BitmapDescriptor? _carIcon;
  BitmapDescriptor? _pickupIcon;
  BitmapDescriptor? _destIcon;

  // For smooth driver marker animation
  LatLng? _previousDriverPos;
  LatLng? _currentDriverPos;

  // Dynamic route rendering
  Set<Polyline> _dynamicPolylines = {};
  bool _isFetchingRoute = false;
  String? _dynamicEtaText;

  @override
  void initState() {
    super.initState();
    _markerAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _loadIcons();
  }

  @override
  void dispose() {
    _markerAnimController.dispose();
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _loadIcons() async {
    final car = await CarMarkerHelper.getCarIcon(color: Colors.blue.shade800);
    final pickup = await CarMarkerHelper.getPickupIcon();
    final dest = await CarMarkerHelper.getDestinationIcon();
    if (mounted) {
      setState(() {
        _carIcon = car;
        _pickupIcon = pickup;
        _destIcon = dest;
      });
    }
  }

  Future<void> _fetchDynamicRoute(double originLat, double originLng, double destLat, double destLng) async {
    if (_isFetchingRoute) return;
    _isFetchingRoute = true;
    
    final route = await GeocodingService.instance.getRoute(
      originLat: originLat,
      originLng: originLng,
      destLat: destLat,
      destLng: destLng,
    );

    if (route != null && mounted) {
      final polylineStr = route['polyline'] as String;
      final points = PolylinePoints.decodePolyline(polylineStr);
      final durationMins = ((route['duration_seconds'] as int) / 60).ceil();
      
      setState(() {
        _dynamicEtaText = durationMins <= 1 ? '< 1 min' : '$durationMins min';
        _dynamicPolylines = {
          Polyline(
            polylineId: const PolylineId('dynamic_route'),
            points: points.map((p) => LatLng(p.latitude, p.longitude)).toList(),
            color: const Color(0xFF2563EB),
            width: 5,
            patterns: [PatternItem.dot, PatternItem.gap(10)],
          )
        };
      });
      
      // Auto-fit bounds when route loads
      if (_mapController != null) {
        final bounds = LatLngBounds(
          southwest: LatLng(
            _min(originLat, destLat) - 0.01,
            _min(originLng, destLng) - 0.01,
          ),
          northeast: LatLng(
            _max(originLat, destLat) + 0.01,
            _max(originLng, destLng) + 0.01,
          ),
        );
        _mapController!.animateCamera(CameraUpdate.newLatLngBounds(bounds, 80));
      }
    }
    _isFetchingRoute = false;
  }

  /// Animate camera to show both markers and polyline
  void _fitBounds(BookingState state) {
    if (_mapController == null || state.activeTrip == null) return;

    final trip = state.activeTrip!;
    final bounds = LatLngBounds(
      southwest: LatLng(
        _min(trip.pickup.lat, trip.destination.lat) - 0.01,
        _min(trip.pickup.lng, trip.destination.lng) - 0.01,
      ),
      northeast: LatLng(
        _max(trip.pickup.lat, trip.destination.lat) + 0.01,
        _max(trip.pickup.lng, trip.destination.lng) + 0.01,
      ),
    );
    _mapController?.animateCamera(CameraUpdate.newLatLngBounds(bounds, 80));
  }

  double _min(double a, double b) => a < b ? a : b;
  double _max(double a, double b) => a > b ? a : b;

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<BookingBloc, BookingState>(
      listenWhen: (prev, curr) {
        // Listen for driver location changes to animate marker
        final prevDriver = prev.activeTrip?.driver;
        final currDriver = curr.activeTrip?.driver;
        return prevDriver?.lat != currDriver?.lat || prevDriver?.lng != currDriver?.lng;
      },
      listener: (context, state) {
        final driver = state.activeTrip?.driver;
        if (driver != null && (driver.lat != 0 || driver.lng != 0)) {
          _previousDriverPos = _currentDriverPos;
          _currentDriverPos = LatLng(driver.lat, driver.lng);

          // Smooth animation between positions
          _markerAnimController.forward(from: 0);

          // Follow the driver on the map
          if (_mapController != null) {
            _mapController!.animateCamera(
              CameraUpdate.newLatLng(_currentDriverPos!),
            );
          }
        }
      },
      builder: (context, state) {
        final trip = state.activeTrip;
        final isDriverArrived = trip?.status == RideStatus.driverArrived;
        final isRideStarted = trip?.status == RideStatus.tripStarted;

        // Build polyline from route estimate
        Set<Polyline> polylines = {};
        if (state.routeEstimate != null && state.routeEstimate!.polylinePoints.isNotEmpty) {
          polylines = {
            Polyline(
              polylineId: const PolylineId('route'),
              points: state.routeEstimate!.polylinePoints
                  .map((p) => LatLng(p.lat, p.lng))
                  .toList(),
              color: const Color(0xFF2563EB),
              width: 5,
              patterns: [PatternItem.dot, PatternItem.gap(10)],
            )
          };
        } else if (trip != null) {
          // If restored from background, we don't have routeEstimate, so we fetch it dynamically
          polylines = _dynamicPolylines;
          if (_dynamicPolylines.isEmpty && !_isFetchingRoute) {
            final originLat = isRideStarted ? trip.pickup.lat : (state.activeTrip?.driver?.lat ?? trip.pickup.lat);
            final originLng = isRideStarted ? trip.pickup.lng : (state.activeTrip?.driver?.lng ?? trip.pickup.lng);
            final destLat = isRideStarted ? trip.destination.lat : trip.pickup.lat;
            final destLng = isRideStarted ? trip.destination.lng : trip.pickup.lng;
            
            // Only fetch if driver has valid GPS coordinates (not 0,0)
            if (originLat != 0 && originLng != 0) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                _fetchDynamicRoute(originLat, originLng, destLat, destLng);
              });
            }
          }
        }

        // Get the initial camera position
        final initialLat = trip?.pickup.lat ?? -1.2921;
        final initialLng = trip?.pickup.lng ?? 36.8219;

        // Compute ETA text
        final etaText = _computeEtaText(state);

        // Status text
        final statusText = isRideStarted
            ? 'Heading to destination'
            : isDriverArrived
                ? 'Driver has arrived'
                : 'Driver arriving${state.routeEstimate != null ? ' in ${state.routeEstimate!.durationMinutes} min' : '...'}';

        return Scaffold(
          backgroundColor: Colors.white,
          body: Stack(
            children: [
              // ── Live Google Map (AnimatedBuilder drives smooth driver interpolation) ──
              RepaintBoundary(
                child: AnimatedBuilder(
                  animation: _markerAnimController,
                  builder: (context, _) {
                    final animatedMarkers = _buildMarkers(state);
                    return GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: LatLng(initialLat, initialLng),
                        zoom: 15,
                      ),
                      myLocationEnabled: true,
                      zoomControlsEnabled: false,
                      style: _mapStyle,
                      onMapCreated: (controller) {
                        _mapController = controller;
                        // Fit bounds to show full route once map is ready
                        Future.delayed(const Duration(milliseconds: 500), () {
                          _fitBounds(state);
                        });
                      },
                      markers: animatedMarkers,
                      polylines: polylines,
                    );
                  },
                ),
              ),

              // ── Top Bar ──────────────────────────────────────────────
              Positioned(
                top: MediaQuery.of(context).padding.top + 8,
                left: 16,
                right: 16,
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: Colors.white,
                      child: IconButton(
                        icon: const Icon(Icons.arrow_back, color: Colors.black),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: isRideStarted ? Colors.green : Colors.blue,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            statusText,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    )
                  ],
                ),
              ),

              // ── ETA Badge ────────────────────────────────────────────
              if (etaText.isNotEmpty)
                Positioned(
                  top: MediaQuery.of(context).padding.top + 60,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.timer, size: 16, color: Color(0xFF2563EB)),
                        const SizedBox(width: 6),
                        Text(etaText, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                      ],
                    ),
                  ),
                ),

              // ── Bottom Sheet ─────────────────────────────────────────
              Align(
                alignment: Alignment.bottomCenter,
                child: BottomNavSheet(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (!isRideStarted) ...[
                        // OTP Section
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('PIN for this ride', style: TextStyle(fontWeight: FontWeight.w600)),
                              Text(
                                trip?.otp ?? '----',
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 4,
                                  color: Colors.black,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Driver Info
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 30,
                            backgroundColor: Colors.grey[200],
                            child: trip?.driver?.photoUrl != null
                                ? ClipOval(child: Image.network(trip!.driver!.photoUrl!, fit: BoxFit.cover, width: 60, height: 60))
                                : const Icon(Icons.person, size: 30, color: Colors.grey),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      trip?.driver?.name ?? 'Finding driver...',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                                    ),
                                    if (trip?.driver?.rating != null) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(4)),
                                        child: Row(
                                          children: [
                                            const Icon(Icons.star, size: 14, color: Colors.amber),
                                            Text(
                                              trip!.driver!.rating.toStringAsFixed(1),
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                if (trip?.vehicle != null)
                                  Text(
                                    '${trip!.vehicle!.model} • ${trip.vehicle!.color}',
                                    style: const TextStyle(color: Colors.grey),
                                  ),
                                // Vendor badge
                                if (trip?.driverVendorName != null) ...[
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFFF7ED),
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(color: const Color(0xFFFED7AA)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.verified, size: 12, color: Color(0xFFD97706)),
                                        const SizedBox(width: 3),
                                        Text(
                                          trip!.driverVendorName!,
                                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFFD97706)),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          // License Plate
                          if (trip?.vehicle?.plateNumber != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.grey[300]!),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                trip!.vehicle!.plateNumber,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Actions
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _ActionCircle(icon: Icons.safety_check, label: 'Safety', onTap: () {}),
                          _ActionCircle(icon: Icons.call, label: 'Call', onTap: () {}),
                          _ActionCircle(icon: Icons.chat, label: 'Message', onTap: () {}),
                          _ActionCircle(icon: Icons.share, label: 'Share', onTap: () {}),
                        ],
                      ),
                      SizedBox(height: MediaQuery.of(context).padding.bottom + 8),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Build markers for pickup, destination, and driver position
  Set<Marker> _buildMarkers(BookingState state) {
    final markers = <Marker>{};
    final trip = state.activeTrip;

    if (trip != null) {
      // Pickup marker (custom green circle)
      markers.add(Marker(
        markerId: const MarkerId('pickup'),
        position: LatLng(trip.pickup.lat, trip.pickup.lng),
        icon: _pickupIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: InfoWindow(title: 'Pickup', snippet: trip.pickup.address),
        zIndexInt: 8,
      ));

      // Destination marker (custom red circle)
      markers.add(Marker(
        markerId: const MarkerId('destination'),
        position: LatLng(trip.destination.lat, trip.destination.lng),
        icon: _destIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: InfoWindow(title: 'Drop-off', snippet: trip.destination.address),
        zIndexInt: 8,
      ));

      // Live driver marker — car icon, interpolated position, flat on map
      final driver = trip.driver;
      if (driver != null && (driver.lat != 0 || driver.lng != 0)) {
        // Interpolate between previous and current positions for smooth movement
        LatLng driverPos;
        if (_previousDriverPos != null && _currentDriverPos != null) {
          final t = _markerAnimController.value;
          driverPos = LatLng(
            _previousDriverPos!.latitude + (_currentDriverPos!.latitude - _previousDriverPos!.latitude) * t,
            _previousDriverPos!.longitude + (_currentDriverPos!.longitude - _previousDriverPos!.longitude) * t,
          );
        } else {
          driverPos = LatLng(driver.lat, driver.lng);
        }

        markers.add(Marker(
          markerId: const MarkerId('driver'),
          position: driverPos,
          icon: _carIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
          rotation: driver.heading,
          anchor: const Offset(0.5, 0.5),
          flat: true,
          zIndexInt: 10,
        ));
      }
    }

    return markers;
  }

  /// Compute ETA string from route data or dynamic route
  String _computeEtaText(BookingState state) {
    if (state.routeEstimate != null) {
      if (state.routeEstimate!.durationMinutes <= 1) return '< 1 min';
      return '${state.routeEstimate!.durationMinutes} min';
    }
    return _dynamicEtaText ?? '';
  }

  static const _mapStyle = '''[
    {"featureType":"all","elementType":"geometry.fill","stylers":[{"weight":"2.00"}]},
    {"featureType":"all","elementType":"geometry.stroke","stylers":[{"color":"#9c9c9c"}]},
    {"featureType":"all","elementType":"labels.text","stylers":[{"visibility":"on"}]},
    {"featureType":"landscape","elementType":"all","stylers":[{"color":"#f2f2f2"}]},
    {"featureType":"landscape","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},
    {"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#eeeeee"}]},
    {"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#7b7b7b"}]},
    {"featureType":"road","elementType":"labels.text.stroke","stylers":[{"color":"#ffffff"}]}
  ]''';
}

class _ActionCircle extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionCircle({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.black87),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
