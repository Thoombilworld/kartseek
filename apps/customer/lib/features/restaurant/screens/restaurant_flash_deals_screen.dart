import 'package:flutter/material.dart';
import 'package:kartseek_customer/routing/customer_router.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Restaurant — Flash Deals / Happy Hour Deals Screen.
class RestaurantFlashDealsScreen extends StatelessWidget {
  const RestaurantFlashDealsScreen({super.key});
  static const _brandColor = Color(0xFFEA580C);

  @override
  Widget build(BuildContext context) {
    final sym = RegionService.instance.currentCountry.currencySymbol;
    final deals = [
      {'restaurant': 'Pizza Paradise', 'deal': '60% OFF on all Pizzas', 'original': '${sym}800', 'discounted': '${sym}320', 'ends': '2h 15m', 'emoji': '🍕', 'orders': '142'},
      {'restaurant': 'The Grand Biryani House', 'deal': 'Buy 1 Get 1 on Biryani', 'original': '${sym}640', 'discounted': '${sym}320', 'ends': '1h 30m', 'emoji': '🍛', 'orders': '89'},
      {'restaurant': 'Burger Barn', 'deal': 'Combo Meal at ${sym}199', 'original': '${sym}450', 'discounted': '${sym}199', 'ends': '45m', 'emoji': '🍔', 'orders': '67'},
      {'restaurant': 'Sushi Master', 'deal': '40% OFF Sushi Platters', 'original': '${sym}1,200', 'discounted': '${sym}720', 'ends': '3h 00m', 'emoji': '🍣', 'orders': '34'},
      {'restaurant': 'Thai Orchid', 'deal': 'Free Dessert with meals above ${sym}500', 'original': '${sym}500', 'discounted': '${sym}500', 'ends': '5h 00m', 'emoji': '🍜', 'orders': '56'},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Flash Deals ⚡', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Hero banner
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFFEA580C), Color(0xFFF97316), Color(0xFFFBBF24)]),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('⚡ HAPPY HOUR', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 1)),
            SizedBox(height: 4),
            Text('Limited-time deals from your favorite restaurants', style: TextStyle(color: Colors.white70, fontSize: 13)),
          ]),
        ),
        const SizedBox(height: 16),
        ...deals.map((d) => GestureDetector(
          onTap: () => Navigator.pushNamed(context, CustomerRouter.restaurantDetail, arguments: d['restaurant']),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: _brandColor.withValues(alpha: 0.2))),
            child: Column(children: [
              // Deal header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(color: _brandColor.withValues(alpha: 0.05), borderRadius: const BorderRadius.vertical(top: Radius.circular(13))),
                child: Row(children: [
                  Text(d['emoji']!, style: const TextStyle(fontSize: 24)),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(d['restaurant']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                    Text(d['deal']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _brandColor)),
                  ])),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.timer, size: 12, color: Colors.red),
                      const SizedBox(width: 3),
                      Text(d['ends']!, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.red)),
                    ]),
                  ),
                ]),
              ),
              // Deal footer
              Padding(
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  Text(d['original']!, style: TextStyle(fontSize: 12, decoration: TextDecoration.lineThrough, color: Colors.grey.shade400)),
                  const SizedBox(width: 6),
                  Text(d['discounted']!, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: _brandColor)),
                  const Spacer(),
                  Text('${d['orders']} ordered', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: _brandColor, borderRadius: BorderRadius.circular(8)),
                    child: const Text('ORDER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
                  ),
                ]),
              ),
            ]),
          ),
        )),
      ]),
    );
  }
}
