import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:flutter/services.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/services/alert_sound_service.dart';
import 'package:kartseek_partner/routing/partner_router.dart';
import 'package:shared_mobile/core/security/secure_api_client.dart';

/// Data model for incoming ride request.
class RideRequestData {
  final String rideId;
  final String customerName;
  final double customerRating;
  final String pickupAddress;
  final String dropAddress;
  final double pickupLat;
  final double pickupLng;
  final double dropLat;
  final double dropLng;
  final double distanceToPickup;
  final double tripDistance;
  final int estimatedFare;
  final String vehicleType;
  final String paymentMethod;
  final String currency;

  const RideRequestData({
    required this.rideId,
    this.customerName = 'Customer',
    this.customerRating = 4.5,
    this.pickupAddress = 'Pickup Location',
    this.dropAddress = 'Destination',
    this.pickupLat = 0.0,
    this.pickupLng = 0.0,
    this.dropLat = 0.0,
    this.dropLng = 0.0,
    this.distanceToPickup = 1.2,
    this.tripDistance = 8.5,
    this.estimatedFare = 450,
    this.vehicleType = 'economy',
    this.paymentMethod = 'cash',
    this.currency = '',
  });

  factory RideRequestData.fromMap(Map<String, dynamic> map) => RideRequestData(
    rideId: map['rideId']?.toString() ?? 'RIDE-000',
    customerName: map['customerName']?.toString() ?? 'Customer',
    customerRating: (map['customerRating'] as num?)?.toDouble() ?? 4.5,
    pickupAddress: map['pickupAddress']?.toString() ?? 'Pickup Location',
    dropAddress: map['dropAddress']?.toString() ?? 'Destination',
    pickupLat: (map['pickupLat'] as num?)?.toDouble() ?? 0.0,
    pickupLng: (map['pickupLng'] as num?)?.toDouble() ?? 0.0,
    dropLat: (map['dropLat'] as num?)?.toDouble() ?? 0.0,
    dropLng: (map['dropLng'] as num?)?.toDouble() ?? 0.0,
    distanceToPickup: (map['distanceToPickup'] as num?)?.toDouble() ?? 1.2,
    tripDistance: (map['tripDistance'] as num?)?.toDouble() ?? 8.5,
    estimatedFare: (map['fareEstimate'] as num?)?.toInt() ?? 450,
    vehicleType: map['vehicleType']?.toString() ?? 'economy',
    paymentMethod: map['paymentMethod']?.toString() ?? 'cash',
    currency: map['currency']?.toString() ?? '',
  );
}

/// Incoming Ride Request Screen — Full-screen popup when a ride request arrives.
///
/// Shows customer details, pickup/drop locations, fare, distance, and a
/// countdown timer. Driver can accept or reject.
class IncomingRideRequestScreen extends StatefulWidget {
  final RideRequestData? rideData;
  const IncomingRideRequestScreen({super.key, this.rideData});
  @override
  State<IncomingRideRequestScreen> createState() => _IncomingRideRequestScreenState();
}

class _IncomingRideRequestScreenState extends State<IncomingRideRequestScreen> with SingleTickerProviderStateMixin {
  static const _timeoutSeconds = 30;
  int _countdown = _timeoutSeconds;
  Timer? _timer;
  late AnimationController _pulseCtrl;
  late RideRequestData _data;
  final _api = SecureApiClient();
  bool _responding = false;

