import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_shared_mobile/core/utils/currency_formatter.dart';

/// Create Deal — Form to create flash deals / promotions.
class GroceryCreateDealScreen extends StatefulWidget {
  const GroceryCreateDealScreen({super.key});
  @override State<GroceryCreateDealScreen> createState() => _State();
}

class _State extends State<GroceryCreateDealScreen> {
  String? _selectedProductId;
  final _discountCtl = TextEditingController(text: '20');
  String _discountType = 'percentage'; // 'percentage' | 'flat'
  int _durationHours = 24;

  @override void dispose() { _discountCtl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Create Deal', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          return ListView(padding: const EdgeInsets.all(16), children: [
            _label('Select Product'),
            Container(padding: const EdgeInsets.symmetric(horizontal: 12), decoration: _boxDeco(),
              child: DropdownButtonHideUnderline(child: DropdownButton<String>(
                value: _selectedProductId, isExpanded: true, hint: const Text('Choose a product', style: TextStyle(fontSize: 13)),
                items: state.allProducts.map((p) => DropdownMenuItem(value: p.id,
                  child: Row(children: [Text(p.emoji, style: const TextStyle(fontSize: 16)), const SizedBox(width: 8), Text('${p.name} · ${CurrencyFormatter.format(p.price)}', style: const TextStyle(fontSize: 12))]))).toList(),
                onChanged: (v) => setState(() => _selectedProductId = v)))),
            const SizedBox(height: 14),
            _label('Discount Type'),
            Row(children: [
              _chip('Percentage (%)', 'percentage'), const SizedBox(width: 8),
              _chip('Flat Amount', 'flat'),
            ]),
            const SizedBox(height: 14),
            _label('Discount Value'),
            Container(decoration: _boxDeco(),
              child: TextField(controller: _discountCtl, keyboardType: TextInputType.number,
                decoration: InputDecoration(hintText: _discountType == 'percentage' ? 'e.g. 20' : 'e.g. 5.00',
                  suffixText: _discountType == 'percentage' ? '%' : '', border: InputBorder.none, contentPadding: const EdgeInsets.all(12)))),
            const SizedBox(height: 14),
            _label('Duration'),
            Wrap(spacing: 8, children: [6, 12, 24, 48, 72].map((h) => ChoiceChip(
              label: Text('${h}h', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _durationHours == h ? Colors.white : Colors.grey.shade600)),
              selected: _durationHours == h, selectedColor: SellerTheme.grocery,
              onSelected: (s) { if (s) setState(() => _durationHours = h); },
            )).toList()),
            const SizedBox(height: 24),
            SizedBox(height: 50, child: ElevatedButton(
              onPressed: _selectedProductId == null ? null : () { Navigator.pop(context); },
              style: ElevatedButton.styleFrom(backgroundColor: SellerTheme.grocery, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0, disabledBackgroundColor: Colors.grey.shade300),
              child: const Text('Launch Deal', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)))),
          ]);
        },
      ),
    );
  }

  Widget _chip(String l, String val) => GestureDetector(onTap: () => setState(() => _discountType = val),
    child: Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(color: _discountType == val ? SellerTheme.grocery : Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: _discountType == val ? SellerTheme.grocery : Colors.grey.shade300)),
      child: Text(l, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _discountType == val ? Colors.white : Colors.grey.shade600))));
  Widget _label(String t) => Padding(padding: const EdgeInsets.only(bottom: 6), child: Text(t, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey.shade600)));
  BoxDecoration _boxDeco() => BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200));
}
