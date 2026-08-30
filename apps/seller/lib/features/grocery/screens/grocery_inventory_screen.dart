import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_event.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/routing/seller_router.dart';
import 'package:shared_mobile/core/utils/currency_formatter.dart';

/// Inventory Management — Browse products, toggle availability, update stock.
class GroceryInventoryScreen extends StatelessWidget {
  const GroceryInventoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Inventory', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [IconButton(icon: const Icon(Icons.search, color: Colors.white), onPressed: () => Navigator.pushNamed(context, SellerRouter.groceryBarcodeScan))]),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          if (state.allProducts.isEmpty) return const Center(child: Text('No products'));
          return ListView.builder(
            padding: const EdgeInsets.all(12), itemCount: state.allProducts.length,
            itemBuilder: (ctx, i) {
              final p = state.allProducts[i];
              final lowStock = p.stockLevel == StockLevel.low || p.stockLevel == StockLevel.outOfStock;
              return Container(
                margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: lowStock ? Colors.red.shade200 : Colors.grey.shade200)),
                child: Row(children: [
                  Text(p.emoji, style: const TextStyle(fontSize: 26)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(p.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    Text('${p.stockLabel} · ${p.minLabel}', style: TextStyle(fontSize: 10, color: lowStock ? Colors.red : Colors.grey.shade500)),
                    Text(CurrencyFormatter.format(p.price), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: SellerTheme.grocery)),
                  ])),
                  Column(children: [
                    Switch(value: p.isAvailable, activeThumbColor: SellerTheme.grocery, onChanged: (v) =>
                      context.read<GrocerySellerBloc>().add(ToggleCatalogItemAvailability(p.id, v))),
                    if (lowStock)
                      GestureDetector(
                        onTap: () => context.read<GrocerySellerBloc>().add(RestockGroceryProduct(p.id, p.minStockQty * 2)),
                        child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(6)),
                          child: const Text('Restock', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.orange)),
                        )),
                  ]),
                ]),
              );
            },
          );
        },
      ),
    );
  }
}
