import 'package:flutter/material.dart';

/// Label Print Screen — Generate & print shipping labels for orders.
class MarketplaceLabelPrintScreen extends StatelessWidget {
  const MarketplaceLabelPrintScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          title: const Text('Label Print',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        ...[
          {
            'order': 'ORD-48521',
            'customer': 'Priya S., Mumbai',
            'weight': '0.8 kg',
            'carrier': 'Delhivery',
            'generated': false
          },
          {
            'order': 'ORD-48520',
            'customer': 'Rahul V., Delhi',
            'weight': '0.3 kg',
            'carrier': 'Blue Dart',
            'generated': true
          },
          {
            'order': 'ORD-48518',
            'customer': 'Sneha K., Bangalore',
            'weight': '1.2 kg',
            'carrier': 'DTDC',
            'generated': true
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
