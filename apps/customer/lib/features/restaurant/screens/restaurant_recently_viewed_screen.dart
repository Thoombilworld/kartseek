import 'package:flutter/material.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

/// Restaurant — Recently Viewed Restaurants Screen.
class RestaurantRecentlyViewedScreen extends StatefulWidget {
  const RestaurantRecentlyViewedScreen({super.key});
  @override
  State<RestaurantRecentlyViewedScreen> createState() => _RestaurantRecentlyViewedScreenState();
}

class _RestaurantRecentlyViewedScreenState extends State<RestaurantRecentlyViewedScreen> {
  static const _brandColor = Color(0xFFEA580C);

  final _items = [
    {'name': 'The Grand Biryani House', 'cuisine': 'Indian • Biryani', 'rating': '4.4', 'time': '35 min', 'emoji': '🍛', 'viewed': '2 hours ago'},
    {'name': 'Pizza Paradise', 'cuisine': 'Italian • Pizza', 'rating': '4.7', 'time': '25 min', 'emoji': '🍕', 'viewed': '5 hours ago'},
    {'name': 'Burger Barn', 'cuisine': 'American • Burgers', 'rating': '4.2', 'time': '20 min', 'emoji': '🍔', 'viewed': 'Yesterday'},
    {'name': 'Sushi Master', 'cuisine': 'Japanese • Sushi', 'rating': '4.8', 'time': '40 min', 'emoji': '🍣', 'viewed': 'Yesterday'},
    {'name': 'Taco Town', 'cuisine': 'Mexican • Tacos', 'rating': '4.3', 'time': '30 min', 'emoji': '🌮', 'viewed': '2 days ago'},
    {'name': 'Thai Orchid', 'cuisine': 'Thai • Curry', 'rating': '4.5', 'time': '35 min', 'emoji': '🍜', 'viewed': '3 days ago'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
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
          ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.history, size: 64, color: Colors.grey),
              SizedBox(height: 12),
              Text('No recently viewed restaurants', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
            ]))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final r = _items[i];
                return GestureDetector(
                  onTap: () => Navigator.pushNamed(context, CustomerRouter.restaurantDetail, arguments: r['name']),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
                    child: Row(children: [
                      Container(
                        width: 56, height: 56,
                        decoration: BoxDecoration(color: _brandColor.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                        child: Center(child: Text(r['emoji']!, style: const TextStyle(fontSize: 28))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(r['name']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 2),
                        Text(r['cuisine']!, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                        const SizedBox(height: 4),
                        Row(children: [
                          const Icon(Icons.star, size: 12, color: Colors.amber),
                          const SizedBox(width: 2),
                          Text(r['rating']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                          const SizedBox(width: 8),
                          Icon(Icons.access_time, size: 12, color: Colors.grey.shade400),
                          const SizedBox(width: 2),
                          Text(r['time']!, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                        ]),
                      ])),
                      Column(children: [
                        Text(r['viewed']!, style: TextStyle(fontSize: 9, color: Colors.grey.shade400)),
                        const SizedBox(height: 8),
                        Icon(Icons.chevron_right, color: Colors.grey.shade300, size: 20),
                      ]),
                    ]),
                  ),
                );
              },
            ),
    );
  }
}
