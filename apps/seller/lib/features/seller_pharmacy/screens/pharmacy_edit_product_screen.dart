import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Edit existing product — prefilled form.
class PharmacyEditProductScreen extends StatelessWidget {
  final String productId;
  const PharmacyEditProductScreen({super.key, this.productId = 'med-01'});
  @override Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Edit Product', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Save', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.pharmacyColor)))]),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _field('Medicine Name', 'Crocin Advance 500mg'), _field('Generic Name', 'Paracetamol'), _field('Manufacturer', 'GSK'),
        Row(children: [Expanded(child: _field('MRP', '85')), const SizedBox(width: 12), Expanded(child: _field('Selling Price', '45'))]),
        Row(children: [Expanded(child: _field('Stock', '45')), const SizedBox(width: 12), Expanded(child: _field('Reorder Level', '10'))]),
        const SizedBox(height: 16),
        SizedBox(height: 52, child: ElevatedButton(onPressed: () => Navigator.pop(context), style: ElevatedButton.styleFrom(backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))), child: const Text('Update Product', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)))),
        const SizedBox(height: 12),
        SizedBox(height: 44, child: OutlinedButton(onPressed: () {}, style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))), child: const Text('Delete Product', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)))),
      ]),
    );
  }
  Widget _field(String label, String value) => Padding(padding: const EdgeInsets.only(bottom: 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade700)), const SizedBox(height: 6),
    TextFormField(initialValue: value, decoration: InputDecoration(filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade200)), contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12)))]));
}
