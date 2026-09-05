import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_shared_mobile/core/utils/currency_formatter.dart';

/// Seller Earnings overview — Revenue, commissions, tips.
class GrocerySellerEarningsScreen extends StatelessWidget {
  const GrocerySellerEarningsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Earnings', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (ctx, state) {
          final delivered = state.orders.where((o) => o.status.name == 'delivered').toList();
          final totalRevenue = delivered.fold<double>(0, (s, o) => s + o.grandTotal);
          final totalOrders = delivered.length;
          final commission = totalRevenue * 0.12; // Platform fee
          final netEarnings = totalRevenue - commission;
          return ListView(padding: const EdgeInsets.all(16), children: [
            // Hero card
            Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(
              gradient: LinearGradient(colors: [SellerTheme.grocery, SellerTheme.grocery.withValues(alpha: 0.8)]), borderRadius: BorderRadius.circular(18)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Net Earnings', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
                Text(CurrencyFormatter.format(netEarnings), style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
                const SizedBox(height: 12),
                Row(children: [_heroStat('Revenue', CurrencyFormatter.format(totalRevenue)), _heroStat('Orders', '$totalOrders'), _heroStat('Commission', CurrencyFormatter.format(commission))]),
              ])),
            const SizedBox(height: 16),
            // Breakdown
            _section('This Week', [
              _breakdownRow('Mon', 12, 2400.0), _breakdownRow('Tue', 15, 3100.0), _breakdownRow('Wed', 8, 1800.0),
              _breakdownRow('Thu', 20, 4200.0), _breakdownRow('Fri', 18, 3800.0), _breakdownRow('Sat', 25, 5100.0), _breakdownRow('Sun', 22, 4600.0),
            ]),
          ]);
        },
      ),
    );
  }

  Widget _heroStat(String l, String v) => Expanded(child: Column(children: [Text(v, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800)), Text(l, style: const TextStyle(color: Colors.white60, fontSize: 10))]));
  Widget _section(String t, List<Widget> ch) => Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(t, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)), const SizedBox(height: 8), ...ch]));
  Widget _breakdownRow(String day, int orders, double rev) => Padding(padding: const EdgeInsets.symmetric(vertical: 3), child: Row(children: [
    SizedBox(width: 32, child: Text(day, style: TextStyle(fontSize: 11, color: Colors.grey.shade500))),
    Expanded(child: Container(height: 18, decoration: BoxDecoration(borderRadius: BorderRadius.circular(4), color: Colors.grey.shade100),
      child: FractionallySizedBox(alignment: Alignment.centerLeft, widthFactor: (orders / 30).clamp(0, 1),
        child: Container(decoration: BoxDecoration(borderRadius: BorderRadius.circular(4), color: SellerTheme.grocery.withValues(alpha: 0.7)))))),
    const SizedBox(width: 8), Text(CurrencyFormatter.format(rev), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
  ]));
}
