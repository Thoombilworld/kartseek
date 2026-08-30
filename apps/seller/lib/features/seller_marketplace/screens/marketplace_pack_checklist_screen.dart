import 'package:flutter/material.dart';

/// Pack Checklist Screen — Packing checklist for order fulfillment.
class MarketplacePackChecklistScreen extends StatelessWidget {
  const MarketplacePackChecklistScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          title: const Text('Pack Checklist',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(14)),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Order: ORD-48521',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const Text('Priya Sharma — 3 items',
                  style: TextStyle(color: Colors.grey, fontSize: 13)),
              const SizedBox(height: 16),
              ...[
                {'item': 'Verify product matches order', 'checked': true},
                {'item': 'Check for damage/defects', 'checked': true},
                {'item': 'Add invoice inside package', 'checked': false},
                {'item': 'Wrap with bubble wrap', 'checked': false},
                {'item': 'Seal outer box', 'checked': false},
                {'item': 'Attach shipping label', 'checked': false}
              ].map((item) => CheckboxListTile(
                  value: item['checked'] as bool,
                  onChanged: (_) {},
                  title: Text(item['item'] as String,
                      style: const TextStyle(fontSize: 14)),
                  controlAffinity: ListTileControlAffinity.leading,
                  activeColor: _mp,
                  dense: true,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)))),
            ])),
        const SizedBox(height: 16),
        ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
                backgroundColor: _mp,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12))),
            child: const Text('Mark as Packed',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w700))),
      ]),
    );
  }
}
