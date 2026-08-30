import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Best Sellers Screen — Top selling products ranked by category with badges.
class BestSellersScreen extends StatelessWidget {
  const BestSellersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final products = <_BestSeller>[
      const _BestSeller(
          rank: 1,
          name: 'iPhone 15 Pro Max',
          brand: 'Apple',
          price: 159900,
          sold: 12500,
          rating: 4.8,
          category: 'Electronics'),
      const _BestSeller(
          rank: 2,
          name: 'Noise ColorFit Pro 5',
          brand: 'Noise',
          price: 3999,
          sold: 45000,
          rating: 4.3,
          category: 'Electronics'),
      const _BestSeller(
          rank: 3,
          name: 'boAt Airdopes 141',
          brand: 'boAt',
          price: 1299,
          sold: 82000,
          rating: 4.1,
          category: 'Electronics'),
      const _BestSeller(
          rank: 4,
          name: 'Protein Powder 2kg',
          brand: 'MuscleBlaze',
          price: 2499,
          sold: 28000,
          rating: 4.5,
          category: 'Health'),
      const _BestSeller(
          rank: 5,
          name: 'Fire-Boltt Phoenix',
          brand: 'Fire-Boltt',
          price: 1999,
          sold: 35000,
          rating: 4.2,
          category: 'Electronics'),
      const _BestSeller(
          rank: 6,
          name: 'Levi\'s 511 Slim Fit',
          brand: 'Levi\'s',
          price: 2999,
          sold: 18000,
          rating: 4.4,
          category: 'Fashion'),
      const _BestSeller(
          rank: 7,
          name: 'Prestige Cooker 5L',
          brand: 'Prestige',
          price: 2199,
          sold: 22000,
          rating: 4.6,
          category: 'Home'),
      const _BestSeller(
          rank: 8,
          name: 'Mamaearth Face Wash',
          brand: 'Mamaearth',
          price: 299,
          sold: 55000,
          rating: 4.0,
          category: 'Beauty'),
    ];

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('🏆 Best Sellers',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: products.length,
        itemBuilder: (context, i) {
          final p = products[i];
          final medal = p.rank == 1
              ? '🥇'
              : p.rank == 2
                  ? '🥈'
                  : p.rank == 3
                      ? '🥉'
                      : '#${p.rank}';
          final isTop3 = p.rank <= 3;

          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: isTop3
                      ? const Color(0xFFC7D2FE)
                      : AppTheme.borderLight,
                  width: isTop3 ? 1.5 : 1),
              boxShadow: isTop3
                  ? [
                      BoxShadow(
                          color:
                              AppTheme.marketplaceColor.withValues(alpha: 0.05),
                          blurRadius: 8,
                          offset: const Offset(0, 2))
                    ]
                  : null,
            ),
            child: Row(children: [
              // Rank
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isTop3
                      ? const Color(0xFFEEF2FF)
                      : AppTheme.surfaceMuted,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                    child: Text(medal,
                        style: TextStyle(
                            fontSize: isTop3 ? 20 : 14,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.marketplaceColor))),
              ),
              const SizedBox(width: 12),
              // Product Image Placeholder
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                    color: AppTheme.surfaceWhite,
                    borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.inventory_2,
                    color: Color(0xFFD1D5DB), size: 26),
              ),
              const SizedBox(width: 12),
              // Details
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(p.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 14),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(p.brand,
                        style: const TextStyle(
                            color: AppTheme.textMuted, fontSize: 12)),
                    const SizedBox(height: 4),
                    Row(children: [
                      Text('₹${p.price}',
                          style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              color: AppTheme.textPrimary)),
                      const Spacer(),
                      const Icon(Icons.star,
                          color: Color(0xFFFBBF24), size: 14),
                      Text(' ${p.rating}',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 12)),
                    ]),
                    const SizedBox(height: 2),
                    Row(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                            color: const Color(0xFFEEF2FF),
                            borderRadius: BorderRadius.circular(4)),
                        child: Text(p.category,
                            style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.marketplaceColor)),
                      ),
                      const SizedBox(width: 8),
                      Text('${(p.sold / 1000).toStringAsFixed(0)}K+ sold',
                          style: const TextStyle(
                              color: AppTheme.successGreen,
                              fontSize: 11,
                              fontWeight: FontWeight.w600)),
                    ]),
                  ])),
            ]),
          );
        },
      ),
    );
  }
}

class _BestSeller {
  final int rank, price, sold;
  final String name, brand, category;
  final double rating;
  const _BestSeller(
      {required this.rank,
      required this.name,
      required this.brand,
      required this.price,
      required this.sold,
      required this.rating,
      required this.category});
}
