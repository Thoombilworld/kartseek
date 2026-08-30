import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Restaurant Payout History Screen.
class RestaurantPayoutHistoryScreen extends StatelessWidget {
  const RestaurantPayoutHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    final sym = RegionService.instance.currentCountry.currencySymbol;
    final payouts = [
      {'id': 'PAY-4401', 'amount': '${sym}42,300', 'date': 'Jul 1, 2026', 'status': 'Completed', 'method': 'Bank Transfer'},
      {'id': 'PAY-4389', 'amount': '${sym}38,700', 'date': 'Jun 24, 2026', 'status': 'Completed', 'method': 'Bank Transfer'},
      {'id': 'PAY-4372', 'amount': '${sym}35,100', 'date': 'Jun 17, 2026', 'status': 'Completed', 'method': 'M-Pesa'},
      {'id': 'PAY-4358', 'amount': '${sym}29,800', 'date': 'Jun 10, 2026', 'status': 'Completed', 'method': 'Bank Transfer'},
      {'id': 'PAY-4345', 'amount': '${sym}44,200', 'date': 'Jun 3, 2026', 'status': 'Completed', 'method': 'Bank Transfer'},
    ];
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Payout History', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Pending Payout', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              Text('${sym}18,600', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: c)),
              Text('Next payout: Jul 8, 2026', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
            ])),
            Container(width: 48, height: 48, decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
              child: Icon(Icons.account_balance, color: c, size: 24)),
          ]),
        ),
        const SizedBox(height: 16),
        Text('PAST PAYOUTS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey.shade500, letterSpacing: 1)),
        const SizedBox(height: 10),
        ...payouts.map((p) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
          child: Row(children: [
            Container(width: 40, height: 40, decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.check_circle, color: Colors.green, size: 20)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(p['id'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
              Text('${p['date']} • ${p['method']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
            ])),
            Text(p['amount'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.green)),
          ]),
        )),
      ]),
    );
  }
}
