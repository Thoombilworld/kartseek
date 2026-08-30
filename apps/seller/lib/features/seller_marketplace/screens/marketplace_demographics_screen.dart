import 'package:flutter/material.dart';

/// Seller Demographics — Customer analytics showing age, gender, location, device breakdown.
class MarketplaceDemographicsScreen extends StatelessWidget {
  const MarketplaceDemographicsScreen({super.key});
  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final ageGroups = [
      const _AgeGroup(
          range: '18-24', pct: 22, count: 3520, color: Color(0xFF6366F1)),
      const _AgeGroup(
          range: '25-34', pct: 38, count: 6080, color: Color(0xFF8B5CF6)),
      const _AgeGroup(
          range: '35-44', pct: 22, count: 3520, color: Color(0xFFA78BFA)),
      const _AgeGroup(
          range: '45-54', pct: 12, count: 1920, color: Color(0xFF3B82F6)),
      const _AgeGroup(
          range: '55+', pct: 6, count: 960, color: Color(0xFFF59E0B)),
    ];
    final topCities = [
      const _CityData(name: 'Mumbai', orders: 3200, revenue: 1250000),
      const _CityData(name: 'Delhi', orders: 2800, revenue: 1080000),
      const _CityData(name: 'Bangalore', orders: 2100, revenue: 920000),
      const _CityData(name: 'Hyderabad', orders: 1500, revenue: 650000),
      const _CityData(name: 'Pune', orders: 1200, revenue: 480000),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF5F3FF),
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('Customer Demographics',
            style: TextStyle(fontWeight: FontWeight.w800)),
        elevation: 0,
      ),
      body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            // Age Distribution
            _card(
              title: 'Age Distribution',
              child: Column(
                  children: ageGroups
                      .map((ag) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Row(children: [
                              SizedBox(
                                  width: 44,
                                  child: Text(ag.range,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13))),
                              const SizedBox(width: 10),
                              Expanded(
                                  child: Stack(children: [
                                Container(
                                    height: 20,
                                    decoration: BoxDecoration(
                                        color: const Color(0xFFF3F4F6),
                                        borderRadius:
                                            BorderRadius.circular(4))),
                                FractionallySizedBox(
                                    widthFactor: ag.pct / 100,
                                    child: Container(
                                        height: 20,
                                        decoration: BoxDecoration(
                                            color: ag.color,
                                            borderRadius:
                                                BorderRadius.circular(4)))),
                              ])),
                              const SizedBox(width: 10),
                              SizedBox(
                                  width: 40,
                                  child: Text('${ag.pct}%',
                                      style: TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 13,
                                          color: ag.color),
                                      textAlign: TextAlign.right)),
                            ]),
                          ))
                      .toList()),
            ),

            // Gender Split
            _card(
              title: 'Gender Split',
              child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _genderCircle('Male', 58, const Color(0xFF3B82F6)),
                    _genderCircle('Female', 38, const Color(0xFFEC4899)),
                    _genderCircle('Other', 4, const Color(0xFF8B5CF6)),
                  ]),
            ),

            // Top Cities
            _card(
              title: 'Top Cities',
              child: Column(
                  children: topCities.asMap().entries.map((e) {
                final i = e.key;
                final city = e.value;
                final medal = i == 0
                    ? '🥇'
                    : i == 1
                        ? '🥈'
                        : i == 2
                            ? '🥉'
                            : '  ';
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(10)),
                  child: Row(children: [
                    Text(medal, style: const TextStyle(fontSize: 18)),
                    const SizedBox(width: 8),
                    Expanded(
                        child: Text(city.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14))),
                    Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                              '₹${(city.revenue / 100000).toStringAsFixed(1)}L',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF10B981),
                                  fontSize: 13)),
                          Text('${city.orders} orders',
                              style: const TextStyle(
                                  color: Color(0xFF9CA3AF), fontSize: 11)),
                        ]),
                  ]),
                );
              }).toList()),
            ),

            // Device Usage
            _card(
              title: 'Device Usage',
              child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _deviceChip('📱 Mobile', '62%', const Color(0xFF6366F1)),
                    _deviceChip('💻 Desktop', '25%', const Color(0xFF8B5CF6)),
                    _deviceChip('📱 Web', '8%', const Color(0xFF3B82F6)),
                    _deviceChip('📋 Tablet', '5%', const Color(0xFFF59E0B)),
                  ]),
            ),
          ])),
    );
  }

  Widget _card({required String title, required Widget child}) => Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE5E7EB))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: Color(0xFF1F2937))),
          const SizedBox(height: 14),
          child,
        ]),
      );

  Widget _genderCircle(String label, int pct, Color color) => Column(children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
          child: Center(
              child: Text('$pct%',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: color))),
        ),
        const SizedBox(height: 4),
        Text(label,
            style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
      ]);

  Widget _deviceChip(String label, String pct, Color color) =>
      Column(children: [
        Text(pct,
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.w900, color: color)),
        const SizedBox(height: 2),
        Text(label,
            style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280))),
      ]);
}

class _AgeGroup {
  final String range;
  final int pct, count;
  final Color color;
  const _AgeGroup(
      {required this.range,
      required this.pct,
      required this.count,
      required this.color});
}

class _CityData {
  final String name;
  final int orders, revenue;
  const _CityData(
      {required this.name, required this.orders, required this.revenue});
}
