import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Live delivery map tracking — shows driver location, ETA, and route.
class PharmacyLiveTrackingScreen extends StatefulWidget {
  final String orderId;
  const PharmacyLiveTrackingScreen({super.key, this.orderId = 'PH-2026-1234'});
  @override
  State<PharmacyLiveTrackingScreen> createState() =>
      _PharmacyLiveTrackingScreenState();
}

class _PharmacyLiveTrackingScreenState extends State<PharmacyLiveTrackingScreen>
    with TickerProviderStateMixin {
  late AnimationController _breatheCtrl;
  final String _driverName = 'Mohammed A.';
  // ignore: unused_field
  final String _driverPhone = '+971 55 123 4567';
  final String _vehicleInfo = 'Honda Activa • DL 4C AB 1234';
  final int _etaMinutes = 12;

  @override
  void initState() {
    super.initState();
    _breatheCtrl =
        AnimationController(vsync: this, duration: const Duration(seconds: 2))
          ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _breatheCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      body: Stack(
        children: [
          // Map placeholder
          Container(
            width: double.infinity,
            height: double.infinity,
            color: const Color(0xFFE8F0FE),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(Icons.map_rounded, size: 120, color: Colors.grey.shade300),
                // Animated driver marker
                AnimatedBuilder(
                  animation: _breatheCtrl,
                  builder: (_, __) => Container(
                    width: 56 + _breatheCtrl.value * 12,
                    height: 56 + _breatheCtrl.value * 12,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.pharmacyColor
                          .withValues(alpha: 0.15 + _breatheCtrl.value * 0.1),
                    ),
                    child: Center(
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppTheme.pharmacyColor,
                          boxShadow: [
                            BoxShadow(
                                color: AppTheme.pharmacyColor
                                    .withValues(alpha: 0.4),
                                blurRadius: 12)
                          ],
                        ),
                        child: const Icon(Icons.delivery_dining,
                            color: Colors.white, size: 22),
                      ),
                    ),
                  ),
                ),
                // Destination marker
                Positioned(
                  bottom: MediaQuery.of(context).size.height * 0.38,
                  right: 60,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                        shape: BoxShape.circle, color: Colors.green.shade600),
                    child: const Icon(Icons.home_rounded,
                        color: Colors.white, size: 18),
                  ),
                ),
              ],
            ),
          ),

          // Top bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withValues(alpha: 0.08),
                                blurRadius: 8)
                          ]),
                      child: const Icon(Icons.arrow_back_ios_new,
                          size: 18, color: Colors.black87),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withValues(alpha: 0.08),
                              blurRadius: 8)
                        ]),
                    child: Row(children: [
                      const Icon(Icons.receipt_long,
                          size: 16, color: Colors.black54),
                      const SizedBox(width: 6),
                      Text(widget.orderId,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 13)),
                    ]),
                  ),
                ],
              ),
            ),
          ),

          // Bottom driver card
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(28)),
                boxShadow: [
                  BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 20,
                      offset: const Offset(0, -8))
                ],
              ),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                // Handle
                Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2))),
                const SizedBox(height: 16),

                // ETA banner
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [
                      AppTheme.pharmacyColor,
                      AppTheme.pharmacyColor.withValues(alpha: 0.8)
                    ]),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(children: [
                    const Icon(Icons.access_time_filled,
                        color: Colors.white, size: 28),
                    const SizedBox(width: 14),
                    Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Estimated Arrival',
                              style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500)),
                          Text('$_etaMinutes min',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: -0.5)),
                        ]),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8)),
                      child: const Text('On the way',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 12)),
                    ),
                  ]),
                ),
                const SizedBox(height: 16),

                // Driver info
                Row(children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                        shape: BoxShape.circle, color: Colors.grey.shade100),
                    child:
                        const Icon(Icons.person, color: Colors.grey, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(_driverName,
                            style: const TextStyle(
                                fontWeight: FontWeight.w800, fontSize: 16)),
                        const SizedBox(height: 2),
                        Text(_vehicleInfo,
                            style: TextStyle(
                                color: Colors.grey.shade500, fontSize: 12)),
                      ])),
                  // Call
                  GestureDetector(
                    onTap: () {},
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                          color: Colors.green.shade50, shape: BoxShape.circle),
                      child: Icon(Icons.phone,
                          color: Colors.green.shade600, size: 20),
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Chat
                  GestureDetector(
                    onTap: () {},
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                          color: AppTheme.pharmacyColor.withValues(alpha: 0.1),
                          shape: BoxShape.circle),
                      child: const Icon(Icons.chat_bubble_outline,
                          color: AppTheme.pharmacyColor, size: 20),
                    ),
                  ),
                ]),
                const SizedBox(height: 16),

                // Status steps
                Row(
                  children: [
                    _statusDot(true, 'Picked up'),
                    _statusLine(true),
                    _statusDot(true, 'On the way'),
                    _statusLine(false),
                    _statusDot(false, 'Delivered'),
                  ],
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusDot(bool done, String label) {
    return Expanded(
      child: Column(children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: done ? AppTheme.pharmacyColor : Colors.grey.shade200,
          ),
          child: Icon(done ? Icons.check : Icons.circle,
              color: done ? Colors.white : Colors.grey.shade400, size: 14),
        ),
        const SizedBox(height: 6),
        Text(label,
            style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: done ? Colors.black87 : Colors.grey.shade400)),
      ]),
    );
  }

  Widget _statusLine(bool done) {
    return Expanded(
      child: Container(
          height: 3,
          margin: const EdgeInsets.only(bottom: 20),
          color: done ? AppTheme.pharmacyColor : Colors.grey.shade200),
    );
  }
}
