import 'package:flutter/material.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

/// Restaurant — Wishlist / Favorite Restaurants Screen.
class RestaurantWishlistScreen extends StatefulWidget {
  const RestaurantWishlistScreen({super.key});
  @override
  State<RestaurantWishlistScreen> createState() => _RestaurantWishlistScreenState();
}

class _RestaurantWishlistScreenState extends State<RestaurantWishlistScreen> {
  static const _brandColor = Color(0xFFEA580C);

  final _favorites = [
    {'name': 'The Grand Biryani House', 'cuisine': 'Indian • Biryani • Mughlai', 'rating': '4.4', 'time': '35 min', 'emoji': '🍛', 'distance': '2.1 km', 'open': true},
    {'name': 'Pizza Paradise', 'cuisine': 'Italian • Pizza • Pasta', 'rating': '4.7', 'time': '25 min', 'emoji': '🍕', 'distance': '1.2 km', 'open': true},
    {'name': 'Sushi Master', 'cuisine': 'Japanese • Sushi • Ramen', 'rating': '4.8', 'time': '40 min', 'emoji': '🍣', 'distance': '3.5 km', 'open': false},
    {'name': 'Thai Orchid', 'cuisine': 'Thai • Curry • Noodles', 'rating': '4.5', 'time': '35 min', 'emoji': '🍜', 'distance': '1.8 km', 'open': true},
    {'name': 'Le Petit Bistro', 'cuisine': 'French • Continental', 'rating': '4.6', 'time': '45 min', 'emoji': '🥐', 'distance': '4.2 km', 'open': true},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Favorite Restaurants', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: _favorites.isEmpty
          ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.favorite_border, size: 64, color: Colors.grey),
              SizedBox(height: 12),
              Text('No favorite restaurants yet', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
              SizedBox(height: 4),
              Text('Tap ❤ on any restaurant to save it here', style: TextStyle(color: Colors.grey, fontSize: 12)),
            ]))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _favorites.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final r = _favorites[i];
                final isOpen = r['open'] as bool;
                return GestureDetector(
                  onTap: () => Navigator.pushNamed(context, CustomerRouter.restaurantDetail, arguments: r['name']),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
                    child: Row(children: [
                      Container(
                        width: 64, height: 64,
                        decoration: BoxDecoration(color: _brandColor.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                        child: Center(child: Text(r['emoji'] as String, style: const TextStyle(fontSize: 32))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Expanded(child: Text(r['name'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis)),
                          GestureDetector(
                            onTap: () => setState(() => _favorites.removeAt(i)),
                            child: const Icon(Icons.favorite, color: Colors.red, size: 20),
                          ),
                        ]),
                        const SizedBox(height: 2),
                        Text(r['cuisine'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                        const SizedBox(height: 6),
                        Row(children: [
                          const Icon(Icons.star, size: 12, color: Colors.amber),
                          const SizedBox(width: 2),
                          Text(r['rating'] as String, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                          const SizedBox(width: 10),
                          Icon(Icons.access_time, size: 12, color: Colors.grey.shade400),
                          const SizedBox(width: 2),
                          Text(r['time'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                          const SizedBox(width: 10),
                          Icon(Icons.location_on, size: 12, color: Colors.grey.shade400),
                          const SizedBox(width: 2),
                          Text(r['distance'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: (isOpen ? Colors.green : Colors.red).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                            child: Text(isOpen ? 'Open' : 'Closed', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: isOpen ? Colors.green : Colors.red)),
                          ),
                        ]),
                      ])),
                    ]),
                  ),
                );
              },
            ),
    );
  }
}
