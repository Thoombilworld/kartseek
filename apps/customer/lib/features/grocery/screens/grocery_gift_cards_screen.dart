import 'package:flutter/material.dart';
import 'package:kartseek_customer/routing/customer_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Gift Cards Screen — Buy & redeem gift cards.
class GroceryGiftCardsScreen extends StatefulWidget {
  const GroceryGiftCardsScreen({super.key});
  @override
  State<GroceryGiftCardsScreen> createState() => _GroceryGiftCardsScreenState();
}

class _GroceryGiftCardsScreenState extends State<GroceryGiftCardsScreen> {
  final _codeController = TextEditingController();
  int? _selectedAmount;

  static const _amounts = [250, 500, 1000, 2000, 5000];
  static const _designs = [
    {'name': 'Fresh Green', 'colors': [0xFF4CAF50, 0xFF00897B], 'emoji': '🥬'},
    {'name': 'Fruit Basket', 'colors': [0xFFFF9800, 0xFFE53935], 'emoji': '🍎'},
    {'name': 'Premium', 'colors': [0xFF7B1FA2, 0xFF4A148C], 'emoji': '✨'},
  ];

  @override
  void dispose() { _codeController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: const Color(0xFF7B1FA2), surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Gift Cards', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Redeem
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [
              Expanded(child: TextField(
                controller: _codeController,
                decoration: InputDecoration(hintText: 'Enter gift card code', hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400), border: InputBorder.none),
                style: const TextStyle(fontSize: 13, fontFamily: 'monospace', fontWeight: FontWeight.w700),
              )),
              ElevatedButton(onPressed: () => Navigator.pushNamed(context, CustomerRouter.groceryOrderHistory), style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7B1FA2), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                child: const Text('Redeem', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12))),
            ]),
          ),
          const SizedBox(height: 20),

          // Card designs
          const Text('Buy a Gift Card', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          SizedBox(
            height: 140,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _designs.length,
              itemBuilder: (context, i) {
                final d = _designs[i];
                final colors = d['colors'] as List<int>;
                return Container(
                  width: 220,
                  margin: const EdgeInsets.only(right: 10),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [Color(colors[0]), Color(colors[1])]),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      const Text('KARTSEEK', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900)),
                      Text(d['emoji'] as String, style: const TextStyle(fontSize: 28)),
                    ]),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(d['name'] as String, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
                      const Text('Gift Card', style: TextStyle(color: Colors.white70, fontSize: 11)),
                    ]),
                  ]),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          // Amount selector
          const Text('Select Amount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: _amounts.map((a) => GestureDetector(
            onTap: () => setState(() => _selectedAmount = a),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: _selectedAmount == a ? const Color(0xFF7B1FA2) : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _selectedAmount == a ? const Color(0xFF7B1FA2) : Colors.grey.shade300),
              ),
              child: Text('${RegionService.instance.currentCountry.currencySymbol} $a', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: _selectedAmount == a ? Colors.white : Colors.grey.shade700)),
            ),
          )).toList()),

          if (_selectedAmount != null) ...[
            const SizedBox(height: 20),
            SizedBox(width: double.infinity, height: 50, child: ElevatedButton(
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Processing gift card purchase for ${RegionService.instance.currentCountry.currencySymbol} $_selectedAmount...'))),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7B1FA2), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
              child: Text('Buy Gift Card — ${RegionService.instance.currentCountry.currencySymbol} $_selectedAmount', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
            )),
          ],

          // My cards
          const SizedBox(height: 24),
          const Text('My Gift Cards', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('KART-XXXX-7891', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                Text('Expires Dec 2026', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('${RegionService.instance.currentCountry.currencySymbol} 350', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                Text('of ${RegionService.instance.currentCountry.currencySymbol} 500', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
              ]),
            ]),
          ),
        ],
      ),
    );
  }
}
