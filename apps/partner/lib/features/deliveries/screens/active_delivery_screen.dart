import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/services/map_navigation_service.dart';
import 'package:kartseek_partner/features/shared/widgets/map_picker_sheet.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Active Delivery Screen — Shows during an ongoing delivery.
///
/// Includes a "Navigate" button that opens the driver's preferred map app
/// for turn-by-turn directions to the pickup store or customer drop-off.
class ActiveDeliveryScreen extends StatefulWidget {
  const ActiveDeliveryScreen({super.key});
  @override
  State<ActiveDeliveryScreen> createState() => _ActiveDeliveryScreenState();
}

class _ActiveDeliveryScreenState extends State<ActiveDeliveryScreen> {
  String _status = 'going_to_pickup';
  int _elapsed = 0;

  // Coordinates — populated from route args (real assignment) or defaults
  double _pickupLat = -1.2670;
  double _pickupLng = 36.8110;
  double _dropLat = -1.2720;
  double _dropLng = 36.7950;
  String _pickupLabel = 'Pickup Store';
  String _dropLabel = 'Customer Location';
  String _orderId = '';
  // ignore: unused_field — reserved for SOS/status API calls
  String _partnerId = '';

  @override
  void initState() {
    super.initState();

    // Extract real delivery data from route arguments
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map<String, dynamic>) {
        setState(() {
          _pickupLat = (args['pickupLat'] as num?)?.toDouble() ?? _pickupLat;
          _pickupLng = (args['pickupLng'] as num?)?.toDouble() ?? _pickupLng;
          _dropLat = (args['dropLat'] as num?)?.toDouble() ?? _dropLat;
          _dropLng = (args['dropLng'] as num?)?.toDouble() ?? _dropLng;
          _pickupLabel = args['pickupLabel'] ?? _pickupLabel;
          _dropLabel = args['dropLabel'] ?? _dropLabel;
          _orderId = args['orderId'] ?? '';
          _partnerId = args['partnerId'] ?? '';
        });
      }
    });

    // Elapsed timer
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
        case 'arrived_at_pickup': _status = 'pickup_confirmed'; break;
        case 'pickup_confirmed': _status = 'out_for_delivery'; break;
        case 'out_for_delivery': _status = 'arrived_at_drop'; break;
        case 'arrived_at_drop':
          Navigator.pushReplacementNamed(context, PartnerRouter.partnerDeliveryOtp);
          break;
      }
    });
  }

  String get _actionLabel {
    switch (_status) {
      case 'going_to_pickup': return 'Arrived at Store';
      case 'arrived_at_pickup': return 'Confirm Pickup';
      case 'pickup_confirmed': return 'Start Delivery';
      case 'out_for_delivery': return 'Arrived at Customer';
      case 'arrived_at_drop': return 'Verify & Complete';
      default: return 'Continue';
    }
  }

  /// Navigate to the appropriate destination based on delivery status.
  void _navigateToDestination() {
    final mapService = MapNavigationService.instance;
    final isGoingToStore = _status == 'going_to_pickup' || _status == 'arrived_at_pickup' || _status == 'pickup_confirmed';
    if (isGoingToStore) {
      mapService.navigateToPickup(lat: _pickupLat, lng: _pickupLng, label: _pickupLabel);
    } else {
      mapService.navigateToDropoff(lat: _dropLat, lng: _dropLng, label: _dropLabel);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mapService = MapNavigationService.instance;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Map
          Positioned.fill(child: ColoredBox(color: const Color(0xFFEDE7F6), child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.map, size: 80, color: Colors.purple.shade100),
            const SizedBox(height: 12),
            Text('Live Navigation', style: TextStyle(color: Colors.purple.shade200, fontWeight: FontWeight.w600, fontSize: 16)),
          ])))),
          // Top bar
          Positioned(top: MediaQuery.of(context).padding.top + 12, left: 16, right: 16,
            child: Row(children: [
              _circleBtn(Icons.arrow_back, () => Navigator.pop(context)),
              const Spacer(),
              Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10)]),
                child: Row(children: [
                  Container(width: 8, height: 8, decoration: const BoxDecoration(color: PartnerTheme.deliveryColor, shape: BoxShape.circle)),
                  const SizedBox(width: 6),
                  Text(_orderId.isNotEmpty ? _orderId : 'DEL-782', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 8),
                  Text(_elapsedStr, style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
                ])),
              const Spacer(),
              _circleBtn(Icons.my_location, () {}),
            ])),
          // Right side buttons
          Positioned(
            top: MediaQuery.of(context).padding.top + 70, right: 16,
            child: Column(
              children: [
                // SOS
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
                    decoration: BoxDecoration(color: PartnerTheme.deliveryColor, shape: BoxShape.circle, boxShadow: [BoxShadow(color: PartnerTheme.deliveryColor.withValues(alpha: 0.4), blurRadius: 12)]),
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
                        Text(_mapLabel(mapService.preferredApp), style: const TextStyle(fontSize: 7, fontWeight: FontWeight.w700, color: PartnerTheme.textMuted)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Bottom Panel
          DraggableScrollableSheet(
            initialChildSize: 0.45, minChildSize: 0.25, maxChildSize: 0.70,
            builder: (context, scrollController) => DecoratedBox(
              decoration: BoxDecoration(color: Colors.white, borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 20, offset: const Offset(0, -4))]),
              child: SingleChildScrollView(
                controller: scrollController, physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                child: Column(children: [
                  Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
                  const SizedBox(height: 16),
                  Container(width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(color: PartnerTheme.statusColor(_status).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                    child: Center(child: Text(_status.replaceAll('_', ' ').toUpperCase(), style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: PartnerTheme.statusColor(_status), letterSpacing: 1)))),
                  const SizedBox(height: 16),
                  // Customer + Store
                  Row(children: [
                    CircleAvatar(radius: 22, backgroundColor: PartnerTheme.deliveryColor.withValues(alpha: 0.1), child: const Icon(Icons.person, color: PartnerTheme.deliveryColor, size: 22)),
                    const SizedBox(width: 12),
                    const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Mary Njeri', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      Text('From: FreshMart • Grocery', style: TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
                    ])),
                    GestureDetector(onTap: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action invoked'))); }, child: Container(width: 40, height: 40, decoration: BoxDecoration(color: PartnerTheme.onlineGreen.withValues(alpha: 0.1), shape: BoxShape.circle), child: const Icon(Icons.phone, size: 18, color: PartnerTheme.onlineGreen))),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _navigateToDestination,
                      child: Container(width: 40, height: 40, decoration: BoxDecoration(color: PartnerTheme.deliveryColor.withValues(alpha: 0.1), shape: BoxShape.circle), child: const Icon(Icons.navigation, size: 18, color: PartnerTheme.deliveryColor)),
                    ),
                  ]),
                  const SizedBox(height: 14),
                  Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
                    child: Column(children: [
                      _locRow(Icons.store, PartnerTheme.deliveryColor, 'FreshMart Store'),
                      Container(margin: const EdgeInsets.only(left: 9), width: 2, height: 14, color: PartnerTheme.border),
                      _locRow(Icons.location_on, const Color(0xFFEF4444), '23 Riverside Drive'),
                    ])),
                  const SizedBox(height: 12),
                  Row(children: [
                    _miniStat('3.2 km', 'Distance'),
                    const SizedBox(width: 10),
                    _miniStat('${RegionService.instance.currentCountry.currencySymbol} 2,450', 'COD'),
                    const SizedBox(width: 10),
                    _miniStat('${RegionService.instance.currentCountry.currencySymbol} 150', 'Fee'),
                  ]),
                  const SizedBox(height: 20),
                  SizedBox(width: double.infinity, height: 54,
                    child: ElevatedButton(onPressed: _advanceStatus,
                      style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.deliveryColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                      child: Text(_actionLabel, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)))),
                ]),
              ),
            ),
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

  Widget _circleBtn(IconData icon, VoidCallback onTap) => GestureDetector(onTap: onTap,
    child: Container(width: 44, height: 44, decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8)]),
      child: Icon(icon, size: 20, color: PartnerTheme.textPrimary)));

  Widget _locRow(IconData icon, Color color, String address) => Row(children: [Icon(icon, size: 18, color: color), const SizedBox(width: 10), Expanded(child: Text(address, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)))]);

  Widget _miniStat(String value, String label) => Expanded(child: Container(padding: const EdgeInsets.symmetric(vertical: 10), decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)),
    child: Column(children: [Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)), Text(label, style: const TextStyle(fontSize: 10, color: PartnerTheme.textMuted))])));

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
