import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Subscribe & Save Management — Full subscription management.
class SubscribeSaveManageScreen extends StatefulWidget {
  const SubscribeSaveManageScreen({super.key});
  @override
  State<SubscribeSaveManageScreen> createState() =>
      _SubscribeSaveManageScreenState();
}

class _SubscribeSaveManageScreenState extends State<SubscribeSaveManageScreen> {
  final _subs = <_Sub>[
    _Sub(
        product: 'Protein Powder 1kg',
        brand: 'MuscleBlaze',
        price: 2499,
        frequency: 'Monthly',
        nextDelivery: 'Jul 15',
        discount: 10,
        status: 'active'),
    _Sub(
        product: 'Green Tea (100 bags)',
        brand: 'Organic India',
        price: 399,
        frequency: 'Every 2 months',
        nextDelivery: 'Aug 1',
        discount: 15,
        status: 'active'),
    _Sub(
        product: 'Face Wash 150ml',
        brand: 'Cetaphil',
        price: 449,
        frequency: 'Every 3 months',
        nextDelivery: 'Sep 20',
        discount: 5,
        status: 'paused'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0.5,
          title: const Text('\u{1F504} Manage Subscriptions',
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textPrimary)),
          iconTheme: const IconThemeData(color: AppTheme.textPrimary)),
      body: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _subs.length,
          itemBuilder: (_, i) {
            final s = _subs[i];
            final discountedPrice = (s.price * (1 - s.discount / 100)).round();
            return Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 8)
                    ],
                    border: Border.all(
                        color: s.status == 'paused'
                            ? const Color(0xFFFBBF24).withValues(alpha: 0.3)
                            : Colors.transparent)),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text(s.product,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16,
                                      color: AppTheme.textPrimary)),
                              Text(s.brand,
                                  style: const TextStyle(
                                      color: AppTheme.textSecondary, fontSize: 13)),
                            ])),
                        Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                                color: s.status == 'active'
                                    ? const Color(0xFFDCFCE7)
                                    : const Color(0xFFFEF9C3),
                                borderRadius: BorderRadius.circular(8)),
                            child: Text(s.status.toUpperCase(),
                                style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 11,
                                    color: s.status == 'active'
                                        ? const Color(0xFF16A34A)
                                        : const Color(0xFFCA8A04)))),
                      ]),
                      const SizedBox(height: 12),
                      Row(children: [
                        Text('\u20B9$discountedPrice',
                            style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 18,
                                color: AppTheme.marketplaceColor)),
                        const SizedBox(width: 8),
                        Text('\u20B9${s.price}',
                            style: const TextStyle(
                                decoration: TextDecoration.lineThrough,
                                color: AppTheme.textMuted,
                                fontSize: 14)),
                        const SizedBox(width: 8),
                        Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(4)),
                            child: Text('${s.discount}% OFF',
                                style: const TextStyle(
                                    color: AppTheme.errorRed,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 11))),
                      ]),
                      const Divider(height: 24),
                      Row(children: [
                        const Icon(Icons.schedule,
                            size: 16, color: AppTheme.textSecondary),
                        const SizedBox(width: 6),
                        Text(s.frequency,
                            style: const TextStyle(
                                color: AppTheme.textSecondary, fontSize: 13)),
                        const Spacer(),
                        const Icon(Icons.local_shipping_outlined,
                            size: 16, color: AppTheme.textSecondary),
                        const SizedBox(width: 6),
                        Text('Next: ${s.nextDelivery}',
                            style: const TextStyle(
                                color: AppTheme.textSecondary, fontSize: 13)),
                      ]),
                      const SizedBox(height: 12),
                      Row(children: [
                        Expanded(
                            child: OutlinedButton(
                                onPressed: () {},
                                style: OutlinedButton.styleFrom(
                                    side: const BorderSide(
                                        color: AppTheme.marketplaceColor),
                                    shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(10))),
                                child: Text(
                                    s.status == 'active' ? 'Pause' : 'Resume',
                                    style: const TextStyle(
                                        color: AppTheme.marketplaceColor)))),
                        const SizedBox(width: 8),
                        Expanded(
                            child: OutlinedButton(
                                onPressed: () {},
                                style: OutlinedButton.styleFrom(
                                    side: const BorderSide(
                                        color: AppTheme.errorRed),
                                    shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(10))),
                                child: const Text('Cancel',
                                    style:
                                        TextStyle(color: AppTheme.errorRed)))),
                        const SizedBox(width: 8),
                        Expanded(
                            child: ElevatedButton(
                                onPressed: () {},
                                style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.marketplaceColor,
                                    shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(10))),
                                child: const Text('Edit',
                                    style: TextStyle(color: Colors.white)))),
                      ]),
                    ]));
          }),
    );
  }
}

class _Sub {
  final String product;
  final String brand;
  final int price;
  final String frequency;
  final String nextDelivery;
  final int discount;
  final String status;
  _Sub(
      {required this.product,
      required this.brand,
      required this.price,
      required this.frequency,
      required this.nextDelivery,
      required this.discount,
      required this.status});
}
