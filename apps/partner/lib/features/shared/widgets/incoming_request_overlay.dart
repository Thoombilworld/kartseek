import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/services/alert_sound_service.dart';

/// KARTSEEK Partner App — Incoming Request Pop-up Overlay
///
/// A premium, full-screen overlay that appears when a ride request or delivery
/// task arrives. Shows a pulsing countdown timer, request details, and
/// Accept/Reject actions. Plays sound alerts via [AlertSoundService].
///
/// Usage:
///   IncomingRequestOverlay.show(context, type: 'ride', data: {...});
class IncomingRequestOverlay {
  IncomingRequestOverlay._();

  /// Show the overlay as a modal bottom sheet with full-screen dark backdrop.
  static Future<bool> show(
    BuildContext context, {
    required String type,
    required String customerName,
    required String pickup,
    required String drop,
    required String amount,
    String? distance,
    String? storeName,
    String? orderType,
    String? paymentMethod,
    int countdownSeconds = 30,
  }) async {
    final isRide = type == 'ride';

    // Start alert sound
    if (isRide) {
      AlertSoundService.instance.playRideRequestAlert();
    } else {
      AlertSoundService.instance.playDeliveryRequestAlert();
    }

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _IncomingRequestSheet(
        type: type,
        customerName: customerName,
        pickup: pickup,
        drop: drop,
        amount: amount,
        distance: distance,
        storeName: storeName,
        orderType: orderType,
        paymentMethod: paymentMethod,
        countdownSeconds: countdownSeconds,
      ),
    );

    // Stop alert sound when dismissed
    AlertSoundService.instance.stop();

    return result ?? false;
  }
}

class _IncomingRequestSheet extends StatefulWidget {
  final String type;
  final String customerName;
  final String pickup;
  final String drop;
  final String amount;
  final String? distance;
  final String? storeName;
  final String? orderType;
  final String? paymentMethod;
  final int countdownSeconds;

  const _IncomingRequestSheet({
    required this.type,
    required this.customerName,
    required this.pickup,
    required this.drop,
    required this.amount,
    this.distance,
    this.storeName,
    this.orderType,
    this.paymentMethod,
    this.countdownSeconds = 30,
  });

  @override
  State<_IncomingRequestSheet> createState() => _IncomingRequestSheetState();
}

class _IncomingRequestSheetState extends State<_IncomingRequestSheet>
    with SingleTickerProviderStateMixin {
  late int _countdown;
  Timer? _timer;
  late AnimationController _pulseCtrl;

  bool get _isRide => widget.type == 'ride';
  Color get _accentColor => _isRide ? PartnerTheme.taxiColor : PartnerTheme.deliveryColor;

  @override
  void initState() {
    super.initState();
    _countdown = widget.countdownSeconds;

    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown > 0) {
        setState(() => _countdown--);
        // Re-trigger haptic every 5 seconds
        if (_countdown % 5 == 0) {
          HapticFeedback.mediumImpact();
        }
      } else {
        t.cancel();
        if (mounted) Navigator.pop(context, false);
      }
    });

    // Initial strong haptic burst
    HapticFeedback.heavyImpact();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 12),
            // Handle bar
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),

            // Pulsing countdown ring
            AnimatedBuilder(
              animation: _pulseCtrl,
              builder: (_, __) {
                final scale = 1.0 + _pulseCtrl.value * 0.06;
                return Transform.scale(
                  scale: scale,
                  child: Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          _accentColor.withValues(alpha: 0.25),
                          _accentColor.withValues(alpha: 0.05),
                        ],
                      ),
                      border: Border.all(color: _accentColor, width: 3),
                    ),
                    child: Center(
                      child: Text(
                        '$_countdown',
                        style: TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                          color: _accentColor,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 14),
            Text(
              _isRide ? '🚕  New Ride Request' : '📦  New Delivery Task',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Accept within $_countdown seconds',
              style: TextStyle(
                fontSize: 13,
                color: Colors.white.withValues(alpha: 0.5),
              ),
            ),
            const SizedBox(height: 20),

            // Request details card
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Customer info
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 22,
                            backgroundColor: _accentColor.withValues(alpha: 0.1),
                            child: Icon(
                              _isRide ? Icons.person : Icons.local_shipping,
                              color: _accentColor,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.customerName,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                if (widget.paymentMethod != null)
                                  Text(
                                    widget.paymentMethod!,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: PartnerTheme.textMuted,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: _accentColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              widget.amount,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: _accentColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (widget.storeName != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: PartnerTheme.deliveryColor.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.store, size: 16, color: PartnerTheme.deliveryColor),
                              const SizedBox(width: 8),
                              Text(
                                widget.storeName!,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: PartnerTheme.deliveryColor,
                                ),
                              ),
                              if (widget.orderType != null) ...[
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: PartnerTheme.deliveryColor.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    widget.orderType!,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: PartnerTheme.deliveryColor,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),

                      // Pickup
                      _locationRow(
                        icon: Icons.radio_button_checked,
                        color: PartnerTheme.onlineGreen,
                        label: 'PICKUP',
                        address: widget.pickup,
                      ),
                      Container(
                        margin: const EdgeInsets.only(left: 10),
                        width: 2,
                        height: 20,
                        color: PartnerTheme.border,
                      ),
                      _locationRow(
                        icon: Icons.location_on,
                        color: PartnerTheme.offlineRed,
                        label: 'DROP',
                        address: widget.drop,
                      ),

                      if (widget.distance != null) ...[
                        const SizedBox(height: 14),
                        const Divider(color: PartnerTheme.border),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            _statChip(Icons.route, widget.distance!, 'Distance'),
                            _statChip(Icons.payments, widget.amount, 'Est. Fare'),
                            _statChip(
                              Icons.timer,
                              '${_countdown}s',
                              'Time Left',
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Action buttons
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 54,
                      child: OutlinedButton(
                        onPressed: () {
                          AlertSoundService.instance.playErrorHaptic();
                          Navigator.pop(context, false);
                        },
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white30, width: 2),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'Reject',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Colors.white70,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    flex: 2,
                    child: SizedBox(
                      height: 54,
                      child: ElevatedButton(
                        onPressed: () {
                          AlertSoundService.instance.playSuccessHaptic();
                          Navigator.pop(context, true);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isRide
                              ? PartnerTheme.onlineGreen
                              : PartnerTheme.deliveryColor,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 4,
                          shadowColor: (_isRide
                                  ? PartnerTheme.onlineGreen
                                  : PartnerTheme.deliveryColor)
                              .withValues(alpha: 0.4),
                        ),
                        child: Text(
                          _isRide ? 'Accept Ride' : 'Accept Task',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _locationRow({
    required IconData icon,
    required Color color,
    required String label,
    required String address,
  }) {
    return Row(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: color,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                address,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _statChip(IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, size: 16, color: _accentColor),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            color: PartnerTheme.textMuted,
          ),
        ),
      ],
    );
  }
}
