import 'dart:async';
import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:flutter/services.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/services/alert_sound_service.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Incoming Delivery Request Screen — Shows when a seller has a delivery ready.
///
/// Plays a repeating sound alert and haptic pattern via [AlertSoundService]
/// to grab the delivery boy's attention. Auto-dismisses on countdown expiry.
class IncomingDeliveryRequestScreen extends StatefulWidget {
  const IncomingDeliveryRequestScreen({super.key});
  @override
  State<IncomingDeliveryRequestScreen> createState() => _IncomingDeliveryRequestScreenState();
}

class _IncomingDeliveryRequestScreenState extends State<IncomingDeliveryRequestScreen> with SingleTickerProviderStateMixin {
  int _countdown = 30;
  Timer? _timer;
  late AnimationController _pulseCtrl;

  // Delivery data — populated from route args (push notification) or mock
  String _orderId = '';
  String _orderType = 'Grocery';
  String _buyerName = 'Mary Njeri';
  String _buyerPhone = '+254700444555';
  String _pickupLocation = 'FreshMart, City Center';
  String _dropLocation = '23 Riverside Drive';
  String _storeName = 'FreshMart Supermarket';
  String _distance = '3.2 km';
  String _deliveryFee = '150';
  String _codAmount = '2,450';
  bool _isCod = true;

  @override
  void initState() {
    super.initState();

    // Extract delivery data from route arguments (real order from Kafka → FCM push)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map<String, dynamic>) {
        setState(() {
          _orderId = args['orderId'] ?? _orderId;
          _orderType = args['serviceType'] ?? _orderType;
          _buyerName = args['buyerName'] ?? _buyerName;
          _buyerPhone = args['buyerPhone'] ?? _buyerPhone;
          _pickupLocation = args['pickupAddress'] ?? _pickupLocation;
          _dropLocation = args['dropAddress'] ?? _dropLocation;
          _storeName = args['storeName'] ?? _storeName;
          _distance = args['distance'] ?? _distance;
          _deliveryFee = args['deliveryFee']?.toString() ?? _deliveryFee;
          _codAmount = args['codAmount']?.toString() ?? _codAmount;
          _isCod = args['isCod'] ?? _isCod;
        });
      }
    });

    // Start sound alert for delivery
    AlertSoundService.instance.playDeliveryRequestAlert();
    HapticFeedback.heavyImpact();

    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown > 0) {
        setState(() => _countdown--);
        if (_countdown % 5 == 0) HapticFeedback.mediumImpact();
      } else {
        t.cancel();
        _dismiss();
      }
    });
  }

  void _dismiss() {
    AlertSoundService.instance.stop();
    if (mounted) Navigator.pop(context);
  }

  void _accept() {
    AlertSoundService.instance.stop();
    AlertSoundService.instance.playSuccessHaptic();
    if (mounted) Navigator.pushReplacementNamed(context, PartnerRouter.partnerActiveDelivery);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseCtrl.dispose();
    AlertSoundService.instance.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 24),
            AnimatedBuilder(
              animation: _pulseCtrl,
              builder: (_, __) {
                final scale = 1.0 + _pulseCtrl.value * 0.06;
                return Transform.scale(
                  scale: scale,
                  child: Container(
                    width: 100, height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: PartnerTheme.deliveryColor.withValues(alpha: 0.15 + _pulseCtrl.value * 0.1),
                      border: Border.all(color: PartnerTheme.deliveryColor, width: 3),
                    ),
                    child: Center(child: Text('$_countdown', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: PartnerTheme.deliveryColor))),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            const Text('📦  New Delivery Task', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
            const SizedBox(height: 4),
            Text(
              'Accept within $_countdown seconds',
              style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.5)),
            ),
            const SizedBox(height: 32),
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 20), padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        CircleAvatar(radius: 24, backgroundColor: PartnerTheme.deliveryColor.withValues(alpha: 0.1), child: const Icon(Icons.local_shipping, color: PartnerTheme.deliveryColor)),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(_buyerName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                          Text(_buyerPhone, style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
                        ])),
                        if (_isCod) Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(8)),
                          child: const Text('COD', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: PartnerTheme.warningAmber)),
                        ),
                      ]),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: PartnerTheme.deliveryColor.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(10)),
                        child: Row(children: [
                          const Icon(Icons.store, size: 18, color: PartnerTheme.deliveryColor),
                          const SizedBox(width: 8),
                          Text('From: $_storeName', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        ]),
                      ),
                      const SizedBox(height: 12),
                      _locationTile(Icons.radio_button_checked, const Color(0xFF22C55E), 'PICKUP', _pickupLocation),
                      Container(margin: const EdgeInsets.only(left: 11), width: 2, height: 24, color: PartnerTheme.border),
                      _locationTile(Icons.location_on, const Color(0xFFEF4444), 'DROP', _dropLocation),
                      const SizedBox(height: 16),
                      const Divider(),
                      const SizedBox(height: 8),
                      Row(children: [
                        _infoChip(Icons.shopping_bag, _orderType, 'Order Type'),
                        const SizedBox(width: 8),
                        _infoChip(Icons.route, _distance, 'Distance'),
                        const SizedBox(width: 8),
                        _infoChip(Icons.payments, '${RegionService.instance.currentCountry.currencySymbol} $_deliveryFee', 'Delivery Fee'),
                      ]),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(10)),
                        child: Row(children: [
                          const Icon(Icons.payments, size: 18, color: PartnerTheme.warningAmber),
                          const SizedBox(width: 8),
                          const Text('COD Amount: ', style: TextStyle(fontSize: 13, color: PartnerTheme.textSecondary)),
                          Text('${RegionService.instance.currentCountry.currencySymbol} 2,450', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: PartnerTheme.warningAmber)),
                        ]),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(children: [
                Expanded(child: SizedBox(height: 56, child: OutlinedButton(
                  onPressed: _dismiss,
                  style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.white38, width: 2), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: const Text('Reject', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white70)),
                ))),
                const SizedBox(width: 16),
                Expanded(flex: 2, child: SizedBox(height: 56, child: ElevatedButton(
                  onPressed: _accept,
                  style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.deliveryColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: const Text('Accept Task', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                ))),
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _locationTile(IconData icon, Color color, String label, String address) => Row(children: [
    Icon(icon, size: 22, color: color), const SizedBox(width: 12),
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color, letterSpacing: 1)),
      const SizedBox(height: 2),
      Text(address, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
    ])),
  ]);

  Widget _infoChip(IconData icon, String value, String label) => Expanded(
    child: Container(padding: const EdgeInsets.symmetric(vertical: 10), decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)),
      child: Column(children: [Icon(icon, size: 18, color: PartnerTheme.deliveryColor), const SizedBox(height: 4), Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)), Text(label, style: const TextStyle(fontSize: 10, color: PartnerTheme.textMuted))])),
  );
}
