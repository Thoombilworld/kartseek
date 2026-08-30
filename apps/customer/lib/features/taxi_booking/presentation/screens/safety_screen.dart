/// KARTSEEK Taxi Booking — Safety Center Screen
///
/// Safety hub during active rides: share trip, emergency contacts,
/// live location sharing, safety tips, and SOS access.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/booking_bloc.dart';
import '../../taxi_booking_routes.dart';

class SafetyScreen extends StatelessWidget {
  const SafetyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF0F0F23) : Colors.white;
    final cardColor = isDark ? const Color(0xFF1A1A2E) : const Color(0xFFF8F9FA);
    final textPrimary = isDark ? Colors.white : Colors.black87;
    final textSecondary = isDark ? Colors.white60 : Colors.black54;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: bgColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: textPrimary, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Safety Center',
          style: TextStyle(
            color: textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
      ),
      body: BlocBuilder<BookingBloc, BookingState>(
        builder: (context, state) {
          final trip = state.activeTrip;
          final hasActiveTrip = trip != null;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Active Trip Safety Banner ─────────────────────────────
                if (hasActiveTrip) ...[
                  _buildActiveTripBanner(context, isDark, trip),
                  const SizedBox(height: 24),
                ],

                // ── SOS Emergency Button ──────────────────────────────────
                _buildSOSButton(context, isDark, hasActiveTrip),
                const SizedBox(height: 24),

                // ── Safety Actions ────────────────────────────────────────
                Text(
                  'Safety Actions',
                  style: TextStyle(
                    color: textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),

                _SafetyActionTile(
                  icon: Icons.share_location,
                  title: 'Share Trip Status',
                  subtitle: 'Share live trip details with trusted contacts',
                  iconColor: const Color(0xFF3B82F6),
                  cardColor: cardColor,
                  textPrimary: textPrimary,
                  textSecondary: textSecondary,
                  onTap: () => _shareTrip(context, state),
                  enabled: hasActiveTrip,
                ),
                const SizedBox(height: 8),

                _SafetyActionTile(
                  icon: Icons.contacts,
                  title: 'Emergency Contacts',
                  subtitle: 'Manage your trusted contacts for ride sharing',
                  iconColor: const Color(0xFF10B981),
                  cardColor: cardColor,
                  textPrimary: textPrimary,
                  textSecondary: textSecondary,
                  onTap: () => _showEmergencyContacts(context, isDark),
                ),
                const SizedBox(height: 8),

                _SafetyActionTile(
                  icon: Icons.verified_user,
                  title: 'Verify Your Ride',
                  subtitle: 'Confirm driver name, photo, and license plate',
                  iconColor: const Color(0xFF8B5CF6),
                  cardColor: cardColor,
                  textPrimary: textPrimary,
                  textSecondary: textSecondary,
                  onTap: () => _showRideVerification(context, state, isDark),
                  enabled: hasActiveTrip,
                ),
                const SizedBox(height: 8),

                _SafetyActionTile(
                  icon: Icons.report_problem_outlined,
                  title: 'Report an Issue',
                  subtitle: 'Report safety concerns about this trip',
                  iconColor: const Color(0xFFF59E0B),
                  cardColor: cardColor,
                  textPrimary: textPrimary,
                  textSecondary: textSecondary,
                  onTap: () => _reportIssue(context),
                  enabled: hasActiveTrip,
                ),

                const SizedBox(height: 32),

                // ── Safety Tips ───────────────────────────────────────────
                Text(
                  'Safety Tips',
                  style: TextStyle(
                    color: textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),

                ..._safetyTips.map((tip) => _SafetyTipCard(
                      tip: tip,
                      isDark: isDark,
                      textPrimary: textPrimary,
                      textSecondary: textSecondary,
                    )),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildActiveTripBanner(BuildContext context, bool isDark, dynamic trip) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.shield, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Trip in Progress',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Your trip is being monitored for safety',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              'LIVE',
              style: TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSOSButton(BuildContext context, bool isDark, bool hasActiveTrip) {
    return GestureDetector(
      onTap: hasActiveTrip
          ? () => Navigator.pushNamed(context, TaxiBookingRoutes.emergency)
          : null,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          gradient: hasActiveTrip
              ? const LinearGradient(colors: [Color(0xFFDC2626), Color(0xFFB91C1C)])
              : null,
          color: hasActiveTrip ? null : (isDark ? const Color(0xFF2A2A3E) : const Color(0xFFE5E7EB)),
          borderRadius: BorderRadius.circular(16),
          boxShadow: hasActiveTrip
              ? [BoxShadow(color: const Color(0xFFDC2626).withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))]
              : null,
        ),
        child: Column(
          children: [
            Icon(
              Icons.emergency,
              size: 40,
              color: hasActiveTrip ? Colors.white : (isDark ? Colors.white38 : Colors.black26),
            ),
            const SizedBox(height: 8),
            Text(
              'Emergency SOS',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: hasActiveTrip ? Colors.white : (isDark ? Colors.white38 : Colors.black26),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              hasActiveTrip ? 'Tap for immediate emergency assistance' : 'Available during active trips only',
              style: TextStyle(
                fontSize: 12,
                color: hasActiveTrip ? Colors.white70 : (isDark ? Colors.white24 : Colors.black26),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _shareTrip(BuildContext context, BookingState state) {
    final trip = state.activeTrip;
    if (trip == null) return;
    final message = 'I\'m on a KARTSEEK ride!\n'
        'Driver: ${trip.driver?.name ?? "Assigned"}\n'
        'Pickup: ${state.pickup?.address ?? "My location"}\n'
        'Drop: ${state.destination?.address ?? "Destination"}\n'
        'Track my ride: https://kartseek.app/track/${trip.rideId}';
    Clipboard.setData(ClipboardData(text: message));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Trip info copied! Open your messaging app to share.')),
      );
    }
  }

  void _showEmergencyContacts(BuildContext context, bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1A1A2E) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade400, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            Text('Emergency Contacts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: isDark ? Colors.white : Colors.black87)),
            const SizedBox(height: 16),
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person_add)),
              title: const Text('Add Emergency Contact'),
              subtitle: const Text('Your contacts will be notified during emergencies'),
              onTap: () => Navigator.pop(context),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showRideVerification(BuildContext context, BookingState state, bool isDark) {
    final trip = state.activeTrip;
    if (trip == null) return;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1A1A2E) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade400, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            Text('Verify Your Ride', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: isDark ? Colors.white : Colors.black87)),
            const SizedBox(height: 16),
            _infoRow('Driver', trip.driver?.name ?? 'Assigned', isDark),
            _infoRow('Vehicle', trip.vehicle?.plateNumber ?? 'N/A', isDark),
            _infoRow('Ride ID', trip.rideId, isDark),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: isDark ? Colors.white60 : Colors.black54)),
          Text(value, style: TextStyle(fontWeight: FontWeight.w600, color: isDark ? Colors.white : Colors.black87)),
        ],
      ),
    );
  }

  void _reportIssue(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Report submitted. Our safety team will review it.')),
    );
  }

  static const _safetyTips = [
    {'icon': Icons.check_circle, 'title': 'Verify driver details', 'desc': 'Always check the driver name, photo, and license plate before boarding.'},
    {'icon': Icons.share, 'title': 'Share your trip', 'desc': 'Share your live trip status with a trusted friend or family member.'},
    {'icon': Icons.gps_fixed, 'title': 'Follow the route', 'desc': 'Keep an eye on the navigation to ensure the driver follows the correct route.'},
    {'icon': Icons.phone, 'title': 'Keep your phone charged', 'desc': 'Ensure your phone has enough battery for the duration of your trip.'},
  ];
}

class _SafetyActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color iconColor;
  final Color cardColor;
  final Color textPrimary;
  final Color textSecondary;
  final VoidCallback onTap;
  final bool enabled;

  const _SafetyActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.iconColor,
    required this.cardColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.onTap,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1.0 : 0.4,
      child: Material(
        color: cardColor,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: enabled ? onTap : null,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: iconColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: iconColor, size: 20),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: TextStyle(color: textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                      const SizedBox(height: 2),
                      Text(subtitle, style: TextStyle(color: textSecondary, fontSize: 12)),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: textSecondary, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SafetyTipCard extends StatelessWidget {
  final Map<String, dynamic> tip;
  final bool isDark;
  final Color textPrimary;
  final Color textSecondary;

  const _SafetyTipCard({
    required this.tip,
    required this.isDark,
    required this.textPrimary,
    required this.textSecondary,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(tip['icon'] as IconData, color: const Color(0xFF10B981), size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tip['title'] as String, style: TextStyle(color: textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 2),
                Text(tip['desc'] as String, style: TextStyle(color: textSecondary, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
