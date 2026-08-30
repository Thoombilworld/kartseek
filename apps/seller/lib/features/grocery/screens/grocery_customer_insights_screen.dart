import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:shared_mobile/core/utils/currency_formatter.dart';

/// Customer Insights — Repeat customers, top spenders, order patterns.
class GroceryCustomerInsightsScreen extends StatelessWidget {
  const GroceryCustomerInsightsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Customer Insights', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          // Aggregate orders by customer
          final customerMap = <String, _CustomerData>{};
          for (final o in state.orders) {
            final name = o.customerName;
            customerMap.putIfAbsent(name, () => _CustomerData(name));
            customerMap[name]!.orders++;
            customerMap[name]!.totalSpent += o.grandTotal;
          }
          final customers = customerMap.values.toList()..sort((a, b) => b.totalSpent.compareTo(a.totalSpent));
          final uniqueCount = customers.length;
          final repeatCount = customers.where((c) => c.orders > 1).length;

          return ListView(padding: const EdgeInsets.all(16), children: [
            // Summary
            Row(children: [
              _stat('Total Customers', '$uniqueCount', Icons.people, Colors.blue),
              const SizedBox(width: 8),
              _stat('Repeat Buyers', '$repeatCount', Icons.repeat, SellerTheme.grocery),
              const SizedBox(width: 8),
              _stat('Retention', '${uniqueCount > 0 ? (repeatCount / uniqueCount * 100).toStringAsFixed(0) : 0}%', Icons.trending_up, Colors.orange),
            ]),
            const SizedBox(height: 16),
            // Top Spenders
            Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Top Customers', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                ...customers.take(10).map((c) => Padding(padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(children: [
                    CircleAvatar(radius: 16, backgroundColor: SellerTheme.grocery.withValues(alpha: 0.1), child: Text(c.name[0], style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: SellerTheme.grocery))),
                    const SizedBox(width: 10),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(c.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      Text('${c.orders} orders', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                    ])),
                    Text(CurrencyFormatter.format(c.totalSpent), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                  ]))),
              ])),
          ]);
        },
      ),
    );
  }

  Widget _stat(String l, String v, IconData i, Color c) => Expanded(child: Container(padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: Column(children: [Icon(i, color: c, size: 18), const SizedBox(height: 4), Text(v, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)), Text(l, style: TextStyle(fontSize: 9, color: Colors.grey.shade500))])));
}

class _CustomerData {
  final String name;
  int orders = 0;
  double totalSpent = 0;
  _CustomerData(this.name);
}
