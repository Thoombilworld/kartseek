import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Restaurant Inventory / Ingredient Stock Screen.
class RestaurantInventoryScreen extends StatefulWidget {
  const RestaurantInventoryScreen({super.key});
  @override
  State<RestaurantInventoryScreen> createState() => _State();
}

class _State extends State<RestaurantInventoryScreen> {
  final _ingredients = [
    {'name': 'Basmati Rice', 'stock': 5.0, 'unit': 'kg', 'min': 10.0, 'status': 'low'},
    {'name': 'Chicken', 'stock': 12.0, 'unit': 'kg', 'min': 8.0, 'status': 'ok'},
    {'name': 'Paneer', 'stock': 3.0, 'unit': 'kg', 'min': 5.0, 'status': 'low'},
    {'name': 'Onions', 'stock': 20.0, 'unit': 'kg', 'min': 10.0, 'status': 'ok'},
    {'name': 'Cooking Oil', 'stock': 8.0, 'unit': 'L', 'min': 5.0, 'status': 'ok'},
    {'name': 'Yogurt', 'stock': 2.0, 'unit': 'kg', 'min': 4.0, 'status': 'low'},
    {'name': 'Mutton', 'stock': 0.0, 'unit': 'kg', 'min': 5.0, 'status': 'out'},
  ];

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    final low = _ingredients.where((i) => i['status'] == 'low' || i['status'] == 'out').length;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Inventory', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add ingredient'))),
        backgroundColor: c, icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Item', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        if (low > 0) Container(
          padding: const EdgeInsets.all(12), margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.red.withValues(alpha: 0.2))),
          child: Row(children: [
            const Icon(Icons.warning_amber, color: Colors.red, size: 20),
            const SizedBox(width: 8),
            Text('$low items need restocking', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.red)),
          ]),
        ),
        ..._ingredients.map((item) {
          final status = item['status'] as String;
          final color = status == 'out' ? Colors.red : status == 'low' ? Colors.orange : Colors.green;
          final stock = item['stock'] as double;
          final min = item['min'] as double;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: status == 'ok' ? Colors.grey.shade200 : color.withValues(alpha: 0.3))),
            child: Row(children: [
              Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                ClipRRect(borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(value: min > 0 ? (stock / (min * 2)).clamp(0, 1) : 0, backgroundColor: Colors.grey.shade200, valueColor: AlwaysStoppedAnimation(color), minHeight: 4)),
              ])),
              const SizedBox(width: 12),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('${stock.toStringAsFixed(stock == stock.roundToDouble() ? 0 : 1)} ${item['unit']}', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: color)),
                Text(status == 'out' ? 'OUT OF STOCK' : status == 'low' ? 'LOW STOCK' : 'In Stock', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color)),
              ]),
            ]),
          );
        }),
      ]),
    );
  }
}
