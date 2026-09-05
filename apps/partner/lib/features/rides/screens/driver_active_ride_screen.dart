// lib/features/taxi/screens/driver_active_ride_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';


import 'package:kartseek_shared_mobile/core/services/taxi_socket_service.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/services/driver_location_service.dart';

/// Driver Active Ride Screen — Broadcasts driver GPS live to the customer
/// via TaxiSocketService while managing the ride lifecycle (OTP, completion).
class DriverActiveRideScreen extends StatefulWidget {
  final String rideId;
  final String driverId;
  final String passengerName;
  final double passengerRating;
  final String pickupAddress;
  final String dropoffAddress;
  final double fare;

  const DriverActiveRideScreen({
    super.key,
    this.rideId = 'ride_demo_001',
    this.driverId = 'driver_001',
    this.passengerName = 'Rahul K.',
    this.passengerRating = 4.9,
    this.pickupAddress = 'Skyline Apartments, MG Road',
    this.dropoffAddress = 'Airport Terminal 2',
    this.fare = 240.0,
  });

  @override
  State<DriverActiveRideScreen> createState() => _DriverActiveRideScreenState();
}

class _DriverActiveRideScreenState extends State<DriverActiveRideScreen> {
  // ── Ride State Machine ──────────────────────────────────────────────────────
  String _rideState = 'EN_ROUTE_TO_PICKUP'; // → ARRIVED → ON_TRIP → COMPLETED

  // ── OTP ───────────────────────────────────────────────────────────────
  final TextEditingController _otpController = TextEditingController();
  bool _isOtpValidating = false;

  // ── WebSocket ─────────────────────────────────────────────────────────
  late final TaxiSocketService _taxiSocket;
  int _locationUpdates = 0;

  // ── Real GPS ──────────────────────────────────────────────────────────
  late double _currentLat;
  late double _currentLng;
  double _currentHeading = 0.0;
  GoogleMapController? _mapController;
  StreamSubscription<Position>? _positionSub;

  @override
  void initState() {
    super.initState();
    final region = RegionService.instance;
    _currentLat = region.lastDetection?.lat ?? region.currentCountry.defaultLat;
    _currentLng = region.lastDetection?.lng ?? region.currentCountry.defaultLng;
    _taxiSocket = TaxiSocketService();
    _connectAndBroadcast();
    
    // Listen to central GPS stream
    _positionSub = DriverLocationService.instance.locationStream.listen((position) {
      if (mounted) {
        setState(() {
          _currentLat = position.latitude;
          _currentLng = position.longitude;
          _currentHeading = position.heading;
          _locationUpdates++;
        });

        // Follow driver on map
        _mapController?.animateCamera(
          CameraUpdate.newCameraPosition(CameraPosition(
            target: LatLng(_currentLat, _currentLng),
            bearing: _currentHeading,
            zoom: 16,
          )),
        );
      }
    });
  }

  Future<void> _connectAndBroadcast() async {
    await _taxiSocket.connect(
      userId: widget.driverId,
      userType: 'driver',
    );

    // FIX 6: Do NOT start a separate broadcast here.
    // DriverLocationService (via DriverAvailabilityService) is already
    // broadcasting GPS and now manages the Geolocator stream internally.
    DriverLocationService.instance.setActiveRide(widget.rideId);
  }



  @override
  void dispose() {
    // FIX 6: Don't stop broadcasting here — DriverAvailabilityService manages
    // the broadcast lifecycle. Only clean up the GPS subscription and OTP.
    _positionSub?.cancel();
    _otpController.dispose();
    super.dispose();
  }

  // ── Ride Lifecycle ────────────────────────────────────────────────────────

  void _handleStatusChange() {
    if (_rideState == 'EN_ROUTE_TO_PICKUP') {
      setState(() => _rideState = 'ARRIVED');
    } else if (_rideState == 'ARRIVED') {
      _showOtpHandshakeDialog();
    } else if (_rideState == 'ON_TRIP') {
      _completeRide();
    }
  }

  void _completeRide() {
    _taxiSocket.stopBroadcastingLocation();
    setState(() => _rideState = 'COMPLETED');
    _showCompletionDialog();
  }

