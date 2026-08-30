import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_event.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/delivery_dispatch_button.dart';
import 'package:kartseek_seller/features/shared/widgets/order_status_chip.dart';
import 'package:kartseek_seller/features/shared/widgets/seller_module_scaffold.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Country-specific config for the Grocery store hero card
// ─────────────────────────────────────────────────────────────────────────────

class _GroceryConfig {
  final String storeName;
  final String taxLabel;
  final double taxRate;
  final String storeId;
  final String city;
  final int avgPackMin;

  const _GroceryConfig({
    required this.storeName,
    required this.taxLabel,
    required this.taxRate,
    required this.storeId,
    required this.city,
    required this.avgPackMin,
  });

  static _GroceryConfig forCountry(String cc, String? profileName) {
    const configs = <String, _GroceryConfig>{
      'QA': _GroceryConfig(storeName: 'Doha Fresh Market', taxLabel: 'No VAT', taxRate: 0.0, storeId: 'GRC-QA-0042', city: 'Doha', avgPackMin: 12),
      'IN': _GroceryConfig(storeName: 'Mumbai Kirana Store', taxLabel: 'GST 5%', taxRate: 0.05, storeId: 'GRC-IN-1188', city: 'Mumbai', avgPackMin: 10),
      'AE': _GroceryConfig(storeName: 'Dubai Smart Grocery', taxLabel: 'VAT 5%', taxRate: 0.05, storeId: 'GRC-AE-0231', city: 'Dubai', avgPackMin: 14),
      'SA': _GroceryConfig(storeName: 'Riyadh Superstore', taxLabel: 'VAT 15%', taxRate: 0.15, storeId: 'GRC-SA-0085', city: 'Riyadh', avgPackMin: 11),
      'KE': _GroceryConfig(storeName: 'Nairobi Fresh Hub', taxLabel: 'VAT 16%', taxRate: 0.16, storeId: 'GRC-KE-0347', city: 'Nairobi', avgPackMin: 8),
      'BH': _GroceryConfig(storeName: 'Manama Grocery', taxLabel: 'VAT 10%', taxRate: 0.10, storeId: 'GRC-BH-0018', city: 'Manama', avgPackMin: 13),
      'KW': _GroceryConfig(storeName: 'Kuwait Fresh Stop', taxLabel: 'No Tax', taxRate: 0.0, storeId: 'GRC-KW-0072', city: 'Kuwait City', avgPackMin: 12),
      'OM': _GroceryConfig(storeName: 'Muscat Grocery Hub', taxLabel: 'VAT 5%', taxRate: 0.05, storeId: 'GRC-OM-0029', city: 'Muscat', avgPackMin: 14),
      'GB': _GroceryConfig(storeName: 'London Fresh Express', taxLabel: 'VAT 0% (Food)', taxRate: 0.0, storeId: 'GRC-GB-0511', city: 'London', avgPackMin: 15),
      'US': _GroceryConfig(storeName: 'QuickMart USA', taxLabel: 'No Sales Tax (Groceries)', taxRate: 0.0, storeId: 'GRC-US-0229', city: 'New York', avgPackMin: 13),
    };
    final cfg = configs[cc] ?? configs['QA']!;
    return _GroceryConfig(
      storeName: profileName ?? cfg.storeName,
      taxLabel: cfg.taxLabel,
      taxRate: cfg.taxRate,
      storeId: cfg.storeId,
      city: cfg.city,
      avgPackMin: cfg.avgPackMin,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GroceryDashboardScreen
// ─────────────────────────────────────────────────────────────────────────────

class GroceryDashboardScreen extends StatefulWidget {
  const GroceryDashboardScreen({super.key});

  @override
  State<GroceryDashboardScreen> createState() => _GroceryDashboardScreenState();
}

class _GroceryDashboardScreenState extends State<GroceryDashboardScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseCtrl;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat(reverse: true);
    final ss = context.read<SellerBloc>().state;
    context.read<GrocerySellerBloc>().add(LoadGroceryDashboard(countryCode: ss.countryCode));
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<GrocerySellerBloc, GrocerySellerState>(
      listener: (context, state) {
        if (state.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.actionMessage!),
            backgroundColor: (state.actionSuccess ?? true) ? SellerTheme.successGreen : SellerTheme.errorRed,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<SellerBloc, SellerState>(
        builder: (context, sellerState) {
          final cfg = _GroceryConfig.forCountry(
            sellerState.countryCode,
            sellerState.profile?.storeName,
          );
          return BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
            builder: (context, gs) {
              return SellerModuleScaffold(
                activeRole: SellerRole.grocerySeller,
                title: 'Grocery Dashboard',
                floatingActionButton: FloatingActionButton.extended(
                  onPressed: () => Navigator.pushNamed(context, SellerRouter.groceryCatalog),
                  backgroundColor: SellerTheme.grocery,
                  icon: const Icon(Icons.add, color: Colors.white),
                  label: const Text('Catalog', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                ),
                body: RefreshIndicator(
                  color: SellerTheme.grocery,
                  onRefresh: () async {
                    context.read<GrocerySellerBloc>()
                        .add(LoadGroceryDashboard(countryCode: sellerState.countryCode));
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildHeroCard(gs, sellerState, cfg),
                      const SizedBox(height: 16),
                      _buildKpiRow(gs, sellerState, cfg),
                      const SizedBox(height: 16),
                      _buildQuickActions(context),
                      const SizedBox(height: 18),
                      _buildRevenueChart(gs, sellerState),
                      const SizedBox(height: 18),
                      _buildOrderSection(context, gs, sellerState),
                      const SizedBox(height: 18),
                      _buildCategoryHealth(gs, sellerState),
                      const SizedBox(height: 18),
                      _buildLowStockSection(context, gs, sellerState),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  // ── Hero card ─────────────────────────────────────────────────────────────

  Widget _buildHeroCard(GrocerySellerState gs, SellerState ss, _GroceryConfig cfg) {
    final dash = gs.dashboardData;
    final country = ss.country;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF15803D), Color(0xFF22C55E)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: SellerTheme.grocery.withValues(alpha: 0.35), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Text('🛒', style: TextStyle(fontSize: 38)),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(cfg.storeName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 17), maxLines: 1, overflow: TextOverflow.ellipsis),
              Text('${country.flag} ${country.name} · ${cfg.taxLabel}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
              Text(cfg.storeId, style: const TextStyle(color: Colors.white54, fontSize: 10)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              _StoreToggle(isOpen: gs.isOpen),
              const SizedBox(height: 6),
              // LIVE pulse
              AnimatedBuilder(
                animation: _pulseCtrl,
                builder: (_, __) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1 + _pulseCtrl.value * 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(
                      width: 7, height: 7,
                      decoration: BoxDecoration(
                        color: Color.lerp(const Color(0xFF4ADE80), Colors.white, _pulseCtrl.value * 0.4),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Text('LIVE', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                  ]),
                ),
              ),
            ]),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            _heroPill('⭐ ${dash['rating'] ?? 4.7}', Colors.white),
            const SizedBox(width: 8),
            _heroPill('${dash['reviews'] ?? 238} reviews', Colors.white),
            const SizedBox(width: 8),
            if (gs.pendingOrderCount > 0)
              _heroPill('${gs.pendingOrderCount} pending', const Color(0xFFFCD34D)),
          ]),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
              _heroStat('${dash['orders'] ?? 54}', "Today's Orders"),
              _vDivider(),
              _heroStat(country.formatAmount((dash['revenue'] as num? ?? 18400).toDouble()), 'Revenue'),
              _vDivider(),
              _heroStat('${dash['low_stock'] ?? gs.lowStockProducts.length}', 'Low Stock'),
              _vDivider(),
              _heroStat('${cfg.avgPackMin} min', 'Avg Pack'),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _heroPill(String label, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
    child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
  );

  Widget _heroStat(String val, String label) => Column(children: [
    Text(val, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14)),
    Text(label, style: const TextStyle(color: Colors.white70, fontSize: 9)),
  ]);

  Widget _vDivider() => Container(height: 30, width: 1, color: Colors.white30);

  // ── KPI row ───────────────────────────────────────────────────────────────

  Widget _buildKpiRow(GrocerySellerState gs, SellerState ss, _GroceryConfig cfg) {
    return Row(children: [
      _kpi('${gs.orders.length}', 'Live Orders',  Icons.shopping_cart_outlined, SellerTheme.grocery),
      const SizedBox(width: 10),
      _kpi('${gs.lowStockProducts.length}', 'Low Stock',   Icons.inventory_2_outlined, SellerTheme.warningAmber),
      const SizedBox(width: 10),
      _kpi('${cfg.avgPackMin} min', 'Avg Pack',    Icons.timer_outlined,           SellerTheme.infoBlue),
      const SizedBox(width: 10),
      _kpi('${gs.categories.length}', 'Categories', Icons.category_outlined,       SellerTheme.successGreen),
    ]);
  }

  Widget _kpi(String value, String label, IconData icon, Color color) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: SellerTheme.border),
        boxShadow: [BoxShadow(color: color.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 3))],
      ),
      child: Column(children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color)),
        Text(label, style: const TextStyle(fontSize: 8, color: SellerTheme.textMuted), textAlign: TextAlign.center),
      ]),
    ),
  );

  // ── Quick actions ─────────────────────────────────────────────────────────

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      ('📦', 'Process Orders',  SellerRouter.groceryOrderProcessing, SellerTheme.grocery),
      ('📋', 'Catalog',         SellerRouter.groceryCatalog,          SellerTheme.infoBlue),
      ('⚠️', 'Low Stock',      SellerRouter.groceryLowStock,          SellerTheme.warningAmber),
      ('🆕', 'New Orders',     SellerRouter.groceryNewOrders,         Colors.orange),
      ('🔄', 'Active Orders',  SellerRouter.groceryActiveOrders,      SellerTheme.grocery),
      ('📊', 'Analytics',      SellerRouter.groceryAnalytics,         Colors.purple),
      ('🏷️', 'Price Update',  SellerRouter.groceryPriceUpdate,       Colors.teal),
      ('📦', 'Inventory',      SellerRouter.groceryInventory,         SellerTheme.infoBlue),
      ('➕', 'Add Product',    SellerRouter.groceryAddProduct,        SellerTheme.grocery),
      ('🔍', 'Barcode Scan',   SellerRouter.groceryBarcodeScan,       Colors.indigo),
      ('⚡', 'Create Deal',    SellerRouter.groceryCreateDeal,        Colors.deepOrange),
      ('💰', 'Earnings',       SellerRouter.groceryEarnings,          SellerTheme.successGreen),
      ('🏦', 'Payouts',        SellerRouter.groceryPayouts,           Colors.blue),
      ('↩️', 'Returns',        SellerRouter.groceryReturns,           Colors.red),
      ('👥', 'Customers',      SellerRouter.groceryCustomerInsights,  Colors.cyan),
      ('⭐', 'Ratings',        SellerRouter.groceryRatings,           Colors.amber),
      ('🔔', 'Notifications',  SellerRouter.groceryNotifications,     Colors.deepPurple),
      ('⚙️', 'Settings',      SellerRouter.grocerySettings,          Colors.blueGrey),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Quick Actions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
      const SizedBox(height: 10),
      GridView.count(
        crossAxisCount: 4, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 0.9,
        children: actions.map((a) => GestureDetector(
          onTap: () => Navigator.pushNamed(context, a.$3),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: a.$4.withValues(alpha: 0.07),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: a.$4.withValues(alpha: 0.2)),
            ),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(a.$1, style: const TextStyle(fontSize: 22)),
              const SizedBox(height: 4),
              Text(a.$2, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: a.$4), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
            ]),
          ),
        )).toList(),
      ),
    ]);
  }

  // ── Weekly Revenue Chart ──────────────────────────────────────────────────

  Widget _buildRevenueChart(GrocerySellerState gs, SellerState ss) {
    final raw = gs.dashboardData['weekly'];
    final spots = raw is List
        ? raw.cast<double>()
        : [12400.0, 15200.0, 18400.0, 14100.0, 19800.0, 22300.0, 18400.0];
    final maxY = spots.reduce((a, b) => a > b ? a : b) * 1.25;
    final peakIdx = spots.indexOf(spots.reduce((a, b) => a > b ? a : b));
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: SellerTheme.elevatedCard(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('Revenue Trend (7 Days)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          TextButton(
            onPressed: () => Navigator.pushNamed(context, SellerRouter.groceryAnalytics),
            child: const Text('See Details →', style: TextStyle(color: SellerTheme.grocery, fontSize: 12)),
          ),
        ]),
        Text(
          '${ss.country.currencySymbol} values · Peak on ${days[peakIdx]}',
          style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11),
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 130,
          child: BarChart(BarChartData(
            maxY: maxY,
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              horizontalInterval: maxY / 4,
              getDrawingHorizontalLine: (_) => const FlLine(color: SellerTheme.border, strokeWidth: 1),
            ),
            titlesData: FlTitlesData(
              leftTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles:  const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              topTitles:    const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              bottomTitles: AxisTitles(sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (v, _) => Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(days[v.toInt() % 7], style: const TextStyle(fontSize: 9, color: SellerTheme.textMuted)),
                ),
              )),
            ),
            borderData: FlBorderData(show: false),
            barGroups: spots.asMap().entries.map((e) => BarChartGroupData(
              x: e.key,
              barRods: [BarChartRodData(
                toY: e.value,
                color: e.key == peakIdx ? SellerTheme.grocery : SellerTheme.grocery.withValues(alpha: 0.4),
                width: 22,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
              )],
            )).toList(),
          )),
        ),
      ]),
    );
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  Widget _buildOrderSection(BuildContext context, GrocerySellerState gs, SellerState ss) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        const Text('Live Orders', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        TextButton(
          onPressed: () => Navigator.pushNamed(context, SellerRouter.groceryOrderProcessing),
          child: const Text('View All →', style: TextStyle(color: SellerTheme.grocery, fontWeight: FontWeight.w600, fontSize: 12)),
        ),
      ]),
      const SizedBox(height: 10),
      if (gs.status == GroceryBlocStatus.loading)
        const Center(child: CircularProgressIndicator(color: SellerTheme.grocery))
      else if (gs.orders.isEmpty)
        _emptyOrders()
      else
        ...gs.orders.take(5).map((o) => _GroceryOrderCard(order: o, country: ss.country)),
    ]);
  }

  Widget _emptyOrders() => Container(
    padding: const EdgeInsets.all(32),
    decoration: SellerTheme.cardDecoration(),
    child: const Center(child: Column(children: [
      Text('🛒', style: TextStyle(fontSize: 40)),
      SizedBox(height: 10),
      Text('No active orders', style: TextStyle(color: SellerTheme.textMuted, fontSize: 13)),
    ])),
  );

  // ── Category Health ───────────────────────────────────────────────────────

  Widget _buildCategoryHealth(GrocerySellerState gs, SellerState ss) {
    if (gs.categories.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        const Text('Category Health', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        TextButton(
          onPressed: () => Navigator.pushNamed(context, SellerRouter.groceryCatalog),
          child: const Text('Manage →', style: TextStyle(color: SellerTheme.infoBlue, fontSize: 12, fontWeight: FontWeight.w600)),
        ),
      ]),
      const SizedBox(height: 8),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: SellerTheme.elevatedCard(),
        child: Column(
          children: gs.categories.map((cat) {
            final total   = cat.products.length;
            final avail   = cat.products.where((p) => p.isAvailable).length;
            final lowStk  = cat.products.where((p) => p.stockLevel == StockLevel.low).length;
            final oos     = cat.products.where((p) => p.stockLevel == StockLevel.outOfStock).length;
            final pct     = total == 0 ? 0.0 : avail / total;
            final barClr  = oos > 0 ? SellerTheme.errorRed : lowStk > 0 ? SellerTheme.warningAmber : SellerTheme.successGreen;

            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 7),
              child: Row(children: [
                Text(cat.emoji, style: const TextStyle(fontSize: 18)),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text(cat.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    Text('$avail/$total avail', style: TextStyle(fontSize: 10, color: barClr, fontWeight: FontWeight.w600)),
                  ]),
                  const SizedBox(height: 5),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: pct,
                      minHeight: 5,
                      backgroundColor: barClr.withValues(alpha: 0.1),
                      color: barClr,
                    ),
                  ),
                  if (oos > 0) Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Text('$oos out of stock', style: const TextStyle(fontSize: 9, color: SellerTheme.errorRed, fontWeight: FontWeight.w600)),
                  ),
                ])),
              ]),
            );
          }).toList(),
        ),
      ),
    ]);
  }

  // ── Low Stock ─────────────────────────────────────────────────────────────

  Widget _buildLowStockSection(BuildContext context, GrocerySellerState gs, SellerState ss) {
    if (gs.lowStockProducts.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Row(children: [
          const Icon(Icons.warning_amber_outlined, color: SellerTheme.warningAmber, size: 18),
          const SizedBox(width: 6),
          const Text('Low Stock Alerts', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: SellerTheme.warningAmber, borderRadius: BorderRadius.circular(20)),
            child: Text('${gs.lowStockProducts.length}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
          ),
        ]),
        TextButton(
          onPressed: () => Navigator.pushNamed(context, SellerRouter.groceryLowStock),
          child: const Text('Manage →', style: TextStyle(color: SellerTheme.warningAmber, fontWeight: FontWeight.w600, fontSize: 12)),
        ),
      ]),
      const SizedBox(height: 10),
      ...gs.lowStockProducts.take(4).map((p) => _LowStockCard(product: p, currency: ss.country.currencySymbol)),
    ]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grocery Order Card
