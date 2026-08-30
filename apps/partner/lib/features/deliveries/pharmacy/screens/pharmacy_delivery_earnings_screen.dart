import 'package:flutter/material.dart';
/// Pharmacy-specific earnings for delivery partners.
class PharmacyDeliveryEarningsScreen extends StatelessWidget {
  const PharmacyDeliveryEarningsScreen({super.key});
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: Colors.grey.shade50,
    appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Pharmacy Earnings', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      Container(padding: const EdgeInsets.all(24), decoration: BoxDecoration(gradient: LinearGradient(colors: [Colors.green.shade600, Colors.green.shade400]), borderRadius: BorderRadius.circular(16)),
        child: Column(children: [Text('Today\'s Earnings', style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.8))), const SizedBox(height: 8), const Text('KES 340', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 8), Text('5 deliveries completed', style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.7)))])),
      const SizedBox(height: 16),
      Row(children: [_stat('This Week', 'KES 2,150', Colors.blue), const SizedBox(width: 10), _stat('This Month', 'KES 8,900', Colors.purple)]),
      const SizedBox(height: 20),
      const Text('Earnings Breakdown', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)), const SizedBox(height: 12),
      _row('Base delivery fee', 'KES 200'), _row('Distance bonus', 'KES 85'), _row('Rx handling fee', 'KES 30'), _row('Cold chain bonus', 'KES 25'), _row('Tips', 'KES 0'),
      const Divider(height: 24), _row('Total', 'KES 340', bold: true),
    ]),
  );
  Widget _stat(String label, String value, Color color) => Expanded(child: Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: color.withValues(alpha: 0.2))),
    child: Column(children: [Text(label, style: TextStyle(fontSize: 12, color: color)), const SizedBox(height: 4), Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color))])));
  Widget _row(String l, String v, {bool bold = false}) => Padding(padding: const EdgeInsets.only(bottom: 8), child: Row(children: [Text(l, style: TextStyle(fontSize: 13, color: bold ? Colors.black87 : Colors.grey.shade600, fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
    const Spacer(), Text(v, style: TextStyle(fontSize: 13, fontWeight: bold ? FontWeight.w800 : FontWeight.w600, color: bold ? Colors.green.shade700 : Colors.black87))]));
}