  void _showOtpHandshakeDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Verify Ride OTP', style: TextStyle(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Ask the customer for their 4-digit PIN to start the trip.', style: TextStyle(fontSize: 14)),
              const SizedBox(height: 16),
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                maxLength: 4,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, letterSpacing: 16, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  hintText: '----',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  counterText: '',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: _isOtpValidating
                  ? null
                  : () async {
                      if (_otpController.text.length != 4) return;

                      final nav = Navigator.of(context);
                      final messenger = ScaffoldMessenger.of(this.context);

                      setDialogState(() => _isOtpValidating = true);
                      // In production: validate OTP via API
                      await Future.delayed(const Duration(seconds: 1));
                      setDialogState(() => _isOtpValidating = false);

                      nav.pop();
                      setState(() => _rideState = 'ON_TRIP');

                      messenger.showSnackBar(
                        const SnackBar(content: Text('OTP Verified! Trip Started.'), backgroundColor: Colors.green),
                      );
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: _isOtpValidating
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Verify & Start', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _showCompletionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, color: Colors.green, size: 64),
            const SizedBox(height: 16),
            const Text('Trip Completed', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Fare: ${RegionService.instance.currentCountry.currencySymbol} ${widget.fare.toStringAsFixed(2)}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.green)),
            const Text('Paid via Kartseek Wallet', style: TextStyle(color: Colors.grey, fontSize: 12)),
            const SizedBox(height: 8),
            Text('$_locationUpdates GPS updates sent', style: const TextStyle(color: Colors.grey, fontSize: 11)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.black, padding: const EdgeInsets.symmetric(vertical: 16)),
                child: const Text('Find Next Ride', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Real Google Map
          Positioned.fill(
            child: GoogleMap(
              initialCameraPosition: CameraPosition(
                target: LatLng(_currentLat, _currentLng),
                zoom: 16,
                bearing: _currentHeading,
              ),
              myLocationEnabled: true,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              onMapCreated: (controller) => _mapController = controller,
              markers: {
                // Driver's current position
                Marker(
                  markerId: const MarkerId('driver'),
                  position: LatLng(_currentLat, _currentLng),
                  icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
                  rotation: _currentHeading,
                  flat: true,
                  anchor: const Offset(0.5, 0.5),
                ),
              },
            ),
          ),

          // Floating Top Banner
          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            left: 16, right: 16,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 10, offset: const Offset(0, 4))],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _rideState == 'ON_TRIP' ? 'Dropoff in 12 mins' : 'Pickup in 3 mins',
                        style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _rideState == 'ON_TRIP' ? '2.4 km remaining' : '800m away',
                        style: const TextStyle(color: Colors.grey, fontSize: 14),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), shape: BoxShape.circle),
                    child: const Icon(Icons.navigation_rounded, color: Colors.white, size: 24),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Sheet
          DraggableScrollableSheet(
            initialChildSize: 0.45,
            minChildSize: 0.35,
            maxChildSize: 0.55,
            builder: (context, scrollController) {
              return DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 24, offset: const Offset(0, -6))],
                ),
                child: SingleChildScrollView(
                  controller: scrollController,
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
                      const SizedBox(height: 24),

                      // Passenger info
                      Row(children: [
                        const CircleAvatar(
                          radius: 28,
                          child: Icon(Icons.person, color: Colors.white),
                        ),
                        const SizedBox(width: 16),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(widget.passengerName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                          const SizedBox(height: 4),
                          Row(children: [
                            const Icon(Icons.star, size: 16, color: Colors.orange),
                            Text(' ${widget.passengerRating}', style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.w700, fontSize: 14)),
                          ]),
                        ])),
                        IconButton(
                          icon: const Icon(Icons.phone, color: Colors.blue),
                          style: IconButton.styleFrom(backgroundColor: Colors.blue[50]),
                          onPressed: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action invoked'))); },
                        ),
                      ]),

                      const Divider(height: 32),

                      // Location info
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(top: 4.0),
                            child: Icon(
                              Icons.location_on,
                              size: 20,
                              color: _rideState == 'ON_TRIP' ? const Color(0xFF0F172A) : const Color(0xFF22C55E),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(
                              _rideState == 'ON_TRIP' ? 'Dropoff Location' : 'Pickup Location',
                              style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                            Text(
                              _rideState == 'ON_TRIP' ? widget.dropoffAddress : widget.pickupAddress,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                            ),
                          ])),
                        ],
                      ),
                      const SizedBox(height: 32),

                      // Action button
                      SizedBox(
                        width: double.infinity, height: 56,
                        child: ElevatedButton(
                          onPressed: _rideState == 'COMPLETED' ? null : _handleStatusChange,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _rideState == 'ARRIVED' ? const Color(0xFF3B82F6) : const Color(0xFF22C55E),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 0,
                          ),
                          child: Text(
                            _rideState == 'EN_ROUTE_TO_PICKUP'
                                ? 'Arrived at Pickup'
                                : _rideState == 'ARRIVED'
                                    ? 'Enter Customer OTP'
                                    : _rideState == 'ON_TRIP'
                                        ? 'Complete Trip'
                                        : 'Trip Completed ✓',
                            style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
