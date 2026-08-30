import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Refunds — Track and manage refund processing for returned or cancelled orders.
class MarketplaceRefundsScreen extends StatefulWidget {
  const MarketplaceRefundsScreen({super.key});

  @override
  State<MarketplaceRefundsScreen> createState() =>
      _MarketplaceRefundsScreenState();
}

class _MarketplaceRefundsScreenState extends State<MarketplaceRefundsScreen> {
  static const _mp = Color(0xFF6C3FC8);
  String _filter = 'all';

  final List<_Refund> _refunds = [
    const _Refund(
        id: 'REF-8101',
        orderId: 'KS-78432',
        product: 'iPhone 15 Pro Max',
        customer: 'Ahmed K.',
        amount: 5699,
        status: 'processing',
        date: '25 Jun',
        method: 'Original Payment'),
    const _Refund(
        id: 'REF-8102',
        orderId: 'KS-78290',
        product: 'Sony WH-1000XM5',
        customer: 'Sara M.',
        amount: 1299,
        status: 'completed',
        date: '23 Jun',
        method: 'Wallet Credit'),
    const _Refund(
        id: 'REF-8103',
        orderId: 'KS-78101',
        product: 'Samsung Galaxy S24',
        customer: 'Khalid R.',
        amount: 4999,
        status: 'completed',
        date: '21 Jun',
        method: 'Bank Transfer'),
    const _Refund(
        id: 'REF-8104',
        orderId: 'KS-77988',
        product: 'Apple Watch SE',
        customer: 'Fatima A.',
        amount: 1899,
        status: 'failed',
        date: '20 Jun',
        method: 'Original Payment'),
    const _Refund(
        id: 'REF-8105',
        orderId: 'KS-77850',
        product: 'MacBook Air M3',
        customer: 'Omar H.',
        amount: 5499,
        status: 'processing',
        date: '19 Jun',
        method: 'Bank Transfer'),
  ];

  List<_Refund> get _filtered => _filter == 'all'
      ? _refunds
      : _refunds.where((r) => r.status == _filter).toList();

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;

    final totalRefunded = _refunds
        .where((r) => r.status == 'completed')
        .fold<int>(0, (s, r) => s + r.amount);
    final pending = _refunds.where((r) => r.status == 'processing').length;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Refunds · ${ss.country.flag}',
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
                // Summary
                Row(children: [
                  Expanded(
                      child: _summaryCard(
                          'Total Refunded',
                          '$currency $totalRefunded',
                          SellerTheme.errorRed,
                          Icons.money_off)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _summaryCard('Processing', '$pending',
                          SellerTheme.warningAmber, Icons.hourglass_bottom)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _summaryCard('This Month', '${_refunds.length}',
                          SellerTheme.infoBlue, Icons.calendar_month)),
                ]),
                const SizedBox(height: 16),

                // Filters
                SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children:
                        ['all', 'processing', 'completed', 'failed'].map((f) {
                      final active = _filter == f;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(f == 'all'
                              ? 'All'
                              : f[0].toUpperCase() + f.substring(1)),
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

                // List
                if (_filtered.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 40),
                    child: Center(
                        child: Column(children: [
                      Icon(Icons.money_off_csred_outlined,
                          size: 50, color: Colors.grey.shade300),
                      const SizedBox(height: 10),
                      const Text('No refunds found',
                          style: TextStyle(color: SellerTheme.textMuted)),
                    ])),
                  ),
                ..._filtered.map((r) => _buildRefundCard(r, currency)),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryCard(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 6),
        Text(value,
            style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.w800, color: color)),
        const SizedBox(height: 2),
        Text(label,
            style:
                TextStyle(fontSize: 10, color: color.withValues(alpha: 0.8))),
      ]),
    );
  }

  Widget _buildRefundCard(_Refund r, String currency) {
    final statusColor = SellerTheme.statusColor(r.status);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(r.id,
              style: const TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w700, color: _mp)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8)),
            child: Text(r.status.toUpperCase(),
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: statusColor)),
          ),
        ]),
        const SizedBox(height: 8),
        Text(r.product,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        Row(children: [
          const Icon(Icons.person_outline,
              size: 14, color: SellerTheme.textMuted),
          const SizedBox(width: 4),
          Text(r.customer,
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
          const SizedBox(width: 12),
          const Icon(Icons.calendar_today,
              size: 14, color: SellerTheme.textMuted),
          const SizedBox(width: 4),
          Text(r.date,
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          const Icon(Icons.payment, size: 14, color: SellerTheme.textMuted),
          const SizedBox(width: 4),
          Text(r.method,
              style: const TextStyle(
                  fontSize: 12, color: SellerTheme.textSecondary)),
          const Spacer(),
          Text('$currency ${r.amount}',
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: SellerTheme.errorRed)),
        ]),
        if (r.status == 'failed') ...[
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                setState(() {
                  final idx = _refunds.indexOf(r);
                  if (idx >= 0) {
                    _refunds[idx] = r.copyWith(status: 'processing');
                  }
                });
              },
              style: ElevatedButton.styleFrom(
                  backgroundColor: _mp,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10))),
              child: const Text('Retry Refund',
                  style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ]),
    );
  }
}

class _Refund {
  final String id, orderId, product, customer, status, date, method;
  final int amount;
  const _Refund(
      {required this.id,
      required this.orderId,
      required this.product,
      required this.customer,
      required this.amount,
      required this.status,
      required this.date,
      required this.method});
  _Refund copyWith({String? status}) => _Refund(
      id: id,
      orderId: orderId,
      product: product,
      customer: customer,
      amount: amount,
      status: status ?? this.status,
      date: date,
      method: method);
}
