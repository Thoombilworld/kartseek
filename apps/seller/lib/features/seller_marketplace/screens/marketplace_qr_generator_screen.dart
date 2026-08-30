import 'package:flutter/material.dart';

/// QR Generator Screen — Generate QR codes for products and store.
class MarketplaceQRGeneratorScreen extends StatelessWidget {
  const MarketplaceQRGeneratorScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          title: const Text('QR Generator',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        ...[
          {
            'type': 'Store Link',
            'value': 'kartseek.com/store/techvision',
            'downloads': 245
          },
          {'type': 'Product', 'value': 'Galaxy S24 Ultra', 'downloads': 128},
          {'type': 'Payment', 'value': 'UPI Payment QR', 'downloads': 89}
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
