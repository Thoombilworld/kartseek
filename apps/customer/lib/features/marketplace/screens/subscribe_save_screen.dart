import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Subscribe & Save Screen — Recurring delivery subscriptions with frequency selector and discount.
class SubscribeSaveScreen extends StatefulWidget {
  const SubscribeSaveScreen({super.key});
  @override
  State<SubscribeSaveScreen> createState() => _SubscribeSaveScreenState();
}

class _SubscribeSaveScreenState extends State<SubscribeSaveScreen> {
  final _subscriptions = <_Subscription>[
    _Subscription(
        name: 'Protein Powder 1kg',
        brand: 'MuscleBlaze',
        price: 2499,
        frequency: 'Monthly',
        nextDelivery: 'Jul 15',
        discount: 10,
        active: true),
    _Subscription(
        name: 'Green Tea (100 bags)',
        brand: 'Organic India',
        price: 399,
        frequency: 'Every 2 months',
        nextDelivery: 'Aug 1',
        discount: 15,
        active: true),
    _Subscription(
        name: 'Face Wash 150ml',
        brand: 'Cetaphil',
        price: 449,
        frequency: 'Every 3 months',
        nextDelivery: 'Sep 20',
        discount: 5,
        active: false),
  ];

  @override
  Widget build(BuildContext context) {
    final active = _subscriptions.where((s) => s.active).toList();
    final paused = _subscriptions.where((s) => !s.active).toList();

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('🔄 Subscribe & Save',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Benefits Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [AppTheme.successGreen, Color(0xFF059669)]),
              borderRadius: BorderRadius.circular(20),
            ),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Subscribe & Save up to 15%',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              const Text(
                  'Set it and forget it. Your essentials, delivered on schedule with extra savings.',
                  style: TextStyle(
                      color: Colors.white70, fontSize: 14, height: 1.4)),
              const SizedBox(height: 12),
              Row(children: [
                _benefitChip('Free Delivery'),
                const SizedBox(width: 8),
                _benefitChip('Cancel Anytime'),
                const SizedBox(width: 8),
                _benefitChip('Auto Discount'),
              ]),
            ]),
          ),
          const SizedBox(height: 24),

          if (active.isNotEmpty) ...[
            Text('Active Subscriptions (${active.length})',
                style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary)),
            const SizedBox(height: 12),
            ...active.map(_buildSubCard),
          ],

          if (paused.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text('Paused (${paused.length})',
                style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary)),
            const SizedBox(height: 12),
            ...paused.map(_buildSubCard),
          ],

          const SizedBox(height: 24),
          // Suggested
          const Text('Recommended for Subscription',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary)),
          const SizedBox(height: 12),
          SizedBox(
            height: 180,
            child: ListView(scrollDirection: Axis.horizontal, children: [
              _suggestCard(
                  'Whey Protein', '₹1,999', '12% off', Icons.fitness_center),
              _suggestCard('Multivitamin', '₹599', '10% off', Icons.medication),
              _suggestCard(
                  'Basmati Rice 5kg', '₹749', '8% off', Icons.rice_bowl),
              _suggestCard('Hand Soap', '₹199', '15% off', Icons.wash),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _benefitChip(String label) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(8)),
        child: Text(label,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w600)),
      );

  Widget _buildSubCard(_Subscription sub) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: sub.active
                  ? AppTheme.borderLight
                  : const Color(0xFFFDE68A)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                    color: AppTheme.surfaceMuted,
                    borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.inventory_2, color: AppTheme.marketplaceColor)),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(sub.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 14)),
                  Text(sub.brand,
                      style: const TextStyle(
                          color: AppTheme.textMuted, fontSize: 12)),
                ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: AppTheme.successGreen.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6)),
              child: Text('${sub.discount}% off',
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.successGreen)),
            ),
          ]),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('₹${sub.price}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                      color: AppTheme.textPrimary)),
              Text(sub.frequency,
                  style:
                      const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
            ]),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              const Text('Next delivery',
                  style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
              Text(sub.nextDelivery,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppTheme.marketplaceColor,
                      fontSize: 13)),
            ]),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
                child: OutlinedButton(
              onPressed: () => setState(() => sub.active = !sub.active),
              style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                  side: const BorderSide(color: AppTheme.borderLight)),
              child: Text(sub.active ? 'Pause' : 'Resume',
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 13)),
            )),
            const SizedBox(width: 8),
            Expanded(
                child: OutlinedButton(
              onPressed: () {},
              style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                  side: const BorderSide(color: AppTheme.borderLight)),
              child: const Text('Modify',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            )),
            const SizedBox(width: 8),
            IconButton(
                onPressed: () => setState(() => _subscriptions.remove(sub)),
                icon: const Icon(Icons.delete_outline,
                    color: AppTheme.errorRed, size: 20)),
          ]),
        ]),
      );

  Widget _suggestCard(
          String name, String price, String discount, IconData icon) =>
      Container(
        width: 140,
        margin: const EdgeInsets.only(right: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.borderLight)),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 36, color: AppTheme.marketplaceColor),
          const SizedBox(height: 8),
          Text(name,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
              textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Text(price,
              style:
                  const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          Container(
            margin: const EdgeInsets.only(top: 4),
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
                color: AppTheme.successGreen.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4)),
            child: Text(discount,
                style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.successGreen)),
          ),
        ]),
      );
}

class _Subscription {
  final String name, brand, frequency, nextDelivery;
  final int price, discount;
  bool active;
  _Subscription(
      {required this.name,
      required this.brand,
      required this.price,
      required this.frequency,
      required this.nextDelivery,
      required this.discount,
      required this.active});
}
