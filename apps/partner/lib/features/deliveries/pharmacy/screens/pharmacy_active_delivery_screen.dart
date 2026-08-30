import 'package:flutter/material.dart';
/// Active delivery status — track progress.
class PharmacyActiveDeliveryScreen extends StatelessWidget {
  const PharmacyActiveDeliveryScreen({super.key});
  @override Widget build(BuildContext context) {
    final steps = [
      {'label': 'Order Accepted', 'done': true, 'time': '10:15 AM'},
      {'label': 'Navigating to Pharmacy', 'done': true, 'time': '10:16 AM'},
      {'label': 'Arrived at Pharmacy', 'done': true, 'time': '10:24 AM'},
      {'label': 'Picked Up Order', 'done': true, 'time': '10:28 AM'},
      {'label': 'Navigating to Customer', 'done': false, 'time': ''},
      {'label': 'Delivered', 'done': false, 'time': ''},
    ];
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Active Delivery', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Delivery Progress', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)), const SizedBox(height: 16),
            ...List.generate(steps.length, (i) { final s = steps[i]; final done = s['done'] as bool; final isLast = i == steps.length - 1;
              return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Column(children: [Container(width: 24, height: 24, decoration: BoxDecoration(shape: BoxShape.circle, color: done ? Colors.green : Colors.grey.shade200), child: done ? const Icon(Icons.check, color: Colors.white, size: 14) : null),
                  if (!isLast) Container(width: 2, height: 28, color: done ? Colors.green.shade200 : Colors.grey.shade200)]),
                const SizedBox(width: 12),
                Expanded(child: Padding(padding: const EdgeInsets.only(top: 2, bottom: 8), child: Row(children: [Text(s['label'] as String, style: TextStyle(fontSize: 13, fontWeight: done ? FontWeight.w600 : FontWeight.w400, color: done ? Colors.black87 : Colors.grey.shade400)),
                  const Spacer(), if ((s['time'] as String).isNotEmpty) Text(s['time'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade400))]))),
              ]);
            }),
          ])),
        const SizedBox(height: 16),
        Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Column(children: [Row(children: [const Text('Earnings', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)), const Spacer(), Text('KES 85', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.green.shade700))]),
            const SizedBox(height: 8), Row(children: [Text('Distance: 2.3 km', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)), const Spacer(), Text('ETA: 6 min', style: TextStyle(fontSize: 12, color: Colors.grey.shade500))])])),
      ]),
    );
  }
}
