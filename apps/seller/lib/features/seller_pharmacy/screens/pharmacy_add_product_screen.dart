import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Add a new product — form with drug details, pricing, category, Rx flag.
class PharmacyAddProductScreen extends StatelessWidget {
  const PharmacyAddProductScreen({super.key});
  @override Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Add Product', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _field('Medicine Name', 'e.g. Crocin Advance 500mg'), _field('Generic Name', 'e.g. Paracetamol'), _field('Manufacturer', 'e.g. GSK'),
        _field('Composition', 'e.g. Paracetamol 500mg'), _field('Pack Size', 'e.g. Strip of 15 tablets'),
        Row(children: [Expanded(child: _field('MRP (KES)', '0.00')), const SizedBox(width: 12), Expanded(child: _field('Selling Price', '0.00'))]),
        Row(children: [Expanded(child: _field('Stock Quantity', '0')), const SizedBox(width: 12), Expanded(child: _field('Reorder Level', '10'))]),
        const SizedBox(height: 12),
        _dropdown('Category', ['OTC Medicines', 'Antibiotics', 'Vitamins', 'Diabetes', 'Allergy']),
        _dropdown('Dosage Form', ['Tablet', 'Capsule', 'Syrup', 'Cream', 'Drops', 'Injection']),
        const SizedBox(height: 12),
        _switchRow('Requires Prescription', true), _switchRow('Schedule H Drug', false), _switchRow('Available for Sale', true),
        const SizedBox(height: 12),
        Container(height: 100, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200, style: BorderStyle.solid)),
          child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.add_photo_alternate, size: 32, color: Colors.grey.shade400), const SizedBox(height: 4), Text('Upload Product Image', style: TextStyle(fontSize: 12, color: Colors.grey.shade400))]))),
        const SizedBox(height: 24),
        SizedBox(height: 52, child: ElevatedButton(onPressed: () => Navigator.pop(context), style: ElevatedButton.styleFrom(backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))), child: const Text('Add Product', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)))),
      ]),
    );
  }
  Widget _field(String label, String hint) => Padding(padding: const EdgeInsets.only(bottom: 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade700)), const SizedBox(height: 6),
    TextField(decoration: InputDecoration(hintText: hint, hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14), filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade200)), enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade200)), contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12)))]));
  Widget _dropdown(String label, List<String> opts) => Padding(padding: const EdgeInsets.only(bottom: 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade700)), const SizedBox(height: 6),
    Container(padding: const EdgeInsets.symmetric(horizontal: 14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey.shade200)),
      child: DropdownButton<String>(isExpanded: true, underline: const SizedBox(), hint: Text(opts.first, style: TextStyle(fontSize: 14, color: Colors.grey.shade600)), items: opts.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(), onChanged: (_) {}))]));
  Widget _switchRow(String label, bool val) => Padding(padding: const EdgeInsets.only(bottom: 8), child: Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey.shade200)),
    child: Row(children: [Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)), const Spacer(), Switch(value: val, onChanged: (_) {}, activeThumbColor: AppTheme.pharmacyColor)])));
}
