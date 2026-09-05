import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Restaurant Sales Analytics Screen.
class RestaurantSalesAnalyticsScreen extends StatelessWidget {
  const RestaurantSalesAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = SellerTheme.restaurant;
    final sym = RegionService.instance.currentCountry.currencySymbol;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: c, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Sales Analytics', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // KPI cards
        Row(children: [
          _kpiCard('Revenue', '${sym}38.4K', '+12%', Icons.trending_up, Colors.green, c),
          const SizedBox(width: 10),
          _kpiCard('Orders', '42', '+8%', Icons.receipt_long, Colors.green, Colors.blue),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          _kpiCard('Avg Order', '${sym}914', '+3%', Icons.shopping_basket, Colors.green, Colors.purple),
          const SizedBox(width: 10),
          _kpiCard('Cancellation', '2.4%', '-0.5%', Icons.cancel, Colors.green, Colors.red),
        ]),
        const SizedBox(height: 16),
        // Revenue chart placeholder
        Container(
          height: 200, padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Weekly Revenue', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            Expanded(child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              for (var d in [0.4, 0.6, 0.8, 1.0, 0.7, 0.9, 0.85]) ...[
                Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                  Container(height: 100 * d, decoration: BoxDecoration(color: c.withValues(alpha: d), borderRadius: BorderRadius.circular(4))),
                  const SizedBox(height: 4),
                  Text(['M', 'T', 'W', 'T', 'F', 'S', 'S'][[0.4, 0.6, 0.8, 1.0, 0.7, 0.9, 0.85].indexOf(d)], style: TextStyle(fontSize: 9, color: Colors.grey.shade500)),
                ])),
                if (d != 0.85) const SizedBox(width: 6),
              ],
            ])),
          ]),
        ),
        const SizedBox(height: 16),
        // Order type breakdown
        const Text('Order Distribution', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Column(children: [
            _distRow('Delivery', '58%', 0.58, c),
            const SizedBox(height: 10),
            _distRow('Dine-In', '29%', 0.29, Colors.blue),
            const SizedBox(height: 10),
            _distRow('Takeaway', '13%', 0.13, Colors.green),
          ]),
        ),
        const SizedBox(height: 16),
        // Peak hours
        const Text('Peak Hours', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Column(children: [
            _peakRow('12:00 – 14:00', '🔥 Lunch Rush', '38%', c),
            const SizedBox(height: 8),
            _peakRow('19:00 – 21:00', '🌙 Dinner Peak', '45%', Colors.blue),
            const SizedBox(height: 8),
            _peakRow('15:00 – 17:00', '☕ Snack Time', '17%', Colors.green),
          ]),
        ),
      ]),
    );
  }

  Widget _kpiCard(String label, String value, String change, IconData icon, Color changeColor, Color accent) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Icon(icon, size: 16, color: changeColor), const SizedBox(width: 4), Text(change, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: changeColor))]),
        const SizedBox(height: 6),
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: accent)),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
      ]),
    ),
  );

  Widget _distRow(String label, String pct, double val, Color col) => Row(children: [
    Container(width: 10, height: 10, decoration: BoxDecoration(color: col, borderRadius: BorderRadius.circular(2))),
    const SizedBox(width: 8),
    Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
    const Spacer(),
    Text(pct, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: col)),
    const SizedBox(width: 8),
    SizedBox(width: 80, child: ClipRRect(borderRadius: BorderRadius.circular(2), child: LinearProgressIndicator(value: val, backgroundColor: Colors.grey.shade200, valueColor: AlwaysStoppedAnimation(col), minHeight: 6))),
  ]);

  Widget _peakRow(String time, String label, String pct, Color col) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(color: col.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(8)),
    child: Row(children: [
      Text(label, style: const TextStyle(fontSize: 12)),
      const Spacer(),
      Text(time, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: col)),
      const SizedBox(width: 8),
      Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: col.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(4)),
        child: Text(pct, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: col))),
    ]),
  );
}
