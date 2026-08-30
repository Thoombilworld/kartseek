import 'package:flutter/material.dart';
/// Delivery summary after completion.
class PharmacyDeliverySummaryScreen extends StatelessWidget {
  final String orderId;
  const PharmacyDeliverySummaryScreen({super.key, this.orderId = 'PH-001'});
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: Colors.white,
    body: SafeArea(child: Padding(padding: const EdgeInsets.all(32), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      const Spacer(flex: 2),
      Container(width: 100, height: 100, decoration: BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: [Colors.green.shade400, Colors.green.shade600]),
        boxShadow: [BoxShadow(color: Colors.green.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 6))]), child: const Icon(Icons.check, color: Colors.white, size: 52)),
      const SizedBox(height: 28),
      const Text('Delivery Complete! ✅', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
      const SizedBox(height: 12),
      Text('Order #$orderId delivered successfully', style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
      const SizedBox(height: 28),
      Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
        child: Column(children: [_row('Earned', 'KES 85'), const SizedBox(height: 8), _row('Distance', '2.3 km'), const SizedBox(height: 8), _row('Time', '18 min'), const SizedBox(height: 8), _row('Rating', '⭐⭐⭐⭐⭐')])),
      const Spacer(flex: 3),
      SizedBox(width: double.infinity, height: 52, child: ElevatedButton(onPressed: () => Navigator.popUntil(context, (r) => r.isFirst),
        style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
        child: const Text('Back to Home', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)))),
    ]))),
  );
  Widget _row(String l, String v) => Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(l, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)), Text(v, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700))]);
}
