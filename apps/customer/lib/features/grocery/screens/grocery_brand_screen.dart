import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/grocery/services/grocery_api_service.dart';

/// Grocery Brand Listing Screen — Browse all brands available in user's region.
class GroceryBrandListScreen extends StatefulWidget {
  const GroceryBrandListScreen({super.key});

  @override
  State<GroceryBrandListScreen> createState() => _GroceryBrandListScreenState();
}

class _GroceryBrandListScreenState extends State<GroceryBrandListScreen> {
  final _apiService = GroceryApiService();
  List<Map<String, dynamic>> _brands = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadBrands();
  }

  Future<void> _loadBrands() async {
    try {
      // Attempt API fetch first
      await _apiService.getGlobalCategories();
      setState(() {
        _brands = _demoBrands();
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _brands = _demoBrands();
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> _demoBrands() {
    final country = RegionService.instance.currentCountry;
    if (country.code == 'IN') {
      return [
        {'name': 'Amul', 'category': 'Dairy', 'emoji': '🥛', 'products': 142, 'featured': true},
        {'name': 'Tata', 'category': 'Essentials', 'emoji': '🫖', 'products': 89, 'featured': true},
        {'name': 'Fortune', 'category': 'Cooking', 'emoji': '🫒', 'products': 67, 'featured': true},
        {'name': 'Britannia', 'category': 'Bakery', 'emoji': '🍪', 'products': 156, 'featured': false},
        {'name': 'Haldiram', 'category': 'Snacks', 'emoji': '🥨', 'products': 93, 'featured': false},
        {'name': 'Dabur', 'category': 'Health', 'emoji': '🌿', 'products': 78, 'featured': false},
        {'name': 'Patanjali', 'category': 'Organic', 'emoji': '🌱', 'products': 124, 'featured': false},
        {'name': 'ITC', 'category': 'FMCG', 'emoji': '🏭', 'products': 201, 'featured': true},
      ];
    }
    return [
      {'name': 'Al Ain', 'category': 'Water & Dairy', 'emoji': '💧', 'products': 56, 'featured': true},
      {'name': 'Almarai', 'category': 'Dairy', 'emoji': '🥛', 'products': 189, 'featured': true},
      {'name': 'Al Rawabi', 'category': 'Beverages', 'emoji': '🧃', 'products': 72, 'featured': false},
      {'name': 'NIDO', 'category': 'Milk', 'emoji': '🍶', 'products': 34, 'featured': true},
    ];
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _search.isEmpty
        ? _brands
        : _brands.where((b) => (b['name'] as String).toLowerCase().contains(_search.toLowerCase())).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Shop by Brand', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 18)),
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : CustomScrollView(
              slivers: [
                // Search bar
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: TextField(
                      onChanged: (v) => setState(() => _search = v),
                      decoration: InputDecoration(
                        hintText: 'Search brands...',
                        prefixIcon: const Icon(Icons.search, color: Color(0xFF94A3B8)),
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                ),
                // Featured brands
                if (filtered.any((b) => b['featured'] == true)) ...[
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Text('⭐ Featured Brands', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A))),
                    ),
                  ),
                ],
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.3,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final brand = filtered[index];
                        return GestureDetector(
                          onTap: () {
                            Navigator.push(context, MaterialPageRoute(
                              builder: (_) => GroceryBrandDetailScreen(brandName: brand['name'] as String, brandEmoji: brand['emoji'] as String),
                            ));
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2))],
                            ),
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(brand['emoji'] as String, style: const TextStyle(fontSize: 32)),
                                const SizedBox(height: 8),
                                Text(brand['name'] as String, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF0F172A))),
                                const SizedBox(height: 2),
                                Text('${brand['products']} products', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                                if (brand['featured'] == true)
                                  Container(
                                    margin: const EdgeInsets.only(top: 4),
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(4)),
                                    child: const Text('Featured', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFFD97706))),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: filtered.length,
                    ),
                  ),
                ),
                const SliverPadding(padding: EdgeInsets.only(bottom: 32)),
              ],
            ),
    );
  }
}

/// Grocery Brand Detail Screen — Shows products from a specific brand.
class GroceryBrandDetailScreen extends StatelessWidget {
  final String brandName;
  final String brandEmoji;

  const GroceryBrandDetailScreen({super.key, required this.brandName, required this.brandEmoji});

  static const _groceryColor = AppTheme.groceryColor;

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    // Demo products for brand
    final products = List.generate(8, (int i) {
      return <String, Object>{
        'name': '$brandName Product ${i + 1}',
        'price': (50 + i * 25).toDouble(),
        'weight': ['250 g', '500 g', '1 kg', '1 litre'][i % 4],
        'rating': 4.0 + (i % 10) / 10,
        'inStock': i != 3,
      };
    });

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(brandEmoji, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
            Text(brandName, style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 18)),
          ],
        ),
        centerTitle: true,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: products.length,
        itemBuilder: (context, index) {
          final p = products[index];
          final inStock = p['inStock'] as bool;
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(
                    color: _groceryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(child: Text(brandEmoji, style: const TextStyle(fontSize: 24))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p['name'] as String, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF0F172A))),
                      const SizedBox(height: 2),
                      Text(p['weight'] as String, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Row(
                        children: [
                          Icon(Icons.star, size: 12, color: Colors.amber.shade600),
                          const SizedBox(width: 2),
                          Text('${p['rating']}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                        ],
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('$currency${(p['price'] as double).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A))),
                    const SizedBox(height: 6),
                    inStock
                        ? Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(color: _groceryColor, borderRadius: BorderRadius.circular(8)),
                            child: const Text('Add', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
                          )
                        : Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                            child: const Text('Out of stock', style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.w600, fontSize: 11)),
                          ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
