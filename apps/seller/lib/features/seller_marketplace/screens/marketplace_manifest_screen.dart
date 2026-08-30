import 'package:flutter/material.dart';

/// Manifests Screen — View and create shipment manifests.
class MarketplaceManifestScreen extends StatelessWidget {
  const MarketplaceManifestScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          title: const Text('Manifests',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        ...[
          {
            'id': 'MAN-2041',
            'date': 'Jul 1',
            'carrier': 'Delhivery',
            'orders': 12,
            'status': 'Created'
          },
          {
            'id': 'MAN-2040',
            'date': 'Jun 30',
            'carrier': 'Blue Dart',
            'orders': 8,
            'status': 'Picked Up'
          },
          {
            'id': 'MAN-2039',
            'date': 'Jun 29',
            'carrier': 'Delhivery',
            'orders': 15,
            'status': 'Picked Up'
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
