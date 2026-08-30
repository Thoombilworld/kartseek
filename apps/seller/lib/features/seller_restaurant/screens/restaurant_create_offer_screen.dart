import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Restaurant Create Offer / Deal Screen.
class RestaurantCreateOfferScreen extends StatefulWidget {
  const RestaurantCreateOfferScreen({super.key});
  @override
  State<RestaurantCreateOfferScreen> createState() => _State();
}

class _State extends State<RestaurantCreateOfferScreen> {
  final _titleCtl = TextEditingController();
  final _discountCtl = TextEditingController(text: '20');
  String _type = 'percentage';
  String _applyTo = 'all';

  @override
  void dispose() { _titleCtl.dispose(); _discountCtl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Create Offer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _label('Offer Title'),
        TextField(controller: _titleCtl, decoration: _inputDec('e.g. Happy Hour 50% OFF', c)),
        const SizedBox(height: 16),
        _label('Discount Type'),
        Row(children: [
          _chip('Percentage', _type == 'percentage', () => setState(() => _type = 'percentage'), c),
          const SizedBox(width: 8),
          _chip('Flat Amount', _type == 'flat', () => setState(() => _type = 'flat'), c),
          const SizedBox(width: 8),
          _chip('BOGO', _type == 'bogo', () => setState(() => _type = 'bogo'), c),
        ]),
        const SizedBox(height: 16),
        _label('Discount Value'),
        TextField(controller: _discountCtl, keyboardType: TextInputType.number, decoration: _inputDec(_type == 'percentage' ? '% off' : 'Amount', c)),
        const SizedBox(height: 16),
        _label('Apply To'),
        Row(children: [
          _chip('All Items', _applyTo == 'all', () => setState(() => _applyTo = 'all'), c),
          const SizedBox(width: 8),
          _chip('Category', _applyTo == 'category', () => setState(() => _applyTo = 'category'), c),
          const SizedBox(width: 8),
          _chip('Specific Items', _applyTo == 'items', () => setState(() => _applyTo = 'items'), c),
        ]),
        const SizedBox(height: 24),
        SizedBox(height: 48, child: ElevatedButton(
          onPressed: () { Navigator.pop(context); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Offer created!'))); },
          style: ElevatedButton.styleFrom(backgroundColor: c, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
          child: const Text('Create Offer', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        )),
      ]),
    );
  }

  Widget _label(String t) => Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(t, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)));

  InputDecoration _inputDec(String hint, Color c) => InputDecoration(
    hintText: hint, hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: c)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
  );

  Widget _chip(String label, bool active, VoidCallback onTap, Color c) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(color: active ? c.withValues(alpha: 0.1) : Colors.grey.shade100, borderRadius: BorderRadius.circular(20), border: Border.all(color: active ? c : Colors.grey.shade300)),
      child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? c : Colors.grey.shade600)),
    ),
  );
}
