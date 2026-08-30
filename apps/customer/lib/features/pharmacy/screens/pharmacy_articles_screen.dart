import 'package:flutter/material.dart';

/// Health articles — wellness tips, medicine guides, FAQ.
class PharmacyArticlesScreen extends StatelessWidget {
  const PharmacyArticlesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final articles = [
      {'title': 'Understanding Generic vs Branded Medicines', 'category': 'Medicine Guide', 'readTime': '5 min read', 'emoji': '💊', 'color': Colors.blue},
      {'title': 'How to Read a Prescription', 'category': 'Health Tips', 'readTime': '3 min read', 'emoji': '📋', 'color': Colors.green},
      {'title': '10 Essential Vitamins for Immunity', 'category': 'Wellness', 'readTime': '7 min read', 'emoji': '🛡️', 'color': Colors.orange},
      {'title': 'Safe Storage of Medicines at Home', 'category': 'Medicine Guide', 'readTime': '4 min read', 'emoji': '🏠', 'color': Colors.purple},
      {'title': 'First Aid Kit Essentials Checklist', 'category': 'Health Tips', 'readTime': '6 min read', 'emoji': '🩹', 'color': Colors.red},
      {'title': 'Managing Diabetes: Diet & Medication', 'category': 'Chronic Care', 'readTime': '8 min read', 'emoji': '🩸', 'color': Colors.teal},
    ];
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Health Articles', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: articles.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) {
          final a = articles[i];
          return Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 140,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [(a['color'] as Color).withValues(alpha: 0.15), (a['color'] as Color).withValues(alpha: 0.05)]),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                  ),
                  child: Center(child: Text(a['emoji'] as String, style: const TextStyle(fontSize: 56))),
                ),
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: (a['color'] as Color).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                            child: Text(a['category'] as String, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: a['color'] as Color)),
                          ),
                          const Spacer(),
                          Text(a['readTime'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(a['title'] as String, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, height: 1.3)),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
