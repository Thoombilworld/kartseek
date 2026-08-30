import 'package:flutter/material.dart';
/// Seller pharmacy notifications.
class PharmacySellerNotificationsScreen extends StatelessWidget {
  const PharmacySellerNotificationsScreen({super.key});
  @override Widget build(BuildContext context) {
    final items = [
      {'title': 'New Order #PH-007', 'body': 'John Doe placed a new order (3 items, KES 450)', 'time': '2 min ago', 'icon': Icons.shopping_bag, 'color': Colors.blue},
      {'title': 'Prescription Uploaded', 'body': 'Sarah K. uploaded a new prescription for review', 'time': '15 min ago', 'icon': Icons.description, 'color': Colors.purple},
      {'title': 'Low Stock Alert', 'body': 'Augmentin 625 Duo has only 3 units left', 'time': '1 hr ago', 'icon': Icons.warning, 'color': Colors.orange},
      {'title': 'Payout Processed', 'body': 'KES 45,200 has been transferred to your M-Pesa', 'time': '3 hrs ago', 'icon': Icons.payments, 'color': Colors.green},
    ];
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Notifications', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: items.length, separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) { final n = items[i];
          return Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 40, height: 40, decoration: BoxDecoration(color: (n['color'] as Color).withValues(alpha: 0.12), shape: BoxShape.circle), child: Icon(n['icon'] as IconData, color: n['color'] as Color, size: 20)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(n['title'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                const SizedBox(height: 3),
                Text(n['body'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.3)),
                const SizedBox(height: 4),
                Text(n['time'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
              ])),
            ]),
          );
        }),
    );
  }
}
