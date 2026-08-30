import 'dart:async';
import 'package:flutter/material.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Grocery Flash Deals Screen — Limited time offers with countdown timers.
class GroceryFlashDealsScreen extends StatefulWidget {
  const GroceryFlashDealsScreen({super.key});
  @override
  State<GroceryFlashDealsScreen> createState() => _GroceryFlashDealsScreenState();
}

class _GroceryFlashDealsScreenState extends State<GroceryFlashDealsScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  late Timer _timer;
  int _secondsLeft = 3 * 3600; // 3 hours

  static const _deals = [
    {'name': 'Fresh Bananas', 'price': 49, 'mrp': 79, 'emoji': '🍌', 'store': 'FreshMart'},
    {'name': 'Organic Tomatoes', 'price': 45, 'mrp': 80, 'emoji': '🍅', 'store': 'Green Basket'},
    {'name': 'Amul Butter 500g', 'price': 199, 'mrp': 275, 'emoji': '🧈', 'store': 'D-Mart'},
    {'name': 'Chicken Breast 500g', 'price': 195, 'mrp': 280, 'emoji': '🍗', 'store': 'Fresh N Easy'},
    {'name': 'Basmati Rice 5kg', 'price': 349, 'mrp': 499, 'emoji': '🍚', 'store': 'FreshMart'},
    {'name': 'Full Cream Milk 1L', 'price': 52, 'mrp': 68, 'emoji': '🥛', 'store': 'D-Mart'},
    {'name': 'Red Onions 1kg', 'price': 25, 'mrp': 45, 'emoji': '🧅', 'store': 'Green Basket'},
    {'name': 'Whole Wheat Bread', 'price': 35, 'mrp': 50, 'emoji': '🍞', 'store': 'FreshMart'},
  ];

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_secondsLeft > 0) setState(() => _secondsLeft--);
    });
  }

  @override
  void dispose() { _timer.cancel(); super.dispose(); }

  String _formatTime(int s) {
    final h = s ~/ 3600;
    final m = (s % 3600) ~/ 60;
    final sec = s % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // Hero App Bar
          SliverAppBar(
            expandedHeight: 160,
            pinned: true,
            backgroundColor: const Color(0xFFE65100),
            surfaceTintColor: Colors.transparent,
            leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [Color(0xFFE65100), Color(0xFFFF6D00)]),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 50, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.flash_on, color: Colors.yellow, size: 28),
                            SizedBox(width: 8),
                            Text('Flash Deals', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        // Countdown
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.timer, color: Colors.white, size: 16),
                              const SizedBox(width: 6),
                              Text('Ends in ${_formatTime(_secondsLeft)}',
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()])),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Deal Cards Grid
          SliverPadding(
            padding: const EdgeInsets.all(12),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 0.72,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, i) {
                  final deal = _deals[i];
                  final price = deal['price'] as int;
                  final mrp = deal['mrp'] as int;
                  final discount = ((mrp - price) / mrp * 100).round();

                  return Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.grey.shade200),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Image + Discount badge
                        Stack(
                          children: [
                            Container(
                              height: 100,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                              ),
                              child: Center(child: Text(deal['emoji'] as String, style: const TextStyle(fontSize: 48))),
                            ),
                            Positioned(
                              top: 8,
                              left: 8,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(6)),
                                child: Text('$discount% OFF', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800)),
                              ),
                            ),
                          ],
                        ),

                        // Info
                        Padding(
                          padding: const EdgeInsets.all(10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(deal['store'] as String, style: const TextStyle(fontSize: 9, color: _groceryColor, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 2),
                              Text(deal['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700), maxLines: 2, overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Text('$currency$price', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
                                  const SizedBox(width: 6),
                                  Text('$currency$mrp', style: TextStyle(fontSize: 11, color: Colors.grey.shade400, decoration: TextDecoration.lineThrough)),
                                ],
                              ),
                              const SizedBox(height: 8),
                              SizedBox(
                                width: double.infinity,
                                height: 32,
                                child: ElevatedButton(
                                  onPressed: () => Navigator.pushNamed(context, CustomerRouter.groceryNotifications),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: _groceryColor,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                    elevation: 0,
                                  ),
                                  child: const Text('ADD'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
                childCount: _deals.length,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
