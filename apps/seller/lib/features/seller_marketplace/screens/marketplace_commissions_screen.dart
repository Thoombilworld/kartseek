import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Commissions — Commission breakdown by product, category, and period.
class MarketplaceCommissionsScreen extends StatelessWidget {
  const MarketplaceCommissionsScreen({super.key});

  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;

    final commissions = <_Commission>[
      const _Commission(
          category: 'Electronics',
          rate: 8,
          sales: 34500,
          commission: 2760,
          products: 24),
      const _Commission(
          category: 'Fashion',
          rate: 12,
          sales: 18200,
          commission: 2184,
          products: 38),
      const _Commission(
          category: 'Home & Living',
          rate: 10,
          sales: 8500,
          commission: 850,
          products: 12),
      const _Commission(
          category: 'Beauty',
          rate: 15,
          sales: 4200,
          commission: 630,
          products: 8),
      const _Commission(
          category: 'Sports',
          rate: 10,
          sales: 2800,
          commission: 280,
          products: 5),
    ];

    final totalSales = commissions.fold<int>(0, (s, c) => s + c.sales);
    final totalCommission =
        commissions.fold<int>(0, (s, c) => s + c.commission);
    final effectiveRate =
        totalSales > 0 ? (totalCommission / totalSales * 100) : 0.0;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Commissions · ${ss.country.flag}',
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
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                      gradient: SellerTheme.darkGradient,
                      borderRadius: BorderRadius.circular(20)),
                  child: Column(children: [
                    Row(children: [
                      Expanded(
                          child: Column(children: [
                        Text('Total Sales',
                            style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.6),
                                fontSize: 12)),
                        const SizedBox(height: 4),
                        Text('$currency $totalSales',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.w800)),
                      ])),
                      Container(
                          width: 1,
                          height: 40,
                          color: Colors.white.withValues(alpha: 0.2)),
                      Expanded(
                          child: Column(children: [
                        Text('Commission Paid',
                            style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.6),
                                fontSize: 12)),
                        const SizedBox(height: 4),
                        Text('$currency $totalCommission',
                            style: const TextStyle(
                                color: SellerTheme.warningAmber,
                                fontSize: 20,
                                fontWeight: FontWeight.w800)),
                      ])),
                    ]),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10)),
                      child: Text(
                          'Effective Rate: ${effectiveRate.toStringAsFixed(1)}%',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w600)),
                    ),
                  ]),
                ),
                const SizedBox(height: 16),

                // Rate explanation
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                      color: SellerTheme.infoBlue.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: SellerTheme.infoBlue.withValues(alpha: 0.2))),
                  child: const Row(children: [
                    Icon(Icons.info_outline,
                        size: 18, color: SellerTheme.infoBlue),
                    SizedBox(width: 8),
                    Expanded(
                        child: Text(
                            'Commission rates vary by category. Rates are applied on the selling price excluding taxes.',
                            style: TextStyle(
                                fontSize: 12, color: SellerTheme.infoBlue))),
                  ]),
                ),
                const SizedBox(height: 16),

                // Per-category breakdown
                const Text('Category Breakdown',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                ...commissions.map((c) => _buildCategoryCard(c, currency)),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryCard(_Commission c, String currency) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(c.category,
              style:
                  const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
                color: _mp.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8)),
            child: Text('${c.rate}%',
                style: const TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w700, color: _mp)),
          ),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          _stat('Sales', '$currency ${c.sales}', SellerTheme.successGreen),
          const SizedBox(width: 16),
          _stat('Commission', '$currency ${c.commission}',
              SellerTheme.warningAmber),
          const SizedBox(width: 16),
          _stat('Products', '${c.products}', SellerTheme.infoBlue),
        ]),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
              value: c.rate / 20,
              backgroundColor: SellerTheme.border,
              color: _mp,
              minHeight: 4),
        ),
      ]),
    );
  }

  Widget _stat(String label, String value, Color color) {
    return Expanded(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value,
            style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w700, color: color)),
        Text(label,
            style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
      ]),
    );
  }
}

class _Commission {
  final String category;
  final int rate, sales, commission, products;
  const _Commission(
      {required this.category,
      required this.rate,
      required this.sales,
      required this.commission,
      required this.products});
}
