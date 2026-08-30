import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Restaurant Customer Insights Screen.
class RestaurantCustomerInsightsScreen extends StatelessWidget {
  const RestaurantCustomerInsightsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    final customers = [
      {'name': 'Sarah K.', 'orders': 24, 'spent': 'KES 22,800', 'last': '2 days ago', 'fav': 'Chicken Biryani'},
      {'name': 'John M.', 'orders': 18, 'spent': 'KES 16,400', 'last': '5 days ago', 'fav': 'Mutton Biryani'},
      {'name': 'Priya S.', 'orders': 15, 'spent': 'KES 12,600', 'last': '1 week ago', 'fav': 'Paneer Tikka'},
      {'name': 'David L.', 'orders': 12, 'spent': 'KES 9,200', 'last': '3 days ago', 'fav': 'Veg Biryani'},
    ];
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Customer Insights', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Row(children: [
          _statCard('Total', '1,284', Icons.people, c),
          const SizedBox(width: 10),
          _statCard('Repeat', '342', Icons.replay, Colors.blue),
          const SizedBox(width: 10),
          _statCard('New (7d)', '67', Icons.person_add, Colors.green),
        ]),
        const SizedBox(height: 16),
        const Text('TOP CUSTOMERS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1, color: Colors.grey)),
        const SizedBox(height: 10),
        ...customers.map((cust) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Row(children: [
            CircleAvatar(radius: 20, backgroundColor: c.withValues(alpha: 0.1), child: Text((cust['name'] as String)[0], style: TextStyle(fontWeight: FontWeight.w800, color: c, fontSize: 16))),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(cust['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
              Text('${cust['orders']} orders • Loves ${cust['fav']}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              Text('Last order: ${cust['last']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
            ])),
            Text(cust['spent'] as String, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: c)),
          ]),
        )),
      ]),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color col) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
      child: Column(children: [
        Icon(icon, color: col, size: 22),
        const SizedBox(height: 6),
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: col)),
        Text(label, style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
      ]),
    ),
  );
}
