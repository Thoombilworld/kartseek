import 'package:flutter/material.dart';
/// Reports — sales analytics, top products, revenue charts.
class PharmacyReportsScreen extends StatelessWidget {
  const PharmacyReportsScreen({super.key});
  @override Widget build(BuildContext context) {
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Reports', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _metric('Total Orders', '234', Icons.shopping_bag, Colors.blue),
        _metric('Revenue', 'KES 456,000', Icons.payments, Colors.green),
        _metric('Avg Order Value', 'KES 1,950', Icons.analytics, Colors.purple),
        _metric('Prescription Orders', '67 (28%)', Icons.medical_information, Colors.orange),
        const SizedBox(height: 16),
        const Text('Top Products', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...[{'name': 'Crocin Advance 500mg', 'sales': 89}, {'name': 'Vitamin D3 60K IU', 'sales': 72}, {'name': 'Cetirizine 10mg', 'sales': 65}].map((p) =>
          Padding(padding: const EdgeInsets.only(bottom: 8), child: Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [Text(p['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)), const Spacer(), Text('${p['sales']} sold', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.blue.shade700))])))),
      ]),
    );
  }
  Widget _metric(String label, String value, IconData icon, Color color) => Padding(padding: const EdgeInsets.only(bottom: 10), child: Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: Row(children: [Container(width: 44, height: 44, decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle), child: Icon(icon, color: color, size: 22)), const SizedBox(width: 14),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)), Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800))])])));
}
