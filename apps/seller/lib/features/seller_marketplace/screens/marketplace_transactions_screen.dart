import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Transactions — Full transaction ledger with filters, search, and export.
class MarketplaceTransactionsScreen extends StatefulWidget {
  const MarketplaceTransactionsScreen({super.key});

  @override
  State<MarketplaceTransactionsScreen> createState() =>
      _MarketplaceTransactionsScreenState();
}

class _MarketplaceTransactionsScreenState
    extends State<MarketplaceTransactionsScreen> {
  static const _mp = Color(0xFF6C3FC8);
  String _filter = 'all';

  final List<_Transaction> _txns = [
    const _Transaction(
        id: 'TXN-90201',
        type: 'sale',
        description: 'Order #KS-78432 — iPhone 15 Pro Max',
        amount: 5699,
        date: '25 Jun 2026',
        time: '3:45 PM'),
    const _Transaction(
        id: 'TXN-90202',
        type: 'commission',
        description: 'Platform commission — 8%',
        amount: -456,
        date: '25 Jun 2026',
        time: '3:45 PM'),
    const _Transaction(
        id: 'TXN-90203',
        type: 'sale',
        description: 'Order #KS-78290 — Sony WH-1000XM5',
        amount: 1299,
        date: '24 Jun 2026',
        time: '11:20 AM'),
    const _Transaction(
        id: 'TXN-90204',
        type: 'refund',
        description: 'Refund — Order #KS-77988 Apple Watch',
        amount: -1899,
        date: '23 Jun 2026',
        time: '9:00 AM'),
    const _Transaction(
        id: 'TXN-90205',
        type: 'payout',
        description: 'Weekly payout to bank ****4521',
        amount: -12450,
        date: '22 Jun 2026',
        time: '6:00 AM'),
    const _Transaction(
        id: 'TXN-90206',
        type: 'sale',
        description: 'Order #KS-78101 — Samsung Galaxy S24',
        amount: 4999,
        date: '22 Jun 2026',
        time: '2:15 PM'),
    const _Transaction(
        id: 'TXN-90207',
        type: 'ad_charge',
        description: 'Sponsored ad — iPhone 15 Pro Max',
        amount: -50,
        date: '21 Jun 2026',
        time: '12:00 AM'),
    const _Transaction(
        id: 'TXN-90208',
        type: 'sale',
        description: 'Order #KS-77850 — MacBook Air M3',
        amount: 5499,
        date: '20 Jun 2026',
        time: '5:30 PM'),
    const _Transaction(
        id: 'TXN-90209',
        type: 'commission',
        description: 'Platform commission — 8%',
        amount: -440,
        date: '20 Jun 2026',
        time: '5:30 PM'),
    const _Transaction(
        id: 'TXN-90210',
        type: 'payout',
        description: 'Weekly payout to bank ****4521',
        amount: -8900,
        date: '15 Jun 2026',
        time: '6:00 AM'),
  ];

  List<_Transaction> get _filtered =>
      _filter == 'all' ? _txns : _txns.where((t) => t.type == _filter).toList();

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;
    final totalIn =
        _txns.where((t) => t.amount > 0).fold<int>(0, (s, t) => s + t.amount);
    final totalOut = _txns
        .where((t) => t.amount < 0)
        .fold<int>(0, (s, t) => s + t.amount.abs());

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Transactions · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
              icon: const Icon(Icons.file_download),
              tooltip: 'Export',
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: const Text('Transaction report exported'),
                    backgroundColor: SellerTheme.successGreen,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12))));
              }),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                Row(children: [
                  Expanded(
                      child: _kpi('Money In', '$currency $totalIn',
                          SellerTheme.successGreen, Icons.arrow_downward)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _kpi('Money Out', '$currency $totalOut',
                          SellerTheme.errorRed, Icons.arrow_upward)),
                ]),
                const SizedBox(height: 16),
                SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      'all',
                      'sale',
                      'commission',
                      'refund',
                      'payout',
                      'ad_charge'
                    ].map((f) {
                      final active = _filter == f;
                      final label = f == 'all'
                          ? 'All'
                          : f == 'ad_charge'
                              ? 'Ads'
                              : f[0].toUpperCase() + f.substring(1);
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(label),
                          selected: active,
                          onSelected: (_) => setState(() => _filter = f),
                          selectedColor: _mp.withValues(alpha: 0.15),
                          checkmarkColor: _mp,
                          labelStyle: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: active ? _mp : SellerTheme.textSecondary),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                          side: BorderSide(
                              color: active ? _mp : SellerTheme.border),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),
                ..._filtered.map((t) => _buildTxnTile(t, currency)),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _kpi(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Row(children: [
        Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 18)),
        const SizedBox(width: 10),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value,
              style: TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w800, color: color)),
          Text(label,
              style:
                  TextStyle(fontSize: 11, color: color.withValues(alpha: 0.7))),
        ])),
      ]),
    );
  }

  Widget _buildTxnTile(_Transaction t, String currency) {
    final isCredit = t.amount > 0;
    final icon = t.type == 'sale'
        ? Icons.shopping_bag
        : t.type == 'commission'
            ? Icons.percent
            : t.type == 'refund'
                ? Icons.undo
                : t.type == 'payout'
                    ? Icons.account_balance
                    : Icons.ads_click;
    final color = isCredit ? SellerTheme.successGreen : SellerTheme.errorRed;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: SellerTheme.cardDecoration(),
      child: Row(children: [
        Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 18)),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(t.description,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Text('${t.date} · ${t.time}',
              style:
                  const TextStyle(fontSize: 11, color: SellerTheme.textMuted)),
        ])),
        Text('${isCredit ? '+' : '−'}$currency ${t.amount.abs()}',
            style: TextStyle(
                fontSize: 14, fontWeight: FontWeight.w700, color: color)),
      ]),
    );
  }
}

class _Transaction {
  final String id, type, description, date, time;
  final int amount;
  const _Transaction(
      {required this.id,
      required this.type,
      required this.description,
      required this.amount,
      required this.date,
      required this.time});
}
