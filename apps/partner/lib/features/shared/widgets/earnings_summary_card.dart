import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Earnings summary card for partner dashboards
class EarningsSummaryCard extends StatelessWidget {
  final double todayEarnings;
  final int completedJobs;
  final double onlineHours;
  final double rating;

  const EarningsSummaryCard({
    super.key,
    required this.todayEarnings,
    required this.completedJobs,
    required this.onlineHours,
    required this.rating,
  });

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: PartnerTheme.earningsGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: const Color(0xFF1B5E20).withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Today's Earnings", style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          Text(
            '$currency ${todayEarnings.toStringAsFixed(0)}',
            style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900, letterSpacing: -0.5),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _stat(Icons.check_circle_outline, '$completedJobs', 'Jobs'),
              _divider(),
              _stat(Icons.schedule, '${onlineHours.toStringAsFixed(1)}h', 'Online'),
              _divider(),
              _stat(Icons.star, rating.toStringAsFixed(1), 'Rating'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _stat(IconData icon, String value, String label) {
    return Expanded(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: Colors.white70, size: 16),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
              Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _divider() => Container(width: 1, height: 32, color: Colors.white24);
}
