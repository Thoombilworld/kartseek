import 'package:flutter/material.dart';
/// Inventory alerts — low-stock & out-of-stock items.
class PharmacyInventoryAlertsScreen extends StatelessWidget {
  const PharmacyInventoryAlertsScreen({super.key});
  @override Widget build(BuildContext context) {
    final alerts = [
      {'name': 'Augmentin 625 Duo', 'stock': 3, 'reorder': 10, 'type': 'LOW'},
      {'name': 'Metformin 500mg', 'stock': 0, 'reorder': 15, 'type': 'OUT'},
      {'name': 'Cetirizine 10mg', 'stock': 8, 'reorder': 20, 'type': 'LOW'},
      {'name': 'Insulin Glargine', 'stock': 0, 'reorder': 5, 'type': 'OUT'},
    ];
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Inventory Alerts', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: alerts.length, separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) { final a = alerts[i]; final isOut = a['type'] == 'OUT';
          return Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: isOut ? Colors.red.shade50 : Colors.orange.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: isOut ? Colors.red.shade200 : Colors.orange.shade200)),
            child: Row(children: [
              Icon(isOut ? Icons.error : Icons.warning_amber, color: isOut ? Colors.red : Colors.orange, size: 24), const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(a['name'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                Text('Stock: ${a['stock']} / Reorder at: ${a['reorder']}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ])),
              SizedBox(height: 32, child: ElevatedButton(onPressed: () {}, style: ElevatedButton.styleFrom(backgroundColor: isOut ? Colors.red : Colors.orange, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), padding: const EdgeInsets.symmetric(horizontal: 12)),
                child: Text(isOut ? 'Restock' : 'Order', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)))),
            ]),
          );
        },
      ),
    );
  }
}
