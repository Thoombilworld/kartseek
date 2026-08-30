import 'package:flutter/material.dart';
/// Customer reviews — respond to feedback.
class PharmacySellerReviewsScreen extends StatelessWidget {
  const PharmacySellerReviewsScreen({super.key});
  @override Widget build(BuildContext context) {
    final reviews = [
      {'name': 'Priya S.', 'rating': 5, 'comment': 'Fastest delivery!', 'time': '3 days ago', 'replied': true},
      {'name': 'Amit G.', 'rating': 4, 'comment': 'Good pharmacy, sometimes out of stock.', 'time': '1 week ago', 'replied': false},
      {'name': 'Rohit M.', 'rating': 3, 'comment': 'Late delivery but helpful pharmacist.', 'time': '2 weeks ago', 'replied': false},
    ];
    return Scaffold(backgroundColor: Colors.grey.shade50,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Customer Reviews', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87))),
      body: ListView.separated(padding: const EdgeInsets.all(16), itemCount: reviews.length, separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) { final r = reviews[i];
          return Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text(r['name'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                const Spacer(),
                ...List.generate(5, (j) => Icon(j < (r['rating'] as int) ? Icons.star : Icons.star_border, size: 16, color: Colors.amber)),
              ]),
              const SizedBox(height: 6),
              Text(r['comment'] as String, style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.3)),
              const SizedBox(height: 6),
              Row(children: [
                Text(r['time'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                const Spacer(),
                if (r['replied'] == true) Text('✅ Replied', style: TextStyle(fontSize: 11, color: Colors.green.shade600, fontWeight: FontWeight.w600))
                else TextButton(onPressed: () {}, child: const Text('Reply', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
              ]),
            ]),
          );
        }),
    );
  }
}
