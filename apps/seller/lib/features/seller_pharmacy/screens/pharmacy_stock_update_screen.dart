import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Quick stock update — toggle availability and update quantities.
class PharmacyStockUpdateScreen extends StatelessWidget {
  const PharmacyStockUpdateScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final items = [
      {'name': 'Crocin Advance 500mg', 'stock': 45, 'low': false, 'available': true},
      {'name': 'Augmentin 625 Duo', 'stock': 3, 'low': true, 'available': true},
      {'name': 'Vitamin D3 60K IU', 'stock': 120, 'low': false, 'available': true},
      {'name': 'Metformin 500mg', 'stock': 0, 'low': true, 'available': false},
      {'name': 'Cetirizine 10mg', 'stock': 8, 'low': true, 'available': true},
    ];
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Quick Stock Update', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
        actions: [TextButton(onPressed: () {}, child: const Text('Save All', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.pharmacyColor)))]),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: items.length, separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final item = items[i];
          return Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: item['low'] == true ? Colors.orange.shade200 : Colors.grey.shade200)),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item['name'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Row(children: [Text('Stock: ${item['stock']}', style: TextStyle(fontSize: 12, color: item['low'] == true ? Colors.orange.shade700 : Colors.grey.shade500)),
                  if (item['low'] == true) ...[const SizedBox(width: 6), Container(padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1), decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(4)),
                    child: Text('LOW', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.orange.shade700)))]])])),
              SizedBox(width: 80, height: 36, child: TextField(
                decoration: InputDecoration(hintText: '${item['stock']}', border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)), contentPadding: const EdgeInsets.symmetric(horizontal: 10)),
                keyboardType: TextInputType.number, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              )),
              const SizedBox(width: 10),
              Switch(value: item['available'] as bool, onChanged: (_) {}, activeThumbColor: Colors.green),
            ]),
          );
        },
      ),
    );
  }
}
