import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_shared_mobile/core/utils/currency_formatter.dart';

/// Barcode Scanner — Scan a product barcode to view/update stock.
class GrocerySellerBarcodeScanScreen extends StatefulWidget {
  const GrocerySellerBarcodeScanScreen({super.key});
  @override State<GrocerySellerBarcodeScanScreen> createState() => _State();
}

class _State extends State<GrocerySellerBarcodeScanScreen> {
  final _barcodeCtl = TextEditingController();
  GroceryProduct? _found;
  String? _error;

  @override
  void dispose() { _barcodeCtl.dispose(); super.dispose(); }

  void _search() {
    final state = context.read<GrocerySellerBloc>().state;
    final query = _barcodeCtl.text.trim().toLowerCase();
    final match = state.allProducts.where((p) => p.id.toLowerCase() == query || p.name.toLowerCase().contains(query));
    setState(() { _found = match.isNotEmpty ? match.first : null; _error = match.isEmpty ? 'Product not found' : null; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Barcode Scanner', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(16)),
          child: const Column(children: [
            Icon(Icons.qr_code_scanner, color: Colors.white54, size: 64), SizedBox(height: 12),
            Text('Point camera at barcode', style: TextStyle(color: Colors.white54, fontSize: 12)),
          ])),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: Container(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
            child: TextField(controller: _barcodeCtl, decoration: const InputDecoration(hintText: 'Enter barcode or product name', border: InputBorder.none, contentPadding: EdgeInsets.all(12), hintStyle: TextStyle(fontSize: 13))))),
          const SizedBox(width: 8),
          ElevatedButton(onPressed: _search, style: ElevatedButton.styleFrom(backgroundColor: SellerTheme.grocery, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), elevation: 0, padding: const EdgeInsets.all(12)),
            child: const Icon(Icons.search, size: 20)),
        ]),
        const SizedBox(height: 16),
        if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
        if (_found != null) Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: SellerTheme.grocery.withValues(alpha: 0.3))),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Text(_found!.emoji, style: const TextStyle(fontSize: 28)), const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_found!.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                Text('Category: ${_found!.category}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ]))]),
            const SizedBox(height: 10), const Divider(height: 1),
            const SizedBox(height: 10),
            Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
              _stat('Price', CurrencyFormatter.format(_found!.price)),
              _stat('Stock', _found!.stockLabel),
              _stat('Status', _found!.isAvailable ? 'Active' : 'Inactive'),
            ]),
          ])),
      ]),
    );
  }

  Widget _stat(String l, String v) => Column(children: [Text(l, style: TextStyle(fontSize: 10, color: Colors.grey.shade500)), Text(v, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800))]);
}
