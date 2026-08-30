/// KARTSEEK Taxi Booking — Trip Details Screen
///
/// Past trip detail view showing route map, fare breakdown,
/// driver info, timeline, and receipt actions.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Immutable data model for displaying a past trip.
class TripDetail {
  final String rideId;
  final String status;
  final String pickupAddress;
  final String dropAddress;
  final double pickupLat;
  final double pickupLng;
  final double dropLat;
  final double dropLng;
  final String vehicleType;
  final String paymentMethod;
  final double fare;
  final double? tip;
  final double? discount;
  final String currency;
  final String? driverName;
  final String? driverPhoto;
  final double? driverRating;
  final String? vehiclePlate;
  final String? vehicleModel;
  final int? customerRating;
  final String? customerFeedback;
  final DateTime createdAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final double? distanceKm;
  final int? durationMin;

  const TripDetail({
    required this.rideId,
    required this.status,
    required this.pickupAddress,
    required this.dropAddress,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropLat,
    required this.dropLng,
    required this.vehicleType,
    required this.paymentMethod,
    required this.fare,
    this.tip,
    this.discount,
    this.currency = 'NGN',
    this.driverName,
    this.driverPhoto,
    this.driverRating,
    this.vehiclePlate,
    this.vehicleModel,
    this.customerRating,
    this.customerFeedback,
    this.createdAt = const _DefaultDateTime(),
    this.startedAt,
    this.completedAt,
    this.distanceKm,
    this.durationMin,
  });
}

// Helper for const default
class _DefaultDateTime implements DateTime {
  const _DefaultDateTime();
  @override
  dynamic noSuchMethod(Invocation i) => DateTime.now().noSuchMethod(i);
}

class TripDetailsScreen extends StatelessWidget {
  final TripDetail trip;

