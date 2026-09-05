import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Size Guide Screen — Category-specific size charts for clothing, shoes, electronics.
class SizeGuideScreen extends StatefulWidget {
  final String? category;
  const SizeGuideScreen({super.key, this.category});
  @override
  State<SizeGuideScreen> createState() => _SizeGuideScreenState();
}

class _SizeGuideScreenState extends State<SizeGuideScreen> {
  String _selected = 'Clothing';
  final _categories = {
    'Clothing': [
      {'size': 'XS', 'chest': '32-34', 'waist': '26-28', 'length': '25'},
      {'size': 'S', 'chest': '34-36', 'waist': '28-30', 'length': '26'},
      {'size': 'M', 'chest': '38-40', 'waist': '32-34', 'length': '27'},
      {'size': 'L', 'chest': '42-44', 'waist': '36-38', 'length': '28'},
      {'size': 'XL', 'chest': '46-48', 'waist': '40-42', 'length': '29'},
      {'size': 'XXL', 'chest': '50-52', 'waist': '44-46', 'length': '30'},
    ],
    'Shoes': [
      {'size': 'UK 6', 'us': 'US 7', 'eu': 'EU 40', 'cm': '25.0'},
      {'size': 'UK 7', 'us': 'US 8', 'eu': 'EU 41', 'cm': '25.5'},
      {'size': 'UK 8', 'us': 'US 9', 'eu': 'EU 42', 'cm': '26.5'},
      {'size': 'UK 9', 'us': 'US 10', 'eu': 'EU 43', 'cm': '27.0'},
      {'size': 'UK 10', 'us': 'US 11', 'eu': 'EU 44', 'cm': '28.0'},
    ],
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('📐 Size Guide',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(
                spacing: 8,
                children: _categories.keys
                    .map((c) => ChoiceChip(
                          label: Text(c),
                          selected: _selected == c,
                          onSelected: (_) => setState(() => _selected = c),
                          selectedColor: AppTheme.marketplaceColor,
                          labelStyle: TextStyle(
                              color: _selected == c
                                  ? Colors.white
                                  : AppTheme.textSecondary,
                              fontWeight: FontWeight.w600),
                          backgroundColor: Colors.white,
                          side: BorderSide(
                              color: _selected == c
                                  ? AppTheme.marketplaceColor
                                  : AppTheme.borderLight),
                        ))
                    .toList()),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                  color: const Color(0xFFF3E8FF),
                  borderRadius: BorderRadius.circular(14)),
              child: const Row(children: [
                Icon(Icons.straighten, color: AppTheme.marketplaceColor, size: 28),
                SizedBox(width: 12),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text('How to Measure',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textPrimary)),
                      SizedBox(height: 4),
                      Text(
                          'Use a flexible tape measure and keep it snug but not tight.',
                          style: TextStyle(
                              fontSize: 13, color: AppTheme.textSecondary)),
                    ])),
              ]),
            ),
            const SizedBox(height: 20),
            Container(
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
                    Text('$_selected Size Chart',
                        style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary)),
                    const SizedBox(height: 12),
                    Table(
                      border: TableBorder.all(
                          color: AppTheme.borderLight, width: 0.5),
                      children: [
                        TableRow(
                          decoration:
                              const BoxDecoration(color: AppTheme.surfaceWhite),
                          children: (_categories[_selected]?.first.keys ?? [])
                              .map((k) => Padding(
                                    padding: const EdgeInsets.all(10),
                                    child: Text(k.toUpperCase(),
                                        style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: AppTheme.textSecondary)),
                                  ))
                              .toList(),
                        ),
                        ...(_categories[_selected] ?? []).map((row) => TableRow(
                              children: row.values
                                  .map((v) => Padding(
                                      padding: const EdgeInsets.all(10),
                                      child: Text(v,
                                          style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w500))))
                                  .toList(),
                            )),
                      ],
                    ),
                  ]),
            ),
            const SizedBox(height: 16),
            const Text('All measurements are in inches unless specified.',
                style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
          ])),
    );
  }
}
