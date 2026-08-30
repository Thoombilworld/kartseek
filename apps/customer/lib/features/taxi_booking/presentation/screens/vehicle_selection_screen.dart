import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import '../blocs/booking_bloc.dart';
import '../widgets/premium_button.dart';
import '../widgets/bottom_nav_sheet.dart';
import '../widgets/car_marker_helper.dart';

class VehicleSelectionScreen extends StatefulWidget {
  const VehicleSelectionScreen({super.key});

  @override
  State<VehicleSelectionScreen> createState() => _VehicleSelectionScreenState();
}

class _VehicleSelectionScreenState extends State<VehicleSelectionScreen> {
  int _selectedVehicleIndex = 0;
  GoogleMapController? _mapController;
  BitmapDescriptor? _pickupIcon;
  BitmapDescriptor? _destIcon;

  @override
  void initState() {
    super.initState();
    _loadIcons();
  }

  Future<void> _loadIcons() async {
    final pickup = await CarMarkerHelper.getPickupIcon();
    final dest = await CarMarkerHelper.getDestinationIcon();
    if (mounted) setState(() { _pickupIcon = pickup; _destIcon = dest; });
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _vehicles {
    final c = RegionService.instance.currentCountry.currencySymbol;
    final bloc = context.read<BookingBloc>().state;
    final fare = bloc.fareEstimate;
    final dur = bloc.routeEstimate?.durationMinutes;

    return [
      {
        'id': 'economy',
        'name': 'Economy',
        'price': fare != null ? '$c ${(fare.totalEstimate * 0.8).toStringAsFixed(0)}' : '$c 80+',
        'eta': dur != null ? '$dur min' : '3–5 min',
        'desc': 'Affordable, everyday rides',
        'icon': Icons.directions_car,
        'capacity': '4',
      },
      {
        'id': 'comfort',
        'name': 'Comfort',
        'price': fare != null ? '$c ${(fare.totalEstimate).toStringAsFixed(0)}' : '$c 130+',
        'eta': dur != null ? '${dur + 2} min' : '4–7 min',
        'desc': 'Spacious sedans with extra legroom',
        'icon': Icons.local_taxi,
        'capacity': '4',
      },
      {
        'id': 'premium',
        'name': 'Premium',
        'price': fare != null ? '$c ${(fare.totalEstimate * 1.5).toStringAsFixed(0)}' : '$c 220+',
        'eta': dur != null ? '${dur + 4} min' : '6–10 min',
        'desc': 'Luxury vehicles, premium experience',
        'icon': Icons.directions_car_filled,
        'capacity': '4',
      },
      {
        'id': 'bike',
        'name': 'Moto',
        'price': fare != null ? '$c ${(fare.totalEstimate * 0.5).toStringAsFixed(0)}' : '$c 40+',
        'eta': dur != null ? '${(dur * 0.7).round()} min' : '2–3 min',
        'desc': 'Beat traffic on a bike',
        'icon': Icons.two_wheeler,
        'capacity': '1',
      },
    ];
  }

  void _fitBounds(BookingState state) {
    if (_mapController == null) return;
    final pickup = state.pickup;
    final dest = state.destination;
    if (pickup == null || dest == null) return;

    final sw = LatLng(
      pickup.lat < dest.lat ? pickup.lat - 0.005 : dest.lat - 0.005,
      pickup.lng < dest.lng ? pickup.lng - 0.005 : dest.lng - 0.005,
    );
    final ne = LatLng(
      pickup.lat > dest.lat ? pickup.lat + 0.005 : dest.lat + 0.005,
      pickup.lng > dest.lng ? pickup.lng + 0.005 : dest.lng + 0.005,
    );
    _mapController?.animateCamera(
      CameraUpdate.newLatLngBounds(LatLngBounds(southwest: sw, northeast: ne), 80),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<BookingBloc, BookingState>(
      builder: (context, state) {
        // Build markers
        final markers = <Marker>{};
        final polylines = <Polyline>{};

        if (state.pickup != null) {
          markers.add(Marker(
            markerId: const MarkerId('pickup'),
            position: LatLng(state.pickup!.lat, state.pickup!.lng),
            icon: _pickupIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
            infoWindow: InfoWindow(title: 'Pickup', snippet: state.pickup!.address),
            zIndexInt: 10,
          ));
        }
        if (state.destination != null) {
          markers.add(Marker(
            markerId: const MarkerId('destination'),
            position: LatLng(state.destination!.lat, state.destination!.lng),
            icon: _destIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
            infoWindow: InfoWindow(title: 'Drop-off', snippet: state.destination!.address),
            zIndexInt: 10,
          ));
        }

        // Route polyline
        if (state.routeEstimate != null && state.routeEstimate!.polylinePoints.isNotEmpty) {
          polylines.add(Polyline(
            polylineId: const PolylineId('route'),
            points: state.routeEstimate!.polylinePoints
                .map((p) => LatLng(p.lat, p.lng))
                .toList(),
            color: Colors.black,
            width: 5,
            startCap: Cap.roundCap,
            endCap: Cap.roundCap,
          ));
        }

        // Camera target
        final camTarget = state.pickup != null
            ? LatLng(state.pickup!.lat, state.pickup!.lng)
            : LatLng(
                RegionService.instance.lastDetection?.lat ?? RegionService.instance.currentCountry.defaultLat,
                RegionService.instance.lastDetection?.lng ?? RegionService.instance.currentCountry.defaultLng,
              );

        // Route info bar
        final routeInfo = state.routeEstimate;

        return Scaffold(
          backgroundColor: Colors.white,
          body: Stack(
            children: [
              // Background Map showing route
              GoogleMap(
                initialCameraPosition: CameraPosition(target: camTarget, zoom: 14),
                markers: markers,
                polylines: polylines,
                myLocationEnabled: false,
                zoomControlsEnabled: false,
                mapToolbarEnabled: false,
                style: _uberMapStyle,
                onMapCreated: (controller) {
                  _mapController = controller;
                  // Auto-fit to show the full route after map is ready
                  Future.delayed(const Duration(milliseconds: 500), () => _fitBounds(state));
                },
              ),

              // Route info strip (distance + duration)
              if (routeInfo != null)
                Positioned(
                  top: MediaQuery.of(context).padding.top + 60,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.route_rounded, color: Colors.white, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          '${routeInfo.distanceKm} km  •  ${routeInfo.durationMinutes} min',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
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

              // Bottom Sheet with Vehicle Selection
              Align(
                alignment: Alignment.bottomCenter,
                child: BottomNavSheet(
                  padding: EdgeInsets.zero,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                        child: Text(
                          'Choose a ride',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.black,
                          ),
                        ),
                      ),
                      SizedBox(
                        height: 250,
                        child: ListView.builder(
                          itemCount: _vehicles.length,
                          itemBuilder: (context, index) {
                            final vehicle = _vehicles[index];
                            final isSelected = _selectedVehicleIndex == index;
                            return GestureDetector(
                              onTap: () {
                                setState(() {
                                  _selectedVehicleIndex = index;
                                });
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  color: isSelected ? Colors.grey[100] : Colors.white,
                                  border: Border.all(
                                    color: isSelected ? Colors.black : Colors.transparent,
                                    width: 2,
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    Icon(vehicle['icon'], size: 40, color: Colors.black87),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Text(
                                                vehicle['name'],
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 16,
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              const Icon(Icons.person, size: 14),
                                              Text(vehicle['capacity'] ?? '4', style: const TextStyle(fontSize: 12)),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '${vehicle['eta']} • ${vehicle['desc']}',
                                            style: TextStyle(
                                              color: Colors.grey[600],
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      vehicle['price'],
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const Divider(height: 1),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                        child: Row(
                          children: [
                            GestureDetector(
                              onTap: () {
                                Navigator.of(context).pushNamed('/taxi/payment');
                              },
                              child: const Row(
                                children: [
                                  Icon(Icons.payment, color: Colors.black),
                                  SizedBox(width: 8),
                                  Text('Cash', style: TextStyle(fontWeight: FontWeight.bold)),
                                  Icon(Icons.keyboard_arrow_right),
                                ],
                              ),
                            ),
                            const Spacer(),
                            const Text('Promo Code', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                      Padding(
                        padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.of(context).padding.bottom + 16),
                        child: PremiumButton(
                          text: 'Confirm ${_vehicles[_selectedVehicleIndex]['name']}',
                          onPressed: () {
                            Navigator.of(context).pushNamed('/taxi/pickup-confirm');
                          },
                        ),
                      ),
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
