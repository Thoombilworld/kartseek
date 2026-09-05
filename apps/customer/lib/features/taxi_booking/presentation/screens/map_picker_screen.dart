/// KARTSEEK Taxi Booking — Map Picker Screen
///
/// Full-screen Google Map with draggable center pin for precise
/// pickup or drop-off location selection. Reverse-geocodes on
/// camera idle and returns a GeoLocation to the calling screen.
library;

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kartseek_shared_mobile/core/services/geocoding_service.dart';
import '../../domain/entities/entities.dart';

enum MapPickerMode { pickup, destination }

class MapPickerScreen extends StatefulWidget {
  final MapPickerMode mode;
  final LatLng? initialPosition;

  const MapPickerScreen({
    super.key,
    this.mode = MapPickerMode.pickup,
    this.initialPosition,
  });

  @override
  State<MapPickerScreen> createState() => _MapPickerScreenState();
}

class _MapPickerScreenState extends State<MapPickerScreen>
    with SingleTickerProviderStateMixin {
  GoogleMapController? _mapController;
  final _geocoder = GeocodingService.instance;

  LatLng _center = const LatLng(0, 0);
  String _address = 'Move the map to set location';
  bool _isGeocoding = false;
  bool _isMapMoving = false;
  Timer? _debounce;

  late final AnimationController _pinBounceCtrl;
  late final Animation<double> _pinBounce;

  @override
  void initState() {
    super.initState();
    _center = widget.initialPosition ?? const LatLng(1.2921, 36.8219); // Default: Nairobi
    _pinBounceCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _pinBounce = Tween<double>(begin: 0, end: -12).animate(
      CurvedAnimation(parent: _pinBounceCtrl, curve: Curves.easeOut),
    );
    _initLocation();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _pinBounceCtrl.dispose();
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _initLocation() async {
    if (widget.initialPosition != null) {
      _reverseGeocode(widget.initialPosition!);
      return;
    }
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );
      final ll = LatLng(pos.latitude, pos.longitude);
      setState(() => _center = ll);
      _mapController?.animateCamera(CameraUpdate.newLatLng(ll));
      _reverseGeocode(ll);
    } catch (_) {
      // Use default center
    }
  }

  void _onCameraMove(CameraPosition pos) {
    _center = pos.target;
    if (!_isMapMoving) {
      setState(() => _isMapMoving = true);
      _pinBounceCtrl.forward();
    }
    _debounce?.cancel();
  }

  void _onCameraIdle() {
    _pinBounceCtrl.reverse();
    setState(() => _isMapMoving = false);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _reverseGeocode(_center);
    });
  }

  Future<void> _reverseGeocode(LatLng pos) async {
    setState(() => _isGeocoding = true);
    try {
      final result = await _geocoder.reverseGeocode(pos.latitude, pos.longitude);
      if (mounted) {
        setState(() {
          _address = result.isEmpty ? 'Unknown location' : result;
          _isGeocoding = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _address = '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
          _isGeocoding = false;
        });
      }
    }
  }

  void _confirmLocation() {
    final location = GeoLocation(
      lat: _center.latitude,
      lng: _center.longitude,
      address: _address,
    );
    Navigator.pop(context, location);
  }

  void _recenter() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 5),
        ),
      );
      _mapController?.animateCamera(
        CameraUpdate.newLatLng(LatLng(pos.latitude, pos.longitude)),
      );
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isPickup = widget.mode == MapPickerMode.pickup;
    final accentColor = isPickup ? const Color(0xFF10B981) : const Color(0xFF3B82F6);

    return Scaffold(
      body: Stack(
        children: [
          // ── Google Map ──────────────────────────────────────────────────
          GoogleMap(
            initialCameraPosition: CameraPosition(target: _center, zoom: 16),
            onMapCreated: (ctrl) => _mapController = ctrl,
            onCameraMove: _onCameraMove,
            onCameraIdle: _onCameraIdle,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            compassEnabled: false,
            style: isDark ? _darkMapStyle : null,
          ),

          // ── Center Pin ─────────────────────────────────────────────────
          Center(
            child: AnimatedBuilder(
              animation: _pinBounce,
              builder: (context, child) => Transform.translate(
                offset: Offset(0, _pinBounce.value - 40), // pin above center
                child: child,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: accentColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: accentColor.withValues(alpha: 0.4), blurRadius: 12, spreadRadius: 2),
                      ],
                    ),
                    child: Icon(
                      isPickup ? Icons.my_location : Icons.flag,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  CustomPaint(
                    size: const Size(2, 20),
                    painter: _PinLinePainter(color: accentColor),
                  ),
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.5),
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Top Bar ────────────────────────────────────────────────────
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            right: 16,
            child: Row(
              children: [
                _circleButton(
                  icon: Icons.arrow_back_ios_new,
                  isDark: isDark,
                  onTap: () => Navigator.pop(context),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1A1A2E) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10),
                      ],
                    ),
                    child: Text(
                      isPickup ? 'Set pickup location' : 'Set drop-off location',
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black87,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Recenter FAB ──────────────────────────────────────────────
          Positioned(
            right: 16,
            bottom: 200,
            child: _circleButton(
              icon: Icons.gps_fixed,
              isDark: isDark,
              onTap: _recenter,
            ),
          ),

          // ── Bottom Confirm Panel ──────────────────────────────────────
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).padding.bottom + 20),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1A1A2E) : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 20, offset: const Offset(0, -4)),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Address row
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: accentColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          isPickup ? Icons.radio_button_checked : Icons.location_on,
                          color: accentColor,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isPickup ? 'Pickup' : 'Drop-off',
                              style: TextStyle(
                                color: isDark ? Colors.white60 : Colors.black54,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            _isGeocoding
                                ? SizedBox(
                                    width: 120,
                                    child: LinearProgressIndicator(
                                      minHeight: 2,
                                      color: accentColor,
                                      backgroundColor: accentColor.withValues(alpha: 0.1),
                                    ),
                                  )
                                : Text(
                                    _address,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: isDark ? Colors.white : Colors.black87,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                    ),
                                  ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Confirm button
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _isGeocoding ? null : _confirmLocation,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: accentColor,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: accentColor.withValues(alpha: 0.3),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                      child: Text(isPickup ? 'Confirm Pickup' : 'Confirm Drop-off'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleButton({
    required IconData icon,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A1A2E) : Colors.white,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8),
          ],
        ),
        child: Icon(icon, size: 20, color: isDark ? Colors.white : Colors.black87),
      ),
    );
  }

  static const String _darkMapStyle = '''
[
  {"elementType":"geometry","stylers":[{"color":"#242f3e"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#746855"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#242f3e"}]},
  {"featureType":"road","elementType":"geometry","stylers":[{"color":"#38414e"}]},
  {"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#212a37"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#17263c"}]}
]
''';
}

class _PinLinePainter extends CustomPainter {
  final Color color;
  _PinLinePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    canvas.drawLine(Offset(size.width / 2, 0), Offset(size.width / 2, size.height), paint);
  }

  @override
  bool shouldRepaint(covariant _PinLinePainter old) => old.color != color;
}
