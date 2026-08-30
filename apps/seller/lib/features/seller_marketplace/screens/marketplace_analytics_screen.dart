import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_event.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

class MarketplaceAnalyticsScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const MarketplaceAnalyticsScreen({super.key, this.order, this.appointment, this.booking});

  @override
  State<MarketplaceAnalyticsScreen> createState() => _MarketplaceAnalyticsScreenState();
}

class _MarketplaceAnalyticsScreenState extends State<MarketplaceAnalyticsScreen> {
  static const _mp = Color(0xFF6C3FC8);
  String _period = '7d';

  @override
  void initState() {
    super.initState();
    final cc = context.read<SellerBloc>().state.countryCode;
    context.read<MarketplaceSellerBloc>().add(LoadMarketplaceAnalytics(period: _period, countryCode: cc));
  }

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Analytics · ${ss.country.flag}', style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<MarketplaceSellerBloc>()
                .add(LoadMarketplaceAnalytics(period: _period, countryCode: ss.countryCode)),
          ),
        ],
      ),
      body: BlocBuilder<MarketplaceSellerBloc, MarketplaceSellerState>(
        builder: (ctx, ms) {
          if (ms.status == MarketplaceBlocStatus.loading || ms.analytics == null) {
            return const Center(child: CircularProgressIndicator(color: _mp));
          }
          final a   = ms.analytics!;
          final cur = ss.country.currencySymbol;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Period picker
              _buildPeriodPicker(ss.countryCode),
              const SizedBox(height: 16),
              // Hero KPI banner
              _buildHeroBanner(a, cur, ss.country.name),
              const SizedBox(height: 16),
              // KPI grid
              _buildKpiGrid(a, cur),
              const SizedBox(height: 16),
              // Revenue chart
              _buildRevenueChart(a, cur),
              const SizedBox(height: 16),
              // Customer breakdown
              _buildCustomerChart(a),
              const SizedBox(height: 16),
              // Top products
              _buildTopProducts(ms, cur),
              const SizedBox(height: 40),
            ],
          );
        },
      ),
    );
  }

  // ── Period picker ─────────────────────────────────────────────────────────

  Widget _buildPeriodPicker(String cc) {
    final periods = [('7d', 'This Week'), ('30d', 'This Month'), ('90d', 'Last 3 Months')];
    return Row(
      children: periods.map((p) {
        final active = _period == p.$1;
        return Expanded(child: GestureDetector(
          onTap: () {
            setState(() => _period = p.$1);
            context.read<MarketplaceSellerBloc>()
                .add(LoadMarketplaceAnalytics(period: p.$1, countryCode: cc));
          },
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

  // ── Hero banner ───────────────────────────────────────────────────────────

  Widget _buildHeroBanner(MarketplaceAnalytics a, String cur, String country) {
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
          const Text('🛍️', style: TextStyle(fontSize: 28)),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Total Revenue', style: TextStyle(color: Colors.white70, fontSize: 12)),
            Text('$cur ${_fmt(a.totalRevenue)}',
                style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
          ]),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(children: [
              Icon(a.revenueGrowth >= 0 ? Icons.trending_up : Icons.trending_down,
                  color: a.revenueGrowth >= 0 ? const Color(0xFF4ADE80) : SellerTheme.errorRed, size: 16),
              const SizedBox(width: 4),
              Text('${a.revenueGrowth >= 0 ? '+' : ''}${a.revenueGrowth.toStringAsFixed(1)}%',
                  style: TextStyle(
                    color: a.revenueGrowth >= 0 ? const Color(0xFF4ADE80) : SellerTheme.errorRed,
                    fontSize: 12, fontWeight: FontWeight.bold,
                  )),
            ]),
          ),
        ]),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _heroStat('${a.totalOrders}', 'Orders'),
            _vDiv(),
            _heroStat('$cur ${_fmt(a.avgOrderValue)}', 'Avg Order'),
            _vDiv(),
            _heroStat('${a.returnRate}%', 'Return Rate'),
          ]),
        ),
      ]),
    );
  }

  Widget _heroStat(String v, String l) => Column(children: [
    Text(v, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15)),
    Text(l, style: const TextStyle(color: Colors.white60, fontSize: 10)),
  ]);


  Widget _vDiv() => Container(height: 28, width: 1, color: Colors.white.withValues(alpha: 0.2));


  // ── KPI grid ──────────────────────────────────────────────────────────────

  Widget _buildKpiGrid(MarketplaceAnalytics a, String cur) {
    final items = [
      ('New Customers', '${a.newCustomers}',    Icons.person_add_outlined,   SellerTheme.successGreen),
      ('Repeat Buyers', '${a.repeatCustomers}%', Icons.loyalty_outlined,      _mp),
      ('Total Orders',  '${a.totalOrders}',     Icons.shopping_cart_outlined, SellerTheme.infoBlue),
      ('Return Rate',   '${a.returnRate}%',     Icons.assignment_return_outlined, SellerTheme.warningAmber),
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

  // ── Revenue chart ─────────────────────────────────────────────────────────

  Widget _buildRevenueChart(MarketplaceAnalytics a, String cur) {
    final data = _period == '7d' ? a.weeklyRevenue : a.monthlyRevenue.take(14).toList();
    final maxY = data.reduce((a, b) => a > b ? a : b) * 1.2;
    final labels = _period == '7d'
        ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
        : List.generate(14, (i) => '${i + 1}');

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: SellerTheme.elevatedCard(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Revenue Trend', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 4),
        Text('$cur values shown', style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11)),
        const SizedBox(height: 16),
        SizedBox(
          height: 160,
          child: LineChart(LineChartData(
            minY: 0, maxY: maxY,
            gridData: FlGridData(
              show: true, drawVerticalLine: false,
              horizontalInterval: maxY / 4,
              getDrawingHorizontalLine: (_) => const FlLine(color: SellerTheme.border, strokeWidth: 1),
            ),
            titlesData: FlTitlesData(
              leftTitles: AxisTitles(sideTitles: SideTitles(
                showTitles: true, reservedSize: 48,
                getTitlesWidget: (v, _) => Text(_fmtAxis(v, cur),
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

  // ── Customer breakdown ────────────────────────────────────────────────────

  Widget _buildCustomerChart(MarketplaceAnalytics a) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: SellerTheme.elevatedCard(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Customer Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 16),
        Row(children: [
          SizedBox(
            width: 120, height: 120,
            child: PieChart(PieChartData(
              sections: [
                PieChartSectionData(
                  value: a.repeatCustomers.toDouble(),
                  color: _mp,
                  title: '${a.repeatCustomers}%',
                  radius: 50,
                  titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                ),
                PieChartSectionData(
                  value: (100 - a.repeatCustomers).toDouble(),
                  color: SellerTheme.successGreen,
                  title: '${100 - a.repeatCustomers}%',
                  radius: 45,
                  titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ],
              centerSpaceRadius: 20,
              sectionsSpace: 3,
            )),
          ),
          const SizedBox(width: 24),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _legendRow(_mp, 'Repeat Buyers', '${a.repeatCustomers}%'),
            const SizedBox(height: 10),
            _legendRow(SellerTheme.successGreen, 'New Customers', '${100 - a.repeatCustomers}%'),
            const SizedBox(height: 14),
            Text('Total: ${a.newCustomers + a.repeatCustomers} customers',
                style: const TextStyle(fontSize: 11, color: SellerTheme.textMuted)),
          ])),
        ]),
      ]),
    );
  }

  Widget _legendRow(Color color, String label, String value) => Row(children: [
    Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
    const SizedBox(width: 8),
    Text(label, style: const TextStyle(fontSize: 12, color: SellerTheme.textSecondary)),
    const Spacer(),
    Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
  ]);

  // ── Top products ──────────────────────────────────────────────────────────

  Widget _buildTopProducts(MarketplaceSellerState ms, String cur) {
    final topIds = ms.analytics?.topProductIds ?? [];
    final top    = ms.products.where((p) => topIds.contains(p.id)).take(5).toList();
    if (top.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: SellerTheme.elevatedCard(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Top Products', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 12),
        ...top.asMap().entries.map((e) {
          final rank = e.key + 1;
          final p    = e.value;
          final pct  = top.isNotEmpty ? p.salesCount / (top.first.salesCount == 0 ? 1 : top.first.salesCount) : 0.0;
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(children: [
              Container(
                width: 28, height: 28,
                decoration: BoxDecoration(
                  color: rank == 1 ? SellerTheme.warningAmber : rank == 2 ? Colors.grey.shade300 : Colors.brown.shade200,
                  shape: BoxShape.circle,
                ),
                child: Center(child: Text('$rank',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white))),
              ),
              const SizedBox(width: 10),
              Text(p.emoji, style: const TextStyle(fontSize: 22)),
              const SizedBox(width: 8),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(p.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                Row(children: [
                  Expanded(child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: pct.clamp(0.0, 1.0),
                      backgroundColor: _mp.withValues(alpha: 0.08),
                      color: _mp,
                      minHeight: 5,
                    ),
                  )),
                  const SizedBox(width: 8),
                  Text('${p.salesCount} sold', style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
                ]),
              ])),
              const SizedBox(width: 10),
              Text('$cur ${p.price.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: _mp)),
            ]),
          );
        }),
      ]),
    );
  }

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000)    return '${(v / 1000).toStringAsFixed(1)}K';
    return v.toStringAsFixed(0);
  }

  String _fmtAxis(double v, String cur) {
    if (v >= 1000) return '$cur${(v / 1000).toStringAsFixed(0)}K';
    return '$cur${v.toStringAsFixed(0)}';
  }
}
