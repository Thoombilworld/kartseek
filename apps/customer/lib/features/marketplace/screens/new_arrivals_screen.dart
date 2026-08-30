import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// New Arrivals Screen — Latest products with sorting and category tabs.
class NewArrivalsScreen extends StatefulWidget {
  const NewArrivalsScreen({super.key});
  @override
  State<NewArrivalsScreen> createState() => _NewArrivalsScreenState();
}

class _NewArrivalsScreenState extends State<NewArrivalsScreen> {
  String _selectedCat = 'All';
  final _categories = [
    'All',
    'Electronics',
    'Fashion',
    'Home',
    'Beauty',
    'Sports'
  ];

  final _products = <_NewProduct>[
    const _NewProduct(
        name: 'MacBook Air M3',
        price: 114900,
        mrp: 119900,
        rating: 4.8,
        reviews: 340,
        category: 'Electronics',
        daysAgo: 1),
    const _NewProduct(
        name: 'Nike Air Max 2026',
        price: 12995,
        mrp: 14995,
        rating: 4.5,
        reviews: 125,
        category: 'Sports',
        daysAgo: 2),
    const _NewProduct(
        name: 'Dyson V15 Detect',
        price: 52990,
        mrp: 59900,
        rating: 4.7,
        reviews: 89,
        category: 'Home',
        daysAgo: 3),
    const _NewProduct(
        name: 'Samsung Galaxy Watch 6',
        price: 26999,
        mrp: 29999,
        rating: 4.4,
        reviews: 210,
        category: 'Electronics',
        daysAgo: 3),
    const _NewProduct(
        name: 'Levi\'s 501 Originals',
        price: 3499,
        mrp: 4999,
        rating: 4.3,
        reviews: 520,
        category: 'Fashion',
        daysAgo: 4),
    const _NewProduct(
        name: 'The Ordinary Niacinamide',
        price: 649,
        mrp: 799,
        rating: 4.6,
        reviews: 1800,
        category: 'Beauty',
        daysAgo: 5),
    const _NewProduct(
        name: 'JBL Flip 6',
        price: 9999,
        mrp: 12999,
        rating: 4.5,
        reviews: 670,
        category: 'Electronics',
        daysAgo: 6),
    const _NewProduct(
        name: 'Adidas Ultraboost',
        price: 14999,
        mrp: 17999,
        rating: 4.6,
        reviews: 340,
        category: 'Sports',
        daysAgo: 7),
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _selectedCat == 'All'
        ? _products
        : _products.where((p) => p.category == _selectedCat).toList();

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('✨ New Arrivals',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: Column(children: [
        // Category Tabs
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
                children: _categories
                    .map((c) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(c,
                                style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: _selectedCat == c
                                        ? Colors.white
                                        : AppTheme.textSecondary,
                                    fontSize: 13)),
                            selected: _selectedCat == c,
                            onSelected: (_) => setState(() => _selectedCat = c),
                            backgroundColor: AppTheme.surfaceMuted,
                            selectedColor: AppTheme.marketplaceColor,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                            checkmarkColor: Colors.white,
                            side: BorderSide.none,
                          ),
                        ))
                    .toList()),
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(12),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 0.62,
            ),
            itemCount: filtered.length,
            itemBuilder: (context, i) {
              final p = filtered[i];
              final discount = ((p.mrp - p.price) / p.mrp * 100).round();
              return Container(
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.borderLight)),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Container(
                          decoration: const BoxDecoration(
                              color: AppTheme.surfaceWhite,
                              borderRadius: BorderRadius.vertical(
                                  top: Radius.circular(14))),
                          child: Stack(children: [
                            const Center(
                                child: Icon(Icons.shopping_bag,
                                    size: 48, color: Color(0xFFD1D5DB))),
                            Positioned(
                                top: 8,
                                left: 8,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                      color: AppTheme.marketplaceColor,
                                      borderRadius: BorderRadius.circular(6)),
                                  child: const Text('NEW',
                                      style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800)),
                                )),
                            if (discount > 0)
                              Positioned(
                                  top: 8,
                                  right: 8,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 3),
                                    decoration: BoxDecoration(
                                        color: Colors.red.shade600,
                                        borderRadius: BorderRadius.circular(4)),
                                    child: Text('$discount% OFF',
                                        style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 9,
                                            fontWeight: FontWeight.w800)),
                                  )),
                          ]),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(10),
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(p.name,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 4),
                              Row(children: [
                                Text('₹${p.price}',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 16,
                                        color: AppTheme.textPrimary)),
                                const SizedBox(width: 6),
                                Text('₹${p.mrp}',
                                    style: const TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.textMuted,
                                        decoration:
                                            TextDecoration.lineThrough)),
                              ]),
                              const SizedBox(height: 4),
                              Row(children: [
                                const Icon(Icons.star,
                                    color: Color(0xFFFBBF24), size: 14),
                                const SizedBox(width: 2),
                                Text('${p.rating}',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 12)),
                                Text(' (${p.reviews})',
                                    style: const TextStyle(
                                        color: AppTheme.textMuted,
                                        fontSize: 11)),
                              ]),
                              const SizedBox(height: 4),
                              Text('${p.daysAgo}d ago',
                                  style: const TextStyle(
                                      color: AppTheme.marketplaceColor,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600)),
                            ]),
                      ),
                    ]),
              );
            },
          ),
        ),
      ]),
    );
  }
}

class _NewProduct {
  final String name, category;
  final int price, mrp, reviews, daysAgo;
  final double rating;
  const _NewProduct(
      {required this.name,
      required this.price,
      required this.mrp,
      required this.rating,
      required this.reviews,
      required this.category,
      required this.daysAgo});
}
