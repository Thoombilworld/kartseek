import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:shared_mobile/core/utils/currency_formatter.dart';

/// Seller Notifications — order alerts, low stock, reviews, payouts.
class GrocerySellerNotificationsScreen extends StatelessWidget {
  const GrocerySellerNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Notifications', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [TextButton(onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Notifications cleared'))), child: const Text('Clear all', style: TextStyle(color: Colors.white70, fontSize: 12)))]),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          // Build notifications from BLoC state
          final items = <_NotifItem>[];
          for (final o in state.orders.where((o) => o.status.name == 'pending').take(5)) {
            items.add(_NotifItem(Icons.shopping_bag, Colors.orange, 'New Order #${o.orderNumber}', '${o.customerName} · ${o.items.length} items · ${CurrencyFormatter.format(o.grandTotal)}', 'Just now'));
          }
          for (final p in state.lowStockProducts.take(5)) {
            items.add(_NotifItem(Icons.warning_amber_rounded, Colors.red, 'Low Stock: ${p.name}', '${p.stockLabel} remaining (min: ${p.minLabel})', '10m ago'));
          }
          if (items.isEmpty) {
            items.addAll([
              _NotifItem(Icons.star, Colors.amber, 'New 5★ Review', 'A customer gave your store a 5-star rating', '2m ago'),
              _NotifItem(Icons.payments, SellerTheme.grocery, 'Payout Processed', 'Your weekly payout has been sent', '1h ago'),
            ]);
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12), itemCount: items.length,
            itemBuilder: (ctx, i) {
              final n = items[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
                child: Row(children: [
                  Container(width: 40, height: 40, decoration: BoxDecoration(color: n.color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                    child: Icon(n.icon, color: n.color, size: 18)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(n.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    Text(n.subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  ])),
                  Text(n.time, style: TextStyle(fontSize: 9, color: Colors.grey.shade400)),
                ]),
              );
            },
          );
        },
      ),
    );
  }
}

class _NotifItem {
  final IconData icon; final Color color; final String title; final String subtitle; final String time;
  _NotifItem(this.icon, this.color, this.title, this.subtitle, this.time);
}
