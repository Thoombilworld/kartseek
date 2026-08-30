import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Restaurant — Gift Cards Screen.
class RestaurantGiftCardsScreen extends StatefulWidget {
  const RestaurantGiftCardsScreen({super.key});
  @override
  State<RestaurantGiftCardsScreen> createState() => _RestaurantGiftCardsScreenState();
}

class _RestaurantGiftCardsScreenState extends State<RestaurantGiftCardsScreen> {
  static const _brandColor = Color(0xFFEA580C);
  int _selectedAmount = 1;
  final _amounts = [500, 1000, 2000, 5000];

  final _myCards = [
    {'balance': 750, 'code': 'GC-FOOD-4821', 'expiry': 'Dec 2026'},
    {'balance': 200, 'code': 'GC-FOOD-9103', 'expiry': 'Mar 2027'},
  ];

  String get _sym => RegionService.instance.currentCountry.currencySymbol;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Gift Cards', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Hero card
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFFEA580C), Color(0xFFF97316)]),
            borderRadius: BorderRadius.circular(18),
          ),
          child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(Icons.card_giftcard, color: Colors.white, size: 28),
              SizedBox(width: 10),
              Text('KARTSEEK Food', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
            ]),
            SizedBox(height: 16),
            Text('Gift someone a delicious meal', style: TextStyle(color: Colors.white70, fontSize: 13)),
            SizedBox(height: 8),
            Text('🍕🍔🍣🥗🍰', style: TextStyle(fontSize: 24)),
          ]),
        ),
        const SizedBox(height: 20),
        const Text('Select Amount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        Wrap(spacing: 10, runSpacing: 10, children: List.generate(_amounts.length, (i) {
          final isSelected = i == _selectedAmount;
          return GestureDetector(
            onTap: () => setState(() => _selectedAmount = i),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: isSelected ? _brandColor : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: isSelected ? _brandColor : Colors.grey.shade200),
              ),
              child: Text('$_sym${_amounts[i]}', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: isSelected ? Colors.white : Colors.black87)),
            ),
          );
        })),
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, height: 48, child: ElevatedButton(
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('\ud83c\udf81 Gift card worth $_sym${_amounts[_selectedAmount]} purchased!'), backgroundColor: _brandColor, behavior: SnackBarBehavior.floating)),
          style: ElevatedButton.styleFrom(backgroundColor: _brandColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
          child: const Text('Buy Gift Card', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        )),
        const SizedBox(height: 24),
        Text('MY GIFT CARDS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey.shade500, letterSpacing: 1)),
        const SizedBox(height: 10),
        ..._myCards.map((c) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: _brandColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.card_giftcard, color: _brandColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(c['code'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
              const SizedBox(height: 2),
              Text('Expires: ${c['expiry']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
            ])),
            Text('$_sym${c['balance']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: _brandColor)),
          ]),
        )),
      ]),
    );
  }
}
