import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Reports — Revenue, orders, returns, and performance analytics with
/// date range filtering, chart summaries, and exportable data.
class MarketplaceReportsScreen extends StatefulWidget {
  const MarketplaceReportsScreen({super.key});
  @override
  State<MarketplaceReportsScreen> createState() => _State();
}

class _State extends State<MarketplaceReportsScreen> {
  static const _mp = Color(0xFF6C3FC8);
  String _period = '7d';
  String _reportType = 'revenue';

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Reports · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_outlined),
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                  content: Text('Report exported to Downloads'),
                  duration: Duration(seconds: 2)),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          // Period selector
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                _periodChip('7d', 'Last 7 Days'),
                _periodChip('30d', 'Last 30 Days'),
                _periodChip('90d', 'Last 90 Days'),
                _periodChip('ytd', 'Year to Date'),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                // Summary KPIs
                _sectionTitle('Summary'),
                const SizedBox(height: 10),
                Row(children: [
                  _kpiCard(
                      'Revenue',
                      '$currency ${_revForPeriod()}',
                      Icons.trending_up,
                      Colors.green,
                      '+${_growthForPeriod()}%'),
                  const SizedBox(width: 10),
                  _kpiCard(
                      'Orders',
                      '${_ordersForPeriod()}',
                      Icons.shopping_bag_outlined,
                      Colors.blue,
                      '+${(_ordersForPeriod() * 0.12).round()}'),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  _kpiCard(
                      'Returns',
                      '${(_ordersForPeriod() * 0.03).round()}',
                      Icons.assignment_return_outlined,
                      Colors.red,
                      '${(_ordersForPeriod() * 0.03 / _ordersForPeriod() * 100).toStringAsFixed(1)}%'),
                  const SizedBox(width: 10),
                  _kpiCard(
                      'Avg Order',
                      '$currency ${(_revForPeriod() ~/ _ordersForPeriod())}',
                      Icons.receipt_long_outlined,
                      Colors.orange,
                      ''),
                ]),
                const SizedBox(height: 24),

                // Report Type Tabs
                _sectionTitle('Detailed Report'),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      _tabBtn('revenue', '💰 Revenue'),
                      _tabBtn('orders', '📦 Orders'),
                      _tabBtn('products', '📊 Products'),
                      _tabBtn('customers', '👥 Customers'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Chart placeholder
                _buildChart(),
                const SizedBox(height: 24),

                // Breakdown table
                _sectionTitle(_reportType == 'revenue'
                    ? 'Revenue by Category'
                    : _reportType == 'orders'
                        ? 'Orders by Status'
                        : _reportType == 'products'
                            ? 'Top Products'
                            : 'Customer Metrics'),
                const SizedBox(height: 10),
                ..._buildBreakdownRows(currency),

                const SizedBox(height: 24),

                // Performance Metrics
                _sectionTitle('Seller Performance'),
                const SizedBox(height: 10),
                _performanceRow('Order Acceptance Rate', 96.4, Colors.green),
                _performanceRow('On-Time Shipping', 94.2, Colors.blue),
                _performanceRow(
                    'Customer Satisfaction', 4.7 / 5 * 100, Colors.amber),
                _performanceRow('Return Rate', 3.2, Colors.red),
                _performanceRow('Response Time', 87.5, Colors.purple),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }

  int _revForPeriod() {
    switch (_period) {
      case '7d':
        return 42500;
      case '30d':
        return 185000;
      case '90d':
        return 520000;
      case 'ytd':
        return 1240000;
      default:
        return 42500;
    }
  }

  int _ordersForPeriod() {
    switch (_period) {
      case '7d':
        return 89;
      case '30d':
        return 342;
      case '90d':
        return 1024;
      case 'ytd':
        return 2480;
      default:
        return 89;
    }
  }

  double _growthForPeriod() {
    switch (_period) {
      case '7d':
        return 12.4;
      case '30d':
        return 18.2;
      case '90d':
        return 24.6;
      case 'ytd':
        return 31.0;
      default:
        return 12.4;
    }
  }

  Widget _periodChip(String value, String label) {
    final sel = _period == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _period = value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          margin: const EdgeInsets.symmetric(horizontal: 2),
          decoration: BoxDecoration(
            color: sel ? _mp : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(label,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: sel ? FontWeight.bold : FontWeight.w500,
                  color: sel ? Colors.white : Colors.grey.shade600)),
        ),
      ),
    );
  }

  Widget _tabBtn(String value, String label) {
    final sel = _reportType == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _reportType = value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: sel ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: sel
                ? [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 4)
                  ]
                : [],
          ),
          child: Text(label,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: sel ? FontWeight.bold : FontWeight.w500)),
        ),
      ),
    );
  }

  Widget _kpiCard(
      String label, String value, IconData icon, Color color, String badge) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(icon, color: color, size: 20),
              const Spacer(),
              if (badge.isNotEmpty)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6)),
                  child: Text(badge,
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: color)),
                ),
            ]),
            const SizedBox(height: 10),
            Text(value,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          ],
        ),
      ),
    );
  }

  Widget _buildChart() {
    // Mini bar chart using containers
    final values = _reportType == 'revenue'
        ? [65, 72, 58, 88, 94, 80, 92]
        : _reportType == 'orders'
            ? [12, 18, 14, 22, 20, 16, 24]
            : [40, 55, 35, 70, 65, 50, 80];
    final maxVal = values.reduce((a, b) => a > b ? a : b);
    final labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 140,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: values.asMap().entries.map((e) {
                final h = maxVal > 0 ? (e.value / maxVal * 120) : 0.0;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text('${e.value}',
                            style: TextStyle(
                                fontSize: 9, color: Colors.grey.shade500)),
                        const SizedBox(height: 4),
                        Container(
                          height: h,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [_mp, _mp.withValues(alpha: 0.5)],
                            ),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: labels
                .map((l) => Expanded(
                      child: Text(l,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 10, color: Colors.grey.shade400)),
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildBreakdownRows(String currency) {
    if (_reportType == 'revenue') {
      return [
        _breakdownRow('Electronics', '$currency 24,800', 58, Colors.blue),
        _breakdownRow('Fashion', '$currency 9,200', 22, Colors.pink),
        _breakdownRow('Home & Living', '$currency 5,400', 13, Colors.amber),
        _breakdownRow('Other', '$currency 3,100', 7, Colors.grey),
      ];
    }
    if (_reportType == 'orders') {
      return [
        _breakdownRow('Delivered', '${(_ordersForPeriod() * 0.72).round()}', 72,
            Colors.green),
        _breakdownRow('In Transit', '${(_ordersForPeriod() * 0.15).round()}',
            15, Colors.blue),
        _breakdownRow('Processing', '${(_ordersForPeriod() * 0.08).round()}', 8,
            Colors.orange),
        _breakdownRow('Cancelled', '${(_ordersForPeriod() * 0.05).round()}', 5,
            Colors.red),
      ];
    }
    if (_reportType == 'products') {
      return [
        _breakdownRow('iPhone 15 Pro', '142 sold', 100, _mp),
        _breakdownRow('MacBook Air M3', '89 sold', 63, Colors.blue),
        _breakdownRow('Sony WH-1000XM5', '178 sold', 100, Colors.teal),
        _breakdownRow('JBL Flip 6', '234 sold', 100, Colors.orange),
        _breakdownRow('Apple Watch Ultra 2', '45 sold', 32, Colors.green),
      ];
    }
    return [
      _breakdownRow('New Customers', '${(_ordersForPeriod() * 0.35).round()}',
          35, Colors.blue),
      _breakdownRow('Returning Customers',
          '${(_ordersForPeriod() * 0.65).round()}', 65, Colors.green),
      _breakdownRow('Avg Rating Given', '4.7 ⭐', 94, Colors.amber),
    ];
  }

  Widget _breakdownRow(String label, String value, double pct, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                  width: 10,
                  height: 10,
                  decoration:
                      BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 10),
              Expanded(
                  child: Text(label,
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600))),
              Text(value,
                  style: TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w700, color: color)),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct / 100,
              backgroundColor: Colors.grey.shade100,
              color: color,
              minHeight: 5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _performanceRow(String label, double pct, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Expanded(
              child: Text(label,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w500))),
          SizedBox(
            width: 100,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                  value: pct / 100,
                  backgroundColor: Colors.grey.shade100,
                  color: color,
                  minHeight: 6),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 48,
            child: Text('${pct.toStringAsFixed(1)}%',
                textAlign: TextAlign.end,
                style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w700, color: color)),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) => Text(title,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800));
}
