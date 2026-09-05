import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Pharmacy notifications — order updates, Rx approvals, promotions.
class PharmacyNotificationsScreen extends StatelessWidget {
  const PharmacyNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final notifications = [
      {'title': 'Order Delivered', 'body': 'Your order PH-2026-001 has been delivered. Rate your experience!', 'time': '10 min ago', 'icon': Icons.check_circle, 'color': Colors.green, 'read': false},
      {'title': 'Prescription Approved', 'body': 'Your prescription RX-002 has been verified and approved.', 'time': '2 hours ago', 'icon': Icons.verified, 'color': Colors.blue, 'read': false},
      {'title': 'Out for Delivery', 'body': 'Your order PH-2026-002 is on its way! ETA: 15 minutes.', 'time': '3 hours ago', 'icon': Icons.delivery_dining, 'color': Colors.indigo, 'read': true},
      {'title': '25% OFF on Vitamins 💊', 'body': 'Use code VIT15 to get 15% off on Vitamins & Supplements. Valid till July 15.', 'time': '1 day ago', 'icon': Icons.local_offer, 'color': Colors.orange, 'read': true},
      {'title': 'Low Price Alert', 'body': 'Crocin Advance 500mg price dropped from KES 85 to KES 45!', 'time': '2 days ago', 'icon': Icons.trending_down, 'color': Colors.teal, 'read': true},
      {'title': 'Prescription Rejected', 'body': 'Your prescription RX-003 was rejected: Image is blurry. Please re-upload.', 'time': '3 days ago', 'icon': Icons.error_outline, 'color': Colors.red, 'read': true},
    ];
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Notifications', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
        actions: [
          TextButton(child: const Text('Mark all read', style: TextStyle(fontSize: 12, color: AppTheme.pharmacyColor, fontWeight: FontWeight.w600)), onPressed: () {}),
        ],
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: notifications.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final n = notifications[i];
          final isRead = n['read'] as bool;
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isRead ? Colors.white : AppTheme.pharmacyColor.withValues(alpha: 0.04),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: isRead ? Colors.grey.shade200 : AppTheme.pharmacyColor.withValues(alpha: 0.15)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: (n['color'] as Color).withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(n['icon'] as IconData, color: n['color'] as Color, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(child: Text(n['title'] as String, style: TextStyle(fontSize: 13, fontWeight: isRead ? FontWeight.w600 : FontWeight.w700))),
                          if (!isRead) Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppTheme.pharmacyColor, shape: BoxShape.circle)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(n['body'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.4)),
                      const SizedBox(height: 6),
                      Text(n['time'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
