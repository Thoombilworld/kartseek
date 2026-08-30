import 'package:flutter/material.dart';

/// Restaurant — Notifications Screen.
class RestaurantNotificationsScreen extends StatefulWidget {
  const RestaurantNotificationsScreen({super.key});
  @override
  State<RestaurantNotificationsScreen> createState() => _RestaurantNotificationsScreenState();
}

class _RestaurantNotificationsScreenState extends State<RestaurantNotificationsScreen> {
  static const _brandColor = Color(0xFFEA580C);
  final _notifications = [
    {'title': 'Order Delivered! 🎉', 'desc': 'Your order #ORD-4521 from The Grand Biryani House has been delivered.', 'time': '2 min ago', 'icon': Icons.check_circle, 'color': 0xFF16A34A, 'read': false},
    {'title': 'Order Being Prepared 🍳', 'desc': 'Chef is preparing your Chicken Biryani and Paneer Tikka!', 'time': '15 min ago', 'icon': Icons.soup_kitchen, 'color': 0xFFEA580C, 'read': false},
    {'title': '50% OFF Flash Deal ⚡', 'desc': 'Pizza Paradise is offering 50% off for the next 2 hours!', 'time': '1 hour ago', 'icon': Icons.local_offer, 'color': 0xFFEAB308, 'read': true},
    {'title': 'Table Booking Confirmed', 'desc': 'Your table for 4 at Spice Garden on Jul 10, 7:30 PM is confirmed.', 'time': '3 hours ago', 'icon': Icons.event_seat, 'color': 0xFF2563EB, 'read': true},
    {'title': 'Rate Your Experience', 'desc': 'How was your meal from Burger Barn? Leave a review!', 'time': 'Yesterday', 'icon': Icons.star, 'color': 0xFFF59E0B, 'read': true},
    {'title': 'New Cuisine Added 🍣', 'desc': 'Japanese cuisine restaurants are now available in your area!', 'time': '2 days ago', 'icon': Icons.restaurant_menu, 'color': 0xFF8B5CF6, 'read': true},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Notifications', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          TextButton(onPressed: () => setState(() { for (final n in _notifications) { n['read'] = true; } }),
            child: const Text('Mark all read', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600))),
        ],
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _notifications.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final n = _notifications[i];
          final isRead = n['read'] as bool;
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isRead ? Colors.white : _brandColor.withValues(alpha: 0.03),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: isRead ? Colors.grey.shade200 : _brandColor.withValues(alpha: 0.2)),
            ),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: Color(n['color'] as int).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: Icon(n['icon'] as IconData, color: Color(n['color'] as int), size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(n['title'] as String, style: TextStyle(fontSize: 13, fontWeight: isRead ? FontWeight.w600 : FontWeight.w800)),
                const SizedBox(height: 3),
                Text(n['desc'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade600, height: 1.3)),
                const SizedBox(height: 4),
                Text(n['time'] as String, style: TextStyle(fontSize: 9, color: Colors.grey.shade400)),
              ])),
              if (!isRead) const DecoratedBox(decoration: BoxDecoration(color: _brandColor, shape: BoxShape.circle), child: SizedBox(width: 8, height: 8)),
            ]),
          );
        },
      ),
    );
  }
}
