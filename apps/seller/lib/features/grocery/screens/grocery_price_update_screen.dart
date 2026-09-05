import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_event.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_shared_mobile/core/utils/currency_formatter.dart';

/// Price Update — Batch or individual price changes.
class GroceryPriceUpdateScreen extends StatelessWidget {
  const GroceryPriceUpdateScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Update Prices', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          if (state.allProducts.isEmpty) return const Center(child: Text('No products'));
          return ListView.builder(
            padding: const EdgeInsets.all(12), itemCount: state.allProducts.length,
            itemBuilder: (ctx, i) {
              final p = state.allProducts[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
                child: Row(children: [
                  Text(p.emoji, style: const TextStyle(fontSize: 22)),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(p.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    Text('Current: ${CurrencyFormatter.format(p.price)}/${p.unit}', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                  ])),
                  SizedBox(width: 80, child: _PriceInput(
                    initial: p.price,
                    onSubmit: (v) => context.read<GrocerySellerBloc>().add(UpdateGroceryProductPrice(p.id, v)),
                  )),
                ]),
              );
            },
          );
        },
      ),
    );
  }
}

class _PriceInput extends StatefulWidget {
  final double initial;
  final ValueChanged<double> onSubmit;
  const _PriceInput({required this.initial, required this.onSubmit});
  @override State<_PriceInput> createState() => _PriceInputState();
}

class _PriceInputState extends State<_PriceInput> {
  late TextEditingController _ctl;
  @override void initState() { super.initState(); _ctl = TextEditingController(text: widget.initial.toStringAsFixed(2)); }
  @override void dispose() { _ctl.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => TextField(
    controller: _ctl, keyboardType: TextInputType.number, textAlign: TextAlign.center,
    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
    decoration: InputDecoration(isDense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300))),
    onSubmitted: (v) { final price = double.tryParse(v); if (price != null && price > 0) widget.onSubmit(price); },
  );
}
