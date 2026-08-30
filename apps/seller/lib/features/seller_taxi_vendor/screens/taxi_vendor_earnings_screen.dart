import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_bloc.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_event.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

class TaxiVendorEarningsScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const TaxiVendorEarningsScreen(
      {super.key, this.order, this.appointment, this.booking});

  @override
  State<TaxiVendorEarningsScreen> createState() =>
      _TaxiVendorEarningsScreenState();
}

class _TaxiVendorEarningsScreenState extends State<TaxiVendorEarningsScreen> {
  static const _taxi = Color(0xFFF59E0B);
  String _period = 'week';

  // Country-specific weekly earnings data
  static const _earningsData = <String, List<double>>{
    'QA': [3200, 4100, 2800, 5600, 4300, 6200, 3800],
    'IN': [12000, 15000, 9500, 18000, 14000, 21000, 11000],
    'AE': [3500, 4500, 3100, 6100, 4700, 6800, 4200],
    'KE': [35000, 42000, 28000, 55000, 43000, 62000, 38000],
    'GB': [1800, 2400, 1600, 3200, 2600, 3800, 2200],
    'US': [2200, 2900, 1900, 4100, 3100, 4700, 2700],
    'SA': [3000, 3800, 2600, 5200, 4000, 5800, 3500],
  };

  static const _tripCounts = <String, List<int>>{
    'QA': [42, 55, 38, 73, 58, 81, 50],
    'IN': [120, 155, 98, 188, 141, 210, 115],
    'AE': [38, 48, 32, 65, 50, 73, 44],
    'KE': [88, 110, 72, 140, 108, 158, 95],
    'GB': [25, 33, 21, 45, 36, 52, 30],
    'US': [30, 40, 26, 57, 43, 65, 38],
    'SA': [40, 52, 35, 70, 54, 79, 47],
  };

  @override
  void initState() {
    super.initState();
    context.read<TaxiVendorBloc>().add(const LoadTaxiVendorEarnings());
  }

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final cc = ss.countryCode;
    final cur = ss.country.currencySymbol;
    final earnings = _earningsData[cc] ?? _earningsData['QA']!;
    final trips = _tripCounts[cc] ?? _tripCounts['QA']!;

    final totalEarnings = earnings.fold(0.0, (a, b) => a + b);
    final totalTrips = trips.fold(0, (a, b) => a + b);
    final avgPerTrip = totalTrips > 0 ? totalEarnings / totalTrips : 0.0;
    final maxBar = earnings.reduce((a, b) => a > b ? a : b) * 1.2;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _taxi,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Fleet Earnings · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Period picker
          _buildPeriodPicker(),
          const SizedBox(height: 16),

          // Hero KPIs
          _buildHeroBanner(cur, totalEarnings, totalTrips, avgPerTrip),
          const SizedBox(height: 16),

          // Weekly earnings bar chart
          _buildBarChart(earnings, trips, cur, maxBar),
          const SizedBox(height: 16),

          // Per-driver earnings breakdown
          _buildDriverBreakdown(context, cur),
          const SizedBox(height: 16),

          // Revenue split
          _buildRevenueSplit(totalEarnings, cur),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // ── Period picker ───────────────────────────────────────────────────────────

