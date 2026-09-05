import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_shared_mobile/core/utils/currency_formatter.dart';

/// Returns — Recent returns/refunds processed by the seller.
class GrocerySellerReturnsScreen extends StatelessWidget {
  const GrocerySellerReturnsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Returns & Refunds', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          // Returns derive from cancelled/refunded orders
          final returns = state.orders.where((o) => o.status.name == 'cancelled').toList();
          if (returns.isEmpty) {
            return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text('🎉', style: TextStyle(fontSize: 48)), SizedBox(height: 8),
              Text('No returns yet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              Text('Great job keeping customers happy!', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ]));
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12), itemCount: returns.length,
            itemBuilder: (ctx, i) {
              final o = returns[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.red.shade100)),
                child: Row(children: [
                  Container(width: 40, height: 40, decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.assignment_return, color: Colors.red, size: 18)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('#${o.orderNumber}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    Text(o.customerName, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  ])),
                  Text(CurrencyFormatter.format(o.grandTotal), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.red)),
                ]),
              );
            },
          );
        },
      ),
    );
  }
}
