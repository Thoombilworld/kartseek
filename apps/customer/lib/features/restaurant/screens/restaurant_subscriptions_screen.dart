import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Restaurant — Meal Plan Subscriptions Screen.
class RestaurantSubscriptionsScreen extends StatelessWidget {
  const RestaurantSubscriptionsScreen({super.key});
  static const _brandColor = Color(0xFFEA580C);

  @override
  Widget build(BuildContext context) {
    final sym = RegionService.instance.currentCountry.currencySymbol;
    final plans = [
      {'name': 'Lunch Plan', 'meals': '20 meals/month', 'price': '${sym}4,500', 'save': '25%', 'icon': Icons.lunch_dining, 'color': 0xFFEA580C},
      {'name': 'Dinner Plan', 'meals': '20 meals/month', 'price': '${sym}5,200', 'save': '20%', 'icon': Icons.dinner_dining, 'color': 0xFF2563EB},
      {'name': 'Full Day Plan', 'meals': '60 meals/month', 'price': '${sym}12,000', 'save': '35%', 'icon': Icons.restaurant, 'color': 0xFF16A34A},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Meal Subscriptions', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Active subscription
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFFEA580C), Color(0xFFF97316)]),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Row(children: [
              Icon(Icons.card_membership, color: Colors.white, size: 22),
              SizedBox(width: 8),
              Text('Active Plan', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800)),
            ]),
            const SizedBox(height: 12),
            const Text('Lunch Plan — 14 meals remaining', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            Text('Renews on Jul 28, 2026', style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12)),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(value: 0.3, backgroundColor: Colors.white.withValues(alpha: 0.2), valueColor: const AlwaysStoppedAnimation(Colors.white), minHeight: 6),
            ),
          ]),
        ),
        const SizedBox(height: 20),
        const Text('Available Plans', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        ...plans.map((p) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Row(children: [
            Container(
              width: 48, height: 48,
              decoration: BoxDecoration(color: Color(p['color'] as int).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
              child: Icon(p['icon'] as IconData, color: Color(p['color'] as int), size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(p['name'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              Text(p['meals'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(p['price'] as String, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: _brandColor)),
              const SizedBox(height: 2),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                child: Text('Save ${p['save']}', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.green)),
              ),
            ]),
          ]),
        )),
      ]),
    );
  }
}
