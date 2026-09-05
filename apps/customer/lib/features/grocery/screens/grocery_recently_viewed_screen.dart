import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Recently Viewed Products Screen
class GroceryRecentlyViewedScreen extends StatefulWidget {
  const GroceryRecentlyViewedScreen({super.key});
  @override
  State<GroceryRecentlyViewedScreen> createState() => _GroceryRecentlyViewedScreenState();
}

class _GroceryRecentlyViewedScreenState extends State<GroceryRecentlyViewedScreen> {
  static const _groceryColor = AppTheme.groceryColor;

  final _items = <Map<String, dynamic>>[
    {'name': 'Fresh Bananas', 'price': 49, 'emoji': '🍌', 'time': '2m ago'},
    {'name': 'Amul Butter 500g', 'price': 275, 'emoji': '🧈', 'time': '15m ago'},
    {'name': 'Organic Tomatoes', 'price': 65, 'emoji': '🍅', 'time': '1h ago'},
    {'name': 'Chicken Breast', 'price': 280, 'emoji': '🍗', 'time': '2h ago'},
    {'name': 'Basmati Rice 5kg', 'price': 450, 'emoji': '🍚', 'time': '3h ago'},
    {'name': 'Full Cream Milk', 'price': 68, 'emoji': '🥛', 'time': '5h ago'},
    {'name': 'Whole Wheat Bread', 'price': 45, 'emoji': '🍞', 'time': '1d ago'},
    {'name': 'Red Onions 1kg', 'price': 35, 'emoji': '🧅', 'time': '1d ago'},
  ];

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Recently Viewed', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          TextButton(
            onPressed: () => setState(_items.clear),
            child: const Text('Clear All', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
      body: _items.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('👀', style: TextStyle(fontSize: 56)),
                  const SizedBox(height: 12),
                  const Text('Nothing viewed yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text('Browse products and they\'ll appear here', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                ],
              ),
            )
          : GridView.builder(
              padding: const EdgeInsets.all(12),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.75,
              ),
              itemCount: _items.length,
              itemBuilder: (context, i) {
                final item = _items[i];
                return Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Stack(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            height: 90,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                            ),
                            child: Center(child: Text(item['emoji'] as String, style: const TextStyle(fontSize: 44))),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(10),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700), maxLines: 2, overflow: TextOverflow.ellipsis),
                                const SizedBox(height: 2),
                                Text(item['time'] as String, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('$currency${item['price']}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: _groceryColor.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: _groceryColor.withValues(alpha: 0.3)),
                                      ),
                                      child: const Text('ADD', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: _groceryColor)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      // Remove button
                      Positioned(
                        top: 6,
                        right: 6,
                        child: GestureDetector(
                          onTap: () => setState(() => _items.removeAt(i)),
                          child: Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4)]),
                            child: const Icon(Icons.close, size: 14, color: Colors.grey),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
