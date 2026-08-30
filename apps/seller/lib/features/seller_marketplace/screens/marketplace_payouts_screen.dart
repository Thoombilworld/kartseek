import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Payouts — Payout history, upcoming schedules, bank account management.
class MarketplacePayoutsScreen extends StatelessWidget {
  const MarketplacePayoutsScreen({super.key});

  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;

    final payouts = <_Payout>[
      const _Payout(
          id: 'PO-3001',
          amount: 12450,
          date: '22 Jun 2026',
          bank: '****4521',
          status: 'completed',
          method: 'Bank Transfer'),
      const _Payout(
          id: 'PO-3002',
          amount: 8900,
          date: '15 Jun 2026',
          bank: '****4521',
          status: 'completed',
          method: 'Bank Transfer'),
      const _Payout(
          id: 'PO-3003',
          amount: 15200,
          date: '8 Jun 2026',
          bank: '****4521',
          status: 'completed',
          method: 'Bank Transfer'),
      const _Payout(
          id: 'PO-3004',
          amount: 6750,
          date: '1 Jun 2026',
          bank: '****4521',
          status: 'completed',
          method: 'Bank Transfer'),
    ];

    final totalPaid = payouts.fold<int>(0, (s, p) => s + p.amount);
    const pendingBalance = 7850;
    const nextPayout = '29 Jun 2026';

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Payouts · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                // Pending payout banner
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                      gradient: SellerTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(20)),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Pending Balance',
                            style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.7),
                                fontSize: 13)),
                        const SizedBox(height: 4),
                        Text('$currency $pendingBalance',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.w800)),
                        const SizedBox(height: 8),
                        Row(children: [
                          Icon(Icons.schedule,
                              size: 14,
                              color: Colors.white.withValues(alpha: 0.7)),
                          const SizedBox(width: 4),
                          Text('Next payout: $nextPayout',
                              style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.8),
                                  fontSize: 12)),
                        ]),
                        const SizedBox(height: 12),
                        SizedBox(
                            width: double.infinity,
                            height: 42,
                            child: ElevatedButton(
                              onPressed: () => ScaffoldMessenger.of(context)
                                  .showSnackBar(const SnackBar(
                                      content: Text(
                                          'Early payout request submitted. Processing in 24 hours.'),
                                      duration: Duration(seconds: 3))),
                              style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: _mp,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12))),
                              child: const Text('Request Early Payout',
                                  style:
                                      TextStyle(fontWeight: FontWeight.w700)),
                            )),
                      ]),
                ),
                const SizedBox(height: 16),

                // Bank account
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: SellerTheme.cardDecoration(),
                  child: Row(children: [
                    Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                            color: SellerTheme.infoBlue.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12)),
                        child: const Icon(Icons.account_balance,
                            color: SellerTheme.infoBlue, size: 22)),
                    const SizedBox(width: 14),
                    const Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text('Bank Account',
                              style: TextStyle(
                                  fontSize: 14, fontWeight: FontWeight.w700)),
                          Text('National Bank of Qatar · ****4521',
                              style: TextStyle(
                                  fontSize: 12, color: SellerTheme.textMuted)),
                        ])),
                    TextButton(
                        onPressed: () => ScaffoldMessenger.of(context)
                            .showSnackBar(const SnackBar(
                                content: Text('Bank account editor opened'),
                                duration: Duration(seconds: 2))),
                        child: const Text('Change',
                            style: TextStyle(
                                color: _mp,
                                fontWeight: FontWeight.w600,
                                fontSize: 12))),
                  ]),
                ),
                const SizedBox(height: 16),

                // Payout history
                Row(children: [
                  const Text('Payout History',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const Spacer(),
                  Text('Total: $currency $totalPaid',
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _mp)),
                ]),
                const SizedBox(height: 10),
                ...payouts.map((p) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(14),
                      decoration: SellerTheme.cardDecoration(),
                      child: Row(children: [
                        Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                                color: SellerTheme.successGreen
                                    .withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10)),
                            child: const Icon(Icons.check_circle,
                                color: SellerTheme.successGreen, size: 18)),
                        const SizedBox(width: 12),
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text(p.id,
                                  style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600)),
                              Text('${p.date} · ${p.method}',
                                  style: const TextStyle(
                                      fontSize: 11,
                                      color: SellerTheme.textMuted)),
                            ])),
                        Text('$currency ${p.amount}',
                            style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: SellerTheme.successGreen)),
                      ]),
                    )),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Payout {
  final String id, date, bank, status, method;
  final int amount;
  const _Payout(
      {required this.id,
      required this.amount,
      required this.date,
      required this.bank,
      required this.status,
      required this.method});
}