// ─────────────────────────────────────────────────────────────────────────────

class _GroceryOrderCard extends StatelessWidget {
  final SellerOrder order;
  final dynamic country;
  const _GroceryOrderCard({required this.order, required this.country});

  static const _gc = SellerTheme.grocery;

  @override
  Widget build(BuildContext context) {
    final age = DateTime.now().difference(order.createdAt);
    final ageLabel = age.inMinutes < 60 ? '${age.inMinutes} min ago' : '${age.inHours}h ago';
    final isUrgent = order.status == SellerOrderStatus.pending && age.inMinutes > 10;

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, SellerRouter.groceryOrderProcessing, arguments: order),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isUrgent ? SellerTheme.errorRed.withValues(alpha: 0.5) : SellerTheme.border),
          boxShadow: [BoxShadow(
            color: isUrgent ? SellerTheme.errorRed.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.04),
            blurRadius: 8, offset: const Offset(0, 2),
          )],
        ),
        child: Column(children: [
          Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: _gc.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: const Center(child: Text('🛒', style: TextStyle(fontSize: 22))),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(order.customerName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13))),
                if (isUrgent) Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: SellerTheme.errorRed, borderRadius: BorderRadius.circular(8)),
                  child: const Text('URGENT', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold)),
                ),
              ]),
              Text('#${order.id} · $ageLabel',
                  style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11)),
              Text('${order.itemCount} items · ${country.currencySymbol} ${order.total.toStringAsFixed(0)}',
                  style: const TextStyle(color: SellerTheme.textSecondary, fontSize: 12)),
            ])),
            OrderStatusChip(status: order.status),
          ]),
          // Inline actions
          if (order.status == SellerOrderStatus.pending) ...[
            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _ActionBtn('✅ Accept', SellerTheme.successGreen, () =>
                  context.read<GrocerySellerBloc>().add(AcceptGroceryOrder(order.id)))),
              const SizedBox(width: 8),
              Expanded(child: _ActionBtn('❌ Reject', SellerTheme.errorRed, () =>
                  context.read<GrocerySellerBloc>().add(RejectGroceryOrder(order.id, 'Out of stock items')))),
            ]),
          ],
          if (order.status == SellerOrderStatus.confirmed) ...[
            const SizedBox(height: 10),
            _ActionBtn('📦 Start Packing', SellerTheme.warningAmber, () =>
                context.read<GrocerySellerBloc>().add(StartPackingGroceryOrder(order.id))),
          ],
          if (order.status == SellerOrderStatus.preparing) ...[
            const SizedBox(height: 10),
            _ActionBtn('🚚 Mark Ready & Dispatch', SellerTheme.infoBlue, () =>
                context.read<GrocerySellerBloc>().add(MarkGroceryOrderReady(order.id))),
          ],
          if (order.status == SellerOrderStatus.ready) ...[
            const SizedBox(height: 10),
            DeliveryDispatchButton(order: order, pickupAddress: 'Store Packing Area', onDispatched: () {}),
          ],
        ]),
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onPressed;
  const _ActionBtn(this.label, this.color, this.onPressed);

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity, height: 36,
    child: ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0),
      child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Low Stock Card
