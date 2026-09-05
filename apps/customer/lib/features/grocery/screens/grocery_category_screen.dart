import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Grocery Category Screen — Browse all categories with subcategories.
class GroceryCategoryScreen extends StatefulWidget {
  const GroceryCategoryScreen({super.key});
  @override
  State<GroceryCategoryScreen> createState() => _GroceryCategoryScreenState();
}

class _GroceryCategoryScreenState extends State<GroceryCategoryScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  int _selectedIndex = 0;

  static const _categories = [
    {'name': 'Fruits & Vegetables', 'emoji': '🥬', 'color': 0xFF4CAF50, 'subs': ['Leafy Greens', 'Root Vegetables', 'Exotic Fruits', 'Citrus Fruits', 'Berries', 'Herbs']},
    {'name': 'Meat & Fish', 'emoji': '🥩', 'color': 0xFFE53935, 'subs': ['Chicken', 'Mutton', 'Fish', 'Prawns', 'Eggs', 'Ready to Cook']},
    {'name': 'Dairy & Bread', 'emoji': '🥛', 'color': 0xFF1E88E5, 'subs': ['Milk', 'Curd & Yogurt', 'Cheese', 'Butter', 'Paneer', 'Bread & Buns']},
    {'name': 'Daily Essentials', 'emoji': '🏪', 'color': 0xFFFF9800, 'subs': ['Rice', 'Dal & Pulses', 'Cooking Oil', 'Spices', 'Salt & Sugar', 'Flour']},
    {'name': 'Snacks & Beverages', 'emoji': '🍿', 'color': 0xFF9C27B0, 'subs': ['Chips', 'Biscuits', 'Chocolates', 'Juices', 'Tea & Coffee', 'Soft Drinks']},
    {'name': 'Household', 'emoji': '🧹', 'color': 0xFF00BCD4, 'subs': ['Cleaning', 'Detergents', 'Tissue & Paper', 'Fresheners', 'Insect Repellent', 'Trash Bags']},
    {'name': 'Baby & Pet', 'emoji': '👶', 'color': 0xFFE91E63, 'subs': ['Diapers', 'Baby Food', 'Baby Care', 'Pet Food', 'Pet Treats', 'Pet Hygiene']},
    {'name': 'Personal Care', 'emoji': '🧴', 'color': 0xFF607D8B, 'subs': ['Shampoo', 'Soap', 'Skincare', 'Oral Care', 'Hair Care', 'Deodorants']},
  ];

  @override
  Widget build(BuildContext context) {
    final selected = _categories[_selectedIndex];
    final subs = selected['subs'] as List<String>;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Categories', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: Row(
        children: [
          // Left: Category list
          Container(
            width: 96,
            color: Colors.white,
            child: ListView.builder(
              itemCount: _categories.length,
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemBuilder: (context, i) {
                final cat = _categories[i];
                final isActive = i == _selectedIndex;
                return GestureDetector(
                  onTap: () => setState(() => _selectedIndex = i),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: isActive ? _groceryColor.withValues(alpha: 0.1) : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      border: isActive ? Border.all(color: _groceryColor.withValues(alpha: 0.3), width: 1.5) : null,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(cat['emoji'] as String, style: const TextStyle(fontSize: 28)),
                        const SizedBox(height: 4),
                        Text(
                          (cat['name'] as String).split(' ').first,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
                            color: isActive ? _groceryColor : Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Divider
          Container(width: 1, color: Colors.grey.shade200),

          // Right: Subcategories grid
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Category header
                Container(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Color(selected['color'] as int).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(child: Text(selected['emoji'] as String, style: const TextStyle(fontSize: 22))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(selected['name'] as String, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                            Text('${subs.length} subcategories', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Subcategory grid
                Expanded(
                  child: GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 0.85,
                    ),
                    itemCount: subs.length,
                    itemBuilder: (context, i) {
                      return GestureDetector(
                        onTap: () {
                          // Navigate to store listing filtered by subcategory
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: Colors.grey.shade200),
                            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2))],
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  color: Color(selected['color'] as int).withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(Icons.local_grocery_store, color: Color(selected['color'] as int), size: 22),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                subs[i],
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
