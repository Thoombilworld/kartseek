/// KARTSEEK Taxi Booking — Driver Searching Screen
///
/// Animated screen displayed while the system searches for an available driver.
/// Features: pulsing radar animation, status messages, cancel option.
library;

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/booking_bloc.dart';
import '../../domain/entities/entities.dart';
import '../../domain/entities/ride_status.dart';

class DriverSearchingScreen extends StatefulWidget {
  const DriverSearchingScreen({super.key});

  @override
  State<DriverSearchingScreen> createState() => _DriverSearchingScreenState();
}

class _DriverSearchingScreenState extends State<DriverSearchingScreen>
    with TickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final AnimationController _rotateController;
  late final Animation<double> _pulseAnim;
  Timer? _demoTimeout;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();

    _rotateController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..repeat();

    _pulseAnim = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Demo/dev timeout: if no driver is assigned within 30s,
    // simulate a driver assignment so the flow can continue.
    _demoTimeout = Timer(const Duration(seconds: 30), _onDemoTimeout);
  }

  void _onDemoTimeout() {
    if (!mounted) return;
    final bloc = context.read<BookingBloc>();
    final trip = bloc.state.activeTrip;
    if (trip == null || trip.status != RideStatus.searchingDriver) return;

    debugPrint('[DriverSearch] ⏱️ Demo timeout — simulating driver assignment');

    // Inject a mock driver assignment
    bloc.add(DriverAssignedUpdate(
      Driver(
        id: 'demo_driver_001',
        name: 'James K.',
        phone: '+254700000000',
        rating: 4.8,
        lat: trip.pickup.lat + 0.002,
        lng: trip.pickup.lng + 0.001,
        heading: 180,
      ),
      vehicle: const Vehicle(
        id: 'demo_vehicle_001',
        model: 'Toyota Prius',
        plateNumber: 'KDA 001A',
        color: 'Silver',
        type: 'economy',
      ),
    ));
  }

  @override
  void dispose() {
    _demoTimeout?.cancel();
    _pulseController.dispose();
    _rotateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return BlocConsumer<BookingBloc, BookingState>(
      listenWhen: (prev, curr) =>
          prev.activeTrip?.status != curr.activeTrip?.status,
      listener: (context, state) {
        final status = state.activeTrip?.status;
        if (status == RideStatus.driverAssigned ||
            status == RideStatus.driverEnRoute) {
          _demoTimeout?.cancel(); // Real driver found, cancel demo fallback
          Navigator.of(context).pushReplacementNamed('/taxi/tracking');
        } else if (status == RideStatus.noDriverAvailable) {
          _demoTimeout?.cancel();
          _showNoDriverDialog(context);
        }
      },
      builder: (context, state) {
        return Scaffold(
          backgroundColor: isDark ? const Color(0xFF0F0F23) : Colors.white,
          body: SafeArea(
            child: Column(
              children: [
                const SizedBox(height: 24),

                // ── Animated Radar ──────────────────────────────────
                Expanded(
                  child: Center(
                    child: _buildRadarAnimation(isDark),
                  ),
                ),

                // ── Status Text ─────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Column(
                    children: [
                      Text(
                        'Finding your driver',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Hold on while we connect you with a driver nearby',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white54 : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // ── Trip Summary ─────────────────────────────────────
                if (state.pickup != null && state.destination != null)
                  _buildTripSummary(state, isDark),

                const SizedBox(height: 24),

                // ── Cancel Button ────────────────────────────────────
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    0,
                    16,
                    MediaQuery.of(context).padding.bottom + 16,
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: TextButton(
                      onPressed: () => _showCancelDialog(context),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFFE53935),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: BorderSide(
                            color: isDark
                                ? const Color(0xFFE53935).withValues(alpha: 0.3)
                                : const Color(0xFFE53935)
                                    .withValues(alpha: 0.2),
                          ),
                        ),
                      ),
                      child: const Text(
                        'Cancel request',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildRadarAnimation(bool isDark) {
    return AnimatedBuilder(
      animation: _pulseAnim,
      builder: (context, child) {
        return SizedBox(
          width: 200,
          height: 200,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Outer pulse ring 1
              _buildPulseRing(180 * _pulseAnim.value, isDark, 0.1),
              // Outer pulse ring 2
              _buildPulseRing(140 * _pulseAnim.value, isDark, 0.15),
              // Outer pulse ring 3
              _buildPulseRing(100 * _pulseAnim.value, isDark, 0.2),
              // Center car icon
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF4CAF50), Color(0xFF2E7D32)],
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4CAF50).withValues(alpha: 0.3),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.local_taxi_rounded,
                  color: Colors.white,
                  size: 32,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPulseRing(double size, bool isDark, double opacity) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: const Color(0xFF4CAF50).withValues(alpha: opacity),
          width: 2,
        ),
      ),
    );
  }

  Widget _buildTripSummary(BookingState state, bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A35) : const Color(0xFFF8F8F8),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          _TripPointRow(
            color: const Color(0xFF4CAF50),
            isCircle: true,
            text: state.pickup?.address ?? 'Pickup',
            isDark: isDark,
          ),
          Container(
            margin: const EdgeInsets.only(left: 14),
            width: 2,
            height: 16,
            color: isDark ? Colors.white12 : Colors.grey[300],
          ),
          _TripPointRow(
            color: const Color(0xFFE53935),
            isCircle: false,
            text: state.destination?.address ?? 'Destination',
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  void _showCancelDialog(BuildContext context) {
    HapticFeedback.mediumImpact();
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Cancel ride request?',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              'No cancellation fee will be charged.',
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Keep waiting'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      context
                          .read<BookingBloc>()
                          .add(const CancelRide(reason: 'Changed mind'));
                      Navigator.of(context).popUntil((route) => route.isFirst);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE53935),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
              ],
            ),
            SizedBox(height: MediaQuery.of(ctx).padding.bottom),
          ],
        ),
      ),
    );
  }

  void _showNoDriverDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('No drivers available'),
        content: const Text(
          'There are no drivers near your pickup location right now. '
          'Please try again in a few minutes or try a different vehicle type.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
            child: const Text('OK'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              // Retry
              context.read<BookingBloc>().add(RequestRide());
            },
            child: const Text('Try again'),
          ),
        ],
      ),
    );
  }
}

class _TripPointRow extends StatelessWidget {
  final Color color;
  final bool isCircle;
  final String text;
  final bool isDark;

  const _TripPointRow({
    required this.color,
    required this.isCircle,
    required this.text,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            shape: isCircle ? BoxShape.circle : BoxShape.rectangle,
            borderRadius: isCircle ? null : BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.white70 : Colors.black87,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
