import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Product Reviews & Ratings Screen — shows and allows adding reviews.
class ReviewsRatingsScreen extends StatefulWidget {
  final String productName;
  const ReviewsRatingsScreen({super.key, this.productName = 'iPhone 15 Pro'});
  @override
  State<ReviewsRatingsScreen> createState() => _ReviewsRatingsScreenState();
}

class _ReviewsRatingsScreenState extends State<ReviewsRatingsScreen> {
  final _reviews = [
    {'user': 'Rohit S.', 'rating': 5, 'date': 'Jun 2, 2026', 'text': 'Absolutely love this product! The camera quality is outstanding and the titanium build feels incredibly premium.', 'helpful': 42},
    {'user': 'Priya M.', 'rating': 4, 'date': 'May 28, 2026', 'text': 'Great phone overall. Battery life could be slightly better but everything else is top-notch.', 'helpful': 18},
    {'user': 'Vikram K.', 'rating': 5, 'date': 'May 20, 2026', 'text': 'Best smartphone I have ever used. The A17 Pro chip is blazing fast. Highly recommended!', 'helpful': 31},
    {'user': 'Neha R.', 'rating': 3, 'date': 'May 15, 2026', 'text': 'Good product but overpriced. Similar features available in competitor brands at lower price.', 'helpful': 8},
    {'user': 'Amit P.', 'rating': 5, 'date': 'May 10, 2026', 'text': 'Delivery was super fast and the product is genuine. Seller packaging was excellent.', 'helpful': 22},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(title: const Text('Reviews & Ratings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Summary card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderLight)),
            child: Row(children: [
              Column(children: [
                const Text('4.8', style: TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: AppTheme.textPrimary)),
                Row(children: List.generate(5, (i) => Icon(i < 4 ? Icons.star : Icons.star_half, color: Colors.amber, size: 16))),
                const SizedBox(height: 4),
                Text('${_reviews.length} reviews', style: AppTheme.caption),
              ]),
              const SizedBox(width: 24),
              Expanded(child: Column(children: [
                for (int s = 5; s >= 1; s--)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(children: [
                      Text('$s', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      const Icon(Icons.star, size: 12, color: Colors.amber),
                      const SizedBox(width: 8),
                      Expanded(child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: s == 5 ? 0.6 : s == 4 ? 0.2 : s == 3 ? 0.1 : 0.05,
                          backgroundColor: AppTheme.borderLight,
                          color: AppTheme.successGreen,
                          minHeight: 6,
                        ),
                      )),
                      const SizedBox(width: 8),
                      SizedBox(width: 24, child: Text('${s == 5 ? 60 : s == 4 ? 20 : s == 3 ? 10 : 5}%', style: const TextStyle(fontSize: 10, color: AppTheme.textMuted))),
                    ]),
                  ),
              ])),
            ]),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () { /* Opens write-review bottom sheet */ },
            icon: const Icon(Icons.rate_review, size: 18),
            label: const Text('Write a Review'),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, minimumSize: const Size.fromHeight(48)),
          ),
          const SizedBox(height: 20),
          // Reviews list
          ..._reviews.map((r) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderLight)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  CircleAvatar(radius: 16, backgroundColor: AppTheme.marketplaceColor.withValues(alpha: 0.12), child: Text((r['user'] as String)[0], style: const TextStyle(color: AppTheme.marketplaceColor, fontWeight: FontWeight.w700, fontSize: 13))),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(r['user'] as String, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    Text(r['date'] as String, style: AppTheme.caption),
                  ])),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: (r['rating'] as int) >= 4 ? const Color(0xFF16A34A) : Colors.amber, borderRadius: BorderRadius.circular(4)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Text('${r['rating']}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)),
                      const Icon(Icons.star, color: Colors.white, size: 10),
                    ]),
                  ),
                ]),
                const SizedBox(height: 10),
                Text(r['text'] as String, style: AppTheme.bodySM),
                const SizedBox(height: 10),
                Row(children: [
                  const Icon(Icons.thumb_up_outlined, size: 14, color: AppTheme.textMuted),
                  const SizedBox(width: 4),
                  Text('${r['helpful']} found helpful', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                ]),
              ]),
            ),
          )),
        ],
      ),
    );
  }
}
