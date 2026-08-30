import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Exchange Offer Screen — Trade in old devices for discount on new purchase.
class ExchangeOfferScreen extends StatefulWidget {
  const ExchangeOfferScreen({super.key});
  @override
  State<ExchangeOfferScreen> createState() => _ExchangeOfferScreenState();
}

class _ExchangeOfferScreenState extends State<ExchangeOfferScreen> {
  int _step = 0; // 0=category, 1=condition, 2=value
  String? _category;
  String? _condition;

  final _categories = [
    const _Cat(name: 'Smartphone', icon: Icons.phone_iphone, maxValue: 25000),
    const _Cat(name: 'Laptop', icon: Icons.laptop, maxValue: 40000),
    const _Cat(name: 'Tablet', icon: Icons.tablet, maxValue: 20000),
    const _Cat(name: 'Smart Watch', icon: Icons.watch, maxValue: 8000),
    const _Cat(name: 'Television', icon: Icons.tv, maxValue: 15000),
    const _Cat(name: 'Camera', icon: Icons.camera_alt, maxValue: 30000),
  ];

  final _conditions = [
    const _Cond(
        label: 'Excellent',
        desc: 'No scratches, perfect condition',
        multiplier: 1.0,
        color: AppTheme.successGreen),
    const _Cond(
        label: 'Good',
        desc: 'Minor scratches, fully functional',
        multiplier: 0.75,
        color: AppTheme.marketplaceColor),
    const _Cond(
        label: 'Fair',
        desc: 'Visible wear, all features work',
        multiplier: 0.5,
        color: AppTheme.warningAmber),
    const _Cond(
        label: 'Poor',
        desc: 'Significant damage, may have issues',
        multiplier: 0.25,
        color: AppTheme.errorRed),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('🔄 Exchange Offer',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: Column(children: [
        // Progress indicator
        Container(
          color: Colors.white,
          padding: const EdgeInsets.all(16),
          child: Row(
              children: List.generate(
                  3,
                  (i) => Expanded(
                        child: Container(
                          height: 4,
                          margin: EdgeInsets.only(right: i < 2 ? 8 : 0),
                          decoration: BoxDecoration(
                            color: i <= _step
                                ? AppTheme.marketplaceColor
                                : AppTheme.borderLight,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ))),
        ),
        Expanded(child: _buildStep()),
      ]),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 0:
        return _buildCategoryStep();
      case 1:
        return _buildConditionStep();
      case 2:
        return _buildValueStep();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildCategoryStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('What are you exchanging?',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        const SizedBox(height: 4),
        const Text('Select the category of your device',
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
        const SizedBox(height: 20),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.3,
          children: _categories
              .map((cat) => GestureDetector(
                    onTap: () => setState(() {
                      _category = cat.name;
                      _step = 1;
                    }),
                    child: Container(
                      decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.borderLight)),
                      child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(cat.icon,
                                size: 36, color: AppTheme.marketplaceColor),
                            const SizedBox(height: 8),
                            Text(cat.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 14)),
                            Text('Up to ₹${cat.maxValue}',
                                style: const TextStyle(
                                    color: AppTheme.successGreen,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600)),
                          ]),
                    ),
                  ))
              .toList(),
        ),
      ]),
    );
  }

  Widget _buildConditionStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          GestureDetector(
              onTap: () => setState(() => _step = 0),
              child: const Icon(Icons.arrow_back_ios,
                  size: 18, color: AppTheme.marketplaceColor)),
          const SizedBox(width: 8),
          const Text('Condition of your ',
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textPrimary)),
          Text(_category ?? '',
              style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.marketplaceColor)),
        ]),
        const SizedBox(height: 20),
        ..._conditions.map((cond) => GestureDetector(
              onTap: () => setState(() {
                _condition = cond.label;
                _step = 2;
              }),
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.borderLight)),
                child: Row(children: [
                  Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                          color: cond.color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12)),
                      child: Icon(Icons.check_circle_outline,
                          color: cond.color, size: 24)),
                  const SizedBox(width: 16),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(cond.label,
                            style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                                color: cond.color)),
                        const SizedBox(height: 2),
                        Text(cond.desc,
                            style: const TextStyle(
                                color: AppTheme.textSecondary, fontSize: 13)),
                      ])),
                  const Icon(Icons.chevron_right, color: AppTheme.textMuted),
                ]),
              ),
            )),
      ]),
    );
  }

  Widget _buildValueStep() {
    final cat = _categories.firstWhere((c) => c.name == _category);
    final cond = _conditions.firstWhere((c) => c.label == _condition);
    final value = (cat.maxValue * cond.multiplier).round();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        const SizedBox(height: 20),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
                colors: [AppTheme.marketplaceColor, Color(0xFF8B5CF6)]),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(children: [
            const Text('Estimated Exchange Value',
                style: TextStyle(color: Colors.white70, fontSize: 14)),
            const SizedBox(height: 8),
            Text('₹$value',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 48,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8)),
              child: Text('$_category • $_condition condition',
                  style: const TextStyle(color: Colors.white, fontSize: 13)),
            ),
          ]),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.borderLight)),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('How it works',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 12),
            ...[
              'Add exchange to your new purchase',
              'Our partner will pick up your old device',
              'Exchange value applied to your order',
              'Get additional 5% cashback on exchange'
            ].asMap().entries.map(
                  (e) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                    color: const Color(0xFFEEF2FF),
                                    borderRadius: BorderRadius.circular(12)),
                                child: Center(
                                    child: Text('${e.key + 1}',
                                        style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: AppTheme.marketplaceColor)))),
                            const SizedBox(width: 12),
                            Expanded(
                                child: Text(e.value,
                                    style: const TextStyle(
                                        fontSize: 14,
                                        color: Color(0xFF4B5563),
                                        height: 1.3))),
                          ])),
                ),
          ]),
        ),
        const SizedBox(height: 24),
        Row(children: [
          Expanded(
              child: OutlinedButton(
            onPressed: () => setState(() {
              _step = 0;
              _category = null;
              _condition = null;
            }),
            style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                side: const BorderSide(color: AppTheme.borderLight)),
            child: const Text('Re-evaluate',
                style: TextStyle(fontWeight: FontWeight.w600)),
          )),
          const SizedBox(width: 12),
          Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.marketplaceColor,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14))),
                child: const Text('Apply Exchange',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        color: Colors.white)),
              )),
        ]),
      ]),
    );
  }
}

class _Cat {
  final String name;
  final IconData icon;
  final int maxValue;
  const _Cat({required this.name, required this.icon, required this.maxValue});
}

class _Cond {
  final String label, desc;
  final double multiplier;
  final Color color;
  const _Cond(
      {required this.label,
      required this.desc,
      required this.multiplier,
      required this.color});
}
