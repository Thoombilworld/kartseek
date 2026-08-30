import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:shared_mobile/core/utils/currency_formatter.dart';

/// Payout History — Past payouts list.
class GroceryPayoutHistoryScreen extends StatelessWidget {
  const GroceryPayoutHistoryScreen({super.key});

  // Payouts would come from a dedicated API; for now show computed data
  static const _payouts = [
    {'week': 'Jun 23 – 29', 'amount': 18200.0, 'orders': 142, 'status': 'Paid'},
    {'week': 'Jun 16 – 22', 'amount': 15600.0, 'orders': 118, 'status': 'Paid'},
    {'week': 'Jun 09 – 15', 'amount': 21400.0, 'orders': 165, 'status': 'Paid'},
    {'week': 'Jun 02 – 08', 'amount': 12800.0, 'orders': 98, 'status': 'Paid'},
    {'week': 'May 26 – Jun 01', 'amount': 19100.0, 'orders': 147, 'status': 'Paid'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Payout History', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: ListView.builder(
        padding: const EdgeInsets.all(12), itemCount: _payouts.length,
        itemBuilder: (ctx, i) {
          final p = _payouts[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [
              Container(width: 40, height: 40, decoration: BoxDecoration(color: SellerTheme.grocery.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.account_balance, color: SellerTheme.grocery, size: 18)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(p['week'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                Text('${p['orders']} orders', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(CurrencyFormatter.format(p['amount'] as double), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: SellerTheme.grocery)),
                Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6)),
                  child: Text(p['status'] as String, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.green.shade700))),
              ]),
            ]),
          );
        },
      ),
    );
  }
}
