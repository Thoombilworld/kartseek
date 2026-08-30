import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// Reusable active job card that sticks on the dashboard
class ActiveJobCard extends StatelessWidget {
  final String jobId;
  final String jobType; // 'ride' or 'delivery'
  final String customerName;
  final String status;
  final String pickupAddress;
  final String dropAddress;
  final String amount;
  final VoidCallback onTap;

  const ActiveJobCard({
    super.key,
    required this.jobId,
    required this.jobType,
    required this.customerName,
    required this.status,
    required this.pickupAddress,
    required this.dropAddress,
    required this.amount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isRide = jobType == 'ride';
    final color = isRide ? PartnerTheme.taxiColor : PartnerTheme.deliveryColor;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.3), width: 2),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.15), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isRide ? '🚗 RIDE' : '📦 DELIVERY',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: color),
                  ),
                ),
                const SizedBox(width: 8),
                Text(jobId, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PartnerTheme.textMuted)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: PartnerTheme.statusColor(status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: PartnerTheme.statusColor(status)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(customerName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: PartnerTheme.textPrimary)),
            const SizedBox(height: 10),
            _locationRow(Icons.radio_button_checked, const Color(0xFF22C55E), pickupAddress),
            Container(margin: const EdgeInsets.only(left: 9), width: 2, height: 16, color: const Color(0xFFE2E8F0)),
            _locationRow(Icons.location_on, const Color(0xFFEF4444), dropAddress),
            const SizedBox(height: 12),
            Row(
              children: [
                Text(amount, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: PartnerTheme.textPrimary)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(10)),
                  child: const Text('View Details →', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _locationRow(IconData icon, Color color, String address) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 10),
        Expanded(child: Text(address, style: const TextStyle(fontSize: 13, color: PartnerTheme.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}
