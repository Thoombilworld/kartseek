import 'package:flutter/material.dart';
/// Accept delivery — order summary + accept CTA.
class PharmacyAcceptDeliveryScreen extends StatelessWidget {
  final String orderId;
  const PharmacyAcceptDeliveryScreen({super.key, this.orderId = 'PH-001'});
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: Colors.grey.shade50,
    appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: Text('Order #$orderId', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      _card('Pharmacy', 'HealthPlus Pharmacy\n123 Main Ave, Westlands', Icons.store, Colors.blue),
      _card('Customer', 'John Doe\n456 Garden Estate, Roysambu', Icons.person, Colors.green),
      _card('Order', '3 items • KES 450\n1 Rx item', Icons.shopping_bag, Colors.purple),
      _card('Earnings', 'KES 85 (delivery fee)', Icons.payments, Colors.orange),
      _card('Distance', '2.3 km • ~15 min', Icons.directions, Colors.teal),
      const SizedBox(height: 24),
      SizedBox(height: 52, child: ElevatedButton(onPressed: () => Navigator.pop(context), style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
        child: const Text('Accept & Navigate', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)))),
      const SizedBox(height: 10),
      SizedBox(height: 44, child: OutlinedButton(onPressed: () => Navigator.pop(context), style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
        child: const Text('Decline', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)))),
    ]),
  );
  Widget _card(String label, String value, IconData icon, Color color) => Padding(padding: const EdgeInsets.only(bottom: 10), child: Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Container(width: 40, height: 40, decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle), child: Icon(icon, color: color, size: 20)), const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontWeight: FontWeight.w600)), const SizedBox(height: 4), Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, height: 1.4))]))])));
}
