import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Deals of the Day Screen — Daily curated deals with countdown timer and category filters.
class DealsOfDayScreen extends StatefulWidget {
  const DealsOfDayScreen({super.key});
  @override
  State<DealsOfDayScreen> createState() => _DealsOfDayScreenState();
}

class _DealsOfDayScreenState extends State<DealsOfDayScreen>
    with TickerProviderStateMixin {
  late AnimationController _timerCtrl;
  Duration _remaining = const Duration(hours: 14, minutes: 32, seconds: 15);

  final _deals = <_Deal>[
    const _Deal(
        name: 'Sony WH-1000XM5',
        price: 22990,
        mrp: 29990,
        discount: 23,
        sold: 65,
        total: 100,
        rating: 4.8),
    const _Deal(
        name: 'Samsung 55" QLED TV',
        price: 45990,
        mrp: 69990,
        discount: 34,
        sold: 40,
        total: 50,
        rating: 4.6),
    const _Deal(
        name: 'Dyson V12 Detect',
        price: 42990,
        mrp: 52990,
        discount: 19,
        sold: 30,
        total: 75,
        rating: 4.7),
    const _Deal(
        name: 'Apple AirPods Pro 2',
        price: 20990,
        mrp: 24900,
        discount: 16,
        sold: 80,
        total: 100,
        rating: 4.9),
    const _Deal(
        name: 'boAt Stone 1200',
        price: 2499,
        mrp: 4999,
        discount: 50,
        sold: 180,
        total: 200,
        rating: 4.3),
    const _Deal(
        name: 'Kindle Paperwhite',
        price: 13999,
        mrp: 16999,
        discount: 18,
        sold: 55,
        total: 80,
        rating: 4.7),
  ];

  @override
  void initState() {
    super.initState();
    _timerCtrl =
        AnimationController(vsync: this, duration: const Duration(seconds: 1))
          ..addStatusListener((s) {
            if (s == AnimationStatus.completed && _remaining.inSeconds > 0) {
              setState(() => _remaining -= const Duration(seconds: 1));
              _timerCtrl.forward(from: 0);
            }
          })
          ..forward();
  }

  @override
  void dispose() {
    _timerCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final h = _remaining.inHours.toString().padLeft(2, '0');
    final m = (_remaining.inMinutes % 60).toString().padLeft(2, '0');
    final s = (_remaining.inSeconds % 60).toString().padLeft(2, '0');

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('🔥 Deals of the Day',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: CustomScrollView(physics: const BouncingScrollPhysics(), slivers: [
        // Timer Banner
        SliverToBoxAdapter(
          child: Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [Color(0xFFDC2626), Color(0xFFF97316)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('TODAY\'S DEALS',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1)),
                        SizedBox(height: 4),
                        Text('New deals every day at midnight!',
                            style:
                                TextStyle(color: Colors.white70, fontSize: 13)),
                      ]),
                  Row(children: [
                    _timeBox(h),
                    _timeSep(),
                    _timeBox(m),
                    _timeSep(),
                    _timeBox(s),
                  ]),
                ]),
          ),
        ),
        // Deals List
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
            (ctx, i) {
              final deal = _deals[i];
              final soldPct = deal.sold / deal.total;
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.borderLight)),
                child: Row(children: [
                  // Image placeholder
                  Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                        color: AppTheme.surfaceWhite,
                        borderRadius: BorderRadius.circular(12)),
                    child: Stack(children: [
                      const Center(
                          child: Icon(Icons.local_offer,
                              size: 36, color: Color(0xFFD1D5DB))),
                      Positioned(
                          top: 4,
                          left: 4,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                                color: Colors.red.shade600,
                                borderRadius: BorderRadius.circular(4)),
                            child: Text('${deal.discount}%',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800)),
                          )),
                    ]),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(deal.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Row(children: [
                          Text('₹${deal.price}',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 18,
                                  color: AppTheme.textPrimary)),
                          const SizedBox(width: 8),
                          Text('₹${deal.mrp}',
                              style: const TextStyle(
                                  fontSize: 13,
                                  color: AppTheme.textMuted,
                                  decoration: TextDecoration.lineThrough)),
                        ]),
                        const SizedBox(height: 6),
                        Row(children: [
                          const Icon(Icons.star,
                              color: Color(0xFFFBBF24), size: 14),
                          Text(' ${deal.rating}',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600, fontSize: 12)),
                        ]),
                        const SizedBox(height: 6),
                        // Stock bar
                        Stack(children: [
                          Container(
                              height: 6,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                  color: AppTheme.borderLight,
                                  borderRadius: BorderRadius.circular(3))),
                          FractionallySizedBox(
                              widthFactor: soldPct,
                              child: Container(
                                height: 6,
                                decoration: BoxDecoration(
                                    color: soldPct > 0.8
                                        ? Colors.red.shade500
                                        : soldPct > 0.5
                                            ? AppTheme.warningAmber
                                            : AppTheme.successGreen,
                                    borderRadius: BorderRadius.circular(3)),
                              )),
                        ]),
                        const SizedBox(height: 2),
                        Text(
                            soldPct > 0.8
                                ? '🔥 Almost gone!'
                                : '${deal.sold}/${deal.total} claimed',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: soldPct > 0.8
                                    ? Colors.red.shade600
                                    : AppTheme.textMuted)),
                      ])),
                ]),
              );
            },
            childCount: _deals.length,
          )),
        ),
        const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
      ]),
    );
  }

  Widget _timeBox(String val) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(8)),
        child: Text(val,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w900,
                fontFamily: 'monospace')),
      );
  Widget _timeSep() => const Padding(
      padding: EdgeInsets.symmetric(horizontal: 3),
      child: Text(':',
          style: TextStyle(
              color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)));
}

class _Deal {
  final String name;
  final int price, mrp, discount, sold, total;
  final double rating;
  const _Deal(
      {required this.name,
      required this.price,
      required this.mrp,
      required this.discount,
      required this.sold,
      required this.total,
      required this.rating});
}
