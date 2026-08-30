import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Wallet — Seller wallet balance, top-up, withdraw, and transaction history.
class MarketplaceWalletScreen extends StatelessWidget {
  const MarketplaceWalletScreen({super.key});

  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;

    const balance = 7850;
    const holdAmount = 1200;

    final history = <_WalletEntry>[
      const _WalletEntry(
          type: 'credit',
          description: 'Order earnings — 25 Jun',
          amount: 5699,
          date: '25 Jun',
          balance: 7850),
      const _WalletEntry(
          type: 'debit',
          description: 'Weekly payout to bank',
          amount: -12450,
          date: '22 Jun',
          balance: 2151),
      const _WalletEntry(
          type: 'credit',
          description: 'Order earnings — 22 Jun',
          amount: 4999,
          date: '22 Jun',
          balance: 14601),
      const _WalletEntry(
          type: 'debit',
          description: 'Ad spend — Sponsored products',
          amount: -50,
          date: '21 Jun',
          balance: 9602),
      const _WalletEntry(
          type: 'debit',
          description: 'Commission deducted',
          amount: -440,
          date: '20 Jun',
          balance: 9652),
      const _WalletEntry(
          type: 'credit',
          description: 'Order earnings — 20 Jun',
          amount: 5499,
          date: '20 Jun',
          balance: 10092),
    ];

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Wallet · ${ss.country.flag}',
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
                // Balance card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                      gradient: SellerTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(24)),
                  child: Column(children: [
                    Text('Available Balance',
                        style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.7),
                            fontSize: 14)),
                    const SizedBox(height: 6),
                    Text('$currency $balance',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 36,
                            fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20)),
                      child: Text('On hold: $currency $holdAmount',
                          style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 12)),
                    ),
                    const SizedBox(height: 18),
                    Row(children: [
                      Expanded(
                          child: ElevatedButton.icon(
                        onPressed: () => ScaffoldMessenger.of(context)
                            .showSnackBar(SnackBar(
                                content: Text(
                                    'Withdraw $currency $balance requested'),
                                duration: const Duration(seconds: 2))),
                        icon: const Icon(Icons.arrow_downward, size: 18),
                        label: const Text('Withdraw'),
                        style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: _mp,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 12)),
                      )),
                      const SizedBox(width: 10),
                      Expanded(
                          child: OutlinedButton.icon(
                        onPressed: () => ScaffoldMessenger.of(context)
                            .showSnackBar(const SnackBar(
                                content: Text('Top Up — opens payment gateway'),
                                duration: Duration(seconds: 2))),
                        icon: const Icon(Icons.arrow_upward, size: 18),
                        label: const Text('Top Up'),
                        style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: BorderSide(
                                color: Colors.white.withValues(alpha: 0.5)),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(vertical: 12)),
                      )),
                    ]),
                  ]),
                ),
                const SizedBox(height: 20),

                // Quick actions
                Row(children: [
                  Expanded(
                      child: _quickAction(Icons.history, 'Statements', () {})),
                  const SizedBox(width: 10),
                  Expanded(
                      child:
                          _quickAction(Icons.account_balance, 'Bank', () {})),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _quickAction(Icons.settings, 'Auto-Pay', () {})),
                ]),
                const SizedBox(height: 20),

                // Transaction history
                const Text('Recent Activity',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                ...history.map((e) {
                  final isCredit = e.amount > 0;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    decoration: SellerTheme.cardDecoration(),
                    child: Row(children: [
                      Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                              color: (isCredit
                                      ? SellerTheme.successGreen
                                      : SellerTheme.errorRed)
                                  .withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10)),
                          child: Icon(
                              isCredit
                                  ? Icons.arrow_downward
                                  : Icons.arrow_upward,
                              color: isCredit
                                  ? SellerTheme.successGreen
                                  : SellerTheme.errorRed,
                              size: 16)),
                      const SizedBox(width: 10),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text(e.description,
                                style: const TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.w600),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                            Text(e.date,
                                style: const TextStyle(
                                    fontSize: 11,
                                    color: SellerTheme.textMuted)),
                          ])),
                      Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                                '${isCredit ? '+' : '−'}$currency ${e.amount.abs()}',
                                style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: isCredit
                                        ? SellerTheme.successGreen
                                        : SellerTheme.errorRed)),
                            Text('Bal: $currency ${e.balance}',
                                style: const TextStyle(
                                    fontSize: 10,
                                    color: SellerTheme.textMuted)),
                          ]),
                    ]),
                  );
                }),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _quickAction(IconData icon, String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: SellerTheme.cardDecoration(),
        child: Column(children: [
          Icon(icon, color: _mp, size: 22),
          const SizedBox(height: 6),
          Text(label,
              style:
                  const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}

class _WalletEntry {
  final String type, description, date;
  final int amount, balance;
  const _WalletEntry(
      {required this.type,
      required this.description,
      required this.amount,
      required this.date,
      required this.balance});
}
