import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

class ReviewsRatingsScreen extends StatelessWidget {
  const ReviewsRatingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reviews & Ratings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildReviewCard('Sony WH-1000XM5', 5, 'Amazing sound quality and noise cancellation.', 'May 10, 2026'),
          _buildReviewCard('FreshMart Supermarket', 4, 'Fast delivery, but missing one item.', 'April 22, 2026'),
          _buildReviewCard('Dr. Sarah Kamau', 5, 'Very professional and helpful.', 'April 15, 2026'),
        ],
      ),
    );
  }

  Widget _buildReviewCard(String title, int rating, String comment, String date) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text(date, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: List.generate(5, (index) => Icon(
                index < rating ? Icons.star : Icons.star_border,
                color: Colors.amber,
                size: 20,
              )),
            ),
            const SizedBox(height: 8),
            Text(comment, style: const TextStyle(color: AppTheme.textSecondary)),
          ],
        ),
      ),
    );
  }
}
