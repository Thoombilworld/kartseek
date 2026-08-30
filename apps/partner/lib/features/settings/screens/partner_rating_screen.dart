import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// Partner Rating Screen
class PartnerRatingScreen extends StatelessWidget {
  const PartnerRatingScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('My Ratings'), leading: const BackButton(color: PartnerTheme.textPrimary)),
      body: SingleChildScrollView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(20),
        child: Column(children: [
          Container(padding: const EdgeInsets.all(24), decoration: BoxDecoration(gradient: PartnerTheme.primaryGradient, borderRadius: BorderRadius.circular(20)),
            child: Column(children: [
              const Text('Overall Rating', style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 4),
              const Text('4.7', style: TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w900)),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) => Icon(i < 4 ? Icons.star : Icons.star_half, size: 24, color: Colors.amber))),
              const SizedBox(height: 8),
              const Text('Based on 1,284 trips', style: TextStyle(color: Colors.white60, fontSize: 13)),
            ])),
          const SizedBox(height: 20),
          Container(padding: const EdgeInsets.all(16), decoration: PartnerTheme.cardDecoration(),
            child: Column(children: [
              _ratingBar('5 star', 0.72, '928'), _ratingBar('4 star', 0.18, '231'),
              _ratingBar('3 star', 0.06, '77'), _ratingBar('2 star', 0.03, '38'),
              _ratingBar('1 star', 0.01, '10'),
            ])),
          const SizedBox(height: 20),
          const Text('Recent Reviews', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          _review('Sarah W.', 5, 'Excellent driver, very professional!', '2 hrs ago'),
          _review('John K.', 5, 'Safe ride, clean car.', '5 hrs ago'),
          _review('Grace A.', 4, 'Good service but took a longer route.', 'Yesterday'),
        ])),
    );
  }

  Widget _ratingBar(String label, double pct, String count) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(children: [
      SizedBox(width: 50, child: Text(label, style: const TextStyle(fontSize: 12, color: PartnerTheme.textMuted))),
      Expanded(child: Container(height: 8, decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)),
        child: FractionallySizedBox(alignment: Alignment.centerLeft, widthFactor: pct,
          child: Container(decoration: BoxDecoration(color: Colors.amber, borderRadius: BorderRadius.circular(4)))))),
      const SizedBox(width: 8),
      SizedBox(width: 30, child: Text(count, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600), textAlign: TextAlign.right)),
    ]),
  );

  Widget _review(String name, int stars, String text, String time) => Container(
    margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(14), decoration: PartnerTheme.cardDecoration(),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        CircleAvatar(radius: 16, backgroundColor: PartnerTheme.primaryLight, child: Text(name[0], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: PartnerTheme.primary))),
        const SizedBox(width: 8),
        Expanded(child: Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600))),
        Row(children: List.generate(stars, (i) => const Icon(Icons.star, size: 14, color: Colors.amber))),
      ]),
      const SizedBox(height: 8),
      Text(text, style: const TextStyle(fontSize: 13, color: PartnerTheme.textSecondary)),
      const SizedBox(height: 4),
      Text(time, style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted)),
    ]),
  );
}
