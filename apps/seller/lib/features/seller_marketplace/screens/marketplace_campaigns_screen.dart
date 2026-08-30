import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Campaigns — Manage marketing campaigns with targeting, budget, and performance tracking.
class MarketplaceCampaignsScreen extends StatefulWidget {
  const MarketplaceCampaignsScreen({super.key});

  @override
  State<MarketplaceCampaignsScreen> createState() =>
      _MarketplaceCampaignsScreenState();
}

class _MarketplaceCampaignsScreenState
    extends State<MarketplaceCampaignsScreen> {
  static const _mp = Color(0xFF6C3FC8);

  final List<_Campaign> _campaigns = [
    const _Campaign(
        id: 'CP-01',
        name: 'Summer Electronics Fest',
        type: 'Banner Ad',
        budget: 5000,
        spent: 3250,
        impressions: 45200,
        clicks: 1890,
        conversions: 142,
        startDate: '15 Jun',
        endDate: '15 Jul',
        status: 'active'),
    const _Campaign(
        id: 'CP-02',
        name: 'Back to School 2026',
        type: 'Category Boost',
        budget: 3000,
        spent: 800,
        impressions: 12500,
        clicks: 560,
        conversions: 38,
        startDate: '20 Jun',
        endDate: '31 Jul',
        status: 'active'),
    const _Campaign(
        id: 'CP-03',
        name: 'Ramadan Deals',
        type: 'Homepage Feature',
        budget: 8000,
        spent: 8000,
        impressions: 98000,
        clicks: 5600,
        conversions: 420,
        startDate: '1 Mar',
        endDate: '1 Apr',
        status: 'completed'),
    const _Campaign(
        id: 'CP-04',
        name: 'New Arrivals Push',
        type: 'Push Notification',
        budget: 1500,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        startDate: '1 Jul',
        endDate: '10 Jul',
        status: 'scheduled'),
  ];

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;
    final totalSpent = _campaigns.fold<int>(0, (s, c) => s + c.spent);
    final totalConv = _campaigns.fold<int>(0, (s, c) => s + c.conversions);

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Campaigns · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: const Text('Create Campaign coming soon'),
            backgroundColor: SellerTheme.infoBlue,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)))),
        backgroundColor: _mp,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Campaign',
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
                      child: _kpi('Total Spent', '$currency $totalSpent', _mp,
                          Icons.account_balance_wallet)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _kpi('Conversions', '$totalConv',
                          SellerTheme.successGreen, Icons.shopping_cart)),
                ]),
                const SizedBox(height: 16),
                ..._campaigns.map((c) => _buildCampaignCard(c, currency)),
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

  Widget _buildCampaignCard(_Campaign c, String currency) {
    final statusColor = c.status == 'active'
        ? SellerTheme.successGreen
        : c.status == 'completed'
            ? SellerTheme.textMuted
            : SellerTheme.infoBlue;
    final budgetPct = c.budget > 0 ? c.spent / c.budget : 0.0;
    final ctr = c.impressions > 0 ? (c.clicks / c.impressions * 100) : 0.0;
    final convRate = c.clicks > 0 ? (c.conversions / c.clicks * 100) : 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(c.name,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(c.type,
                    style: const TextStyle(
                        fontSize: 12, color: SellerTheme.textMuted)),
              ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8)),
            child: Text(c.status.toUpperCase(),
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: statusColor)),
          ),
        ]),
        const SizedBox(height: 12),
        // Budget progress
        Row(children: [
          const Text('Budget: ',
              style: TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
          Text('$currency ${c.spent}',
              style:
                  const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          Text(' / $currency ${c.budget}',
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
        ]),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
              value: budgetPct,
              backgroundColor: SellerTheme.border,
              color: _mp,
              minHeight: 5),
        ),
        const SizedBox(height: 12),
        // Metrics
        Row(children: [
          _metric('Impressions', _formatNum(c.impressions)),
          _metric('Clicks', '${c.clicks}'),
          _metric('CTR', '${ctr.toStringAsFixed(1)}%'),
          _metric('Conv.', '${convRate.toStringAsFixed(1)}%'),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          const Icon(Icons.calendar_today,
              size: 13, color: SellerTheme.textMuted),
          const SizedBox(width: 4),
          Text('${c.startDate} — ${c.endDate}',
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
        ]),
      ]),
    );
  }

  Widget _metric(String label, String value) {
    return Expanded(
      child: Column(children: [
        Text(value,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        Text(label,
            style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
      ]),
    );
  }

  String _formatNum(int n) =>
      n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}K' : '$n';
}

class _Campaign {
  final String id, name, type, startDate, endDate, status;
  final int budget, spent, impressions, clicks, conversions;
  const _Campaign(
      {required this.id,
      required this.name,
      required this.type,
      required this.budget,
      required this.spent,
      required this.impressions,
      required this.clicks,
      required this.conversions,
      required this.startDate,
      required this.endDate,
      required this.status});
}
