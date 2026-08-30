import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';

/// Seller Buy Box Analytics — Track competitive position across products.
class MarketplaceBuyBoxScreen extends StatelessWidget {
  const MarketplaceBuyBoxScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;

    final products = <_BuyBoxProduct>[
      const _BuyBoxProduct(
          name: 'iPhone 15 Pro 256GB',
          sku: 'IP15P-256',
          buyBox: true,
          price: 134900,
          lowestPrice: 132500,
          position: 1,
          competitors: 8,
          winRate: 78),
      const _BuyBoxProduct(
          name: 'Samsung Galaxy S24',
          sku: 'SGS24-256',
          buyBox: false,
          price: 79999,
          lowestPrice: 76999,
          position: 3,
          competitors: 12,
          winRate: 45),
      const _BuyBoxProduct(
          name: 'Sony WH-1000XM5',
          sku: 'SNWH-XM5',
          buyBox: true,
          price: 29990,
          lowestPrice: 29990,
          position: 1,
          competitors: 5,
          winRate: 92),
      const _BuyBoxProduct(
          name: 'MacBook Air M3',
          sku: 'MBA-M3',
          buyBox: false,
          price: 114900,
          lowestPrice: 112900,
          position: 2,
          competitors: 6,
          winRate: 55),
    ];

    final winning = products.where((p) => p.buyBox).length;
    final avgWinRate = products.isEmpty
        ? 0
        : products.fold<int>(0, (s, p) => s + p.winRate) ~/ products.length;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('Buy Box Analytics',
            style: TextStyle(fontWeight: FontWeight.w800)),
        elevation: 0,
      ),
      body: CustomScrollView(physics: const BouncingScrollPhysics(), slivers: [
        // KPIs
        SliverToBoxAdapter(
            child: Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
              color: _mp,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(28))),
          child: Row(children: [
            _kpi('Win Rate', '$avgWinRate%', Icons.emoji_events),
            _kpi('Winning', '$winning', Icons.check_circle),
            _kpi(
                'Competing', '${products.length - winning}', Icons.trending_up),
          ]),
        )),
        // Products
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
            (ctx, i) {
              final p = products[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: p.buyBox
                          ? const Color(0xFF10B981).withValues(alpha: 0.3)
                          : const Color(0xFFE5E7EB)),
                ),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text(p.name,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14)),
                              Text(p.sku,
                                  style: const TextStyle(
                                      color: Color(0xFF9CA3AF), fontSize: 11)),
                            ])),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: p.buyBox
                                ? const Color(0xFF10B981).withValues(alpha: 0.1)
                                : const Color(0xFFEF4444)
                                    .withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(p.buyBox ? '✓ WINNING' : '✕ LOSING',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: p.buyBox
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFEF4444),
                              )),
                        ),
                      ]),
                      const SizedBox(height: 12),
                      Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _detailCol('Your Price', '$currency${p.price}'),
                            _detailCol('Lowest', '$currency${p.lowestPrice}',
                                valueColor: p.lowestPrice < p.price
                                    ? const Color(0xFFEF4444)
                                    : const Color(0xFF10B981)),
                            _detailCol('Position', '#${p.position}',
                                valueColor: p.position == 1
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFF59E0B)),
                            _detailCol('Win Rate', '${p.winRate}%'),
                          ]),
                      const SizedBox(height: 8),
                      // Win rate bar
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: p.winRate / 100,
                          backgroundColor: const Color(0xFFF3F4F6),
                          valueColor: AlwaysStoppedAnimation(p.winRate >= 70
                              ? const Color(0xFF10B981)
                              : p.winRate >= 50
                                  ? const Color(0xFFF59E0B)
                                  : const Color(0xFFEF4444)),
                          minHeight: 4,
                        ),
                      ),
                    ]),
              );
            },
            childCount: products.length,
          )),
        ),
      ]),
    );
  }

  Widget _kpi(String label, String value, IconData icon) => Expanded(
          child: Column(children: [
        Icon(icon, color: Colors.white70, size: 22),
        const SizedBox(height: 4),
        Text(value,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w900)),
        Text(label,
            style: const TextStyle(color: Colors.white70, fontSize: 11)),
      ]));

  Widget _detailCol(String label, String value, {Color? valueColor}) =>
      Column(children: [
        Text(label,
            style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 10)),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
                color: valueColor ?? const Color(0xFF1F2937))),
      ]);
}

class _BuyBoxProduct {
  final String name, sku;
  final bool buyBox;
  final int price, lowestPrice, position, competitors, winRate;
  const _BuyBoxProduct(
      {required this.name,
      required this.sku,
      required this.buyBox,
      required this.price,
      required this.lowestPrice,
      required this.position,
      required this.competitors,
      required this.winRate});
}
