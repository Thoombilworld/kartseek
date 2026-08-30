import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Restaurant Seller Notifications Screen.
class RestaurantSellerNotificationsScreen extends StatelessWidget {
  const RestaurantSellerNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    final notifs = [
      {'title': 'New Order #ORD-7721', 'desc': '2x Chicken Biryani, 1x Paneer Tikka — KES 980', 'time': '1 min ago', 'icon': Icons.receipt_long, 'color': c},
      {'title': 'Table Booking Request', 'desc': 'Booking for 6 guests on Jul 10 at 7:30 PM', 'time': '10 min ago', 'icon': Icons.event_seat, 'color': Colors.blue},
      {'title': 'New Review ★★★★★', 'desc': '"Amazing biryani! Best in town." — Sarah K.', 'time': '1 hr ago', 'icon': Icons.star, 'color': Colors.amber},
      {'title': 'Ingredient Low Stock', 'desc': 'Basmati Rice — only 5 kg remaining', 'time': '2 hrs ago', 'icon': Icons.warning_amber, 'color': Colors.red},
      {'title': 'Daily Summary', 'desc': '42 orders completed, KES 38,400 revenue today', 'time': '6 hrs ago', 'icon': Icons.insights, 'color': Colors.green},
    ];
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Notifications', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16), itemCount: notifs.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final n = notifs[i];
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 40, height: 40, decoration: BoxDecoration(color: (n['color'] as Color).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: Icon(n['icon'] as IconData, color: n['color'] as Color, size: 20)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(n['title'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text(n['desc'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                const SizedBox(height: 4),
                Text(n['time'] as String, style: TextStyle(fontSize: 9, color: Colors.grey.shade400)),
              ])),
            ]),
          );
        },
      ),
    );
  }
}
