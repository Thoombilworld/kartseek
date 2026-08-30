import 'package:flutter/material.dart';

/// Coupons Screen — Create and manage seller coupons.
class MarketplaceCouponsScreen extends StatelessWidget {
  const MarketplaceCouponsScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          title: const Text('Coupons',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        ...[
          {
            'code': 'TECH20',
            'discount': '20%',
            'used': '342/1000',
            'status': 'Active'
          },
          {
            'code': 'FLAT500',
            'discount': '\u20B9500',
            'used': '128/500',
            'status': 'Active'
          },
          {
            'code': 'NEWYEAR10',
            'discount': '10%',
            'used': '892/1000',
            'status': 'Expired'
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
