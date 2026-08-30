import 'package:flutter/material.dart';
/// Offers manager — create, toggle, delete promotions.
class PharmacyOffersManagerScreen extends StatelessWidget {
  const PharmacyOffersManagerScreen({super.key});
  @override Widget build(BuildContext context) {
    final offers = [
      {'title': '25% OFF First Order', 'code': 'PHARMA25', 'type': 'PERCENTAGE', 'active': true, 'uses': 45},
      {'title': 'Free Delivery 500+', 'code': 'FREEDEL', 'type': 'FREE_DELIVERY', 'active': true, 'uses': 128},
      {'title': '₹100 OFF Rx Orders', 'code': 'RX100', 'type': 'FLAT', 'active': false, 'uses': 23},
    ];
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Offers Manager', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
        actions: [IconButton(icon: const Icon(Icons.add_circle, color: Colors.blue), onPressed: () {})]),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: offers.length, separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) { final o = offers[i];
          return Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(o['title'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Code: ${o['code']} • ${o['uses']} uses', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              ])),
              Switch(value: o['active'] as bool, onChanged: (_) {}, activeThumbColor: Colors.green),
            ]),
          );
        }),
    );
  }
}
