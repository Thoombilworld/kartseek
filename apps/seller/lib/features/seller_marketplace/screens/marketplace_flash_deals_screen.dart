import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';
import 'package:kartseek_seller/features/seller_marketplace/services/marketplace_seller_api_service.dart';

/// Flash Deals — Schedule and manage time-limited flash sales.
class MarketplaceFlashDealsScreen extends StatefulWidget {
  const MarketplaceFlashDealsScreen({super.key});

  @override
  State<MarketplaceFlashDealsScreen> createState() =>
      _MarketplaceFlashDealsScreenState();
}

class _MarketplaceFlashDealsScreenState
    extends State<MarketplaceFlashDealsScreen> {
  static const _mp = Color(0xFF6C3FC8);
  final _apiService = MarketplaceSellerApiService.instance;

  List<_FlashDeal> _deals = [
    const _FlashDeal(
        id: 'FD-01',
        product: 'iPhone 15 Pro Max',
        emoji: '📱',
        originalPrice: 5699,
        dealPrice: 4299,
        discount: 25,
        stockAllotted: 50,
        stockSold: 38,
        startTime: '10:00 AM',
        endTime: '2:00 PM',
        date: '28 Jun',
        status: 'live'),
    const _FlashDeal(
        id: 'FD-02',
        product: 'Sony WH-1000XM5',
        emoji: '🎧',
        originalPrice: 1299,
        dealPrice: 899,
        discount: 31,
        stockAllotted: 100,
        stockSold: 67,
        startTime: '12:00 PM',
        endTime: '6:00 PM',
        date: '28 Jun',
        status: 'live'),
    const _FlashDeal(
        id: 'FD-03',
        product: 'Samsung Galaxy S24 Ultra',
        emoji: '📲',
        originalPrice: 4999,
        dealPrice: 3999,
        discount: 20,
        stockAllotted: 30,
        stockSold: 0,
        startTime: '8:00 PM',
        endTime: '11:59 PM',
        date: '29 Jun',
        status: 'scheduled'),
    const _FlashDeal(
        id: 'FD-04',
        product: 'MacBook Air M3',
        emoji: '💻',
        originalPrice: 5499,
        dealPrice: 4499,
        discount: 18,
        stockAllotted: 20,
        stockSold: 20,
        startTime: '10:00 AM',
        endTime: '4:00 PM',
        date: '25 Jun',
        status: 'ended'),
    const _FlashDeal(
        id: 'FD-05',
        product: 'Apple Watch SE',
        emoji: '⌚',
        originalPrice: 1199,
        dealPrice: 899,
        discount: 25,
        stockAllotted: 80,
        stockSold: 0,
        startTime: '6:00 AM',
        endTime: '12:00 PM',
        date: '30 Jun',
        status: 'scheduled'),
  ];

  @override
  void initState() {
    super.initState();
    _loadDeals();
  }

  Future<void> _loadDeals() async {
    final ss = context.read<SellerBloc>().state;
    try {
      final result = await _apiService.getFlashDeals(ss.profile?.id ?? '');
      final List<dynamic> apiDeals = result['data'] ?? [];
      if (apiDeals.isNotEmpty) {
        setState(() {
          _deals = apiDeals.map((d) => _FlashDeal(
            id: d['id'] ?? '',
            product: d['name'] ?? d['productName'] ?? 'Unknown',
            emoji: '⚡',
            originalPrice: (d['originalPrice'] ?? 0).toDouble(),
            dealPrice: (d['dealPrice'] ?? 0).toDouble(),
            discount: (d['proposedDiscount'] ?? d['discount'] ?? 0) is int
                ? (d['proposedDiscount'] ?? d['discount'] ?? 0)
                : 0,
            stockAllotted: d['stockLimit'] ?? d['stockAllocated'] ?? 0,
            stockSold: d['sold'] ?? 0,
            startTime: d['start'] ?? '',
            endTime: d['end'] ?? '',
            date: '',
            status: d['status'] ?? 'scheduled',
          )).toList();
        });
      }
    } catch (_) {
      // Keep mock data as fallback
    }
  }

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;
    final live = _deals.where((d) => d.status == 'live' || d.status == 'active').length;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Flash Deals · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: const Text('Schedule Flash Deal coming soon'),
            backgroundColor: SellerTheme.infoBlue,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)))),
        backgroundColor: _mp,
        icon: const Icon(Icons.bolt, color: Colors.white),
        label: const Text('Schedule Deal',
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
                // Live banner
                if (live > 0)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [Color(0xFFEF4444), Color(0xFFF97316)]),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(children: [
                      const Icon(Icons.bolt, color: Colors.white, size: 28),
                      const SizedBox(width: 12),
                      Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text(
                                '$live Flash Deal${live > 1 ? 's' : ''} Live Now!',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800)),
                            Text('Products are selling fast',
                                style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.8),
                                    fontSize: 12)),
                          ])),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(10)),
                        child: const Text('⚡ LIVE',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 12)),
                      ),
                    ]),
                  ),
                const SizedBox(height: 16),
                ..._deals.map((d) => _buildDealCard(d, currency)),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDealCard(_FlashDeal d, String currency) {
    final statusColor = d.status == 'live'
        ? SellerTheme.errorRed
        : d.status == 'scheduled'
            ? SellerTheme.infoBlue
            : SellerTheme.textMuted;
    final soldPct = d.stockAllotted > 0 ? d.stockSold / d.stockAllotted : 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(d.emoji, style: const TextStyle(fontSize: 28)),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(d.product,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Row(children: [
                  Text('$currency ${d.dealPrice}',
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: SellerTheme.errorRed)),
                  const SizedBox(width: 6),
                  Text('$currency ${d.originalPrice}',
                      style: const TextStyle(
                          fontSize: 12,
                          color: SellerTheme.textMuted,
                          decoration: TextDecoration.lineThrough)),
                  const SizedBox(width: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                        color: SellerTheme.successGreen.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4)),
                    child: Text('${d.discount}% OFF',
                        style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: SellerTheme.successGreen)),
                  ),
                ]),
              ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8)),
            child: Text(d.status.toUpperCase(),
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: statusColor)),
          ),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          const Icon(Icons.schedule, size: 14, color: SellerTheme.textMuted),
          const SizedBox(width: 4),
          Text('${d.date} · ${d.startTime} – ${d.endTime}',
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          const Text('Stock sold: ',
              style: TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
          Text('${d.stockSold}',
              style:
                  const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
          Text(' / ${d.stockAllotted}',
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
          const Spacer(),
          Text('${(soldPct * 100).toInt()}%',
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: soldPct > 0.8 ? SellerTheme.errorRed : _mp)),
        ]),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
              value: soldPct,
              backgroundColor: SellerTheme.border,
              color: soldPct > 0.8 ? SellerTheme.errorRed : _mp,
              minHeight: 6),
        ),
      ]),
    );
  }
}

class _FlashDeal {
  final String id, product, emoji, startTime, endTime, date, status;
  final int originalPrice, dealPrice, discount, stockAllotted, stockSold;
  const _FlashDeal(
      {required this.id,
      required this.product,
      required this.emoji,
      required this.originalPrice,
      required this.dealPrice,
      required this.discount,
      required this.stockAllotted,
      required this.stockSold,
      required this.startTime,
      required this.endTime,
      required this.date,
      required this.status});
}
