import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Product list — searchable inventory with category filters.
class PharmacyProductsScreen extends StatelessWidget {
  const PharmacyProductsScreen({super.key});
  @override Widget build(BuildContext context) {
    final products = [
      {'name': 'Crocin Advance 500mg', 'category': 'OTC', 'price': 45, 'stock': 45, 'rx': false, 'active': true},
      {'name': 'Augmentin 625 Duo', 'category': 'Antibiotics', 'price': 320, 'stock': 3, 'rx': true, 'active': true},
      {'name': 'Vitamin D3 60K IU', 'category': 'Vitamins', 'price': 120, 'stock': 120, 'rx': false, 'active': true},
      {'name': 'Metformin 500mg', 'category': 'Diabetes', 'price': 85, 'stock': 0, 'rx': true, 'active': false},
      {'name': 'Cetirizine 10mg', 'category': 'Allergy', 'price': 30, 'stock': 8, 'rx': false, 'active': true},
    ];
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0,
        title: const Text('Products', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
        actions: [IconButton(icon: const Icon(Icons.add_circle, color: AppTheme.pharmacyColor), onPressed: () {})]),
      body: Column(children: [
        Container(margin: const EdgeInsets.all(16), height: 44, decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
          child: TextField(decoration: InputDecoration(hintText: 'Search products...', hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 14), prefixIcon: Icon(Icons.search, color: Colors.grey.shade400, size: 20), border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(vertical: 12)))),
        Expanded(child: ListView.separated(padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: products.length, separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) {
            final p = products[i];
            return Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
              child: Row(children: [
                Container(width: 48, height: 48, decoration: BoxDecoration(color: Colors.cyan.shade50, borderRadius: BorderRadius.circular(10)), child: Center(child: Text(p['rx'] == true ? '💊' : '🧴', style: const TextStyle(fontSize: 22)))),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(p['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  Text('${p['category']} • Stock: ${p['stock']}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('KES ${p['price']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Switch(value: p['active'] as bool, onChanged: (_) {}, activeThumbColor: Colors.green, materialTapTargetSize: MaterialTapTargetSize.shrinkWrap),
                ]),
              ]),
            );
          },
        )),
      ]),
    );
  }
}