  Widget _buildPeriodPicker() {
    final opts = [
      ('week', 'This Week'),
      ('month', 'This Month'),
      ('all', 'All Time')
    ];
    return Row(
        children: opts.map((o) {
      final active = _period == o.$1;
      return Expanded(
          child: GestureDetector(
        onTap: () => setState(() => _period = o.$1),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          margin: const EdgeInsets.symmetric(horizontal: 3),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? _taxi : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: active ? _taxi : SellerTheme.border),
            boxShadow: active
                ? [
                    BoxShadow(
                        color: _taxi.withValues(alpha: 0.2), blurRadius: 8)
                  ]
                : [],
          ),
          child: Text(o.$2,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: active ? Colors.white : SellerTheme.textMuted,
              )),
        ),
      ));
    }).toList());
  }

  // ── Hero banner ─────────────────────────────────────────────────────────────

  Widget _buildHeroBanner(String cur, double total, int trips, double avg) =>
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFF59E0B), Color(0xFFFBBF24)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
                color: _taxi.withValues(alpha: 0.3),
                blurRadius: 16,
                offset: const Offset(0, 6))
          ],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Text('🚕', style: TextStyle(fontSize: 28)),
            const SizedBox(width: 12),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Fleet Revenue',
                  style: TextStyle(color: Colors.white70, fontSize: 12)),
              Text('$cur ${_fmt(total)}',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w900)),
            ]),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(16)),
              child: const Row(children: [
                Icon(Icons.trending_up, color: Colors.white, size: 14),
                SizedBox(width: 4),
                Text('+12.4%',
                    style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12)),
              ]),
            ),
          ]),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
            decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12)),
            child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _heroStat('$trips', 'Total Trips'),
                  Container(height: 24, width: 1, color: Colors.white30),
                  _heroStat('$cur ${avg.toStringAsFixed(0)}', 'Per Trip'),
                  Container(height: 24, width: 1, color: Colors.white30),
                  _heroStat('92%', 'Completion'),
                ]),
          ),
        ]),
      );

  Widget _heroStat(String v, String l) => Column(children: [
        Text(v,
            style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 15)),
        Text(l, style: const TextStyle(color: Colors.white70, fontSize: 10)),
      ]);

  // ── Bar chart ────────────────────────────────────────────────────────────────

  Widget _buildBarChart(
      List<double> earnings, List<int> trips, String cur, double maxY) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: SellerTheme.elevatedCard(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Daily Earnings',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 4),
        Text('$cur values',
            style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11)),
        const SizedBox(height: 16),
        SizedBox(
          height: 160,
          child: BarChart(BarChartData(
            maxY: maxY,
            barGroups: List.generate(
                earnings.length,
                (i) => BarChartGroupData(
                      x: i,
                      barRods: [
                        BarChartRodData(
                          toY: earnings[i],
                          color: i == _peakDay(earnings)
                              ? _taxi
                              : _taxi.withValues(alpha: 0.45),
                          width: 20,
                          borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(6)),
                        )
                      ],
                    )),
            titlesData: FlTitlesData(
              leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 48,
                getTitlesWidget: (v, _) => Text(_fmtAxis(v, cur),
                    style: const TextStyle(
                        color: SellerTheme.textMuted, fontSize: 9)),
              )),
              rightTitles:
                  const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              topTitles:
                  const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (v, _) {
                  final i = v.toInt();
                  if (i < 0 || i >= days.length) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(days[i],
                        style: const TextStyle(
                            fontSize: 10, color: SellerTheme.textMuted)),
                  );
                },
              )),
            ),
            gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                getDrawingHorizontalLine: (_) =>
                    const FlLine(color: SellerTheme.border, strokeWidth: 1)),
            borderData: FlBorderData(show: false),
          )),
        ),
        const SizedBox(height: 10),
        // Trip count row
        Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(
                trips.length,
                (i) => Column(children: [
                      Text('${trips[i]}',
                          style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: SellerTheme.infoBlue)),
                      const Text('trips',
                          style: TextStyle(
                              fontSize: 8, color: SellerTheme.textMuted)),
                    ]))),
      ]),
    );
  }

  int _peakDay(List<double> data) {
    int peak = 0;
    for (int i = 1; i < data.length; i++) {
      if (data[i] > data[peak]) peak = i;
    }
    return peak;
  }

  // ── Per-driver breakdown ────────────────────────────────────────────────────

  Widget _buildDriverBreakdown(BuildContext context, String cur) {
    return BlocBuilder<TaxiVendorBloc, TaxiVendorState>(
      builder: (ctx, ts) {
        if (ts.drivers.isEmpty) return const SizedBox.shrink();
        final top5 = ts.drivers.take(5).toList();
        return Container(
          padding: const EdgeInsets.all(18),
          decoration: SellerTheme.elevatedCard(),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Top Earning Drivers',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 14),
            ...top5.asMap().entries.map((e) {
              final d = e.value;
              final pct = top5.first.todayEarnings == 0
                  ? 0.0
                  : (d.todayEarnings / top5.first.todayEarnings)
                      .clamp(0.0, 1.0);
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: e.key == 0 ? _taxi : _taxi.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                        child: Text('${e.key + 1}',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                                color: e.key == 0 ? Colors.white : _taxi))),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(d.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        Row(children: [
                          Expanded(
                              child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: pct,
                              color: _taxi,
                              backgroundColor: _taxi.withValues(alpha: 0.1),
                              minHeight: 5,
                            ),
                          )),
                          const SizedBox(width: 8),
                          Text('${d.totalTrips} trips',
                              style: const TextStyle(
                                  fontSize: 10, color: SellerTheme.textMuted)),
                        ]),
                      ])),
                  const SizedBox(width: 10),
                  Text('$cur ${d.todayEarnings.toStringAsFixed(0)}',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: _taxi)),
                ]),
              );
            }),
          ]),
        );
      },
    );
  }

  // ── Revenue split pie ───────────────────────────────────────────────────────

  Widget _buildRevenueSplit(double total, String cur) => Container(
        padding: const EdgeInsets.all(18),
        decoration: SellerTheme.elevatedCard(),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Revenue Split',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 16),
          Row(children: [
            SizedBox(
              width: 110,
              height: 110,
              child: PieChart(PieChartData(
                sections: [
                  PieChartSectionData(
                      value: 75,
                      color: _taxi,
                      title: '75%',
                      radius: 48,
                      titleStyle: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12)),
                  PieChartSectionData(
                      value: 15,
                      color: SellerTheme.infoBlue,
                      title: '15%',
                      radius: 44,
                      titleStyle: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 11)),
                  PieChartSectionData(
                      value: 10,
                      color: SellerTheme.textMuted,
                      title: '10%',
                      radius: 40,
                      titleStyle: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 11)),
                ],
                centerSpaceRadius: 18,
                sectionsSpace: 3,
              )),
            ),
            const SizedBox(width: 20),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  _legend(_taxi, 'Driver Payout',
                      '75% · $cur ${_fmt(total * 0.75)}'),
                  const SizedBox(height: 10),
                  _legend(SellerTheme.infoBlue, 'Vendor Commission',
                      '15% · $cur ${_fmt(total * 0.15)}'),
                  const SizedBox(height: 10),
                  _legend(SellerTheme.textMuted, 'Platform Fee',
                      '10% · $cur ${_fmt(total * 0.10)}'),
                ])),
          ]),
        ]),
      );

  Widget _legend(Color c, String label, String value) => Row(children: [
        Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
        const SizedBox(width: 8),
        Expanded(
            child: Text(label,
                style: const TextStyle(
                    fontSize: 11, color: SellerTheme.textSecondary))),
        Text(value,
            style:
                TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: c)),
      ]);

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}K';
    return v.toStringAsFixed(0);
  }

  String _fmtAxis(double v, String cur) {
    if (v >= 1000) return '$cur${(v / 1000).toStringAsFixed(0)}K';
    return '$cur${v.toStringAsFixed(0)}';
  }
}
