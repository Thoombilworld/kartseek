import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';


/// Grocery Wishlist Screen — Saved products with remove + add-to-cart actions.
class GroceryWishlistScreen extends StatefulWidget {
  const GroceryWishlistScreen({super.key});
  @override
  State<GroceryWishlistScreen> createState() => _GroceryWishlistScreenState();
}

class _GroceryWishlistScreenState extends State<GroceryWishlistScreen> {
  final List<Map<String, dynamic>> _items = [
    {
      'id': '1',
      'name': 'Organic Bananas',
      'emoji': '🍌',
      'price': 49,
      'mrp': 65,
      'weight': '1 dozen',
      'store': 'FreshMart Express',
      'inStock': true
    },
    {
      'id': '2',
      'name': 'Fresh Tomatoes',
      'emoji': '🍅',
      'price': 42,
      'mrp': 55,
      'weight': '1 kg',
      'store': 'Green Basket',
      'inStock': true
    },
    {
      'id': '3',
      'name': 'Premium Chicken Breast',
      'emoji': '🍗',
      'price': 299,
      'mrp': 399,
      'weight': '500 g',
      'store': 'Meat Paradise',
      'inStock': true
    },
    {
      'id': '4',
      'name': 'Greek Yogurt',
      'emoji': '🥛',
      'price': 89,
      'mrp': 110,
      'weight': '400 g',
      'store': 'Daily Needs',
      'inStock': false
    },
    {
      'id': '5',
      'name': 'Almond Butter',
      'emoji': '🥜',
      'price': 450,
      'mrp': 550,
      'weight': '200 g',
      'store': 'Organic Hub',
      'inStock': true
    },
  ];

  void _removeItem(String id) {
    setState(() => _items.removeWhere((item) => item['id'] == id));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Removed from wishlist'),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        action: SnackBarAction(label: 'Undo', onPressed: () { setState(() {}); }),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Row(
          children: [
            const Text('My Wishlist',
                style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(12)),
              child: Text('${_items.length}',
                  style: TextStyle(
                      color: Colors.red.shade700,
                      fontSize: 12,
                      fontWeight: FontWeight.w700)),
            ),
          ],
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E293B),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: _items.isEmpty
          ? _buildEmptyState()
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final item = _items[index];
                final discount =
                    (((item['mrp'] as int) - (item['price'] as int)) /
                            (item['mrp'] as int) *
                            100)
                        .round();
                final inStock = item['inStock'] as bool;

                return Dismissible(
                  key: Key(item['id'] as String),
                  direction: DismissDirection.endToStart,
                  onDismissed: (_) => _removeItem(item['id'] as String),
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    decoration: BoxDecoration(
                        color: Colors.red.shade400,
                        borderRadius: BorderRadius.circular(16)),
                    child: const Icon(Icons.delete_outline,
                        color: Colors.white, size: 28),
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                      boxShadow: [
                        BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 6,
                            offset: const Offset(0, 2))
                      ],
                    ),
                    child: Row(
                      children: [
                        // Image
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Stack(
                            children: [
                              Center(
                                  child: Text(item['emoji'] as String,
                                      style: const TextStyle(fontSize: 32))),
                              if (discount > 0)
                                Positioned(
                                  top: 2,
                                  left: 2,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 4, vertical: 1),
                                    decoration: BoxDecoration(
                                        color: Colors.red,
                                        borderRadius: BorderRadius.circular(6)),
                                    child: Text('$discount%',
                                        style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 8,
                                            fontWeight: FontWeight.w800)),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item['name'] as String,
                                  style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF1E293B)),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 2),
                              Text('${item['weight']} · ${item['store']}',
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.grey.shade600)),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Text('${RegionService.instance.currentCountry.currencySymbol} ${item['price']}',
                                      style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF1E293B))),
                                  if ((item['mrp'] as int) >
                                      (item['price'] as int)) ...[
                                    const SizedBox(width: 6),
                                    Text('${RegionService.instance.currentCountry.currencySymbol} ${item['mrp']}',
                                        style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey.shade500,
                                            decoration:
                                                TextDecoration.lineThrough)),
                                  ],
                                  const Spacer(),
                                  if (!inStock)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                          color: Colors.red.shade50,
                                          borderRadius:
                                              BorderRadius.circular(8)),
                                      child: Text('Out of Stock',
                                          style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w600,
                                              color: Colors.red.shade700)),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        // Actions
                        Column(
                          children: [
                            // Add to cart button
                            SizedBox(
                              width: 80,
                              child: ElevatedButton(
                                onPressed: inStock
                                    ? () {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(
                                          SnackBar(
                                              content: Text(
                                                  '${item['name']} added to cart'),
                                              behavior:
                                                  SnackBarBehavior.floating,
                                              shape: RoundedRectangleBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(
                                                          10))),
                                        );
                                      }
                                    : null,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF16A34A),
                                  disabledBackgroundColor: Colors.grey.shade300,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 8),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10)),
                                ),
                                child: const Text('Add',
                                    style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white)),
                              ),
                            ),
                            const SizedBox(height: 6),
                            // Remove
                            GestureDetector(
                              onTap: () => _removeItem(item['id'] as String),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                    color: Colors.red.shade50,
                                    borderRadius: BorderRadius.circular(8)),
                                child: Icon(Icons.favorite,
                                    size: 18, color: Colors.red.shade400),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
                color: Colors.red.shade50, shape: BoxShape.circle),
            child: Icon(Icons.favorite_border,
                size: 40, color: Colors.red.shade300),
          ),
          const SizedBox(height: 16),
          const Text('Your wishlist is empty',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B))),
          const SizedBox(height: 6),
          Text('Save products you love by tapping the heart icon',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.shopping_cart_outlined, size: 18),
            label: const Text('Browse Groceries'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF16A34A),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}
