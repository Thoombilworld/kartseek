import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

class MarketplaceBrandAnalyticsScreen extends StatefulWidget {
  final Map<String, dynamic> brandData;
  const MarketplaceBrandAnalyticsScreen({super.key, required this.brandData});

  @override
  State<MarketplaceBrandAnalyticsScreen> createState() => _MarketplaceBrandAnalyticsScreenState();
}

class _MarketplaceBrandAnalyticsScreenState extends State<MarketplaceBrandAnalyticsScreen> {
  static const _mp = Color(0xFF6C3FC8);
  String _period = '7d';

  @override
  Widget build(BuildContext context) {
    final brand = widget.brandData;
    final name = brand['name'] ?? 'Brand';
    final logo = brand['logo'] ?? '🔷';

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('$logo $name Analytics', style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildPeriodPicker(),
          const SizedBox(height: 16),
          _buildHeroBanner(),
          const SizedBox(height: 16),
          _buildKpiGrid(),
          const SizedBox(height: 16),
          _buildRevenueChart(),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildPeriodPicker() {
    final periods = [('7d', 'This Week'), ('30d', 'This Month'), ('90d', 'Last 3 Months')];
    return Row(
      children: periods.map((p) {
        final active = _period == p.$1;
        return Expanded(child: GestureDetector(
          onTap: () => setState(() => _period = p.$1),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            margin: const EdgeInsets.symmetric(horizontal: 3),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: active ? _mp : Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: active ? _mp : SellerTheme.border),
              boxShadow: active ? [BoxShadow(color: _mp.withValues(alpha: 0.2), blurRadius: 8, offset: const Offset(0, 3))] : [],
            ),
            child: Text(p.$2, textAlign: TextAlign.center, style: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w600,
              color: active ? Colors.white : SellerTheme.textMuted,
            )),
          ),
        ));
      }).toList(),
    );
  }

  Widget _buildHeroBanner() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6C3FC8), Color(0xFF9B59F5)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: _mp.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('📈', style: TextStyle(fontSize: 28)),
          const SizedBox(width: 12),
          const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Brand Revenue', style: TextStyle(color: Colors.white70, fontSize: 12)),
            Text('QAR 12,450', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
          ]),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(children: [
              Icon(Icons.trending_up, color: Color(0xFF4ADE80), size: 16),
              SizedBox(width: 4),
              Text('+12.5%', style: TextStyle(color: Color(0xFF4ADE80), fontSize: 12, fontWeight: FontWeight.bold)),
            ]),
          ),
        ]),
      ]),
    );
  }

  Widget _buildKpiGrid() {
    final items = [
      ('Store Views', '3,412', Icons.visibility_outlined, SellerTheme.infoBlue),
      ('Conversion', '4.2%', Icons.shopping_bag_outlined, SellerTheme.successGreen),
      ('Units Sold', '145', Icons.inventory_2_outlined, _mp),
      ('Return Rate', '1.1%', Icons.assignment_return_outlined, SellerTheme.warningAmber),
    ];
    return GridView.count(
      crossAxisCount: 2, shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10, crossAxisSpacing: 10,
      childAspectRatio: 2.0,
      children: items.map((item) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: SellerTheme.border),
          boxShadow: [BoxShadow(color: item.$4.withValues(alpha: 0.06), blurRadius: 8)],
        ),
        child: Row(children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: item.$4.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(item.$3, color: item.$4, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(item.$2, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: item.$4)),
            Text(item.$1, style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
          ])),
        ]),
      )).toList(),
    );
  }

  Widget _buildRevenueChart() {
    final data = [400.0, 300.0, 500.0, 700.0, 600.0, 900.0, 1100.0];
    final labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: SellerTheme.elevatedCard(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Sales Trend', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 16),
        SizedBox(
          height: 160,
          child: LineChart(LineChartData(
            minY: 0, maxY: 1200,
            gridData: FlGridData(
              show: true, drawVerticalLine: false,
              horizontalInterval: 300,
              getDrawingHorizontalLine: (_) => const FlLine(color: SellerTheme.border, strokeWidth: 1),
            ),
            titlesData: FlTitlesData(
              leftTitles: AxisTitles(sideTitles: SideTitles(
                showTitles: true, reservedSize: 32,
                getTitlesWidget: (v, _) => Text(v.toInt().toString(),
                    style: const TextStyle(color: SellerTheme.textMuted, fontSize: 9)),
              )),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              topTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              bottomTitles: AxisTitles(sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (v, _) {
                  final idx = v.toInt();
                  if (idx < 0 || idx >= labels.length) return const SizedBox.shrink();
                  return Text(labels[idx], style: const TextStyle(color: SellerTheme.textMuted, fontSize: 10));
                },
              )),
            ),
            borderData: FlBorderData(show: false),
            lineBarsData: [
              LineChartBarData(
                spots: List.generate(data.length, (i) => FlSpot(i.toDouble(), data[i])),
                isCurved: true, color: _mp, barWidth: 3,
                dotData: const FlDotData(show: false),
                belowBarData: BarAreaData(show: true, color: _mp.withValues(alpha: 0.07)),
              ),
            ],
          )),
        ),
      ]),
    );
  }
}
