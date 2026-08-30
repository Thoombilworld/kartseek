import 'package:flutter/material.dart';

/// Tax Invoice Screen — Generate and view GST tax invoices.
class MarketplaceTaxInvoiceScreen extends StatelessWidget {
  const MarketplaceTaxInvoiceScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          title: const Text('Tax Invoice',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        ...[
          {
            'invoice': 'INV-2026-1842',
            'order': 'ORD-48521',
            'amount': '\u20B91,65,788',
            'gst': '\u20B925,290',
            'date': 'Jun 28'
          },
          {
            'invoice': 'INV-2026-1841',
            'order': 'ORD-48420',
            'amount': '\u20B945,999',
            'gst': '\u20B97,020',
            'date': 'Jun 25'
          },
          {
            'invoice': 'INV-2026-1840',
            'order': 'ORD-48380',
            'amount': '\u20B989,500',
            'gst': '\u20B913,670',
            'date': 'Jun 24'
          }
        ].map((item) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              title: Text(item.values.first,
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(item.values.skip(1).take(2).join(' \u2022 '),
                  style: const TextStyle(fontSize: 12)),
              trailing: Text(item.values.last,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, color: _mp, fontSize: 12)),
            ))),
      ]),
    );
  }
}
