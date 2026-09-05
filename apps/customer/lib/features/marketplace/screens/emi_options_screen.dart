import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// EMI Options Screen — Shows available EMI plans for a product with bank logos and no-cost labels.
class EmiOptionsScreen extends StatefulWidget {
  final double productPrice;
  const EmiOptionsScreen({super.key, this.productPrice = 49999});
  @override
  State<EmiOptionsScreen> createState() => _EmiOptionsScreenState();
}

class _EmiOptionsScreenState extends State<EmiOptionsScreen> {
  int _selectedTenure = 6;

  @override
  Widget build(BuildContext context) {
    final plans = [
      const _EmiPlan(months: 3, rate: 0, noCost: true),
      const _EmiPlan(months: 6, rate: 0, noCost: true),
      const _EmiPlan(months: 9, rate: 13, noCost: false),
      const _EmiPlan(months: 12, rate: 14, noCost: false),
      const _EmiPlan(months: 18, rate: 15, noCost: false),
      const _EmiPlan(months: 24, rate: 16, noCost: false),
    ];

    final selected = plans.firstWhere((p) => p.months == _selectedTenure);
    final emi = selected.noCost
        ? widget.productPrice / selected.months
        : (widget.productPrice * (1 + selected.rate / 100)) / selected.months;

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('EMI Options',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Product price
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderLight)),
            child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Product Price',
                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
                  Text('₹${widget.productPrice.toStringAsFixed(0)}',
                      style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textPrimary)),
                ]),
          ),
          const SizedBox(height: 20),

          // Tenure selector
          const Text('Select Tenure',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary)),
          const SizedBox(height: 12),
          Wrap(
              spacing: 10,
              runSpacing: 10,
              children: plans
                  .map(
                    (p) => GestureDetector(
                      onTap: () => setState(() => _selectedTenure = p.months),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: _selectedTenure == p.months
                              ? AppTheme.marketplaceColor
                              : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: _selectedTenure == p.months
                                  ? AppTheme.marketplaceColor
                                  : AppTheme.borderLight),
                        ),
                        child: Column(children: [
                          Text('${p.months}',
                              style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 18,
                                  color: _selectedTenure == p.months
                                      ? Colors.white
                                      : AppTheme.textPrimary)),
                          Text('months',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: _selectedTenure == p.months
                                      ? Colors.white70
                                      : AppTheme.textMuted)),
                          if (p.noCost)
                            Container(
                              margin: const EdgeInsets.only(top: 4),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                  color: AppTheme.successGreen.withValues(
                                      alpha: _selectedTenure == p.months
                                          ? 0.3
                                          : 0.1),
                                  borderRadius: BorderRadius.circular(4)),
                              child: Text('No Cost',
                                  style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w700,
                                      color: _selectedTenure == p.months
                                          ? Colors.white
                                          : AppTheme.successGreen)),
                            ),
                        ]),
                      ),
                    ),
                  )
                  .toList()),
          const SizedBox(height: 24),

          // EMI Breakdown
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [AppTheme.marketplaceColor, Color(0xFF8B5CF6)]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(children: [
              const Text('Monthly EMI',
                  style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 4),
              Text('₹${emi.toStringAsFixed(0)}/mo',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w900)),
              const SizedBox(height: 12),
              Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                _infoCol('Tenure', '${selected.months} months'),
                _infoCol('Interest',
                    selected.noCost ? 'NO COST' : '${selected.rate}% p.a.'),
                _infoCol(
                    'Total', '₹${(emi * selected.months).toStringAsFixed(0)}'),
              ]),
            ]),
          ),
          const SizedBox(height: 24),

          // Partner Banks
          const Text('Available Banks',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary)),
          const SizedBox(height: 12),
          ...[
            'HDFC Bank',
            'ICICI Bank',
            'SBI Cards',
            'Axis Bank',
            'Kotak Mahindra'
          ].map(
            (bank) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderLight)),
              child: Row(children: [
                Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                        color: AppTheme.surfaceMuted,
                        borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.account_balance,
                        color: AppTheme.marketplaceColor, size: 20)),
                const SizedBox(width: 12),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(bank,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 14)),
                      Text(
                          selected.noCost
                              ? 'No Cost EMI available'
                              : 'Standard EMI',
                          style: TextStyle(
                              fontSize: 12,
                              color: selected.noCost
                                  ? AppTheme.successGreen
                                  : AppTheme.textMuted)),
                    ])),
                const Icon(Icons.chevron_right, color: AppTheme.textMuted),
              ]),
            ),
          ),
          const SizedBox(height: 80),
        ]),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppTheme.borderLight))),
        child: SafeArea(
          child: ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.marketplaceColor,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14))),
            child: Text('Buy with EMI • ₹${emi.toStringAsFixed(0)}/mo',
                style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: Colors.white)),
          ),
        ),
      ),
    );
  }

  Widget _infoCol(String label, String value) => Column(children: [
        Text(label,
            style: const TextStyle(color: Colors.white60, fontSize: 11)),
        const SizedBox(height: 2),
        Text(value,
            style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 14)),
      ]);
}

class _EmiPlan {
  final int months;
  final double rate;
  final bool noCost;
  const _EmiPlan(
      {required this.months, required this.rate, required this.noCost});
}
