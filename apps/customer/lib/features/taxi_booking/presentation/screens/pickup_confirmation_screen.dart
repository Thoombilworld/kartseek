import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/booking_bloc.dart';
import '../widgets/premium_button.dart';

import '../../domain/entities/entities.dart';
import '../../data/repositories/taxi_repository_impl.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

class PickupConfirmationScreen extends StatefulWidget {
  const PickupConfirmationScreen({super.key});

  @override
  State<PickupConfirmationScreen> createState() => _PickupConfirmationScreenState();
}

class _PickupConfirmationScreenState extends State<PickupConfirmationScreen> {
  GoogleMapController? _mapController;
  final _locationRepo = TaxiLocationRepositoryImpl();
  bool _isMoving = false;
  bool _isGeocoding = false;
  String _resolvedAddress = 'Finding your location...';
  late LatLng _center;

  @override
  void initState() {
    super.initState();
    // Initialize from BookingBloc pickup, or fall back to region default
    final pickup = context.read<BookingBloc>().state.pickup;
    if (pickup != null) {
      _center = LatLng(pickup.lat, pickup.lng);
      _resolvedAddress = pickup.address ?? 'Finding your location...';
    } else {
      final region = RegionService.instance;
      _center = LatLng(
        region.lastDetection?.lat ?? region.currentCountry.defaultLat,
        region.lastDetection?.lng ?? region.currentCountry.defaultLng,
      );
      // Reverse geocode the initial position
      _reverseGeocode(_center);
    }
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  /// Reverse geocode the map center to an address string.
  Future<void> _reverseGeocode(LatLng pos) async {
    if (_isGeocoding) return;
    setState(() => _isGeocoding = true);
    try {
      final result = await _locationRepo.reverseGeocode(pos.latitude, pos.longitude);
      if (mounted) {
        setState(() {
          _resolvedAddress = result.address ?? '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
          _isGeocoding = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _resolvedAddress = '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
          _isGeocoding = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Background Map
          GoogleMap(
            initialCameraPosition: CameraPosition(target: _center, zoom: 16),
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            style: _uberMapStyle,
            onMapCreated: (controller) {
              _mapController = controller;
            },
            onCameraMoveStarted: () => setState(() => _isMoving = true),
            onCameraIdle: () {
              setState(() => _isMoving = false);
              // Reverse geocode when user stops dragging
              _reverseGeocode(_center);
            },
            onCameraMove: (position) {
              _center = position.target;
            },
          ),

          // Custom floating pin (centered on screen, moves with map)
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Address bubble above pin
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: const [
                      BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_isGeocoding)
                        const SizedBox(
                          width: 12, height: 12,
                          child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white),
                        )
                      else
                        const Icon(Icons.location_on, size: 14, color: Colors.white),
                      const SizedBox(width: 6),
                      ConstrainedBox(
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.6),
                        child: Text(
                          _isGeocoding ? 'Locating...' : 'Set pickup here',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                // Animated pin that lifts when dragging
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  transform: Matrix4.translationValues(0, _isMoving ? -12 : 0, 0),
                  child: const Icon(Icons.location_on, size: 44, color: Colors.black),
                ),
                const SizedBox(height: 22), // Offset for pin point alignment
              ],
            ),
          ),

          // Back Button
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            child: CircleAvatar(
              backgroundColor: Colors.white,
              child: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.black),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ),

          // My Location button
          Positioned(
            right: 16,
            bottom: MediaQuery.of(context).size.height * 0.32,
            child: FloatingActionButton.small(
              heroTag: 'my_location',
              backgroundColor: Colors.white,
              onPressed: () {
                final pickup = context.read<BookingBloc>().state.pickup;
                if (pickup != null) {
                  _mapController?.animateCamera(CameraUpdate.newLatLng(
                    LatLng(pickup.lat, pickup.lng),
                  ));
                }
              },
              child: const Icon(Icons.my_location_rounded, color: Colors.black),
            ),
          ),

          // Bottom Sheet with resolved Address + Confirm
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
                boxShadow: [
                  BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -2)),
                ],
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Confirm pickup location',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    // Dynamic address display
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.location_on, color: Colors.green.shade700, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _resolvedAddress,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (_isGeocoding)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(
                                    'Resolving address...',
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        // Tap to re-search
                        GestureDetector(
                          onTap: () => Navigator.of(context).pushNamed('/taxi/search'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text('Edit', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    PremiumButton(
                      text: 'Confirm Pickup',
                      onPressed: () {
                        // Update BookingBloc with the final dragged pin location
                        context.read<BookingBloc>().add(SetPickupLocation(
                          GeoLocation(
                            lat: _center.latitude,
                            lng: _center.longitude,
                            address: _resolvedAddress,
                          ),
                        ));
                        // Request ride
                        context.read<BookingBloc>().add(RequestRide());
                        Navigator.of(context).pushNamed('/taxi/searching');
                      },
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

  static const _uberMapStyle = '''[
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
