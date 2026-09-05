import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Restaurant Seller Earnings Screen.
class RestaurantSellerEarningsScreen extends StatelessWidget {
  const RestaurantSellerEarningsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    final sym = RegionService.instance.currentCountry.currencySymbol;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Earnings', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(gradient: LinearGradient(colors: [c, c.withValues(alpha: 0.8)]), borderRadius: BorderRadius.circular(16)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Today\'s Revenue', style: TextStyle(color: Colors.white70, fontSize: 12)),
            Text('${sym}38,400', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Row(children: [
              _chip('42 orders'), const SizedBox(width: 8), _chip('${sym}914 avg'),
            ]),
          ]),
        ),
        const SizedBox(height: 16),
        Row(children: [
          _statBox('This Week', '${sym}185,200', Icons.calendar_today, c),
          const SizedBox(width: 10),
          _statBox('This Month', '${sym}742,800', Icons.date_range, Colors.blue),
        ]),
        const SizedBox(height: 16),
        const Text('Revenue Breakdown', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        _breakdownRow('Delivery Orders', '${sym}22,500', 0.58, c),
        _breakdownRow('Dine-In', '${sym}11,200', 0.29, Colors.blue),
        _breakdownRow('Takeaway', '${sym}4,700', 0.13, Colors.green),
        const SizedBox(height: 16),
        const Text('Top Selling Items', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        _topItem('🍛', 'Chicken Biryani', '128 orders', '${sym}40,960'),
        _topItem('🥘', 'Paneer Tikka', '89 orders', '${sym}24,920'),
        _topItem('🍲', 'Mutton Biryani', '67 orders', '${sym}28,140'),
      ]),
    );
  }

  Widget _chip(String t) => Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
    child: Text(t, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)));

  Widget _statBox(String label, String value, IconData icon, Color col) => Expanded(child: Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, size: 18, color: col),
      const SizedBox(height: 8),
      Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
      Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: col)),
    ]),
  ));

  Widget _breakdownRow(String label, String value, double pct, Color col) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          ClipRRect(borderRadius: BorderRadius.circular(2), child: LinearProgressIndicator(value: pct, backgroundColor: Colors.grey.shade200, valueColor: AlwaysStoppedAnimation(col), minHeight: 6)),
        ])),
        const SizedBox(width: 12),
        Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: col)),
      ]),
    ),
  );

  Widget _topItem(String emoji, String name, String orders, String revenue) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
    child: Row(children: [
      Text(emoji, style: const TextStyle(fontSize: 28)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
        Text(orders, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
      ])),
      Text(revenue, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
    ]),
  );
}