// ─────────────────────────────────────────────────────────────────────────────

class _LowStockCard extends StatelessWidget {
  final GroceryProduct product;
  final String currency;
  const _LowStockCard({required this.product, required this.currency});

  @override
  Widget build(BuildContext context) {
    final isOos = product.stockLevel == StockLevel.outOfStock;
    final color = isOos ? SellerTheme.errorRed : SellerTheme.warningAmber;
    final stockPct = product.minStockQty == 0 ? 0.0
        : (product.stockQty / product.minStockQty).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Row(children: [
          Text(product.emoji, style: const TextStyle(fontSize: 24)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(product.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            Text('Stock: ${product.stockLabel}  ${product.minLabel}',
                style: TextStyle(color: color, fontSize: 11)),
          ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
            child: Text(isOos ? 'Out of Stock' : 'Low Stock',
                style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
          ),
        ]),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: LinearProgressIndicator(
            value: stockPct,
            minHeight: 4,
            backgroundColor: color.withValues(alpha: 0.1),
            color: color,
          ),
        ),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Store toggle
// ─────────────────────────────────────────────────────────────────────────────

class _StoreToggle extends StatelessWidget {
  final bool isOpen;
  const _StoreToggle({required this.isOpen});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.read<GrocerySellerBloc>().add(ToggleGroceryStore(!isOpen)),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isOpen ? Colors.white.withValues(alpha: 0.2) : Colors.black26,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white30),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(
              color: isOpen ? const Color(0xFF4ADE80) : Colors.white54, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(isOpen ? 'Open' : 'Closed',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
        ]),
      ),
    );
  }
}
