import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_state.dart';
import 'package:kartseek_partner/features/shared/models/partner_earning_model.dart';

/// Partner Wallet Screen — Reads balance and transactions from PartnerBloc.
class PartnerWalletScreen extends StatelessWidget {
  const PartnerWalletScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,###');

    return BlocBuilder<PartnerBloc, PartnerState>(
      builder: (context, state) {
        final w = state.wallet;

        return Scaffold(
          backgroundColor: PartnerTheme.surface,
          appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Wallet'), leading: const BackButton(color: PartnerTheme.textPrimary)),
          body: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Balance Card
                Container(
                  width: double.infinity, padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(gradient: PartnerTheme.darkGradient, borderRadius: BorderRadius.circular(20)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Available Balance', style: TextStyle(color: Colors.white60, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text('${RegionService.instance.currentCountry.currencySymbol} ${fmt.format(w.availableBalance)}', style: const TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 16),
                    Row(children: [
                      _balItem('Pending', '${RegionService.instance.currentCountry.currencySymbol} ${fmt.format(w.pendingBalance)}'),
                      Container(width: 1, height: 28, color: Colors.white24),
                      _balItem('Paid', '${RegionService.instance.currentCountry.currencySymbol} ${fmt.format(w.paidAmount)}'),
                      Container(width: 1, height: 28, color: Colors.white24),
                      _balItem('Cash', '${RegionService.instance.currentCountry.currencySymbol} ${fmt.format(w.cashCollected)}'),
                    ]),
                  ]),
                ),
                const SizedBox(height: 16),
                // Adjustment
                if (w.adjustment != 0)
                  Container(
                    padding: const EdgeInsets.all(14), decoration: PartnerTheme.cardDecoration(),
                    child: Row(children: [
                      const Icon(Icons.info_outline, size: 18, color: PartnerTheme.infoBlue),
                      const SizedBox(width: 10),
                      const Text('Adjustment: ', style: TextStyle(fontSize: 13, color: PartnerTheme.textSecondary)),
                      Text(
                        '${w.adjustment < 0 ? '-' : '+'} ${RegionService.instance.currentCountry.currencySymbol} ${fmt.format(w.adjustment.abs())}',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: w.adjustment < 0 ? PartnerTheme.offlineRed : PartnerTheme.onlineGreen),
                      ),
                    ]),
                  ),
                const SizedBox(height: 24),
                const Text('Recent Transactions', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                if (w.transactions.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(20), decoration: PartnerTheme.cardDecoration(),
                    child: const Center(child: Text('No transactions yet', style: TextStyle(color: PartnerTheme.textMuted))),
                  )
                else
                  ...w.transactions.map((txn) {
                    final isCredit = txn.type == WalletTxnType.credit;
                    final amountStr = '${isCredit ? '+' : '-'} ${RegionService.instance.currentCountry.currencySymbol} ${fmt.format(txn.amount.abs())}';
                    final icon = _txnIcon(txn.title);
                    return _txnCard(txn.title, txn.description, amountStr, isCredit, icon);
                  }),
              ],
            ),
          ),
        );
      },
    );
  }

  IconData _txnIcon(String title) {
    final t = title.toLowerCase();
    if (t.contains('trip') || t.contains('ride')) return Icons.directions_car;
    if (t.contains('delivery')) return Icons.local_shipping;
    if (t.contains('commission')) return Icons.receipt;
    if (t.contains('bonus') || t.contains('incentive')) return Icons.card_giftcard;
    if (t.contains('payout')) return Icons.account_balance;
    if (t.contains('cash')) return Icons.payments;
    return Icons.swap_horiz;
  }

  Widget _balItem(String label, String value) => Expanded(
    child: Column(children: [
      Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 11)),
      const SizedBox(height: 2),
      Text(value, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
    ]),
  );

  Widget _txnCard(String title, String desc, String amount, bool isCredit, IconData icon) => Container(
    margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14), decoration: PartnerTheme.cardDecoration(),
    child: Row(children: [
      Container(width: 40, height: 40, decoration: BoxDecoration(color: (isCredit ? PartnerTheme.onlineGreen : PartnerTheme.offlineRed).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, size: 18, color: isCredit ? PartnerTheme.onlineGreen : PartnerTheme.offlineRed)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        Text(desc, style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted)),
      ])),
      Text(amount, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: isCredit ? PartnerTheme.onlineGreen : PartnerTheme.offlineRed)),
    ]),
  );
}
