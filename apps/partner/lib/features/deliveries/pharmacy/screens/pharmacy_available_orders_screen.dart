import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Available pharmacy orders for delivery partners to pick up.
class PharmacyAvailableOrdersScreen extends StatelessWidget {
  const PharmacyAvailableOrdersScreen({super.key});
  @override Widget build(BuildContext context) {
    final orders = [
      {'id': 'PH-001', 'store': 'HealthPlus Pharmacy', 'customer': 'John D.', 'items': 3, 'total': 450, 'distance': '2.3 km', 'earnings': 85, 'rx': true, 'coldChain': false},
      {'id': 'PH-002', 'store': 'Apollo Pharmacy', 'customer': 'Sarah K.', 'items': 1, 'total': 120, 'distance': '1.1 km', 'earnings': 55, 'rx': false, 'coldChain': false},
      {'id': 'PH-003', 'store': 'MedPlus Pharmacy', 'customer': 'Amit G.', 'items': 5, 'total': 890, 'distance': '4.5 km', 'earnings': 120, 'rx': true, 'coldChain': true},
    ];
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Available Pharmacy Orders', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
        actions: [Container(margin: const EdgeInsets.only(right: 12), padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(20)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle)), const SizedBox(width: 6),
            Text('Online', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.green.shade700))]))]),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: orders.length, separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) { final o = orders[i];
          return Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text('#${o['id']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                const Spacer(),
                Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(20)),
                  child: Text('KES ${o['earnings']}', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.green.shade700))),
              ]),
              const SizedBox(height: 10),
              Row(children: [Icon(Icons.store, size: 14, color: Colors.grey.shade400), const SizedBox(width: 6), Text('${o['store']}', style: TextStyle(fontSize: 13, color: Colors.grey.shade700))]),
              const SizedBox(height: 4),
              Row(children: [Icon(Icons.person, size: 14, color: Colors.grey.shade400), const SizedBox(width: 6), Text('${o['customer']}', style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
                const Spacer(), Text('${o['distance']}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.blue.shade700))]),
              const SizedBox(height: 8),
              Row(children: [
                Text('${o['items']} items • KES ${o['total']}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                const Spacer(),
                if (o['rx'] == true) Container(margin: const EdgeInsets.only(right: 6), padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1), decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(4)),
                  child: Text('Rx', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.red.shade700))),
                if (o['coldChain'] == true) Container(padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1), decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(4)),
                  child: Text('❄️ Cold', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.blue.shade700))),
              ]),
              const SizedBox(height: 12),
              SizedBox(width: double.infinity, height: 44, child: ElevatedButton(onPressed: () {},
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Accept Delivery', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)))),
            ]),
          );
        }),
    );
  }
}
