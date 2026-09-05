import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';

/// Shows stores that sell products for a selected category
class GroceryCategoryStoresScreen extends StatelessWidget {
  final String categoryName;
  const GroceryCategoryStoresScreen({super.key, required this.categoryName});

  @override
  Widget build(BuildContext context) {
    // Mock local stores for this category
    final stores = [
      {'name': 'FreshMart Supermarket', 'distance': '0.8 km away', 'rating': '⭐ 4.8 (2.1k)', 'time': '10 min', 'freeDelivery': true, 'deliveryFee': '${RegionService.instance.currentCountry.currencySymbol} 0 delivery', 'image': 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=400&auto=format&fit=crop'},
      {'name': 'Naivas Supermarket', 'distance': '1.2 km away', 'rating': '⭐ 4.6 (5.4k)', 'time': '15 min', 'freeDelivery': false, 'deliveryFee': '${RegionService.instance.currentCountry.currencySymbol} 49 delivery', 'image': 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=400&auto=format&fit=crop'},
      {'name': 'QuickMart Express', 'distance': '0.5 km away', 'rating': '⭐ 4.7 (1.8k)', 'time': '8 min', 'freeDelivery': true, 'deliveryFee': '${RegionService.instance.currentCountry.currencySymbol} 0 delivery', 'image': 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?q=80&w=400&auto=format&fit=crop'},
      {'name': 'Carrefour Local', 'distance': '2.1 km away', 'rating': '⭐ 4.9 (8.9k)', 'time': '20 min', 'freeDelivery': false, 'deliveryFee': '${RegionService.instance.currentCountry.currencySymbol} 29 delivery', 'image': 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?q=80&w=400&auto=format&fit=crop'},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: AppTheme.groceryColor,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text('Stores for $categoryName', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: stores.length,
        itemBuilder: (context, index) {
          final store = stores[index];
          return _storeCard(
            context,
            store['name'] as String,
            store['distance'] as String,
            store['rating'] as String,
            store['time'] as String,
            store['freeDelivery'] as bool,
            store['deliveryFee'] as String,
            store['image'] as String,
          );
        },
      ),
    );
  }

  Widget _storeCard(BuildContext context, String name, String distance, String rating, String time, bool freeDelivery, String deliveryFee, String imageUrl) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.storeDetail, arguments: name),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE5E7EB)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: Row(
          children: [
            KartseekImage(
              url: imageUrl,
              width: 80,
              height: 80,
              fit: BoxFit.cover,
              borderRadius: BorderRadius.circular(12),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(distance, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      const Text(' • ', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                      Text(rating, style: const TextStyle(fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(4)),
                        child: Text('🕐 $time', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF1B5E20))),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: freeDelivery ? const Color(0xFFF0FDF4) : const Color(0xFFFFF7ED),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(deliveryFee, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: freeDelivery ? Colors.green.shade700 : Colors.orange.shade700)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 24),
          ],
        ),
      ),
    );
  }
}
