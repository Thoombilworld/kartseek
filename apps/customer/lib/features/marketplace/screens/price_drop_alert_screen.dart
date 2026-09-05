import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Price Drop Alert Screen — Manage price drop notification preferences.
class PriceDropAlertScreen extends StatefulWidget {
  const PriceDropAlertScreen({super.key});
  @override
  State<PriceDropAlertScreen> createState() => _PriceDropAlertScreenState();
}

class _PriceDropAlertScreenState extends State<PriceDropAlertScreen> {
  final _alerts = <_Alert>[
    _Alert(
        product: 'Samsung Galaxy S24 Ultra',
        currentPrice: 129999,
        targetPrice: 110000,
        active: true,
        created: '2 days ago'),
    _Alert(
        product: 'Sony WH-1000XM5',
        currentPrice: 29990,
        targetPrice: 24990,
        active: true,
        created: '1 week ago'),
    _Alert(
        product: 'MacBook Air M3',
        currentPrice: 114900,
        targetPrice: 99999,
        active: true,
        created: '3 days ago'),
    _Alert(
        product: 'Nike Air Max 270',
        currentPrice: 12995,
        targetPrice: 8999,
        active: false,
        created: '2 weeks ago'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0.5,
          title: const Text('\u{1F514} Price Drop Alerts',
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textPrimary)),
          iconTheme: const IconThemeData(color: AppTheme.textPrimary)),
      body: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _alerts.length,
          itemBuilder: (_, i) {
            final a = _alerts[i];
            final drop =
                ((a.currentPrice - a.targetPrice) / a.currentPrice * 100)
                    .toStringAsFixed(0);
            return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 8)
                    ]),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Expanded(
                            child: Text(a.product,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                    color: AppTheme.textPrimary))),
                        Switch(
                            value: a.active,
                            onChanged: (v) => setState(() => _alerts[i] =
                                _Alert(
                                    product: a.product,
                                    currentPrice: a.currentPrice,
                                    targetPrice: a.targetPrice,
                                    active: v,
                                    created: a.created)),
                            activeThumbColor: AppTheme.marketplaceColor),
                      ]),
                      const SizedBox(height: 8),
                      Row(children: [
                        Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Current',
                                  style: TextStyle(
                                      fontSize: 11, color: AppTheme.textMuted)),
                              Text('\u20B9${a.currentPrice.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14)),
                            ]),
                        const SizedBox(width: 24),
                        const Icon(Icons.arrow_forward,
                            size: 16, color: AppTheme.textMuted),
                        const SizedBox(width: 24),
                        Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Alert at',
                                  style: TextStyle(
                                      fontSize: 11, color: AppTheme.textMuted)),
                              Text('\u20B9${a.targetPrice.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      color: AppTheme.marketplaceColor)),
                            ]),
                        const Spacer(),
                        Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(6)),
                            child: Text('-$drop%',
                                style: const TextStyle(
                                    color: AppTheme.errorRed,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12))),
                      ]),
                      const SizedBox(height: 8),
                      Text('Created ${a.created}',
                          style: const TextStyle(
                              fontSize: 11, color: AppTheme.textMuted)),
                    ]));
          }),
    );
  }
}

class _Alert {
  final String product;
  final double currentPrice;
  final double targetPrice;
  final bool active;
  final String created;
  _Alert(
      {required this.product,
      required this.currentPrice,
      required this.targetPrice,
      required this.active,
      required this.created});
}
