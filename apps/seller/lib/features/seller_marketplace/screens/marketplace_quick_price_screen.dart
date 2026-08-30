import 'package:flutter/material.dart';

class MarketplaceQuickPriceScreen extends StatelessWidget {
  const MarketplaceQuickPriceScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final products = [
      {
        'name': 'Galaxy S24 Ultra',
        'sku': 'SAM-S24U',
        'price': 129999,
        'mrp': 139999,
        'stock': 245
      },
      {
        'name': 'Galaxy A54',
        'sku': 'SAM-A54',
        'price': 27999,
        'mrp': 32999,
        'stock': 380
      },
      {
        'name': 'Galaxy Tab S9',
        'sku': 'SAM-TS9',
        'price': 74999,
        'mrp': 84999,
        'stock': 85
      },
      {
        'name': 'Galaxy Buds FE',
        'sku': 'SAM-BFE',
        'price': 6999,
        'mrp': 8999,
        'stock': 500
      },
      {
        'name': 'Galaxy Watch 6',
        'sku': 'SAM-GW6',
        'price': 26999,
        'mrp': 29999,
        'stock': 0
      },
    ];
    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          title: const Text('Quick Price Update',
              style: TextStyle(fontWeight: FontWeight.w800)),
          elevation: 0,
          actions: [
            TextButton(
                onPressed: () {},
                child: const Text('Save All',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w700)))
          ]),
      body: ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: products.length,
          itemBuilder: (_, i) {
            final p = products[i];
            return Card(
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(p['name'] as String,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 15)),
                          Text(p['sku'] as String,
                              style: const TextStyle(
                                  fontSize: 12, color: Colors.grey)),
                          const SizedBox(height: 8),
                          Row(children: [
                            Expanded(
                                child: TextField(
                                    decoration: InputDecoration(
                                        labelText: 'Price',
                                        prefixText: '\u20B9',
                                        isDense: true,
                                        border: OutlineInputBorder(
                                            borderRadius:
                                                BorderRadius.circular(8))),
                                    controller: TextEditingController(
                                        text: (p['price'] as int).toString()),
                                    keyboardType: TextInputType.number)),
                            const SizedBox(width: 8),
                            Expanded(
                                child: TextField(
                                    decoration: InputDecoration(
                                        labelText: 'Stock',
                                        isDense: true,
                                        border: OutlineInputBorder(
                                            borderRadius:
                                                BorderRadius.circular(8))),
                                    controller: TextEditingController(
                                        text: (p['stock'] as int).toString()),
                                    keyboardType: TextInputType.number)),
                          ]),
                        ])));
          }),
    );
  }
}
