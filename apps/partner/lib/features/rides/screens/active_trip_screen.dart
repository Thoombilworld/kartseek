import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/services/map_navigation_service.dart';
import 'package:kartseek_partner/features/shared/widgets/map_picker_sheet.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Active Trip Screen — Shows during an ongoing taxi trip.
///
/// Includes a "Navigate" button that opens the driver's preferred map app
/// (Google Maps / Waze / Apple Maps) for turn-by-turn directions. The driver
/// can change their preferred map via the map picker sheet.
class ActiveTripScreen extends StatefulWidget {
  const ActiveTripScreen({super.key});
  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  String _status = 'going_to_pickup';
  int _elapsed = 0;

  // Coordinates from region detection
  double get _pickupLat => RegionService.instance.currentCountry.defaultLat;
  double get _pickupLng => RegionService.instance.currentCountry.defaultLng;
  double get _dropLat => RegionService.instance.currentCountry.defaultLat + 0.05;
  double get _dropLng => RegionService.instance.currentCountry.defaultLng + 0.05;

  @override
  void initState() {
    super.initState();
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() => _elapsed++);
      return true;
    });
  }

  String get _elapsedStr {
    final m = _elapsed ~/ 60;
    final s = _elapsed % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  void _advanceStatus() {
    setState(() {
      switch (_status) {
        case 'going_to_pickup': _status = 'arrived_at_pickup'; break;
        case 'arrived_at_pickup': Navigator.pushNamed(context, PartnerRouter.partnerTripOtp); break;
        case 'otp_verified': _status = 'on_trip'; break;
        case 'on_trip': _status = 'arrived_at_drop'; break;
        case 'arrived_at_drop':
          Navigator.pushReplacementNamed(context, PartnerRouter.partnerTripPayment);
          break;
      }
    });
  }

  String get _actionLabel {
    switch (_status) {
      case 'going_to_pickup': return 'Arrived at Pickup';
      case 'arrived_at_pickup': return 'Verify OTP';
      case 'otp_verified': return 'Start Trip';
      case 'on_trip': return 'Arrived at Drop';
      case 'arrived_at_drop': return 'Complete Trip';
      default: return 'Continue';
    }
  }

  /// Get the navigation destination based on the current trip status.
  void _navigateToDestination() {
    final mapService = MapNavigationService.instance;
    if (_status == 'going_to_pickup' || _status == 'arrived_at_pickup') {
      mapService.navigateToPickup(lat: _pickupLat, lng: _pickupLng, label: 'Pickup Location');
    } else {
      mapService.navigateToDropoff(lat: _dropLat, lng: _dropLng, label: 'Drop-off Location');
    }
  }

  @override
  Widget build(BuildContext context) {
    final mapService = MapNavigationService.instance;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Map Placeholder
          Positioned.fill(
            child: ColoredBox(
              color: const Color(0xFFE8F5E9),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.map, size: 80, color: Colors.green.shade200),
                    const SizedBox(height: 12),
                    Text('Live Navigation', style: TextStyle(color: Colors.green.shade400, fontWeight: FontWeight.w600, fontSize: 16)),
                  ],
                ),
              ),
            ),
          ),
          // Top Bar
          Positioned(
            top: MediaQuery.of(context).padding.top + 12, left: 16, right: 16,
            child: Row(
              children: [
                _circleBtn(Icons.arrow_back, () => Navigator.pop(context)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10)]),
                  child: Row(children: [
                    Container(width: 8, height: 8, decoration: const BoxDecoration(color: PartnerTheme.onlineGreen, shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    Text(_elapsedStr, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  ]),
                ),
                const Spacer(),
                _circleBtn(Icons.my_location, () {}),
              ],
            ),
          ),
          // Navigation + Map Selector Buttons
          Positioned(
            top: MediaQuery.of(context).padding.top + 70, right: 16,
            child: Column(
              children: [
                // SOS Button
                GestureDetector(
                  onTap: _showSosDialog,
                  child: Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(color: PartnerTheme.offlineRed, shape: BoxShape.circle, boxShadow: [BoxShadow(color: PartnerTheme.offlineRed.withValues(alpha: 0.4), blurRadius: 12)]),
                    child: const Center(child: Text('SOS', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900))),
                  ),
                ),
                const SizedBox(height: 12),
                // Navigate Button
                GestureDetector(
                  onTap: _navigateToDestination,
                  child: Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(color: PartnerTheme.primary, shape: BoxShape.circle, boxShadow: [BoxShadow(color: PartnerTheme.primary.withValues(alpha: 0.4), blurRadius: 12)]),
                    child: const Icon(Icons.navigation, color: Colors.white, size: 22),
                  ),
                ),
                const SizedBox(height: 12),
                // Map Selector
                GestureDetector(
                  onTap: () => MapPickerSheet.show(context),
                  child: Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)]),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(_mapIcon(mapService.preferredApp), size: 18, color: PartnerTheme.textPrimary),
                        Text(
                          _mapLabel(mapService.preferredApp),
                          style: const TextStyle(fontSize: 7, fontWeight: FontWeight.w700, color: PartnerTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Bottom Panel
          DraggableScrollableSheet(
            initialChildSize: 0.40,
            minChildSize: 0.25,
            maxChildSize: 0.65,
            builder: (context, scrollController) {
              return DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 20, offset: const Offset(0, -4))],
                ),
                child: SingleChildScrollView(
                  controller: scrollController,
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                  child: Column(
                    children: [
                      Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
                      const SizedBox(height: 16),
                      // Status Badge
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(color: PartnerTheme.statusColor(_status).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                        child: Center(child: Text(
                          _status.replaceAll('_', ' ').toUpperCase(),
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: PartnerTheme.statusColor(_status), letterSpacing: 1),
                        )),
                      ),
                      const SizedBox(height: 16),
                      // Customer Info
                      Row(
                        children: [
                          const CircleAvatar(radius: 22, backgroundColor: PartnerTheme.primaryLight, child: Icon(Icons.person, color: PartnerTheme.primary, size: 22)),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text('Sarah Wanjiku', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                              Text('RIDE-4521 • Cash', style: TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
                            ]),
                          ),
                          GestureDetector(
                            onTap: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action invoked'))); },
                            child: Container(
                              width: 40, height: 40,
                              decoration: BoxDecoration(color: PartnerTheme.onlineGreen.withValues(alpha: 0.1), shape: BoxShape.circle),
                              child: const Icon(Icons.phone, size: 18, color: PartnerTheme.onlineGreen),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Navigate to customer (quick action)
                          GestureDetector(
                            onTap: _navigateToDestination,
                            child: Container(
                              width: 40, height: 40,
                              decoration: BoxDecoration(color: PartnerTheme.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
                              child: const Icon(Icons.navigation, size: 18, color: PartnerTheme.primary),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Locations
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
                        child: Column(
                          children: [
                            _locRow(Icons.radio_button_checked, const Color(0xFF22C55E), 'Pickup Location'),
                            Container(margin: const EdgeInsets.only(left: 9), width: 2, height: 14, color: PartnerTheme.border),
                            _locRow(Icons.location_on, const Color(0xFFEF4444), 'Drop-off Location'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Stats
                      Row(
                        children: [
                          _miniStat('18.5 km', 'Distance'),
                          const SizedBox(width: 10),
                          _miniStat('${RegionService.instance.currentCountry.currencySymbol} 1,850', 'Fare'),
                          const SizedBox(width: 10),
                          _miniStat('25 min', 'ETA'),
                        ],
                      ),
                      const SizedBox(height: 20),
                      // Action Button
                      SizedBox(
                        width: double.infinity, height: 54,
                        child: ElevatedButton(
                          onPressed: _advanceStatus,
                          style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                          child: Text(_actionLabel, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
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

  IconData _mapIcon(PreferredMapApp app) {
    switch (app) {
      case PreferredMapApp.googleMaps: return Icons.map;
      case PreferredMapApp.waze: return Icons.navigation;
      case PreferredMapApp.appleMaps: return Icons.explore;
    }
  }

  String _mapLabel(PreferredMapApp app) {
    switch (app) {
      case PreferredMapApp.googleMaps: return 'Google';
      case PreferredMapApp.waze: return 'Waze';
      case PreferredMapApp.appleMaps: return 'Apple';
    }
  }

  Widget _circleBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44, height: 44,
        decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)]),
        child: Icon(icon, size: 20, color: PartnerTheme.textPrimary),
      ),
    );
  }

  Widget _locRow(IconData icon, Color color, String address) {
    return Row(children: [
      Icon(icon, size: 18, color: color),
      const SizedBox(width: 10),
      Expanded(child: Text(address, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
    ]);
  }

  Widget _miniStat(String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)),
        child: Column(children: [
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
          Text(label, style: const TextStyle(fontSize: 10, color: PartnerTheme.textMuted)),
        ]),
      ),
    );
  }

  void _showSosDialog() {
    showDialog(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Emergency SOS', style: TextStyle(fontWeight: FontWeight.w800)),
      content: const Text('This will send your live location to admin and your emergency contact. Continue?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: () { Navigator.pop(ctx); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('SOS alert sent to admin'), backgroundColor: PartnerTheme.offlineRed)); },
          style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.offlineRed),
          child: const Text('Send SOS', style: TextStyle(color: Colors.white)),
        ),
      ],
    ));
  }
}
