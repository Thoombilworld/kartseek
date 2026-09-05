import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_bloc.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_event.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_state.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

/// Hotel Map Search Screen — Google Maps with live hotel markers + GPS.
class HotelMapSearchScreen extends StatefulWidget {
  const HotelMapSearchScreen({super.key});

  @override
  State<HotelMapSearchScreen> createState() => _HotelMapSearchScreenState();
}

class _HotelMapSearchScreenState extends State<HotelMapSearchScreen> {
  GoogleMapController? _mapController;
  int? _selectedHotelIndex;
  bool _isLoading = true;
  bool _locationGranted = false;
  LatLng _currentCenter = const LatLng(25.2048, 55.2708); // Default: Dubai
  static const _hotelColor = AppTheme.hotelColor;

  // Fallback data if BLoC has no results yet
  final _fallbackHotels = <Map<String, dynamic>>[
    {'name': 'The Grand Palace Hotel', 'price': 450, 'rating': 4.8, 'stars': 5, 'reviews': 1240, 'lat': 25.2048, 'lng': 55.2708, 'type': 'Luxury', 'emoji': '🏨', 'currency': 'AED', 'city': 'Dubai, UAE', 'id': 'htl-01'},
    {'name': 'KARTSEEK Business Suites', 'price': 280, 'rating': 4.6, 'stars': 4, 'reviews': 890, 'lat': 25.1975, 'lng': 55.2795, 'type': 'Business', 'emoji': '🏢', 'currency': 'QAR', 'city': 'Doha, Qatar', 'id': 'htl-02'},
    {'name': 'Seaside Family Resort', 'price': 380, 'rating': 4.7, 'stars': 5, 'reviews': 2100, 'lat': 25.2120, 'lng': 55.2650, 'type': 'Family', 'emoji': '🏖️', 'currency': 'AED', 'city': 'Dubai, UAE', 'id': 'htl-03'},
    {'name': 'Budget Inn Express', 'price': 120, 'rating': 4.1, 'stars': 3, 'reviews': 560, 'lat': 25.1900, 'lng': 55.2850, 'type': 'Budget', 'emoji': '🏠', 'currency': 'AED', 'city': 'Dubai, UAE', 'id': 'htl-04'},
    {'name': 'Heritage Boutique Hotel', 'price': 650, 'rating': 4.9, 'stars': 5, 'reviews': 430, 'lat': 25.2080, 'lng': 55.2580, 'type': 'Luxury', 'emoji': '🏰', 'currency': 'AED', 'city': 'Dubai, UAE', 'id': 'htl-05'},
  ];

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  Future<void> _initLocation() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _loadNearbyWithDefault();
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        _loadNearbyWithDefault();
        return;
      }

      _locationGranted = true;
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 10)),
      );
      _currentCenter = LatLng(position.latitude, position.longitude);
      _mapController?.animateCamera(CameraUpdate.newLatLng(_currentCenter));
      _loadNearbyHotels(position.latitude, position.longitude);
    } catch (e) {
      debugPrint('[MapSearch] GPS error: $e');
      _loadNearbyWithDefault();
    }
  }

  void _loadNearbyWithDefault() {
    _loadNearbyHotels(_currentCenter.latitude, _currentCenter.longitude);
  }

  void _loadNearbyHotels(double lat, double lng) {
    context.read<HotelBloc>().add(SearchNearbyHotels(lat: lat, lng: lng, radius: 15.0));
    if (mounted) setState(() => _isLoading = false);
  }

  Set<Marker> _buildMarkers(List<Map<String, dynamic>> hotels) {
    return hotels.asMap().entries.map((entry) {
      final idx = entry.key;
      final h = entry.value;
      final lat = h['lat'];
      final lng = h['lng'];
      if (lat is! num || lng is! num) return null;
      return Marker(
        markerId: MarkerId('hotel-$idx'),
        position: LatLng(lat.toDouble(), lng.toDouble()),
        infoWindow: InfoWindow(title: (h['name'] ?? '').toString(), snippet: '${h['currency'] ?? ''} ${h['price'] ?? ''}'),
        icon: BitmapDescriptor.defaultMarkerWithHue(
          _selectedHotelIndex == idx ? BitmapDescriptor.hueRose : BitmapDescriptor.hueRed,
        ),
        onTap: () => setState(() => _selectedHotelIndex = _selectedHotelIndex == idx ? null : idx),
      );
    }).whereType<Marker>().toSet();
  }

  void _goToMyLocation() async {
    if (!_locationGranted) return;
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 5)),
      );
      _mapController?.animateCamera(CameraUpdate.newLatLngZoom(LatLng(pos.latitude, pos.longitude), 13));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocBuilder<HotelBloc, HotelState>(
        builder: (context, state) {
          final hotels = state.nearbyHotels.isNotEmpty ? state.nearbyHotels : _fallbackHotels;

          return Stack(
            children: [
              // ── Google Maps ──
              GoogleMap(
                initialCameraPosition: CameraPosition(target: _currentCenter, zoom: 12.5),
                onMapCreated: (controller) => _mapController = controller,
                markers: _buildMarkers(hotels),
                myLocationEnabled: _locationGranted,
                myLocationButtonEnabled: false,
                zoomControlsEnabled: false,
                mapToolbarEnabled: false,
                onTap: (_) => setState(() => _selectedHotelIndex = null),
                onCameraIdle: () {
                  // Could trigger search for visible area here
                },
              ),

              // Loading
              if (_isLoading || state.status == HotelStatus.searching)
                Positioned.fill(
                  child: Container(
                    color: Colors.white.withValues(alpha: 0.6),
                    child: const Center(child: CircularProgressIndicator(color: _hotelColor)),
                  ),
                ),

              // ── Top Bar ──
              Positioned(
                top: 0, left: 0, right: 0,
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(children: [
                      _circleButton(Icons.arrow_back, () => Navigator.pop(context)),
                      const SizedBox(width: 8),
                      Expanded(child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10)]),
                        child: Row(children: [
                          Icon(Icons.search, size: 18, color: Colors.grey.shade400),
                          const SizedBox(width: 8),
                          Text('${hotels.length} hotels nearby', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.grey.shade800)),
                        ]),
                      )),
                      const SizedBox(width: 8),
                      _circleButton(Icons.my_location, _goToMyLocation),
                    ]),
                  ),
                ),
              ),

              // ── Redo Search ──
              Positioned(
                top: 100, left: 0, right: 0,
                child: Center(child: GestureDetector(
                  onTap: () async {
                    final bounds = await _mapController?.getVisibleRegion();
                    if (bounds != null) {
                      final centerLat = (bounds.northeast.latitude + bounds.southwest.latitude) / 2;
                      final centerLng = (bounds.northeast.longitude + bounds.southwest.longitude) / 2;
                      _loadNearbyHotels(centerLat, centerLng);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)]),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.refresh, size: 14, color: _hotelColor),
                      const SizedBox(width: 6),
                      Text('Search this area', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Colors.grey.shade800)),
                    ]),
                  ),
                )),
              ),

              // ── Hotel Count Badge ──
              Positioned(
                bottom: _selectedHotelIndex != null ? 200 : 30,
                left: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: Colors.grey.shade900, borderRadius: BorderRadius.circular(20)),
                  child: Text('${hotels.length} hotels', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
                ),
              ),

              // ── Bottom Hotel Preview ──
              if (_selectedHotelIndex != null && _selectedHotelIndex! < hotels.length)
                Positioned(
                  bottom: 0, left: 0, right: 0,
                  child: SafeArea(child: Container(
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 20, offset: const Offset(0, -5))]),
                    child: _buildHotelPreview(hotels[_selectedHotelIndex!]),
                  )),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _circleButton(IconData icon, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 44, height: 44,
      decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10)]),
      child: Icon(icon, size: 20, color: Colors.grey.shade700),
    ),
  );

  Widget _buildHotelPreview(Map<String, dynamic> hotel) {
    final name = (hotel['name'] ?? 'Hotel').toString();
    final price = hotel['price'] ?? 0;
    final currency = (hotel['currency'] ?? 'AED').toString();
    final rating = hotel['rating'] ?? 0.0;
    final starsValue = hotel['stars'];
    final stars = starsValue is int ? starsValue.clamp(0, 5) : 4;
    final reviews = hotel['reviews'] ?? hotel['reviewCount'] ?? 0;
    final emoji = (hotel['emoji'] ?? '🏨').toString();

    return Row(children: [
      Container(
        width: 80, height: 80,
        decoration: BoxDecoration(
          color: _hotelColor.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Center(child: Text(emoji, style: const TextStyle(fontSize: 36))),
      ),
      const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text(name, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.grey.shade900), maxLines: 1, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 4),
        Row(children: [
          ...List.generate(stars, (_) => Icon(Icons.star, size: 12, color: Colors.amber.shade400)),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(4)),
            child: Text('$rating', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 10, color: Colors.blue.shade700)),
          ),
          const SizedBox(width: 4),
          Text('($reviews)', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
        ]),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('$currency $price', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.grey.shade900)),
            Text('per night', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
          ]),
          ElevatedButton(
            onPressed: () => Navigator.pushNamed(context, CustomerRouter.hotelDetail, arguments: hotel),
            style: ElevatedButton.styleFrom(backgroundColor: _hotelColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10)),
            child: const Text('View', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.white)),
          ),
        ]),
      ])),
    ]);
  }
}
