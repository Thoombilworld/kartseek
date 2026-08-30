import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Restaurant Active Orders Screen (KDS-style live queue).
class RestaurantActiveOrdersScreen extends StatelessWidget {
  const RestaurantActiveOrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    final orders = [
      {'id': 'ORD-7721', 'items': '2x Chicken Biryani, 1x Raita', 'type': 'Delivery', 'status': 'PREPARING', 'time': '12 min ago', 'customer': 'Sarah K.'},
      {'id': 'ORD-7720', 'items': '1x Mutton Biryani, 2x Naan', 'type': 'Dine-In', 'status': 'READY', 'time': '18 min ago', 'customer': 'Table 5'},
      {'id': 'ORD-7719', 'items': '3x Paneer Tikka, 1x Lassi', 'type': 'Takeaway', 'status': 'PREPARING', 'time': '22 min ago', 'customer': 'John M.'},
      {'id': 'ORD-7718', 'items': '1x Veg Biryani, 1x Raita', 'type': 'Delivery', 'status': 'ACCEPTED', 'time': '3 min ago', 'customer': 'Priya S.'},
    ];
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Active Orders', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [Container(margin: const EdgeInsets.only(right: 12), padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(16)),
          child: Text('${orders.length} active', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)))],
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16), itemCount: orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final o = orders[i];
          final statusColor = (o['status'] == 'READY') ? Colors.green : (o['status'] == 'ACCEPTED') ? Colors.blue : c;
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: statusColor.withValues(alpha: 0.3))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text(o['id'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, fontFamily: 'monospace')),
                const Spacer(),
                Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                  child: Text(o['status'] as String, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: statusColor))),
              ]),
              const SizedBox(height: 8),
              Text(o['items'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Row(children: [
                Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(4)),
                  child: Text(o['type'] as String, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.grey.shade600))),
                const SizedBox(width: 8),
                Text(o['customer'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                const Spacer(),
                Text(o['time'] as String, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                if (o['status'] == 'ACCEPTED') Expanded(child: SizedBox(height: 36, child: ElevatedButton(
                  onPressed: () {}, style: ElevatedButton.styleFrom(backgroundColor: c, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0),
                  child: const Text('Start Preparing', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ))),
                if (o['status'] == 'PREPARING') Expanded(child: SizedBox(height: 36, child: ElevatedButton(
                  onPressed: () {}, style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0),
                  child: const Text('Mark Ready', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ))),
                if (o['status'] == 'READY') Expanded(child: SizedBox(height: 36, child: ElevatedButton(
                  onPressed: () {}, style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0),
                  child: Text(o['type'] == 'Dine-In' ? 'Served' : 'Dispatched', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ))),
              ]),
            ]),
          );
        },
      ),
    );
  }
}
