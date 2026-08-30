import 'package:flutter/material.dart';

/// Push Preferences Screen — Configure push notification preferences.
class MarketplacePushPrefsScreen extends StatelessWidget {
  const MarketplacePushPrefsScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          title: const Text('Push Preferences',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        ...[
          {'category': 'New Orders', 'enabled': true, 'sound': true},
          {'category': 'Returns & Refunds', 'enabled': true, 'sound': true},
          {'category': 'Low Stock Alerts', 'enabled': true, 'sound': false},
          {'category': 'Payment Received', 'enabled': true, 'sound': false},
          {'category': 'Performance Reports', 'enabled': false, 'sound': false},
          {'category': 'Promotions & Tips', 'enabled': false, 'sound': false}
        ].map((item) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(children: [
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(item['category'] as String,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 15)),
                        if (item['sound'] as bool)
                          const Text('\u{1F50A} Sound on',
                              style:
                                  TextStyle(fontSize: 12, color: Colors.grey)),
                      ])),
                  Switch(
                      value: item['enabled'] as bool,
                      onChanged: (_) {},
                      activeThumbColor: _mp),
                ])))),
      ]),
    );
  }
}
