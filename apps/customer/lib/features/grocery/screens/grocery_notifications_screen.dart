import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';

import 'package:shared_mobile/core/theme/app_theme.dart';

/// Notifications Screen — Push notification center.
class GroceryNotificationsScreen extends StatefulWidget {
  const GroceryNotificationsScreen({super.key});
  @override
  State<GroceryNotificationsScreen> createState() => _GroceryNotificationsScreenState();
}

class _GroceryNotificationsScreenState extends State<GroceryNotificationsScreen> {
  static const _groceryColor = AppTheme.groceryColor;

  final _notifications = <Map<String, dynamic>>[
    {'title': 'Order #GRC-2847 confirmed', 'desc': 'Your order has been placed.', 'time': '2m ago', 'icon': Icons.shopping_bag, 'color': 0xFF1E88E5, 'read': false},
    {'title': 'Out for delivery', 'desc': 'Rahul K. is delivering your order.', 'time': '15m ago', 'icon': Icons.local_shipping, 'color': 0xFF4CAF50, 'read': false},
    {'title': 'Flash Deal: 40% off Fruits!', 'desc': 'Morning Fresh Deals are live.', 'time': '1h ago', 'icon': Icons.local_offer, 'color': 0xFFFF9800, 'read': false},
    {'title': 'Order delivered', 'desc': 'Rate your experience.', 'time': '3h ago', 'icon': Icons.check_circle, 'color': 0xFF4CAF50, 'read': true},
    {'title': 'Price drop alert', 'desc': 'Amul Butter price dropped to ${RegionService.instance.currentCountry.currencySymbol} 275.', 'time': '5h ago', 'icon': Icons.trending_down, 'color': 0xFFF44336, 'read': true},
    {'title': 'Free delivery this weekend!', 'desc': 'Orders above ${RegionService.instance.currentCountry.currencySymbol} 499.', 'time': '1d ago', 'icon': Icons.local_offer, 'color': 0xFFFF9800, 'read': true},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Notifications', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          TextButton(onPressed: () => setState(() { for (var n in _notifications) { n['read'] = true; } }),
            child: const Text('Read all', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w700))),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _notifications.length,
        itemBuilder: (context, i) {
          final n = _notifications[i];
          final isRead = n['read'] as bool;
          return GestureDetector(
            onTap: () => setState(() => n['read'] = true),
            child: Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isRead ? Colors.white : _groceryColor.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isRead ? Colors.grey.shade200 : _groceryColor.withValues(alpha: 0.2)),
              ),
              child: Row(children: [
                Container(
                  width: 38, height: 38,
                  decoration: BoxDecoration(color: Color(n['color'] as int).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                  child: Icon(n['icon'] as IconData, color: Color(n['color'] as int), size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(n['title'] as String, style: TextStyle(fontSize: 12, fontWeight: isRead ? FontWeight.w600 : FontWeight.w800)),
                  Text(n['desc'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  Text(n['time'] as String, style: TextStyle(fontSize: 9, color: Colors.grey.shade400)),
                ])),
                if (!isRead) const DecoratedBox(decoration: BoxDecoration(color: _groceryColor, shape: BoxShape.circle), child: SizedBox(width: 8, height: 8)),
              ]),
            ),
          );
        },
      ),
    );
  }
}
