import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_event.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_shared_mobile/core/utils/currency_formatter.dart';

/// New Orders Screen — Incoming orders requiring acceptance.
class GroceryNewOrdersScreen extends StatelessWidget {
  const GroceryNewOrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('New Orders', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          final pending = state.orders.where((o) => o.status.name == 'pending').toList();
          if (pending.isEmpty) {
            return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text('📦', style: TextStyle(fontSize: 48)), SizedBox(height: 8), Text('No new orders', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700))]));
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12), itemCount: pending.length,
            itemBuilder: (ctx, i) {
              final o = pending[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.orange.shade200), boxShadow: [BoxShadow(color: Colors.orange.withValues(alpha: 0.05), blurRadius: 8)]),
                child: Column(children: [
                  Row(children: [
                    Container(width: 42, height: 42, decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.shopping_bag, color: Colors.orange, size: 20)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Order #${o.orderNumber}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                      Text('${o.customerName} · ${o.items.length} items', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    ])),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text(CurrencyFormatter.format(o.grandTotal), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                      Text('${o.createdAt.hour}:${o.createdAt.minute.toString().padLeft(2, '0')}', style: TextStyle(fontSize: 9, color: Colors.grey.shade400)),
                    ]),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: OutlinedButton(
                      onPressed: () => context.read<GrocerySellerBloc>().add(RejectGroceryOrder(o.id, 'Store busy')),
                      style: OutlinedButton.styleFrom(side: BorderSide(color: Colors.red.shade300), foregroundColor: Colors.red, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                      child: const Text('Decline', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    )),
                    const SizedBox(width: 10),
                    Expanded(child: ElevatedButton(
                      onPressed: () => context.read<GrocerySellerBloc>().add(AcceptGroceryOrder(o.id)),
                      style: ElevatedButton.styleFrom(backgroundColor: SellerTheme.grocery, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), elevation: 0),
                      child: const Text('Accept', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
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
