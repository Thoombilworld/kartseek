import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_event.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/delivery_dispatch_button.dart';
import 'package:kartseek_seller/features/shared/widgets/order_status_chip.dart';
import 'package:kartseek_seller/features/shared/widgets/seller_module_scaffold.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

class RestaurantDashboardScreen extends StatefulWidget {
  const RestaurantDashboardScreen({super.key});

  @override
  State<RestaurantDashboardScreen> createState() =>
      _RestaurantDashboardScreenState();
}

class _RestaurantDashboardScreenState extends State<RestaurantDashboardScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseAnim;
  bool _liveMode = true;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
    _pulseAnim = Tween(begin: 0.7, end: 1.0)
        .animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));

    final ss = context.read<SellerBloc>().state;
    context
        .read<RestaurantSellerBloc>()
        .add(LoadRestaurantDashboard(countryCode: ss.countryCode));
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<RestaurantSellerBloc, RestaurantSellerState>(
      listener: (context, state) {
        if (state.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.actionMessage!),
            backgroundColor: (state.actionSuccess ?? true)
                ? SellerTheme.successGreen
                : SellerTheme.errorRed,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<SellerBloc, SellerState>(
        builder: (context, sellerState) {
          return BlocBuilder<RestaurantSellerBloc, RestaurantSellerState>(
            builder: (context, state) {
              final d = state.dashboardData;
              final cur = sellerState.country.currencySymbol;

              return SellerModuleScaffold(
                activeRole: SellerRole.restaurantOwner,
                title: 'Restaurant Dashboard',
                floatingActionButton: FloatingActionButton.extended(
                  onPressed: () =>
                      Navigator.pushNamed(context, SellerRouter.restaurantMenu),
                  backgroundColor: SellerTheme.restaurant,
                  icon: const Icon(Icons.restaurant_menu, color: Colors.white),
                  label: const Text('Menu',
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.w700)),
                ),
                body: RefreshIndicator(
                  color: SellerTheme.restaurant,
                  onRefresh: () async {
                    context.read<RestaurantSellerBloc>().add(
                          LoadRestaurantDashboard(
                              countryCode: sellerState.countryCode),
                        );
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // ── Hero header ──────────────────────────────────────
                      _buildHeroHeader(context, sellerState, state),
                      const SizedBox(height: 16),

                      // ── Open/Closed toggle ───────────────────────────────
                      _buildOpenToggle(context, state),
                      const SizedBox(height: 16),

                      // ── KPI Row ──────────────────────────────────────────
                      _buildKpiRow(d, cur),
                      const SizedBox(height: 16),

                      // ── Weekly Revenue Bar Chart ─────────────────────────
                      if (d['weekly'] != null) ...[
                        _buildWeeklyChart(d, cur),
                        const SizedBox(height: 16),
                      ],

                      // ── Live Orders ──────────────────────────────────────
                      _buildLiveOrdersHeader(context, state),
                      const SizedBox(height: 8),
                      if (state.allOrders.isEmpty)
                        _emptyOrders()
                      else
                        ...state.activeOrders
                            .take(5)
                            .map((o) => _OrderCard(order: o, state: state)),

                      if (state.activeOrders.length > 5) ...[
                        const SizedBox(height: 8),
                        _viewAllOrdersButton(context),
                      ],
                      const SizedBox(height: 16),

                      // ── Table Snapshot ───────────────────────────────────
                      _buildTableSnapshot(context, state),
                      const SizedBox(height: 16),

                      // ── Performance Metrics ──────────────────────────────
                      _buildPerformanceMetrics(d, sellerState),
                      const SizedBox(height: 100),
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

  // ── Hero Header ─────────────────────────────────────────────────────────────

  Widget _buildHeroHeader(
      BuildContext context, SellerState ss, RestaurantSellerState rs) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            SellerTheme.restaurant,
            SellerTheme.restaurant.withValues(alpha: 0.75),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: SellerTheme.restaurant.withValues(alpha: 0.3),
              blurRadius: 12,
              offset: const Offset(0, 4)),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Row(children: [
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Row(children: [
              Text('🍽️', style: TextStyle(fontSize: 24)),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Restaurant Partner',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ]),
            const SizedBox(height: 4),
            Text(
              '${ss.country.flag} ${ss.country.name}',
              style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.85), fontSize: 13),
            ),
            const SizedBox(height: 8),
            Row(children: [
              _liveDot(),
              const SizedBox(width: 6),
              Text(
                rs.isOpen ? 'Open for orders' : 'Closed',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w500),
              ),
            ]),
          ]),
        ),
        // Pending badge
        if (rs.pendingCount > 0)
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white54),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '${rs.pendingCount}',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold),
                ),
                const Text('new',
                    style: TextStyle(color: Colors.white70, fontSize: 9)),
              ],
            ),
          ),
      ]),
    );
  }

  Widget _liveDot() {
    return AnimatedBuilder(
      animation: _pulseAnim,
      builder: (_, __) => Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          color: _liveMode
              ? Colors.greenAccent.withValues(alpha: _pulseAnim.value)
              : Colors.redAccent,
          shape: BoxShape.circle,
        ),
      ),
    );
  }

  // ── Open / Closed Toggle ────────────────────────────────────────────────────

  Widget _buildOpenToggle(BuildContext context, RestaurantSellerState state) {
    return Container(
      decoration: SellerTheme.elevatedCard(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: (state.isOpen
                      ? SellerTheme.successGreen
                      : SellerTheme.errorRed)
                  .withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              state.isOpen ? Icons.store : Icons.store_mall_directory_outlined,
              color: state.isOpen
                  ? SellerTheme.successGreen
                  : SellerTheme.errorRed,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                state.isOpen ? 'Restaurant Open' : 'Restaurant Closed',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: state.isOpen
                      ? SellerTheme.successGreen
                      : SellerTheme.errorRed,
                ),
              ),
              Text(
                state.isOpen
                    ? 'Accepting dine-in, takeaway & delivery'
                    : 'Tap to open restaurant',
                style:
                    const TextStyle(fontSize: 11, color: SellerTheme.textMuted),
              ),
            ]),
          ),
          Switch(
            value: state.isOpen,
            onChanged: (v) {
              setState(() => _liveMode = v);
              context.read<RestaurantSellerBloc>().add(ToggleRestaurantOpen(v));
            },
            activeTrackColor: SellerTheme.successGreen,
            inactiveTrackColor: SellerTheme.errorRed.withValues(alpha: 0.4),
          ),
        ]),
      ),
    );
  }

  // ── KPI Row ─────────────────────────────────────────────────────────────────

  Widget _buildKpiRow(Map<String, dynamic> d, String cur) {
    final ordersToday = d['orders_today'] ?? 0;
    final revenue = d['revenue'] ?? 0;
    final tables = d['tables_occupied'] ?? 0;
    final avgPrep = d['avg_prep'] ?? 0;

    return Row(
        children: [
      _kpi('$ordersToday', 'Orders Today', Icons.receipt_long,
          SellerTheme.restaurant),
      const SizedBox(width: 10),
      _kpi('$cur ${_fmt(revenue)}', 'Revenue', Icons.payments_outlined,
          SellerTheme.successGreen),
      const SizedBox(width: 10),
      _kpi('$tables', 'Tables Busy', Icons.table_bar, SellerTheme.warningAmber),
      const SizedBox(width: 10),
      _kpi('${avgPrep}m', 'Avg Prep', Icons.timer_outlined,
          SellerTheme.infoBlue),
    ].expand((w) => [w]).toList());
  }

  Widget _kpi(String value, String label, IconData icon, Color color) {
    return Expanded(
      child: Container(
        decoration: SellerTheme.elevatedCard(),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Icon(icon, size: 16, color: color),
          ),
          const SizedBox(height: 6),
          Text(value,
              style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.bold, color: color),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          Text(label,
              style: const TextStyle(fontSize: 9, color: SellerTheme.textMuted),
              textAlign: TextAlign.center,
              maxLines: 1),
        ]),
      ),
    );
  }

  // ── Weekly Bar Chart ─────────────────────────────────────────────────────────

  Widget _buildWeeklyChart(Map<String, dynamic> d, String cur) {
    final raw = List<double>.from(d['weekly'] as List);
    final maxVal = raw.reduce((a, b) => a > b ? a : b);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Weekly Revenue',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: SellerTheme.textPrimary)),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: List.generate(7, (i) {
            final pct = maxVal == 0 ? 0.0 : raw[i] / maxVal;
            final isToday = i == 6;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: Column(children: [
                  AnimatedContainer(
                    duration: Duration(milliseconds: 400 + i * 60),
                    height: 80 * pct,
                    decoration: BoxDecoration(
                      color: isToday
                          ? SellerTheme.restaurant
                          : SellerTheme.restaurant.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(days[i],
                      style: TextStyle(
                          fontSize: 9,
                          color: isToday
                              ? SellerTheme.restaurant
                              : SellerTheme.textMuted,
                          fontWeight:
                              isToday ? FontWeight.bold : FontWeight.normal)),
                ]),
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        Text(
          'Today: $cur ${_fmt(raw[6].toInt())}',
          style: const TextStyle(
              fontSize: 11,
              color: SellerTheme.textSecondary,
              fontWeight: FontWeight.w500),
        ),
      ]),
    );
  }

  // ── Live Orders Section ──────────────────────────────────────────────────────

  Widget _buildLiveOrdersHeader(
      BuildContext context, RestaurantSellerState state) {
    return Row(children: [
      AnimatedBuilder(
        animation: _pulseAnim,
        builder: (_, __) => Container(
          width: 8,
          height: 8,
          margin: const EdgeInsets.only(right: 8),
          decoration: BoxDecoration(
            color: SellerTheme.restaurant.withValues(alpha: _pulseAnim.value),
            shape: BoxShape.circle,
          ),
        ),
      ),
      const Text('Live Orders',
          style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: SellerTheme.textPrimary)),
      const SizedBox(width: 8),
      if (state.pendingCount > 0)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: SellerTheme.warningAmber,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text('${state.pendingCount} pending',
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold)),
        ),
      const Spacer(),
      GestureDetector(
        onTap: () =>
            Navigator.pushNamed(context, SellerRouter.restaurantOrders),
        child: const Text('View All',
            style: TextStyle(
                color: SellerTheme.restaurant,
                fontSize: 12,
                fontWeight: FontWeight.w600)),
      ),
    ]);
  }

  Widget _emptyOrders() => Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        decoration: SellerTheme.elevatedCard(),
        padding: const EdgeInsets.all(24),
        child: const Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('🎉', style: TextStyle(fontSize: 36)),
            SizedBox(height: 8),
            Text('All caught up!',
                style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: SellerTheme.textPrimary)),
            SizedBox(height: 4),
            Text('No active orders right now.',
                style: TextStyle(color: SellerTheme.textMuted, fontSize: 12)),
          ]),
        ),
      );

  Widget _viewAllOrdersButton(BuildContext context) => Center(
        child: TextButton.icon(
          onPressed: () =>
              Navigator.pushNamed(context, SellerRouter.restaurantOrders),
          icon: const Icon(Icons.list_alt,
              size: 14, color: SellerTheme.restaurant),
          label: const Text('View All Orders',
              style: TextStyle(
                  color: SellerTheme.restaurant,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ),
      );

  // ── Table Snapshot ───────────────────────────────────────────────────────────

  Widget _buildTableSnapshot(
      BuildContext context, RestaurantSellerState state) {
    if (state.tables.isEmpty) return const SizedBox();
    final occupied =
        state.tables.where((t) => t.status == TableStatus.occupied).length;
    final available =
        state.tables.where((t) => t.status == TableStatus.available).length;
    final reserved =
        state.tables.where((t) => t.status == TableStatus.reserved).length;
    final cleaning =
        state.tables.where((t) => t.status == TableStatus.cleaning).length;

    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('Table Overview',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: SellerTheme.textPrimary)),
          const Spacer(),
          GestureDetector(
            onTap: () =>
                Navigator.pushNamed(context, SellerRouter.restaurantTables),
            child: const Text('Manage',
                style: TextStyle(
                    color: SellerTheme.restaurant,
                    fontSize: 12,
                    fontWeight: FontWeight.w600)),
          ),
        ]),
        const SizedBox(height: 12),
        // Occupancy bar
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: state.tables.isEmpty ? 0 : occupied / state.tables.length,
            minHeight: 8,
            color: SellerTheme.restaurant,
            backgroundColor: SellerTheme.restaurant.withValues(alpha: 0.1),
          ),
        ),
        const SizedBox(height: 12),
        // Status pills
        Row(children: [
          _tablePill('$occupied Occupied', SellerTheme.restaurant),
          const SizedBox(width: 8),
          _tablePill('$available Free', SellerTheme.successGreen),
          const SizedBox(width: 8),
          _tablePill('$reserved Reserved', SellerTheme.infoBlue),
          if (cleaning > 0) ...[
            const SizedBox(width: 8),
            _tablePill('$cleaning Cleaning', SellerTheme.textMuted),
          ],
        ]),
        const SizedBox(height: 12),
        // Mini table grid (first 8)
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: state.tables.take(8).map((t) {
            final color = switch (t.status) {
              TableStatus.occupied => SellerTheme.restaurant,
              TableStatus.reserved => SellerTheme.infoBlue,
              TableStatus.cleaning => SellerTheme.warningAmber,
              TableStatus.available => SellerTheme.successGreen,
            };
            return Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: color.withValues(alpha: 0.5)),
              ),
              child: Center(
                child: Text(
                  'T${t.number}',
                  style: TextStyle(
                      fontSize: 10, fontWeight: FontWeight.bold, color: color),
                ),
              ),
            );
          }).toList(),
        ),
      ]),
    );
  }

  Widget _tablePill(String label, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label,
            style: TextStyle(
                color: color, fontSize: 10, fontWeight: FontWeight.w600)),
      );

  // ── Performance Metrics ──────────────────────────────────────────────────────

  Widget _buildPerformanceMetrics(Map<String, dynamic> d, SellerState ss) {
    final rating = d['rating'] ?? 0.0;
    final reviews = d['reviews'] ?? 0;
    final avgPrep = d['avg_prep'] ?? 0;

    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Performance',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: SellerTheme.textPrimary)),
        const SizedBox(height: 14),
        _metricRow('⭐ Rating', '$rating/5 ($reviews reviews)', rating / 5,
            SellerTheme.warningAmber),
        const SizedBox(height: 10),
        _metricRow('⏱️ Avg Prep Time', '$avgPrep min',
            ((60 - avgPrep) / 60).clamp(0.0, 1.0), SellerTheme.infoBlue),
        const SizedBox(height: 10),
        _metricRow('✅ Order Acceptance', '96%', 0.96, SellerTheme.successGreen),
      ]),
    );
  }

  Widget _metricRow(String label, String value, double progress, Color color) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Text(label,
            style: const TextStyle(
                fontSize: 12, color: SellerTheme.textSecondary)),
        const Spacer(),
        Text(value,
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.bold, color: color)),
      ]),
      const SizedBox(height: 4),
      ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: LinearProgressIndicator(
          value: progress,
          minHeight: 5,
          color: color,
          backgroundColor: color.withValues(alpha: 0.1),
        ),
      ),
    ]);
  }

  String _fmt(int v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}K';
    return '$v';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Card for Dashboard
