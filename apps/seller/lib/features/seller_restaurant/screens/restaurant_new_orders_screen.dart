import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Restaurant New / Incoming Orders Screen.
class RestaurantNewOrdersScreen extends StatelessWidget {
  const RestaurantNewOrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    final incoming = [
      {'id': 'ORD-7725', 'items': '1x Chicken Biryani, 1x Mango Lassi', 'total': 'KES 400', 'type': 'Delivery', 'customer': 'Alice W.', 'distance': '2.1 km'},
      {'id': 'ORD-7724', 'items': '2x Pizza Margherita, 1x Garlic Bread', 'total': 'KES 780', 'type': 'Takeaway', 'customer': 'Bob T.', 'distance': ''},
      {'id': 'ORD-7723', 'items': '1x Mutton Biryani, 2x Naan, 1x Raita', 'total': 'KES 620', 'type': 'Delivery', 'customer': 'Carol N.', 'distance': '3.4 km'},
    ];
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('New Orders', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [Container(margin: const EdgeInsets.only(right: 12), padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(16)),
          child: Text('${incoming.length} new', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)))],
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16), itemCount: incoming.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final o = incoming[i];
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: c.withValues(alpha: 0.3))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text(o['id'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, fontFamily: 'monospace')),
                const Spacer(),
                Text(o['total'] as String, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: c)),
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
                if ((o['distance'] as String).isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Icon(Icons.location_on, size: 12, color: Colors.grey.shade400),
                  Text(o['distance'] as String, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                ],
              ]),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: SizedBox(height: 40, child: OutlinedButton(
                  onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order rejected'))),
                  style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.red), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                  child: const Text('Reject', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w700)),
                ))),
                const SizedBox(width: 10),
                Expanded(flex: 2, child: SizedBox(height: 40, child: ElevatedButton(
                  onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order accepted!'))),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), elevation: 0),
                  child: const Text('Accept Order', style: TextStyle(fontWeight: FontWeight.w800)),
                ))),
              ]),
            ]),
          );
        },
      ),
    );
  }
}
