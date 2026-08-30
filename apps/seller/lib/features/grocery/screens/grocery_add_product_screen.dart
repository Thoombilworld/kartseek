import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_event.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Add New Product — Form to add a new grocery item.
class GroceryAddProductScreen extends StatefulWidget {
  const GroceryAddProductScreen({super.key});
  @override State<GroceryAddProductScreen> createState() => _State();
}

class _State extends State<GroceryAddProductScreen> {
  final _nameCtl = TextEditingController();
  final _emojiCtl = TextEditingController(text: '🍎');
  final _priceCtl = TextEditingController();
  final _stockCtl = TextEditingController();
  String _selectedUnit = 'kg';
  String _selectedCategory = '';

  @override
  void dispose() { _nameCtl.dispose(); _emojiCtl.dispose(); _priceCtl.dispose(); _stockCtl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Add Product', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [TextButton(onPressed: _submit, child: const Text('Save', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)))]),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          if (_selectedCategory.isEmpty && state.categories.isNotEmpty) _selectedCategory = state.categories.first.id;
          return ListView(padding: const EdgeInsets.all(16), children: [
            _label('Product Name'), _field(_nameCtl, 'e.g. Organic Bananas'),
            const SizedBox(height: 12),
            _label('Emoji Icon'), _field(_emojiCtl, '🍎'),
            const SizedBox(height: 12),
            _label('Category'),
            Container(padding: const EdgeInsets.symmetric(horizontal: 12), decoration: _boxDeco(),
              child: DropdownButtonHideUnderline(child: DropdownButton<String>(
                value: _selectedCategory.isEmpty ? null : _selectedCategory, isExpanded: true,
                items: state.categories.map((c) => DropdownMenuItem(value: c.id, child: Text('${c.emoji} ${c.name}', style: const TextStyle(fontSize: 13)))).toList(),
                onChanged: (v) => setState(() => _selectedCategory = v ?? '')))),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [_label('Price'), _field(_priceCtl, '0.00', type: TextInputType.number)])),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [_label('Unit'),
                Container(padding: const EdgeInsets.symmetric(horizontal: 12), decoration: _boxDeco(),
                  child: DropdownButtonHideUnderline(child: DropdownButton<String>(value: _selectedUnit, isExpanded: true,
                    items: ['kg', 'L', 'pcs', 'bundle', 'g', 'ml'].map((u) => DropdownMenuItem(value: u, child: Text(u, style: const TextStyle(fontSize: 13)))).toList(),
                    onChanged: (v) => setState(() => _selectedUnit = v ?? 'kg'))))])),
            ]),
            const SizedBox(height: 12),
            _label('Initial Stock'), _field(_stockCtl, '0', type: TextInputType.number),
            const SizedBox(height: 24),
            SizedBox(height: 50, child: ElevatedButton(onPressed: _submit,
              style: ElevatedButton.styleFrom(backgroundColor: SellerTheme.grocery, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
              child: const Text('Add Product', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)))),
          ]);
        },
      ),
    );
  }

  void _submit() {
    if (_nameCtl.text.isEmpty || _priceCtl.text.isEmpty) return;
    context.read<GrocerySellerBloc>().add(AddNewGroceryProduct(
      name: _nameCtl.text, emoji: _emojiCtl.text, categoryId: _selectedCategory,
      price: double.tryParse(_priceCtl.text) ?? 0, unit: _selectedUnit, stockQty: int.tryParse(_stockCtl.text) ?? 0,
    ));
    Navigator.pop(context);
  }

  Widget _label(String t) => Padding(padding: const EdgeInsets.only(bottom: 6), child: Text(t, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey.shade600)));
  Widget _field(TextEditingController c, String hint, {TextInputType type = TextInputType.text}) => Container(
    decoration: _boxDeco(),
    child: TextField(controller: c, keyboardType: type, decoration: InputDecoration(hintText: hint, border: InputBorder.none, contentPadding: const EdgeInsets.all(12), hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400))),
  );
  BoxDecoration _boxDeco() => BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200));
}
