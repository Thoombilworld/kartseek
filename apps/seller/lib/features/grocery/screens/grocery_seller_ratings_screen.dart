import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Seller Ratings — Aggregated store rating and recent reviews.
class GrocerySellerRatingsScreen extends StatelessWidget {
  const GrocerySellerRatingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Ratings would come from a dedicated API; shown with sample data
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Ratings & Reviews', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Aggregate
        Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(
          gradient: LinearGradient(colors: [SellerTheme.grocery, SellerTheme.grocery.withValues(alpha: 0.8)]), borderRadius: BorderRadius.circular(18)),
          child: Row(children: [
            const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('4.6', style: TextStyle(color: Colors.white, fontSize: 42, fontWeight: FontWeight.w900)),
              Text('out of 5', style: TextStyle(color: Colors.white70, fontSize: 12)),
            ]),
            const Spacer(),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Row(children: List.generate(5, (i) => Icon(i < 4 ? Icons.star : Icons.star_half, color: Colors.amber, size: 20))),
              const SizedBox(height: 4),
              const Text('Based on 248 reviews', style: TextStyle(color: Colors.white60, fontSize: 11)),
            ]),
          ])),
        const SizedBox(height: 12),
        // Distribution
        Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Rating Distribution', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            ...[(5, 165, Colors.green), (4, 52, Colors.lightGreen), (3, 18, Colors.amber), (2, 8, Colors.orange), (1, 5, Colors.red)].map((e) => Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Row(children: [
              SizedBox(width: 16, child: Text('${e.$1}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey.shade600))),
              const Icon(Icons.star, size: 12, color: Colors.amber),
              const SizedBox(width: 6),
              Expanded(child: Container(height: 14, decoration: BoxDecoration(borderRadius: BorderRadius.circular(3), color: Colors.grey.shade100),
                child: FractionallySizedBox(alignment: Alignment.centerLeft, widthFactor: (e.$2 / 165).clamp(0, 1),
                  child: Container(decoration: BoxDecoration(borderRadius: BorderRadius.circular(3), color: e.$3))))),
              const SizedBox(width: 8),
              SizedBox(width: 28, child: Text('${e.$2}', style: TextStyle(fontSize: 10, color: Colors.grey.shade500))),
            ]))),
          ])),
        const SizedBox(height: 12),
        // Recent Reviews
        Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Recent Reviews', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            ...[
              _Review('Sarah M.', 5, 'Super fresh produce! Delivery was quick and everything was perfectly packed.', '2d ago'),
              _Review('Ahmed K.', 4, 'Great variety. Would love to see more organic options.', '3d ago'),
              _Review('Lisa T.', 5, 'Best grocery delivery experience. The driver was very polite too.', '5d ago'),
            ].map((r) => Container(margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(10)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  CircleAvatar(radius: 14, backgroundColor: SellerTheme.grocery.withValues(alpha: 0.1),
                    child: Text(r.name[0], style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: SellerTheme.grocery))),
                  const SizedBox(width: 8),
                  Text(r.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  const Spacer(),
                  ...List.generate(5, (i) => Icon(i < r.rating ? Icons.star : Icons.star_border, size: 12, color: Colors.amber)),
                  const SizedBox(width: 6),
                  Text(r.time, style: TextStyle(fontSize: 9, color: Colors.grey.shade400)),
                ]),
                const SizedBox(height: 6),
                Text(r.comment, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
              ]))),
          ])),
      ]),
    );
  }
}

class _Review {
  final String name; final int rating; final String comment; final String time;
  _Review(this.name, this.rating, this.comment, this.time);
}
