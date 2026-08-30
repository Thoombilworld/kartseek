import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_event.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';
import 'package:kartseek_seller/features/shared/widgets/order_status_chip.dart';
import 'package:kartseek_seller/features/shared/widgets/seller_module_scaffold.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Country-specific store configurations
// ─────────────────────────────────────────────────────────────────────────────

class _StoreConfig {
  final String name;
  final String category;
  final String city;
  final String taxLabel;
  final String taxRate;
  final String storeId;

  const _StoreConfig({
    required this.name,
    required this.category,
    required this.city,
    required this.taxLabel,
    required this.taxRate,
    required this.storeId,
  });

  static _StoreConfig forCountry(String cc) {
    const configs = <String, _StoreConfig>{
      'QA': _StoreConfig(name: 'Gulf Tech & Fashion Emporium', category: 'Multi-category Seller', city: 'The Pearl, Doha', taxLabel: 'VAT', taxRate: '0%', storeId: 'STORE-MP-QA001'),
      'IN': _StoreConfig(name: 'BharatMart Online Store', category: 'Multi-category Seller', city: 'Connaught Place, New Delhi', taxLabel: 'GST', taxRate: '18%', storeId: 'STORE-MP-IN001'),
      'AE': _StoreConfig(name: 'Dubai Mart Global', category: 'Premium Seller', city: 'Business Bay, Dubai', taxLabel: 'VAT', taxRate: '5%', storeId: 'STORE-MP-AE001'),
      'SA': _StoreConfig(name: 'Riyadh Souq Online', category: 'Multi-category Seller', city: 'King Fahd District, Riyadh', taxLabel: 'VAT', taxRate: '15%', storeId: 'STORE-MP-SA001'),
      'KE': _StoreConfig(name: 'Nairobi Market Hub', category: 'Multi-category Seller', city: 'Westlands, Nairobi', taxLabel: 'VAT', taxRate: '16%', storeId: 'STORE-MP-KE001'),
      'BH': _StoreConfig(name: 'Manama Digital Mall', category: 'Electronics & Fashion', city: 'Seef District, Manama', taxLabel: 'VAT', taxRate: '10%', storeId: 'STORE-MP-BH001'),
      'KW': _StoreConfig(name: 'Kuwait Central Store', category: 'Multi-category Seller', city: 'Salmiya, Kuwait City', taxLabel: 'Tax', taxRate: '0%', storeId: 'STORE-MP-KW001'),
      'OM': _StoreConfig(name: 'Muscat Online Bazaar', category: 'Multi-category Seller', city: 'Qurum, Muscat', taxLabel: 'Tax', taxRate: '5%', storeId: 'STORE-MP-OM001'),
      'GB': _StoreConfig(name: 'London Lifestyle Store', category: 'Premium UK Seller', city: 'Covent Garden, London', taxLabel: 'VAT', taxRate: '20%', storeId: 'STORE-MP-GB001'),
      'US': _StoreConfig(name: 'NYC Commerce Hub', category: 'Multi-category Seller', city: 'Midtown, New York', taxLabel: 'Sales Tax', taxRate: '8.5%', storeId: 'STORE-MP-US001'),
    };
    return configs[cc] ?? configs['AE']!;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MarketplaceDashboardScreen
// ─────────────────────────────────────────────────────────────────────────────

class MarketplaceDashboardScreen extends StatefulWidget {
  const MarketplaceDashboardScreen({super.key});

  @override
  State<MarketplaceDashboardScreen> createState() => _MarketplaceDashboardScreenState();
}

class _MarketplaceDashboardScreenState extends State<MarketplaceDashboardScreen>
    with SingleTickerProviderStateMixin {
  static const _mp = Color(0xFF6C3FC8);
  NumberFormat _fmt = NumberFormat.compactCurrency(symbol: 'AED ', decimalDigits: 0);
  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.6, end: 1.0).animate(_pulseCtrl);

    final cc  = context.read<SellerBloc>().state.countryCode;
    final cur = context.read<SellerBloc>().state.country.currencySymbol;
    _fmt = NumberFormat.compactCurrency(symbol: '$cur ', decimalDigits: 0);
    context.read<MarketplaceSellerBloc>()
      ..add(LoadMarketplaceDashboard(countryCode: cc))
      ..add(LoadMarketplaceAnalytics(period: '7d', countryCode: cc));
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SellerModuleScaffold(
      activeRole: SellerRole.marketplaceSeller,
      title: 'Marketplace',
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, SellerRouter.marketplaceProductEdit),
        backgroundColor: _mp,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Product', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: RefreshIndicator(
              color: _mp,
              onRefresh: () async {
                final cc = context.read<SellerBloc>().state.countryCode;
                context.read<MarketplaceSellerBloc>()
                  ..add(LoadMarketplaceDashboard(countryCode: cc))
                  ..add(LoadMarketplaceAnalytics(period: '7d', countryCode: cc));
              },
              child: CustomScrollView(
                slivers: [
                  _buildSliverAppBar(),
                  _buildStoreCard(),
                  _buildKpiGrid(),
                  _buildQuickActions(),
                  _buildRevenueChart(),
                  _buildLowStockBanner(),
                  _buildLiveOrderFeed(),
                  _buildRecentProductsPreview(),
                  const SliverToBoxAdapter(child: SizedBox(height: 100)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Sliver AppBar ─────────────────────────────────────────────────────────

  SliverAppBar _buildSliverAppBar() {
    return SliverAppBar(
      expandedHeight: 130,
      floating: false,
      pinned: true,
      elevation: 0,
      backgroundColor: _mp,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [_mp, Color(0xFF9B59F5)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: BlocBuilder<SellerBloc, SellerState>(
                builder: (context, ss) {
                  final store = _StoreConfig.forCountry(ss.countryCode);
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Good ${_greeting()}, ${ss.profile?.name.split(' ').first ?? 'Seller'} 👋',
                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                          Row(children: [
                            // Live indicator
                            AnimatedBuilder(
                              animation: _pulseAnim,
                              builder: (_, __) => Opacity(
                                opacity: _pulseAnim.value,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.green.withValues(alpha: 0.25),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.greenAccent, width: 1),
                                  ),
                                  child: const Row(children: [
                                    Icon(Icons.circle, size: 6, color: Colors.greenAccent),
                                    SizedBox(width: 4),
                                    Text('LIVE', style: TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                                  ]),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Stack(children: [
                              IconButton(
                                onPressed: () => Navigator.pushNamed(context, SellerRouter.notifications),
                                icon: const Icon(Icons.notifications_outlined, color: Colors.white),
                              ),
                              if (ss.unreadNotifications > 0)
                                Positioned(
                                  right: 8, top: 8,
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                    child: Text('${ss.unreadNotifications}',
                                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                                  ),
                                ),
                            ]),
                          ]),
                        ],
                      ),
                      Text(store.name,
                          style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                      Text('${ss.country.flag} ${store.city}  ·  ${store.taxLabel} ${store.taxRate}',
                          style: const TextStyle(color: Colors.white70, fontSize: 11)),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
      actions: [
        IconButton(
          onPressed: () => Navigator.pushNamed(context, SellerRouter.marketplaceOrders),
          icon: const Icon(Icons.list_alt, color: Colors.white),
          tooltip: 'All Orders',
        ),
        IconButton(
          onPressed: () => Navigator.pushNamed(context, SellerRouter.profile),
          icon: const Icon(Icons.person_outline, color: Colors.white),
          tooltip: 'Profile',
        ),
      ],
    );
  }

  // ── Store card ────────────────────────────────────────────────────────────

  SliverToBoxAdapter _buildStoreCard() {
    return SliverToBoxAdapter(
      child: BlocBuilder<SellerBloc, SellerState>(
        builder: (context, ss) {
          final store = _StoreConfig.forCountry(ss.countryCode);
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [_mp.withValues(alpha: 0.06), const Color(0xFF9B59F5).withValues(alpha: 0.04)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _mp.withValues(alpha: 0.15)),
              ),
              child: Row(children: [
                Container(
                  width: 52, height: 52,
                  decoration: BoxDecoration(
                    color: _mp.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Center(child: Text('🛍️', style: TextStyle(fontSize: 26))),
                ),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(store.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text('${store.category}  ·  ${ss.country.flag} ${ss.country.name}',
                      style: const TextStyle(color: SellerTheme.textSecondary, fontSize: 11)),
                  const SizedBox(height: 4),
                  Row(children: [
                    _pill('⭐ 4.7', _mp),
                    const SizedBox(width: 6),
                    _pill(store.storeId, SellerTheme.textMuted),
                  ]),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: SellerTheme.successGreen.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('Active', style: TextStyle(color: SellerTheme.successGreen, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 4),
                  Text('${store.taxLabel} ${store.taxRate}',
                      style: const TextStyle(color: SellerTheme.textMuted, fontSize: 10)),
                ]),
              ]),
            ),
          );
        },
      ),
    );
  }

  Widget _pill(String label, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(6),
    ),
    child: Text(label, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w600)),
  );

  // ── KPI Grid ─────────────────────────────────────────────────────────────

  SliverToBoxAdapter _buildKpiGrid() {
    return SliverToBoxAdapter(
      child: BlocBuilder<MarketplaceSellerBloc, MarketplaceSellerState>(
        buildWhen: (prev, cur) => prev.dashboardData != cur.dashboardData || prev.status != cur.status,
        builder: (context, ms) {
          final d = ms.dashboardData;
          final pending = ms.pendingCount;

          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.7,
              children: [
                _kpiCard(
                  label: "Today's Orders",
                  value: '${d['todayOrders'] ?? ms.orders.length}',
                  icon: Icons.shopping_cart_outlined,
                  color: _mp,
                  trend: '+12%',
                  trendUp: true,
                ),
                _kpiCard(
                  label: 'Revenue Today',
                  value: _fmt.format((d['todayRevenue'] as num?)?.toDouble() ?? 0.0),
                  icon: Icons.attach_money,
                  color: SellerTheme.successGreen,
                  trend: '+8.4%',
                  trendUp: true,
                ),
                _kpiCard(
                  label: 'Pending',
                  value: '${d['pendingOrders'] ?? pending}',
                  icon: Icons.hourglass_bottom_outlined,
                  color: SellerTheme.warningAmber,
                  trend: pending > 0 ? 'ACTION' : 'Clear',
                  trendUp: pending == 0,
                ),
                _kpiCard(
                  label: 'Avg Rating',
                  value: '${((d['avgRating'] as num?)?.toDouble() ?? 4.7).toStringAsFixed(1)} ⭐',
                  icon: Icons.star_half,
                  color: SellerTheme.infoBlue,
                  trend: 'Top 10%',
                  trendUp: true,
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _kpiCard({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
    required String trend,
    required bool trendUp,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: SellerTheme.border),
        boxShadow: [BoxShadow(color: color.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, color: color, size: 16),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              decoration: BoxDecoration(
                color: (trendUp ? SellerTheme.successGreen : SellerTheme.errorRed).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(trend, style: TextStyle(
                fontSize: 9, fontWeight: FontWeight.bold,
                color: trendUp ? SellerTheme.successGreen : SellerTheme.errorRed,
              )),
            ),
          ]),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
            Text(label, style: const TextStyle(fontSize: 10, color: SellerTheme.textSecondary)),
          ]),
        ],
      ),
    );
  }

  // ── Quick Actions ─────────────────────────────────────────────────────────

  SliverToBoxAdapter _buildQuickActions() {
    final actions = [
      ('📋', 'Orders', SellerRouter.marketplaceOrders, _mp),
      ('📦', 'Inventory', SellerRouter.marketplaceInventory, SellerTheme.infoBlue),
      ('📊', 'Analytics', SellerRouter.marketplaceAnalytics, SellerTheme.successGreen),
      ('➕', 'Add Product', SellerRouter.marketplaceProductEdit, SellerTheme.warningAmber),
    ];
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Quick Actions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 10),
          Row(
            children: actions.map((a) => Expanded(
              child: GestureDetector(
                onTap: () => Navigator.pushNamed(context, a.$3),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: a.$4.withValues(alpha: 0.07),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: a.$4.withValues(alpha: 0.2)),
                  ),
                  child: Column(children: [
                    Text(a.$1, style: const TextStyle(fontSize: 20)),
                    const SizedBox(height: 4),
                    Text(a.$2, style: TextStyle(
                      fontSize: 10, fontWeight: FontWeight.w700, color: a.$4,
                    ), textAlign: TextAlign.center),
                  ]),
                ),
              ),
            )).toList(),
          ),
          const SizedBox(height: 8),
          // Second row — new screens
          Row(
            children: [
              ('🧾', 'GST Filing', SellerRouter.marketplaceGstFiling, const Color(0xFF8B5CF6)),
              ('🚚', 'Shipping', SellerRouter.marketplaceShipping, SellerTheme.infoBlue),
              ('📈', 'Performance', SellerRouter.marketplacePerformance, SellerTheme.successGreen),
              ('💬', 'Messages', SellerRouter.marketplaceMessages, const Color(0xFF0EA5E9)),
              ('⚖️', 'Disputes', SellerRouter.marketplaceDisputes, SellerTheme.errorRed),
            ].map((a) => Expanded(
              child: GestureDetector(
                onTap: () => Navigator.pushNamed(context, a.$3),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: a.$4.withValues(alpha: 0.07),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: a.$4.withValues(alpha: 0.2)),
                  ),
                  child: Column(children: [
                    Text(a.$1, style: const TextStyle(fontSize: 18)),
                    const SizedBox(height: 3),
                    Text(a.$2, style: TextStyle(
                      fontSize: 9, fontWeight: FontWeight.w700, color: a.$4,
                    ), textAlign: TextAlign.center),
                  ]),
                ),
              ),
            )).toList(),
          ),
        ]),
      ),
    );
  }

  // ── Revenue Chart ─────────────────────────────────────────────────────────

  SliverToBoxAdapter _buildRevenueChart() {
    return SliverToBoxAdapter(
      child: BlocBuilder<MarketplaceSellerBloc, MarketplaceSellerState>(
        buildWhen: (p, c) => p.analytics != c.analytics,
        builder: (context, ms) {
          // Use analytics if loaded; fall back to dashboard-derived dummy
          final spots = ms.analytics?.weeklyRevenue ?? [42000.0, 58000.0, 35000.0, 71000.0, 63000.0, 89000.0, 55000.0];
          final maxY = spots.reduce((a, b) => a > b ? a : b) * 1.25;
          final peakIdx = spots.indexOf(spots.reduce((a, b) => a > b ? a : b));

          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Container(
              decoration: SellerTheme.elevatedCard(),
              padding: const EdgeInsets.all(18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('Revenue Trend (7 Days)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () => Navigator.pushNamed(context, SellerRouter.marketplaceAnalytics),
                    child: const Text('Full Analytics →', style: TextStyle(color: _mp, fontSize: 12)),
                  ),
                ]),
                const SizedBox(height: 4),
                Text('${context.read<SellerBloc>().state.country.currencySymbol} values · Peak on ${_dayLabel(peakIdx)}',
                    style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11)),
                const SizedBox(height: 14),
                SizedBox(
                  height: 150,
                  child: BarChart(
                    BarChartData(
                      maxY: maxY,
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        horizontalInterval: maxY / 4,
                        getDrawingHorizontalLine: (_) => const FlLine(color: SellerTheme.border, strokeWidth: 1),
                      ),
                      titlesData: FlTitlesData(
                        leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        bottomTitles: AxisTitles(sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (v, _) => Text(
                            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][v.toInt() % 7],
                            style: const TextStyle(color: SellerTheme.textMuted, fontSize: 9),
                          ),
                        )),
                      ),
                      borderData: FlBorderData(show: false),
                      barGroups: List.generate(spots.length, (i) => BarChartGroupData(
                        x: i,
                        barRods: [
                          BarChartRodData(
                            toY: spots[i],
                            width: 26,
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                            color: i == peakIdx ? _mp : _mp.withValues(alpha: 0.35),
                            backDrawRodData: BackgroundBarChartRodData(
                              show: true, toY: maxY,
                              color: SellerTheme.surface,
                            ),
                          ),
                        ],
                      )),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                  _chartStat('Total', _fmt.format(spots.fold(0.0, (s, v) => s + v)), _mp),
                  _chartStat('Peak Day', _dayLabel(peakIdx), SellerTheme.warningAmber),
                  _chartStat('Avg Daily', _fmt.format(spots.fold(0.0, (s, v) => s + v) / 7), SellerTheme.successGreen),
                ]),
              ]),
            ),
          );
        },
      ),
    );
  }

  Widget _chartStat(String label, String value, Color color) => Column(children: [
    Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color)),
    Text(label, style: const TextStyle(fontSize: 9, color: SellerTheme.textMuted)),
  ]);

  String _dayLabel(int idx) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx % 7];

  // ── Low Stock Banner ──────────────────────────────────────────────────────

  SliverToBoxAdapter _buildLowStockBanner() {
    return SliverToBoxAdapter(
      child: BlocBuilder<MarketplaceSellerBloc, MarketplaceSellerState>(
        buildWhen: (p, c) => p.products != c.products,
        builder: (context, ms) {
          final lowStock = ms.lowStockProducts;
          if (lowStock.isEmpty) return const SizedBox.shrink();
          final outOfStock = lowStock.where((p) => p.isOutOfStock).length;
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: GestureDetector(
              onTap: () => Navigator.pushNamed(context, SellerRouter.marketplaceInventory),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: SellerTheme.warningAmber.withValues(alpha: 0.08),
                  border: Border.all(color: SellerTheme.warningAmber.withValues(alpha: 0.4)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(children: [
                  const Text('⚠️', style: TextStyle(fontSize: 22)),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${lowStock.length} Low-Stock Alert${lowStock.length > 1 ? 's' : ''}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    Text(
                      outOfStock > 0
                          ? '$outOfStock out of stock · ${lowStock.length - outOfStock} running low'
                          : '${lowStock.length} products need restocking',
                      style: const TextStyle(color: SellerTheme.textSecondary, fontSize: 11),
                    ),
                  ])),
                  const Icon(Icons.chevron_right, color: SellerTheme.warningAmber),
                ]),
              ),
            ),
          );
        },
      ),
    );
  }

  // ── Live Order Feed ────────────────────────────────────────────────────────

  SliverToBoxAdapter _buildLiveOrderFeed() {
    return SliverToBoxAdapter(
      child: BlocBuilder<MarketplaceSellerBloc, MarketplaceSellerState>(
        buildWhen: (p, c) => p.orders != c.orders || p.status != c.status,
        builder: (context, ms) {
          final active = ms.orders.where((o) => o.status.isActive).take(6).toList();
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Row(children: [
                  const Text('Live Orders', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 8),
                  if (ms.pendingCount > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: SellerTheme.errorRed,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text('${ms.pendingCount} new', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                ]),
                TextButton(
                  onPressed: () => Navigator.pushNamed(context, SellerRouter.marketplaceOrders),
                  child: const Text('See All →', style: TextStyle(color: _mp, fontSize: 12)),
                ),
              ]),
              const SizedBox(height: 8),
              if (ms.status == MarketplaceBlocStatus.loading)
                const Center(child: Padding(padding: EdgeInsets.all(28), child: CircularProgressIndicator(color: _mp)))
              else if (active.isEmpty)
                _emptyOrderState()
              else
                ...active.map((o) => _orderCard(o)),
            ]),
          );
        },
      ),
    );
  }

  Widget _orderCard(SellerOrder o) {
    final cur = context.read<SellerBloc>().state.country.currencySymbol;
    final age = DateTime.now().difference(o.createdAt);
    final ageLabel = age.inMinutes < 60 ? '${age.inMinutes}m ago' : '${age.inHours}h ago';
    final isUrgent = o.status == SellerOrderStatus.pending && age.inMinutes > 10;

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, SellerRouter.marketplaceOrderDetail, arguments: o),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isUrgent ? SellerTheme.errorRed.withValues(alpha: 0.4) : SellerTheme.border),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 3))],
        ),
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: _mp.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(child: Text('🛍️', style: TextStyle(fontSize: 22))),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(o.customerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            Text('#${o.id} · ${o.itemCount} item${o.itemCount > 1 ? 's' : ''} · $ageLabel',
                style: TextStyle(color: isUrgent ? SellerTheme.errorRed : SellerTheme.textMuted, fontSize: 11)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('$cur ${o.total.toStringAsFixed(0)}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: _mp)),
            const SizedBox(height: 4),
            OrderStatusChip(status: o.status),
          ]),
        ]),
      ),
    );
  }

  Widget _emptyOrderState() => Container(
    padding: const EdgeInsets.symmetric(vertical: 32),
    decoration: SellerTheme.cardDecoration(),
    child: const Column(children: [
      Text('🎉', style: TextStyle(fontSize: 42)),
      SizedBox(height: 10),
      Text('All orders processed!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
      SizedBox(height: 4),
      Text('New orders will appear here in real-time', style: TextStyle(color: SellerTheme.textMuted, fontSize: 12)),
    ]),
  );

  // ── Recent Products Preview ───────────────────────────────────────────────

  SliverToBoxAdapter _buildRecentProductsPreview() {
    return SliverToBoxAdapter(
      child: BlocBuilder<MarketplaceSellerBloc, MarketplaceSellerState>(
        buildWhen: (p, c) => p.products != c.products,
        builder: (context, ms) {
          final cur = context.read<SellerBloc>().state.country.currencySymbol;
          final featured = ms.products.where((p) => p.isFeatured).take(4).toList();
          if (featured.isEmpty) return const SizedBox.shrink();
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Featured Products', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                TextButton(
                  onPressed: () => Navigator.pushNamed(context, SellerRouter.marketplaceInventory),
                  child: const Text('Manage →', style: TextStyle(color: _mp, fontSize: 12)),
                ),
              ]),
              const SizedBox(height: 10),
              SizedBox(
                height: 130,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: featured.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (ctx, i) {
                    final p = featured[i];
                    return Container(
                      width: 120,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: SellerTheme.border),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
                      ),
                      padding: const EdgeInsets.all(12),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          Text(p.emoji, style: const TextStyle(fontSize: 24)),
                          if (p.isLowStock)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: SellerTheme.warningAmber.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('Low', style: TextStyle(color: SellerTheme.warningAmber, fontSize: 8, fontWeight: FontWeight.bold)),
                            ),
                        ]),
                        const Spacer(),
                        Text(p.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11),
                            maxLines: 2, overflow: TextOverflow.ellipsis),
                        Text('$cur ${p.price.toStringAsFixed(0)}',
                            style: const TextStyle(color: _mp, fontWeight: FontWeight.bold, fontSize: 11)),
                        Text('${p.stock} in stock', style: const TextStyle(color: SellerTheme.textMuted, fontSize: 9)),
                      ]),
                    );
                  },
                ),
              ),
            ]),
          );
        },
      ),
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }
}