  @override
  void initState() {
    super.initState();
    _data = widget.rideData ?? const RideRequestData(rideId: 'RIDE-DEMO');
    AlertSoundService.instance.playRideRequestAlert();
    HapticFeedback.heavyImpact();

    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown > 0) {
        setState(() => _countdown--);
        if (_countdown % 5 == 0) HapticFeedback.mediumImpact();
      } else {
        t.cancel();
        _reject(auto: true);
      }
    });
  }

  Future<void> _accept() async {
    if (_responding) return;
    setState(() => _responding = true);
    AlertSoundService.instance.stop();
    AlertSoundService.instance.playSuccessHaptic();

    try {
      await _api.post('/taxi/ride/${_data.rideId}/driver/accept', body: {
        'driverId': 'partner_001', // Will come from auth in production
      });
    } catch (e) {
      debugPrint('[IncomingRide] Accept API failed (non-fatal): $e');
    }

    if (mounted) Navigator.pushReplacementNamed(context, PartnerRouter.partnerPickupNav);
  }

  Future<void> _reject({bool auto = false}) async {
    if (_responding) return;
    setState(() => _responding = true);
    AlertSoundService.instance.stop();

    try {
      await _api.post('/taxi/ride/${_data.rideId}/driver/reject', body: {
        'driverId': 'partner_001',
        'reason': auto ? 'TIMEOUT' : 'DRIVER_REJECTED',
      });
    } catch (e) {
      debugPrint('[IncomingRide] Reject API failed (non-fatal): $e');
    }

    if (mounted) Navigator.pop(context);
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
    final progress = _countdown / _timeoutSeconds;
    final isUrgent = _countdown <= 10;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 20),
            // Countdown ring
            AnimatedBuilder(
              animation: _pulseCtrl,
              builder: (_, __) {
                final scale = 1.0 + _pulseCtrl.value * 0.05;
                return Transform.scale(
                  scale: scale,
                  child: SizedBox(
                    width: 96, height: 96,
                    child: Stack(alignment: Alignment.center, children: [
                      SizedBox(
                        width: 96, height: 96,
                        child: CircularProgressIndicator(
                          value: progress, strokeWidth: 4,
                          backgroundColor: Colors.white.withValues(alpha: 0.1),
                          valueColor: AlwaysStoppedAnimation(isUrgent ? const Color(0xFFEF4444) : PartnerTheme.primary),
                        ),
                      ),
                      Text('$_countdown', style: TextStyle(
                        fontSize: 36, fontWeight: FontWeight.w900,
                        color: isUrgent ? const Color(0xFFEF4444) : PartnerTheme.primary,
                      )),
                    ]),
                  ),
                );
              },
            ),
            const SizedBox(height: 12),
            const Text('🚕  New Ride Request', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
            const SizedBox(height: 4),
            Text(
              isUrgent ? '⚠️ Hurry! Request expiring…' : 'Accept within $_countdown seconds',
              style: TextStyle(fontSize: 13, color: isUrgent ? const Color(0xFFFCA5A5) : Colors.white.withValues(alpha: 0.5)),
            ),
            const SizedBox(height: 20),
            // Ride Details Card
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Customer Row
                    Row(children: [
                      CircleAvatar(
                        radius: 24, backgroundColor: PartnerTheme.primaryLight,
                        child: Text(_data.customerName.isNotEmpty ? _data.customerName[0] : 'C',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: PartnerTheme.primary)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(_data.customerName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                        Row(children: [
                          const Icon(Icons.star, size: 14, color: Colors.amber),
                          const SizedBox(width: 2),
                          Text('${_data.customerRating}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PartnerTheme.textMuted)),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(6)),
                            child: Text(_data.paymentMethod.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: PartnerTheme.onlineGreen)),
                          ),
                        ]),
                      ])),
                      // Fare badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF22C55E), Color(0xFF16A34A)]),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text('${_data.currency.isNotEmpty ? _data.currency : RegionService.instance.currentCountry.currencySymbol} ${_data.estimatedFare}',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                      ),
                    ]),
                    const SizedBox(height: 18),
                    // Pickup & Drop
                    _locationTile(Icons.radio_button_checked, const Color(0xFF22C55E), 'PICKUP', _data.pickupAddress),
                    Container(margin: const EdgeInsets.only(left: 11), width: 2, height: 20, color: PartnerTheme.border),
                    _locationTile(Icons.location_on, const Color(0xFFEF4444), 'DROP-OFF', _data.dropAddress),
                    const SizedBox(height: 16),
                    const Divider(color: PartnerTheme.border),
                    const SizedBox(height: 12),
                    // Stats Row
                    Row(children: [
                      _infoChip(Icons.navigation, '${_data.distanceToPickup.toStringAsFixed(1)} km', 'To Pickup'),
                      const SizedBox(width: 8),
                      _infoChip(Icons.route, '${_data.tripDistance.toStringAsFixed(1)} km', 'Trip Dist.'),
                      const SizedBox(width: 8),
                      _infoChip(Icons.schedule, '${(_data.tripDistance * 2 + 5).round()} min', 'Est. Time'),
                    ]),
                    const SizedBox(height: 12),
                    // Vehicle type badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.directions_car, size: 16, color: Color(0xFF64748B)),
                        const SizedBox(width: 6),
                        Text('Vehicle: ${_data.vehicleType[0].toUpperCase()}${_data.vehicleType.substring(1)}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                      ]),
                    ),
                  ]),
                ),
              ),
            ),
            // Action Buttons
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                Expanded(child: SizedBox(
                  height: 56,
                  child: OutlinedButton(
                    onPressed: _responding ? null : _reject,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white38, width: 2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text('Reject', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white70)),
                  ),
                )),
                const SizedBox(width: 14),
                Expanded(flex: 2, child: SizedBox(
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _responding ? null : _accept,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: PartnerTheme.onlineGreen,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _responding
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Accept Ride', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                )),
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _locationTile(IconData icon, Color color, String label, String address) {
    return Row(children: [
      Icon(icon, size: 20, color: color),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color, letterSpacing: 1)),
        const SizedBox(height: 2),
        Text(address, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      ])),
    ]);
  }

  Widget _infoChip(IconData icon, String value, String label) {
    return Expanded(child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)),
      child: Column(children: [
        Icon(icon, size: 18, color: PartnerTheme.primary),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
        Text(label, style: const TextStyle(fontSize: 10, color: PartnerTheme.textMuted)),
      ]),
    ));
  }
}
