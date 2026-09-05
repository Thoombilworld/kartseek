import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Accept or reject an incoming pharmacy order.
class PharmacyOrderActionScreen extends StatelessWidget {
  final String orderId;
  const PharmacyOrderActionScreen({super.key, this.orderId = 'PH-001'});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: Text('Order #$orderId', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _card('Customer', 'John Doe • +254 712 345 678'),
        const SizedBox(height: 10),
        _card('Items', '3 medicines • 1 requires prescription'),
        const SizedBox(height: 10),
        _card('Total', 'KES 450'),
        const SizedBox(height: 10),
        _card('Delivery Address', '123 Main Avenue, Westlands, Nairobi'),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(12)),
          child: Row(children: [
            Icon(Icons.medical_information, color: Colors.amber.shade700, size: 20), const SizedBox(width: 10),
            Expanded(child: Text('This order contains Rx medicines. Verify prescription before dispensing.', style: TextStyle(fontSize: 12, color: Colors.amber.shade800, height: 1.4))),
          ]),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Estimated Prep Time', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
              _timeChip('10 min', false), _timeChip('15 min', true), _timeChip('20 min', false), _timeChip('30 min', false),
            ]),
          ]),
        ),
        const SizedBox(height: 24),
        Row(children: [
          Expanded(child: SizedBox(height: 52, child: OutlinedButton(
            onPressed: () => Navigator.pop(context), style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: const Text('Reject', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          ))),
          const SizedBox(width: 12),
          Expanded(child: SizedBox(height: 52, child: ElevatedButton(
            onPressed: () => Navigator.pop(context), style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: const Text('Accept Order', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          ))),
        ]),
      ]),
    );
  }

  Widget _card(String label, String value) => Container(
    padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: Row(children: [Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)), const Spacer(), Flexible(child: Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), textAlign: TextAlign.right))]),
  );

  Widget _timeChip(String label, bool selected) => ChoiceChip(
    label: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: selected ? Colors.white : Colors.grey.shade700)),
    selected: selected, selectedColor: AppTheme.pharmacyColor, backgroundColor: Colors.grey.shade100,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)), side: BorderSide.none, onSelected: (_) {},
  );
}
