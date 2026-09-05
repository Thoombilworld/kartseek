import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Compare Products Screen — Side-by-side comparison of products with spec table.
class CompareProductsScreen extends StatelessWidget {
  const CompareProductsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final products = [
      const _CompProduct(
          name: 'iPhone 15 Pro',
          brand: 'Apple',
          price: 134900,
          rating: 4.7,
          reviews: 12500,
          specs: {
            'Display': '6.1" OLED',
            'Processor': 'A17 Pro',
            'RAM': '8 GB',
            'Storage': '256 GB',
            'Camera': '48 MP',
            'Battery': '3274 mAh',
            'OS': 'iOS 17',
            'Weight': '187g',
            '5G': 'Yes',
            'Warranty': '1 Year'
          }),
      const _CompProduct(
          name: 'Galaxy S24 Ultra',
          brand: 'Samsung',
          price: 129999,
          rating: 4.6,
          reviews: 9800,
          specs: {
            'Display': '6.8" AMOLED',
            'Processor': 'Snapdragon 8 Gen 3',
            'RAM': '12 GB',
            'Storage': '256 GB',
            'Camera': '200 MP',
            'Battery': '5000 mAh',
            'OS': 'Android 14',
            'Weight': '232g',
            '5G': 'Yes',
            'Warranty': '1 Year'
          }),
    ];
    final specKeys = products.first.specs.keys.toList();

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('⚖️ Compare Products',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: SingleChildScrollView(
        scrollDirection: Axis.vertical,
        child: Column(children: [
          // Product Headers
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              const SizedBox(width: 90), // label column
              ...products.map((p) => Expanded(
                      child: Column(children: [
                    Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                            color: AppTheme.surfaceMuted,
                            borderRadius: BorderRadius.circular(14)),
                        child: const Icon(Icons.phone_iphone,
                            size: 40, color: AppTheme.marketplaceColor)),
                    const SizedBox(height: 8),
                    Text(p.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 13),
                        textAlign: TextAlign.center),
                    Text(p.brand,
                        style: const TextStyle(
                            color: AppTheme.textMuted, fontSize: 11)),
                    const SizedBox(height: 4),
                    Text('₹${p.price}',
                        style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: AppTheme.marketplaceColor)),
                    const SizedBox(height: 4),
                    Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const Icon(Icons.star,
                          color: Color(0xFFFBBF24), size: 14),
                      const SizedBox(width: 2),
                      Text('${p.rating}',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 12)),
                      Text(' (${(p.reviews / 1000).toStringAsFixed(1)}K)',
                          style: const TextStyle(
                              color: AppTheme.textMuted, fontSize: 10)),
                    ]),
                  ]))),
            ]),
          ),
          const SizedBox(height: 8),

          // Spec Rows
          ...specKeys.asMap().entries.map((e) {
            final key = e.value;
            final isEven = e.key % 2 == 0;
            final vals = products.map((p) => p.specs[key] ?? '-').toList();
            final areSame = vals.every((v) => v == vals.first);

            return Container(
              color: isEven ? Colors.white : AppTheme.surfaceWhite,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(children: [
                SizedBox(
                    width: 90,
                    child: Text(key,
                        style: const TextStyle(
                            color: AppTheme.textSecondary,
                            fontWeight: FontWeight.w600,
                            fontSize: 12))),
                ...vals.map((v) => Expanded(
                        child: Text(
                      v,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: areSame
                              ? AppTheme.textPrimary
                              : AppTheme.marketplaceColor),
                    ))),
              ]),
            );
          }),
          const SizedBox(height: 16),

          // Add to Cart Buttons
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [
              const SizedBox(width: 90),
              ...products.map((p) => Expanded(
                      child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.marketplaceColor,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12))),
                      child: const Text('Add to Cart',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: Colors.white)),
                    ),
                  ))),
            ]),
          ),
          const SizedBox(height: 24),

          // Add more products
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: GestureDetector(
              onTap: () {},
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    border: Border.all(
                        color: const Color(0xFFC7D2FE),
                        style: BorderStyle.solid),
                    borderRadius: BorderRadius.circular(14)),
                child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add, color: AppTheme.marketplaceColor),
                      SizedBox(width: 8),
                      Text('Add another product to compare',
                          style: TextStyle(
                              color: AppTheme.marketplaceColor,
                              fontWeight: FontWeight.w600)),
                    ]),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ]),
      ),
    );
  }
}

class _CompProduct {
  final String name, brand;
  final int price, reviews;
  final double rating;
  final Map<String, String> specs;
  const _CompProduct(
      {required this.name,
      required this.brand,
      required this.price,
      required this.rating,
      required this.reviews,
      required this.specs});
}
