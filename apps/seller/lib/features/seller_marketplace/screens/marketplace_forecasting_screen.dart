import 'package:flutter/material.dart';

/// Seller Demand Forecasting — Predict demand trends for products.
class MarketplaceForecastingScreen extends StatelessWidget {
  const MarketplaceForecastingScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {

    final forecasts = <_Forecast>[
      const _Forecast(
          product: 'iPhone 15 Pro',
          currentDemand: 450,
          predictedDemand: 580,
          confidence: 87,
          trend: 'up',
          season: 'Festival Season'),
      const _Forecast(
          product: 'Galaxy S24 Ultra',
          currentDemand: 320,
          predictedDemand: 290,
          confidence: 72,
          trend: 'down',
          season: 'Post-Sale Dip'),
      const _Forecast(
          product: 'Sony WH-1000XM5',
          currentDemand: 180,
          predictedDemand: 340,
          confidence: 91,
          trend: 'up',
          season: 'Back to School'),
      const _Forecast(
          product: 'MacBook Air M3',
          currentDemand: 110,
          predictedDemand: 150,
          confidence: 78,
          trend: 'up',
          season: 'Student Season'),
      const _Forecast(
          product: 'iPad Air M2',
          currentDemand: 95,
          predictedDemand: 80,
          confidence: 65,
          trend: 'down',
          season: 'Off Season'),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('Demand Forecasting',
            style: TextStyle(fontWeight: FontWeight.w800)),
        elevation: 0,
      ),
      body: CustomScrollView(physics: const BouncingScrollPhysics(), slivers: [
        // Summary
        SliverToBoxAdapter(
            child: Container(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          decoration: const BoxDecoration(
              color: _mp,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(28))),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16)),
            child: const Column(children: [
              Text('AI-Powered Forecast',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800)),
              SizedBox(height: 6),
              Text(
                  'Next 30-day demand prediction based on historical data, seasonality, and market trends.',
                  style: TextStyle(
                      color: Colors.white70, fontSize: 13, height: 1.4),
                  textAlign: TextAlign.center),
            ]),
          ),
        )),
        // Forecast Cards
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
            (ctx, i) {
              final f = forecasts[i];
              final change = ((f.predictedDemand - f.currentDemand) /
                      f.currentDemand *
                      100)
                  .round();
              final isUp = f.trend == 'up';

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE5E7EB))),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Expanded(
                            child: Text(f.product,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15))),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isUp
                                ? const Color(0xFF10B981).withValues(alpha: 0.1)
                                : const Color(0xFFEF4444)
                                    .withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Icon(isUp ? Icons.trending_up : Icons.trending_down,
                                size: 14,
                                color: isUp
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFEF4444)),
                            const SizedBox(width: 4),
                            Text('${isUp ? '+' : ''}$change%',
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: isUp
                                        ? const Color(0xFF10B981)
                                        : const Color(0xFFEF4444))),
                          ]),
                        ),
                      ]),
                      const SizedBox(height: 12),
                      Row(children: [
                        _metric('Current', '${f.currentDemand} units',
                            const Color(0xFF6B7280)),
                        const SizedBox(width: 24),
                        _metric(
                            'Predicted',
                            '${f.predictedDemand} units',
                            isUp
                                ? const Color(0xFF10B981)
                                : const Color(0xFFEF4444)),
                        const SizedBox(width: 24),
                        _metric(
                            'Confidence',
                            '${f.confidence}%',
                            f.confidence >= 80
                                ? const Color(0xFF10B981)
                                : const Color(0xFFF59E0B)),
                      ]),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                            color: const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(6)),
                        child: Text('📅 ${f.season}',
                            style: const TextStyle(
                                fontSize: 11, color: Color(0xFF6B7280))),
                      ),
                      const SizedBox(height: 8),
                      // Confidence bar
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: f.confidence / 100,
                          backgroundColor: const Color(0xFFF3F4F6),
                          valueColor: AlwaysStoppedAnimation(f.confidence >= 80
                              ? const Color(0xFF10B981)
                              : f.confidence >= 60
                                  ? const Color(0xFFF59E0B)
                                  : const Color(0xFFEF4444)),
                          minHeight: 4,
                        ),
                      ),
                    ]),
              );
            },
            childCount: forecasts.length,
          )),
        ),
      ]),
    );
  }

  Widget _metric(String label, String value, Color color) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 10)),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                fontWeight: FontWeight.w700, fontSize: 13, color: color)),
      ]);
}

class _Forecast {
  final String product, trend, season;
  final int currentDemand, predictedDemand, confidence;
  const _Forecast(
      {required this.product,
      required this.currentDemand,
      required this.predictedDemand,
      required this.confidence,
      required this.trend,
      required this.season});
}
