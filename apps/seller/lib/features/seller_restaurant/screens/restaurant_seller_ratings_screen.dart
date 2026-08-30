import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Restaurant Seller Ratings & Reviews Screen.
class RestaurantSellerRatingsScreen extends StatelessWidget {
  const RestaurantSellerRatingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    final reviews = [
      {'name': 'Sarah K.', 'rating': 5, 'text': 'Amazing biryani! Best in town. Will order again.', 'date': 'Jul 3, 2026', 'items': 'Chicken Biryani, Raita'},
      {'name': 'John M.', 'rating': 4, 'text': 'Good food, delivery was a bit late though.', 'date': 'Jul 2, 2026', 'items': 'Mutton Biryani'},
      {'name': 'Priya S.', 'rating': 5, 'text': 'Paneer Tikka was outstanding! Perfect spice level.', 'date': 'Jul 1, 2026', 'items': 'Paneer Tikka, Naan'},
      {'name': 'David L.', 'rating': 3, 'text': 'Food was okay, expected more flavor.', 'date': 'Jun 30, 2026', 'items': 'Veg Biryani'},
    ];
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Ratings & Reviews', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Overview card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
          child: Row(children: [
            Column(children: [
              Text('4.4', style: TextStyle(fontSize: 42, fontWeight: FontWeight.w900, color: c)),
              Row(children: List.generate(5, (i) => Icon(i < 4 ? Icons.star : Icons.star_half, color: Colors.amber, size: 16))),
              const SizedBox(height: 4),
              Text('1,284 ratings', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            ]),
            const SizedBox(width: 24),
            Expanded(child: Column(children: [
              for (var i = 5; i >= 1; i--) Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(children: [
                  Text('$i', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 4),
                  const Icon(Icons.star, size: 10, color: Colors.amber),
                  const SizedBox(width: 6),
                  Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(2),
                    child: LinearProgressIndicator(value: [0.0, 0.05, 0.12, 0.28, 0.55][5 - i], backgroundColor: Colors.grey.shade200, valueColor: AlwaysStoppedAnimation(c), minHeight: 6.0))),
                  const SizedBox(width: 8),
                  SizedBox(width: 30, child: Text(['706', '359', '154', '45', '20'][5 - i], style: TextStyle(fontSize: 10, color: Colors.grey.shade500))),
                ]),
              ),
            ])),
          ]),
        ),
        const SizedBox(height: 16),
        Text('RECENT REVIEWS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey.shade500, letterSpacing: 1)),
        const SizedBox(height: 10),
        ...reviews.map((r) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              CircleAvatar(radius: 16, backgroundColor: c.withValues(alpha: 0.1), child: Text((r['name'] as String)[0], style: TextStyle(fontWeight: FontWeight.w800, color: c))),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(r['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                Row(children: List.generate(5, (i) => Icon(i < (r['rating'] as int) ? Icons.star : Icons.star_border, color: Colors.amber, size: 12))),
              ])),
              Text(r['date'] as String, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
            ]),
            const SizedBox(height: 8),
            Text(r['text'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.3)),
            const SizedBox(height: 6),
            Text('Ordered: ${r['items']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontStyle: FontStyle.italic)),
          ]),
        )),
      ]),
    );
  }
}
