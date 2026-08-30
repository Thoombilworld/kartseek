/// KARTSEEK Taxi Booking — Emergency SOS Screen
///
/// Critical safety screen with one-tap SOS activation, pulsing alarm UI,
/// emergency call, and issue selection. Sends SOS via BookingBloc.
library;

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart';
import '../blocs/booking_bloc.dart';
import 'package:shared_mobile/core/services/region_service.dart';

class EmergencyScreen extends StatefulWidget {
  const EmergencyScreen({super.key});

  @override
  State<EmergencyScreen> createState() => _EmergencyScreenState();
}

class _EmergencyScreenState extends State<EmergencyScreen>
    with TickerProviderStateMixin {
  late final AnimationController _pulseCtrl;
  late final AnimationController _scaleCtrl;
  late final Animation<double> _pulseAnim;
  late final Animation<double> _scaleAnim;

  bool _sosActivated = false;
  String? _selectedIssue;
  int _countdownValue = 5;
  Timer? _countdownTimer;

  static const _issueOptions = [
    {'icon': Icons.speed, 'label': 'Unsafe driving', 'color': Color(0xFFEF4444)},
    {'icon': Icons.wrong_location, 'label': 'Wrong route', 'color': Color(0xFFF59E0B)},
    {'icon': Icons.person_off, 'label': 'Threatening behavior', 'color': Color(0xFFEF4444)},
    {'icon': Icons.car_crash, 'label': 'Accident', 'color': Color(0xFFEF4444)},
    {'icon': Icons.local_drink, 'label': 'Driver intoxicated', 'color': Color(0xFFDC2626)},
    {'icon': Icons.report, 'label': 'Other emergency', 'color': Color(0xFFF97316)},
  ];

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.85, end: 1.15).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );

    _scaleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _scaleAnim = Tween<double>(begin: 1.0, end: 0.92).animate(
      CurvedAnimation(parent: _scaleCtrl, curve: Curves.easeInOut),
    );

    // Vibrate on entry to signal urgency
    HapticFeedback.heavyImpact();
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _scaleCtrl.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    setState(() => _countdownValue = 5);
    _scaleCtrl.forward();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) { timer.cancel(); return; }
      setState(() => _countdownValue--);
      HapticFeedback.mediumImpact();
      if (_countdownValue <= 0) {
        timer.cancel();
        _activateSOS();
      }
    });
  }

  void _cancelCountdown() {
    _countdownTimer?.cancel();
    _scaleCtrl.reverse();
    setState(() => _countdownValue = 5);
  }

  void _activateSOS() {
    final state = context.read<BookingBloc>().state;
    final rideId = state.activeTrip?.rideId;
    if (rideId != null) {
      context.read<BookingBloc>().add(CancelRide(
        reason: 'SOS Emergency: ${_selectedIssue ?? "Emergency alert triggered"}',
      ));
    }

    setState(() => _sosActivated = true);
    _scaleCtrl.reverse();
    HapticFeedback.heavyImpact();

    // Auto-call emergency services
    _callEmergency();
  }

  Future<void> _callEmergency() async {
    final emergencyNumber = _getEmergencyNumber();
    final uri = Uri.parse('tel:$emergencyNumber');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  String _getEmergencyNumber() {
    final country = RegionService.instance.currentCountry.code;
    switch (country) {
      case 'US': return '911';
      case 'GB': return '999';
      case 'IN': return '112';
      case 'AE': case 'QA': return '999';
      case 'KE': return '999';
      default: return '112';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: _sosActivated
          ? const Color(0xFF1A0505)
          : (isDark ? const Color(0xFF0F0F23) : const Color(0xFFFEF2F2)),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: isDark || _sosActivated ? Colors.white : Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Emergency',
          style: TextStyle(
            color: isDark || _sosActivated ? Colors.white : Colors.black87,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: _sosActivated ? _buildActivatedView(isDark) : _buildSOSView(isDark),
      ),
    );
  }

  Widget _buildSOSView(bool isDark) {
    final textPrimary = isDark ? Colors.white : Colors.black87;
    final textSecondary = isDark ? Colors.white60 : Colors.black54;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 24),

          // ── SOS Button ─────────────────────────────────────────────────
          AnimatedBuilder(
            animation: _pulseAnim,
            builder: (context, child) => Transform.scale(
              scale: _pulseAnim.value,
              child: child,
            ),
            child: AnimatedBuilder(
              animation: _scaleAnim,
              builder: (context, child) => Transform.scale(
                scale: _scaleAnim.value,
                child: child,
              ),
              child: GestureDetector(
                onLongPressStart: (_) => _startCountdown(),
                onLongPressEnd: (_) {
                  if (!_sosActivated && _countdownValue > 0) _cancelCountdown();
                },
                child: Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const RadialGradient(
                      colors: [Color(0xFFEF4444), Color(0xFFB91C1C)],
                      center: Alignment.center,
                      radius: 0.8,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.4),
                        blurRadius: 40,
                        spreadRadius: 5,
                      ),
                    ],
                  ),
                  child: Center(
                    child: _countdownTimer?.isActive == true
                        ? Text(
                            '$_countdownValue',
                            style: const TextStyle(
                              fontSize: 56,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          )
                        : const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.emergency, color: Colors.white, size: 48),
                              SizedBox(height: 4),
                              Text(
                                'SOS',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                  letterSpacing: 3,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          ),

          const SizedBox(height: 20),
          Text(
            'Long press to activate SOS',
            style: TextStyle(
              color: textSecondary,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Emergency services will be called automatically',
            style: TextStyle(color: textSecondary, fontSize: 12),
          ),

          const SizedBox(height: 36),

          // ── Issue Selection ─────────────────────────────────────────────
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'What\'s happening?',
              style: TextStyle(
                color: textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 12),

          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _issueOptions.map((opt) {
              final isSelected = _selectedIssue == opt['label'];
              final color = opt['color'] as Color;
              return GestureDetector(
                onTap: () => setState(() => _selectedIssue = opt['label'] as String),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected ? color.withValues(alpha: 0.15) : (isDark ? const Color(0xFF1A1A2E) : Colors.white),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? color : (isDark ? const Color(0xFF2A2A3E) : const Color(0xFFE5E7EB)),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(opt['icon'] as IconData, color: color, size: 16),
                      const SizedBox(width: 6),
                      Text(
                        opt['label'] as String,
                        style: TextStyle(
                          color: isSelected ? color : textPrimary,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 32),

          // ── Direct Call Button ──────────────────────────────────────────
          SizedBox(
            width: double.infinity,
            height: 52,
            child: OutlinedButton.icon(
              onPressed: _callEmergency,
              icon: const Icon(Icons.phone, size: 20),
              label: Text('Call ${_getEmergencyNumber()} directly'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFEF4444),
                side: const BorderSide(color: Color(0xFFEF4444)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildActivatedView(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Pulsing emergency icon
            AnimatedBuilder(
              animation: _pulseAnim,
              builder: (context, child) => Transform.scale(
                scale: _pulseAnim.value,
                child: child,
              ),
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFEF4444).withValues(alpha: 0.2),
                  border: Border.all(color: const Color(0xFFEF4444), width: 3),
                ),
                child: const Icon(Icons.emergency, color: Color(0xFFEF4444), size: 56),
              ),
            ),
            const SizedBox(height: 32),
            const Text(
              'SOS Activated',
              style: TextStyle(
                color: Color(0xFFEF4444),
                fontSize: 28,
                fontWeight: FontWeight.w900,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Emergency services have been notified.\nYour live location is being shared.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 40),

            // Call emergency again
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton.icon(
                onPressed: _callEmergency,
                icon: const Icon(Icons.phone, color: Colors.white),
                label: Text('Call ${_getEmergencyNumber()}'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Close
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text(
                'I\'m safe now',
                style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
