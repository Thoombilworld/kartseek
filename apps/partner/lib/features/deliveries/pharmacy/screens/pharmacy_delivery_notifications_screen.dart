import 'package:flutter/material.dart';
/// Pharmacy-specific notifications for delivery partners.
class PharmacyDeliveryNotificationsScreen extends StatelessWidget {
  const PharmacyDeliveryNotificationsScreen({super.key});
  @override Widget build(BuildContext context) {
    final items = [
      {'title': 'New Pharmacy Order Available', 'body': 'PH-007 at HealthPlus Pharmacy (2.3 km) — KES 85', 'time': '1 min ago', 'icon': Icons.local_pharmacy, 'color': Colors.blue},
      {'title': 'Customer Updated Address', 'body': 'PH-005 delivery address changed to Gate B', 'time': '10 min ago', 'icon': Icons.location_on, 'color': Colors.orange},
      {'title': 'Cold Chain Reminder', 'body': 'PH-003 contains temperature-sensitive medicines. Deliver within 30 min.', 'time': '25 min ago', 'icon': Icons.ac_unit, 'color': Colors.cyan},
      {'title': 'Payout Received', 'body': 'KES 2,150 has been transferred to your M-Pesa.', 'time': '2 hrs ago', 'icon': Icons.payments, 'color': Colors.green},
      {'title': 'Weekly Report Ready', 'body': 'Your weekly pharmacy delivery stats are now available.', 'time': '1 day ago', 'icon': Icons.analytics, 'color': Colors.purple},
    ];
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Pharmacy Alerts', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: items.length, separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) { final n = items[i];
          return Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 40, height: 40, decoration: BoxDecoration(color: (n['color'] as Color).withValues(alpha: 0.12), shape: BoxShape.circle), child: Icon(n['icon'] as IconData, color: n['color'] as Color, size: 20)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(n['title'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)), const SizedBox(height: 3),
                Text(n['body'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.3)), const SizedBox(height: 4),
                Text(n['time'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
              ])),
            ]),
          );
        }),
    );
  }
}
