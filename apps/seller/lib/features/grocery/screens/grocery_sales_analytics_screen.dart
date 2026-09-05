import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_shared_mobile/core/utils/currency_formatter.dart';

/// Sales Analytics — Revenue charts, top products, order trends.
class GrocerySalesAnalyticsScreen extends StatelessWidget {
  const GrocerySalesAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Sales Analytics', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          final totalOrders = state.orders.length;
          final totalRevenue = state.orders.fold<double>(0, (s, o) => s + o.grandTotal);
          final avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0.0;

          // Top products by appearance in orders
          final productFreq = <String, int>{};
          for (final o in state.orders) {
            for (final item in o.items) { productFreq[item.name] = (productFreq[item.name] ?? 0) + item.quantity; }
          }
          final topProducts = productFreq.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

          return ListView(padding: const EdgeInsets.all(16), children: [
            // KPI row
            Row(children: [
              _kpiCard('Revenue', CurrencyFormatter.format(totalRevenue), Icons.attach_money, SellerTheme.grocery),
              const SizedBox(width: 8),
              _kpiCard('Orders', '$totalOrders', Icons.receipt_long, Colors.blue),
              const SizedBox(width: 8),
              _kpiCard('Avg Order', CurrencyFormatter.format(avgOrder), Icons.trending_up, Colors.orange),
            ]),
            const SizedBox(height: 16),
            // Top Products
            _section('Top Products', topProducts.take(8).map((e) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(children: [
                Expanded(child: Text(e.key, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                Text('${e.value} sold', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ]),
            )).toList()),
            const SizedBox(height: 12),
            // Category breakdown
            _section('By Category', state.categories.map((c) {
              final count = c.products.length;
              return Padding(padding: const EdgeInsets.symmetric(vertical: 3), child: Row(children: [
                Text(c.emoji, style: const TextStyle(fontSize: 16)), const SizedBox(width: 8),
                Expanded(child: Text(c.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                Text('$count items', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ]));
            }).toList()),
          ]);
        },
      ),
    );
  }

  Widget _kpiCard(String l, String v, IconData i, Color c) => Expanded(child: Container(padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: Column(children: [Icon(i, color: c, size: 20), const SizedBox(height: 4), Text(v, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)), Text(l, style: TextStyle(fontSize: 9, color: Colors.grey.shade500))])));
  Widget _section(String t, List<Widget> ch) => Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(t, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)), const SizedBox(height: 8), ...ch]));
}
