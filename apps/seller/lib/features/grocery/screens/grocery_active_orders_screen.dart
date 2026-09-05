import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/order_status_chip.dart';
import 'package:kartseek_shared_mobile/core/utils/currency_formatter.dart';

/// Active Orders — Orders in progress (preparing, ready, dispatched).
class GroceryActiveOrdersScreen extends StatelessWidget {
  const GroceryActiveOrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Active Orders', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          final active = state.orders.where((o) => o.status.name != 'pending' && o.status.name != 'delivered' && o.status.name != 'cancelled').toList();
          if (active.isEmpty) {
            return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text('📦', style: TextStyle(fontSize: 48)), SizedBox(height: 8), Text('No active orders', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700))]));
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12), itemCount: active.length,
            itemBuilder: (ctx, i) {
              final o = active[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
                child: Row(children: [
                  Container(width: 42, height: 42,
                    decoration: BoxDecoration(color: SellerTheme.grocery.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                    child: Icon(o.status.name == 'preparing' ? Icons.inventory_2 : o.status.name == 'ready' ? Icons.check_circle : Icons.local_shipping, color: SellerTheme.grocery, size: 20)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('#${o.orderNumber} · ${o.customerName}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    Row(children: [
                      OrderStatusChip(status: o.status),
                      const SizedBox(width: 6),
                      Text('${o.items.length} items', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                    ]),
                  ])),
                  Text(CurrencyFormatter.format(o.grandTotal), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
                ]),
              );
            },
          );
        },
      ),
    );
  }
}