  const TripDetailsScreen({super.key, required this.trip});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF0F0F23) : Colors.white;
    final cardColor =
        isDark ? const Color(0xFF1A1A2E) : const Color(0xFFF8F9FA);
    final textPrimary = isDark ? Colors.white : Colors.black87;
    final textSecondary = isDark ? Colors.white60 : Colors.black54;
    final currencySymbol = _currencySymbol(trip.currency);

    return Scaffold(
      backgroundColor: bgColor,
      body: CustomScrollView(
        slivers: [
          // ── Map Header ──────────────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: bgColor,
            surfaceTintColor: Colors.transparent,
            leading: _circleBack(context, isDark),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: _circleAction(
                  icon: Icons.share,
                  isDark: isDark,
                  onTap: () => _shareReceipt(context),
                ),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: _buildMap(isDark),
            ),
          ),

          // ── Content ──────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Status & Fare Header ────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _statusChip(trip.status, isDark),
                          const SizedBox(height: 4),
                          Text(
                            _formatDate(trip.createdAt),
                            style:
                                TextStyle(color: textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '$currencySymbol ${trip.fare.toStringAsFixed(0)}',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: textPrimary,
                              letterSpacing: -1,
                            ),
                          ),
                          Text(
                            trip.paymentMethod.toUpperCase(),
                            style: TextStyle(
                                color: textSecondary,
                                fontSize: 11,
                                fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ── Route Timeline ──────────────────────────────────────
                  _buildRouteTimeline(textPrimary, textSecondary),

                  const SizedBox(height: 24),

                  // ── Trip Stats ──────────────────────────────────────────
                  if (trip.distanceKm != null || trip.durationMin != null)
                    _buildTripStats(cardColor, textPrimary, textSecondary),

                  if (trip.distanceKm != null || trip.durationMin != null)
                    const SizedBox(height: 24),

                  // ── Fare Breakdown ──────────────────────────────────────
                  _buildFareBreakdown(
                      cardColor, textPrimary, textSecondary, currencySymbol),

                  const SizedBox(height: 24),

                  // ── Driver Card ─────────────────────────────────────────
                  if (trip.driverName != null)
                    _buildDriverCard(cardColor, textPrimary, textSecondary),

                  if (trip.driverName != null) const SizedBox(height: 24),

                  // ── Your Rating ─────────────────────────────────────────
                  if (trip.customerRating != null)
                    _buildRatingSection(cardColor, textPrimary, textSecondary),

                  if (trip.customerRating != null) const SizedBox(height: 24),

                  // ── Ride ID ─────────────────────────────────────────────
                  _buildRideIdRow(textPrimary, textSecondary, context),

                  const SizedBox(height: 32),

                  // ── Actions ─────────────────────────────────────────────
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {},
                          icon: const Icon(Icons.receipt_long, size: 18),
                          label: const Text('Receipt'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: textPrimary,
                            side: BorderSide(
                                color: isDark
                                    ? const Color(0xFF2A2A3E)
                                    : const Color(0xFFE5E7EB)),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {},
                          icon: const Icon(Icons.support_agent, size: 18),
                          label: const Text('Support'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: textPrimary,
                            side: BorderSide(
                                color: isDark
                                    ? const Color(0xFF2A2A3E)
                                    : const Color(0xFFE5E7EB)),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMap(bool isDark) {
    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: LatLng(
          (trip.pickupLat + trip.dropLat) / 2,
          (trip.pickupLng + trip.dropLng) / 2,
        ),
        zoom: 13,
      ),
      markers: {
        Marker(
          markerId: const MarkerId('pickup'),
          position: LatLng(trip.pickupLat, trip.pickupLng),
          icon:
              BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        ),
        Marker(
          markerId: const MarkerId('drop'),
          position: LatLng(trip.dropLat, trip.dropLng),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        ),
      },
      myLocationEnabled: false,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
      scrollGesturesEnabled: false,
      rotateGesturesEnabled: false,
      tiltGesturesEnabled: false,
      zoomGesturesEnabled: false,
      liteModeEnabled: true,
    );
  }

  Widget _buildRouteTimeline(Color textPrimary, Color textSecondary) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: const Color(0xFF10B981),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
            ),
            Container(width: 2, height: 40, color: const Color(0xFFE5E7EB)),
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
            ),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Pickup',
                  style: TextStyle(
                      color: textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600)),
              Text(trip.pickupAddress,
                  style: TextStyle(
                      color: textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14),
                  maxLines: 2),
              const SizedBox(height: 18),
              Text('Drop-off',
                  style: TextStyle(
                      color: textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600)),
              Text(trip.dropAddress,
                  style: TextStyle(
                      color: textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14),
                  maxLines: 2),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTripStats(
      Color cardColor, Color textPrimary, Color textSecondary) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          if (trip.distanceKm != null)
            _stat('Distance', '${trip.distanceKm!.toStringAsFixed(1)} km',
                textPrimary, textSecondary),
          if (trip.distanceKm != null && trip.durationMin != null)
            Container(
                width: 1,
                height: 30,
                color: textSecondary.withValues(alpha: 0.2)),
          if (trip.durationMin != null)
            _stat('Duration', '${trip.durationMin} min', textPrimary,
                textSecondary),
          if (trip.durationMin != null)
            Container(
                width: 1,
                height: 30,
                color: textSecondary.withValues(alpha: 0.2)),
          _stat('Vehicle', _capitalize(trip.vehicleType), textPrimary,
              textSecondary),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, Color primary, Color secondary) {
    return Column(
      children: [
        Text(value,
            style: TextStyle(
                color: primary, fontWeight: FontWeight.w700, fontSize: 15)),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(color: secondary, fontSize: 11)),
      ],
    );
  }

  Widget _buildFareBreakdown(Color cardColor, Color textPrimary,
      Color textSecondary, String currency) {
    final baseFare = trip.fare - (trip.tip ?? 0) + (trip.discount ?? 0);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Fare Breakdown',
              style: TextStyle(
                  color: textPrimary,
                  fontWeight: FontWeight.w700,
                  fontSize: 14)),
          const SizedBox(height: 12),
          _fareRow('Base Fare', '$currency ${baseFare.toStringAsFixed(0)}',
              textPrimary, textSecondary),
          if (trip.discount != null && trip.discount! > 0)
            _fareRow(
                'Discount',
                '-$currency ${trip.discount!.toStringAsFixed(0)}',
                const Color(0xFF10B981),
                textSecondary),
          if (trip.tip != null && trip.tip! > 0)
            _fareRow('Tip', '$currency ${trip.tip!.toStringAsFixed(0)}',
                textPrimary, textSecondary),
          const Divider(height: 20),
          _fareRow('Total', '$currency ${trip.fare.toStringAsFixed(0)}',
              textPrimary, textSecondary,
              bold: true),
        ],
      ),
    );
  }

  Widget _fareRow(
      String label, String value, Color valueColor, Color labelColor,
      {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: labelColor, fontSize: 13)),
          Text(value,
              style: TextStyle(
                  color: valueColor,
                  fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                  fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildDriverCard(
      Color cardColor, Color textPrimary, Color textSecondary) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: const Color(0xFF3B82F6).withValues(alpha: 0.15),
            child: Text(
              trip.driverName?.substring(0, 1).toUpperCase() ?? 'D',
              style: const TextStyle(
                  color: Color(0xFF3B82F6),
                  fontWeight: FontWeight.w800,
                  fontSize: 20),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(trip.driverName!,
                    style: TextStyle(
                        color: textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 15)),
                if (trip.vehicleModel != null)
                  Text(
                    '${trip.vehicleModel} · ${trip.vehiclePlate ?? ""}',
                    style: TextStyle(color: textSecondary, fontSize: 12),
                  ),
              ],
            ),
          ),
          if (trip.driverRating != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.star, color: Color(0xFFF59E0B), size: 14),
                  const SizedBox(width: 2),
                  Text(
                    trip.driverRating!.toStringAsFixed(1),
                    style: const TextStyle(
                        color: Color(0xFFF59E0B),
                        fontWeight: FontWeight.w700,
                        fontSize: 13),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRatingSection(
      Color cardColor, Color textPrimary, Color textSecondary) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Your Rating',
              style: TextStyle(
                  color: textPrimary,
                  fontWeight: FontWeight.w700,
                  fontSize: 14)),
          const SizedBox(height: 8),
          Row(
            children: List.generate(
                5,
                (i) => Icon(
                      i < (trip.customerRating ?? 0)
                          ? Icons.star
                          : Icons.star_border,
                      color: const Color(0xFFF59E0B),
                      size: 22,
                    )),
          ),
          if (trip.customerFeedback != null) ...[
            const SizedBox(height: 8),
            Text(trip.customerFeedback!,
                style: TextStyle(
                    color: textSecondary,
                    fontSize: 13,
                    fontStyle: FontStyle.italic)),
          ],
        ],
      ),
    );
  }

  Widget _buildRideIdRow(
      Color textPrimary, Color textSecondary, BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Ride ID',
                style: TextStyle(color: textSecondary, fontSize: 11)),
            Text(trip.rideId,
                style: TextStyle(
                    color: textPrimary,
                    fontWeight: FontWeight.w500,
                    fontSize: 12,
                    fontFamily: 'monospace')),
          ],
        ),
        IconButton(
          icon: Icon(Icons.copy, size: 18, color: textSecondary),
          onPressed: () {
            Clipboard.setData(ClipboardData(text: trip.rideId));
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                  content: Text('Ride ID copied'),
                  duration: Duration(seconds: 1)),
            );
          },
        ),
      ],
    );
  }

  Widget _statusChip(String status, bool isDark) {
    Color color;
    String label;
    switch (status) {
      case 'RIDE_COMPLETED':
      case 'tripCompleted':
        color = const Color(0xFF10B981);
        label = 'Completed';
        break;
      case 'CANCELLED_BY_CUSTOMER':
        color = const Color(0xFFF59E0B);
        label = 'Cancelled';
        break;
      case 'CANCELLED_BY_DRIVER':
        color = const Color(0xFFEF4444);
        label = 'Driver Cancelled';
        break;
      default:
        color = const Color(0xFF3B82F6);
        label = _capitalize(status);
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label,
          style: TextStyle(
              color: color, fontWeight: FontWeight.w700, fontSize: 12)),
    );
  }

  Widget _circleBack(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: GestureDetector(
        onTap: () => Navigator.pop(context),
        child: Container(
          decoration: BoxDecoration(
            color:
                (isDark ? Colors.black : Colors.white).withValues(alpha: 0.8),
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.arrow_back_ios_new,
              size: 18, color: isDark ? Colors.white : Colors.black87),
        ),
      ),
    );
  }

  Widget _circleAction(
      {required IconData icon,
      required bool isDark,
      required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: (isDark ? Colors.black : Colors.white).withValues(alpha: 0.8),
          shape: BoxShape.circle,
        ),
        child:
            Icon(icon, size: 18, color: isDark ? Colors.white : Colors.black87),
      ),
    );
  }

  void _shareReceipt(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Generating receipt...')),
    );
  }

  String _formatDate(DateTime dt) {
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}, ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1).toLowerCase();

  String _currencySymbol(String code) {
    switch (code) {
      case 'NGN':
        return '₦';
      case 'KES':
        return 'KSh';
      case 'INR':
        return '₹';
      case 'USD':
        return '\$';
      case 'GBP':
        return '£';
      case 'AED':
        return 'AED';
      case 'QAR':
        return 'QR';
      default:
        return code;
    }
  }
}
