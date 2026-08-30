import 'package:flutter/material.dart';

/// Pickup Schedule Screen — Schedule courier pickups for orders.
class MarketplacePickupScheduleScreen extends StatelessWidget {
  const MarketplacePickupScheduleScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          title: const Text('Pickup Schedule',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        ...[
          {
            'date': 'Jul 2, 4:00 PM',
            'carrier': 'Delhivery',
            'orders': 8,
            'status': 'Scheduled'
          },
          {
            'date': 'Jul 2, 5:30 PM',
            'carrier': 'Blue Dart',
            'orders': 3,
            'status': 'Scheduled'
          },
          {
            'date': 'Jul 1, 4:00 PM',
            'carrier': 'Delhivery',
            'orders': 12,
            'status': 'Completed'
          }
        ].map((item) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              title: Text(item.values.first as String,
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(item.values.skip(1).take(2).join(' \u2022 '),
                  style: const TextStyle(fontSize: 12)),
              trailing: Text(item.values.last as String,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, color: _mp, fontSize: 12)),
            ))),
      ]),
    );
  }
}
