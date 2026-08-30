import 'package:flutter/material.dart';
/// Delivery history — past deliveries.
class PharmacyDeliveryHistoryScreen extends StatelessWidget {
  const PharmacyDeliveryHistoryScreen({super.key});
  @override Widget build(BuildContext context) {
    final history = [
      {'id': 'PH-001', 'store': 'HealthPlus', 'customer': 'John D.', 'earned': 85, 'date': 'Jul 5', 'status': 'DELIVERED'},
      {'id': 'PH-002', 'store': 'Apollo', 'customer': 'Sarah K.', 'earned': 55, 'date': 'Jul 5', 'status': 'DELIVERED'},
      {'id': 'PH-003', 'store': 'MedPlus', 'customer': 'Amit G.', 'earned': 120, 'date': 'Jul 4', 'status': 'DELIVERED'},
      {'id': 'PH-004', 'store': 'HealthPlus', 'customer': 'Priya S.', 'earned': 0, 'date': 'Jul 4', 'status': 'CANCELLED'},
    ];
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Delivery History', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: history.length, separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) { final h = history[i]; final del = h['status'] == 'DELIVERED';
          return Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [
              Container(width: 44, height: 44, decoration: BoxDecoration(color: del ? Colors.green.shade50 : Colors.red.shade50, shape: BoxShape.circle), child: Icon(del ? Icons.check_circle : Icons.cancel, color: del ? Colors.green : Colors.red, size: 22)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('#${h['id']} • ${h['store']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                Text('${h['customer']} • ${h['date']}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              ])),
              if (del) Text('+ KES ${h['earned']}', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.green.shade700))
              else Text('Cancelled', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.red.shade600)),
            ]),
          );
        }),
    );
  }
}
