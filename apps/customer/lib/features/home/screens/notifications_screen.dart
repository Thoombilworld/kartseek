import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Notifications screen — shows order updates, promos, and system alerts.
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final notifications = [
      const _N('🛵', 'Order Delivered', 'Your grocery order from FreshMart has been delivered.', '5 min ago', AppTheme.groceryColor, true),
      const _N('🎉', 'Flash Sale Live!', 'Up to 70% off on electronics. Shop now before it ends!', '1 hr ago', AppTheme.marketplaceColor, false),
      const _N('👨‍⚕️', 'Appointment Reminder', 'Your appointment with Dr. Sarah Kamau is tomorrow at 3 PM.', '2 hrs ago', AppTheme.doctorColor, true),
      const _N('💊', 'Prescription Ready', 'Your order from HealthPlus Pharmacy is ready for pickup.', '3 hrs ago', AppTheme.pharmacyColor, false),
      const _N('🚕', 'Rate Your Ride', 'How was your ride with driver Daniel? Rate now.', 'Yesterday', AppTheme.taxiColor, false),
      _N('🍔', '${RegionService.instance.currentCountry.currencySymbol} 100 Cashback', 'You earned ${RegionService.instance.currentCountry.currencySymbol} 100 cashback on your last food order!', 'Yesterday', AppTheme.restaurantColor, false),
      const _N('🔒', 'Security Alert', 'New login detected from Chrome on Windows.', '2 days ago', AppTheme.errorRed, true),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: const Text('Notifications', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        actions: [
          TextButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('All notifications marked as read')),
              );
            }, 
            child: const Text('Mark all read', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primaryGreen))
          ),
        ],
      ),
      body: ListView.separated(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: notifications.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final n = notifications[i];
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: n.unread ? Colors.white : const Color(0xFFF8F9FB),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: n.unread ? n.color.withValues(alpha: 0.2) : const Color(0xFFE5E7EB)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(color: n.color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: Center(child: Text(n.emoji, style: const TextStyle(fontSize: 22))),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(child: Text(n.title, style: TextStyle(fontSize: 15, fontWeight: n.unread ? FontWeight.w700 : FontWeight.w600))),
                          if (n.unread) Container(width: 8, height: 8, decoration: BoxDecoration(color: n.color, shape: BoxShape.circle)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(n.body, style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.4)),
                      const SizedBox(height: 6),
                      Text(n.time, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
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

class _N { final String emoji, title, body, time; final Color color; final bool unread; const _N(this.emoji, this.title, this.body, this.time, this.color, this.unread); }
