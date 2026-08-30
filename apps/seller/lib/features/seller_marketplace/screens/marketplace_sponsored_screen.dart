import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Sponsored Products — Manage product ad placements for premium visibility.
class MarketplaceSponsoredScreen extends StatefulWidget {
  const MarketplaceSponsoredScreen({super.key});

  @override
  State<MarketplaceSponsoredScreen> createState() =>
      _MarketplaceSponsoredScreenState();
}

class _MarketplaceSponsoredScreenState
    extends State<MarketplaceSponsoredScreen> {
  static const _mp = Color(0xFF6C3FC8);

  final List<_SponsoredAd> _ads = [
    const _SponsoredAd(
        product: 'iPhone 15 Pro Max',
        emoji: '📱',
        placement: 'Search Results',
        bidPerClick: 0.50,
        dailyBudget: 50,
        totalSpent: 320,
        impressions: 12400,
        clicks: 640,
        conversions: 48,
        status: 'active'),
    const _SponsoredAd(
        product: 'Sony WH-1000XM5',
        emoji: '🎧',
        placement: 'Category Page',
        bidPerClick: 0.35,
        dailyBudget: 30,
        totalSpent: 180,
        impressions: 8200,
        clicks: 380,
        conversions: 28,
        status: 'active'),
    const _SponsoredAd(
        product: 'Samsung Galaxy S24',
        emoji: '📲',
        placement: 'Homepage Banner',
        bidPerClick: 0.75,
        dailyBudget: 100,
        totalSpent: 450,
        impressions: 25000,
        clicks: 1200,
        conversions: 95,
        status: 'paused'),
    const _SponsoredAd(
        product: 'Apple Watch SE',
        emoji: '⌚',
        placement: 'Search Results',
        bidPerClick: 0.40,
        dailyBudget: 40,
        totalSpent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        status: 'draft'),
  ];

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;
    final totalSpent = _ads.fold<double>(0, (s, a) => s + a.totalSpent);
    final totalConv = _ads.fold<int>(0, (s, a) => s + a.conversions);

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Sponsored · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          showModalBottomSheet(
              context: context,
              shape: const RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.vertical(top: Radius.circular(20))),
              builder: (_) => Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Text('Create Sponsored Listing',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 16),
                    TextFormField(
                        decoration: const InputDecoration(
                            labelText: 'Select Product',
                            border: OutlineInputBorder(),
                            suffixIcon: Icon(Icons.search))),
                    const SizedBox(height: 12),
                    TextFormField(
                        decoration: InputDecoration(
                            labelText: 'Daily Budget',
                            border: const OutlineInputBorder(),
                            prefixText: '${ss.country.currencySymbol} ')),
                    const SizedBox(height: 12),
                    TextFormField(
                        decoration: const InputDecoration(
                            labelText: 'Duration (days)',
                            border: OutlineInputBorder()),
                        keyboardType: TextInputType.number),
                    const SizedBox(height: 16),
                    SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text(
                                        'Sponsored listing submitted for review')));
                          },
                          style: ElevatedButton.styleFrom(
                              backgroundColor: _mp,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12))),
                          child: const Text('Submit for Review',
                              style: TextStyle(fontWeight: FontWeight.w700)),
                        )),
                  ])));
        },
        backgroundColor: _mp,
        icon: const Icon(Icons.ads_click, color: Colors.white),
        label: const Text('New Ad',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
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
                      child: _kpi(
                          'Total Spend',
                          '$currency ${totalSpent.toInt()}',
                          _mp,
                          Icons.account_balance_wallet)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _kpi(
                          'Conversions',
                          '$totalConv',
                          SellerTheme.successGreen,
                          Icons.shopping_cart_checkout)),
                ]),
                const SizedBox(height: 16),
                ..._ads.map((a) => _buildAdCard(a, currency)),
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
        Icon(icon, color: color, size: 22),
        const SizedBox(width: 10),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value,
              style: TextStyle(
                  fontSize: 18, fontWeight: FontWeight.w800, color: color)),
          Text(label,
              style:
                  TextStyle(fontSize: 11, color: color.withValues(alpha: 0.7))),
        ]),
      ]),
    );
  }

  Widget _buildAdCard(_SponsoredAd a, String currency) {
    final statusColor = a.status == 'active'
        ? SellerTheme.successGreen
        : a.status == 'paused'
            ? SellerTheme.warningAmber
            : SellerTheme.textMuted;
    final ctr = a.impressions > 0 ? (a.clicks / a.impressions * 100) : 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(a.emoji, style: const TextStyle(fontSize: 28)),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(a.product,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700)),
                Row(children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                        color: SellerTheme.surface,
                        borderRadius: BorderRadius.circular(4)),
                    child: Text(a.placement,
                        style: const TextStyle(
                            fontSize: 11, color: SellerTheme.textSecondary)),
                  ),
                ]),
              ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8)),
            child: Text(a.status.toUpperCase(),
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: statusColor)),
          ),
        ]),
        const SizedBox(height: 14),
        Row(children: [
          _metric('Bid/Click', '$currency ${a.bidPerClick.toStringAsFixed(2)}'),
          _metric('Daily', '$currency ${a.dailyBudget}'),
          _metric('Spent', '$currency ${a.totalSpent.toInt()}'),
          _metric('CTR', '${ctr.toStringAsFixed(1)}%'),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          _smallStat(Icons.visibility, _fmt(a.impressions)),
          const SizedBox(width: 14),
          _smallStat(Icons.touch_app, '${a.clicks}'),
          const SizedBox(width: 14),
          _smallStat(Icons.shopping_cart, '${a.conversions}'),
          const Spacer(),
          if (a.status == 'active')
            TextButton(
                onPressed: () => setState(() {
                      final i = _ads.indexOf(a);
                      if (i >= 0) _ads[i] = a.copyWith(status: 'paused');
                    }),
                child: const Text('Pause',
                    style: TextStyle(
                        color: SellerTheme.warningAmber,
                        fontSize: 12,
                        fontWeight: FontWeight.w600))),
          if (a.status == 'paused')
            TextButton(
                onPressed: () => setState(() {
                      final i = _ads.indexOf(a);
                      if (i >= 0) _ads[i] = a.copyWith(status: 'active');
                    }),
                child: const Text('Resume',
                    style: TextStyle(
                        color: SellerTheme.successGreen,
                        fontSize: 12,
                        fontWeight: FontWeight.w600))),
        ]),
      ]),
    );
  }

  Widget _metric(String label, String value) {
    return Expanded(
        child: Column(children: [
      Text(value,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
      Text(label,
          style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
    ]));
  }

  Widget _smallStat(IconData icon, String val) {
    return Row(children: [
      Icon(icon, size: 14, color: SellerTheme.textMuted),
      const SizedBox(width: 3),
      Text(val,
          style:
              const TextStyle(fontSize: 12, color: SellerTheme.textSecondary)),
    ]);
  }

  String _fmt(int n) => n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}K' : '$n';
}

class _SponsoredAd {
  final String product, emoji, placement, status;
  final double bidPerClick, dailyBudget, totalSpent;
  final int impressions, clicks, conversions;
  const _SponsoredAd(
      {required this.product,
      required this.emoji,
      required this.placement,
      required this.bidPerClick,
      required this.dailyBudget,
      required this.totalSpent,
      required this.impressions,
      required this.clicks,
      required this.conversions,
      required this.status});
  _SponsoredAd copyWith({String? status}) => _SponsoredAd(
      product: product,
      emoji: emoji,
      placement: placement,
      bidPerClick: bidPerClick,
      dailyBudget: dailyBudget,
      totalSpent: totalSpent,
      impressions: impressions,
      clicks: clicks,
      conversions: conversions,
      status: status ?? this.status);
}