// ─────────────────────────────────────────────────────────────────────────────

class _OrderCard extends StatelessWidget {
  final SellerOrder order;
  final RestaurantSellerState state;
  const _OrderCard({required this.order, required this.state});

  @override
  Widget build(BuildContext context) {
    final mode = order.moduleData['order_mode'] as String? ?? 'takeaway';
    final modeEmoji = mode == 'dine_in'
        ? '🍽️'
        : mode == 'delivery'
            ? '🚚'
            : '📦';
    final modeLabel = mode == 'dine_in'
        ? 'Dine-in'
        : mode == 'delivery'
            ? 'Delivery'
            : 'Takeaway';
    final tableNum = order.moduleData['table_number'] as String?;
    final cur = context.read<SellerBloc>().state.country.currencySymbol;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: SellerTheme.elevatedCard(),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Header row
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: SellerTheme.restaurant.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('$modeEmoji $modeLabel',
                  style: const TextStyle(
                      fontSize: 11,
                      color: SellerTheme.restaurant,
                      fontWeight: FontWeight.bold)),
            ),
            if (tableNum != null) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: SellerTheme.infoBlue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('Table $tableNum',
                    style: const TextStyle(
                        fontSize: 11,
                        color: SellerTheme.infoBlue,
                        fontWeight: FontWeight.w600)),
              ),
            ],
            const Spacer(),
            OrderStatusChip(status: order.status),
          ]),
          const SizedBox(height: 8),
          // Customer & total
          Row(children: [
            const Icon(Icons.person_outline,
                size: 14, color: SellerTheme.textMuted),
            const SizedBox(width: 4),
            Expanded(
              child: Text(order.customerName,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: SellerTheme.textPrimary),
                  overflow: TextOverflow.ellipsis),
            ),
            Text('$cur ${order.total.toStringAsFixed(0)}',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: SellerTheme.restaurant)),
          ]),
          const SizedBox(height: 4),
          Text(order.id,
              style:
                  const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
          const SizedBox(height: 10),
          // Action buttons
          Row(children: [
            if (order.status == SellerOrderStatus.pending)
              _actionBtn(
                context,
                '✅ Accept',
                SellerTheme.successGreen,
                () => context
                    .read<RestaurantSellerBloc>()
                    .add(AcceptRestaurantOrder(order.id)),
              ),
            if (order.status == SellerOrderStatus.confirmed)
              _actionBtn(
                context,
                '🍳 Preparing',
                SellerTheme.warningAmber,
                () => context
                    .read<RestaurantSellerBloc>()
                    .add(MarkRestaurantOrderPreparing(order.id)),
              ),
            if (order.status == SellerOrderStatus.preparing)
              _actionBtn(
                context,
                '📦 Ready',
                SellerTheme.infoBlue,
                () => context
                    .read<RestaurantSellerBloc>()
                    .add(MarkRestaurantOrderReady(order.id)),
              ),
            const SizedBox(width: 8),
            if (mode == 'delivery' && order.status == SellerOrderStatus.ready)
              DeliveryDispatchButton(order: order),
            const Spacer(),
            GestureDetector(
              onTap: () => Navigator.pushNamed(
                context,
                SellerRouter.restaurantOrderDetail,
                arguments: order,
              ),
              child: const Text('Details →',
                  style: TextStyle(
                      color: SellerTheme.restaurant,
                      fontSize: 11,
                      fontWeight: FontWeight.w600)),
            ),
          ]),
        ]),
      ),
    );
  }

  Widget _actionBtn(
      BuildContext context, String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(label,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.bold)),
      ),
    );
  }
}
