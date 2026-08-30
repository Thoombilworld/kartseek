import 'package:flutter/material.dart';

/// Bundles Screen — Create product bundles with combo pricing.
class MarketplaceBundlesScreen extends StatelessWidget {
  const MarketplaceBundlesScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          title: const Text('Bundles',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        ...[
          {
            'name': 'Phone + Charger + Case',
            'products': 3,
            'price': '\u20B9125,999',
            'sold': 245
          },
          {
            'name': 'Laptop + Mouse + Bag',
            'products': 3,
            'price': '\u20B952,999',
            'sold': 128
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
