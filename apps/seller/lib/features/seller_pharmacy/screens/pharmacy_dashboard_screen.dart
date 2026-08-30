import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_event.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/order_status_chip.dart';
import 'package:kartseek_seller/features/shared/widgets/seller_module_scaffold.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

class PharmacyDashboardScreen extends StatefulWidget {
  const PharmacyDashboardScreen({super.key});

  @override
  State<PharmacyDashboardScreen> createState() =>
      _PharmacyDashboardScreenState();
}

class _PharmacyDashboardScreenState extends State<PharmacyDashboardScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;
  late final Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
    _pulseAnim = Tween(begin: 0.6, end: 1.0)
        .animate(CurvedAnimation(parent: _pulse, curve: Curves.easeInOut));

    final ss = context.read<SellerBloc>().state;
    context
        .read<PharmacySellerBloc>()
        .add(LoadPharmacyDashboard(countryCode: ss.countryCode));
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<PharmacySellerBloc, PharmacySellerState>(
      listenWhen: (p, c) => c.actionMessage != p.actionMessage,
      listener: (_, state) {
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
        builder: (context, ss) =>
            BlocBuilder<PharmacySellerBloc, PharmacySellerState>(
          builder: (context, state) {
            final d = state.dashboardData;
            final cur = ss.country.currencySymbol;

            return SellerModuleScaffold(
              activeRole: SellerRole.pharmacySeller,
              title: 'Pharmacy Dashboard',
              floatingActionButton: FloatingActionButton.extended(
                onPressed: () => Navigator.pushNamed(
                    context, SellerRouter.pharmacyInventory),
                backgroundColor: SellerTheme.pharmacy,
                icon:
                    const Icon(Icons.inventory_2_outlined, color: Colors.white),
                label: const Text('Inventory',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w700)),
              ),
              body: RefreshIndicator(
                color: SellerTheme.pharmacy,
                onRefresh: () async => context
                    .read<PharmacySellerBloc>()
                    .add(LoadPharmacyDashboard(countryCode: ss.countryCode)),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildHero(context, ss, state),
                    const SizedBox(height: 16),
                    _buildOpenToggle(context, state),
                    const SizedBox(height: 16),
                    _buildKpiRow(d, cur, state),
                    const SizedBox(height: 16),
                    if (d['weekly'] != null) ...[
                      _buildWeeklyChart(d, cur),
                      const SizedBox(height: 16),
                    ],
                    _buildQuickActions(context, state),
                    const SizedBox(height: 16),
                    if (state.lowStockCount > 0) ...[
                      _buildLowStockAlert(context, state),
                      const SizedBox(height: 16),
                    ],
                    _buildPrescriptionSection(context, state),
                    const SizedBox(height: 16),
                    _buildRecentOrders(context, state, cur),
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  // ── Hero Card ──────────────────────────────────────────────────────────────

  Widget _buildHero(
      BuildContext context, SellerState ss, PharmacySellerState state) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            SellerTheme.pharmacy,
            SellerTheme.pharmacy.withValues(alpha: 0.75)
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: SellerTheme.pharmacy.withValues(alpha: 0.3),
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
              Text('💊', style: TextStyle(fontSize: 26)),
              SizedBox(width: 10),
              Expanded(
                child: Text('Pharmacy Partner',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 19,
                        fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis),
              ),
            ]),
            const SizedBox(height: 4),
            Text('${ss.country.flag} ${ss.country.name}',
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85), fontSize: 13)),
            const SizedBox(height: 8),
            Row(children: [
              AnimatedBuilder(
                animation: _pulseAnim,
                builder: (_, __) => Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(right: 6),
                  decoration: BoxDecoration(
                    color: state.isOpen
                        ? Colors.greenAccent.withValues(alpha: _pulseAnim.value)
                        : Colors.redAccent,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Text(
                state.isOpen ? 'Open for orders' : 'Closed',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w500),
              ),
              if (state.pendingPrescriptionCount > 0) ...[
                const SizedBox(width: 12),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${state.pendingPrescriptionCount} Rx pending',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ]),
          ]),
        ),
        if (state.pendingOrderCount > 0)
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white54),
            ),
            child:
                Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('${state.pendingOrderCount}',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold)),
              const Text('new',
                  style: TextStyle(color: Colors.white70, fontSize: 9)),
            ]),
          ),
      ]),
    );
  }

  // ── Open / Closed Toggle ───────────────────────────────────────────────────

  Widget _buildOpenToggle(BuildContext context, PharmacySellerState state) =>
      Container(
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
                state.isOpen
                    ? Icons.local_pharmacy
                    : Icons.local_pharmacy_outlined,
                color: state.isOpen
                    ? SellerTheme.successGreen
                    : SellerTheme.errorRed,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      state.isOpen ? 'Pharmacy Open' : 'Pharmacy Closed',
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
                          ? 'Accepting prescriptions & OTC orders'
                          : 'Tap to open pharmacy',
                      style: const TextStyle(
                          fontSize: 11, color: SellerTheme.textMuted),
                    ),
                  ]),
            ),
            Switch(
              value: state.isOpen,
              onChanged: (v) =>
                  context.read<PharmacySellerBloc>().add(TogglePharmacyOpen(v)),
              activeTrackColor: SellerTheme.successGreen,
              inactiveTrackColor: SellerTheme.errorRed.withValues(alpha: 0.4),
            ),
          ]),
        ),
      );

  // ── KPI Row ────────────────────────────────────────────────────────────────

  Widget _buildKpiRow(
      Map<String, dynamic> d, String cur, PharmacySellerState state) {
    final orders = d['orders'] ?? 0;
    final revenue = d['revenue'] ?? 0;
    final pendRx = d['pending_rx'] ?? state.pendingPrescriptionCount;
    final lowStock = d['low_stock'] ?? state.lowStockCount;

    return Row(children: [
      _kpi('$orders', 'Orders Today', Icons.receipt_outlined,
          SellerTheme.pharmacy),
      const SizedBox(width: 10),
      _kpi('$cur ${_fmt(revenue)}', 'Revenue', Icons.payments_outlined,
          SellerTheme.successGreen),
      const SizedBox(width: 10),
      _kpi('$pendRx', 'Pending Rx', Icons.document_scanner_outlined,
          SellerTheme.warningAmber),
      const SizedBox(width: 10),
      _kpi('$lowStock', 'Low Stock', Icons.warning_amber_outlined,
          SellerTheme.errorRed),
    ]);
  }

  Widget _kpi(String value, String label, IconData icon, Color color) =>
      Expanded(
        child: Container(
          decoration: SellerTheme.elevatedCard(),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
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
                style:
                    const TextStyle(fontSize: 9, color: SellerTheme.textMuted),
                textAlign: TextAlign.center,
                maxLines: 1),
          ]),
        ),
      );

  // ── Weekly Bar Chart ───────────────────────────────────────────────────────

  Widget _buildWeeklyChart(Map<String, dynamic> d, String cur) {
    final raw = List<double>.from(d['weekly'] as List);
    final maxVal = raw.reduce((a, b) => a > b ? a : b);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Container(
      decoration: SellerTheme.elevatedCard(),
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Weekly Revenue',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 14),
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
                          ? SellerTheme.pharmacy
                          : SellerTheme.pharmacy.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(days[i],
                      style: TextStyle(
                          fontSize: 9,
                          color: isToday
                              ? SellerTheme.pharmacy
                              : SellerTheme.textMuted,
                          fontWeight:
                              isToday ? FontWeight.bold : FontWeight.normal)),
                ]),
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        Text('Today: $cur ${_fmt(raw[6].toInt())}',
            style: const TextStyle(
                fontSize: 11,
                color: SellerTheme.textSecondary,
                fontWeight: FontWeight.w500)),
      ]),
    );
  }

  // ── Quick Actions ──────────────────────────────────────────────────────────

  Widget _buildQuickActions(BuildContext context, PharmacySellerState state) {
    final actions = [
      (
        '📄',
        'Review Rx',
        SellerRouter.pharmacyPrescription,
        SellerTheme.pharmacy,
        state.pendingPrescriptionCount > 0
            ? '${state.pendingPrescriptionCount}'
            : null
      ),
      (
        '🚚',
        'Orders',
        SellerRouter.pharmacyOrderDetail,
        SellerTheme.warningAmber,
        state.pendingOrderCount > 0 ? '${state.pendingOrderCount}' : null
      ),
      (
        '📦',
        'Inventory',
        SellerRouter.pharmacyInventory,
        SellerTheme.successGreen,
        state.lowStockCount > 0 ? '${state.lowStockCount} low' : null
      ),
    ];

    return Row(
      children: actions
          .map((a) => Expanded(
                child: GestureDetector(
                  onTap: () => Navigator.pushNamed(context, a.$3),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: a.$4.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: a.$4.withValues(alpha: 0.25)),
                    ),
                    child: Column(children: [
                      Stack(children: [
                        Text(a.$1, style: const TextStyle(fontSize: 22)),
                        if (a.$5 != null)
                          Positioned(
                            right: -2,
                            top: -2,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: a.$4,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(a.$5!,
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.bold)),
                            ),
                          ),
                      ]),
                      const SizedBox(height: 6),
                      Text(a.$2,
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: a.$4)),
                    ]),
                  ),
                ),
              ))
          .toList(),
    );
  }

  // ── Low Stock Alert ────────────────────────────────────────────────────────

  Widget _buildLowStockAlert(BuildContext context, PharmacySellerState state) =>
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: SellerTheme.errorRed.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(14),
          border:
              Border.all(color: SellerTheme.errorRed.withValues(alpha: 0.3)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.warning_amber_rounded,
                color: SellerTheme.errorRed, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${state.outOfStockCount > 0 ? '${state.outOfStockCount} out of stock · ' : ''}${state.lowStockCount} items need restocking',
                style: const TextStyle(
                    color: SellerTheme.errorRed,
                    fontWeight: FontWeight.w600,
                    fontSize: 13),
              ),
            ),
            GestureDetector(
              onTap: () =>
                  Navigator.pushNamed(context, SellerRouter.pharmacyInventory),
              child: const Text('View →',
                  style: TextStyle(
                      color: SellerTheme.pharmacy,
                      fontSize: 11,
                      fontWeight: FontWeight.w600)),
            ),
          ]),
          const SizedBox(height: 8),
          ...state.lowStockItems.take(3).map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(children: [
                  Text(item.emoji, style: const TextStyle(fontSize: 14)),
                  const SizedBox(width: 8),
                  Expanded(
                      child: Text(item.name,
                          style: const TextStyle(
                              fontSize: 12, color: SellerTheme.textPrimary),
                          overflow: TextOverflow.ellipsis)),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: item.isOutOfStock
                          ? SellerTheme.errorRed
                          : SellerTheme.warningAmber,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      item.isOutOfStock ? 'OUT' : '${item.stock} left',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ]),
              )),
          if (state.lowStockItems.length > 3)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                '+ ${state.lowStockItems.length - 3} more items...',
                style:
                    const TextStyle(color: SellerTheme.textMuted, fontSize: 11),
              ),
            ),
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () => context
                .read<PharmacySellerBloc>()
                .add(const BulkRestockLowItems()),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 9),
              decoration: BoxDecoration(
                color: SellerTheme.errorRed,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text('🔄  Restock All Low-Stock Items',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12)),
            ),
          ),
        ]),
      );

  // ── Prescription Section ───────────────────────────────────────────────────

  Widget _buildPrescriptionSection(
      BuildContext context, PharmacySellerState state) {
    final pending =
        state.prescriptions.where((p) => p.status == 'pending').toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Text('Prescriptions',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: SellerTheme.textPrimary)),
        if (pending.isNotEmpty) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: SellerTheme.warningAmber,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text('${pending.length} pending',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold)),
          ),
        ],
        const Spacer(),
        GestureDetector(
          onTap: () =>
              Navigator.pushNamed(context, SellerRouter.pharmacyPrescription),
          child: const Text('View All',
              style: TextStyle(
                  color: SellerTheme.pharmacy,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ),
      ]),
      const SizedBox(height: 10),
      if (state.prescriptions.isEmpty)
        Container(
          decoration: SellerTheme.elevatedCard(),
          padding: const EdgeInsets.all(20),
          child: const Center(
              child: Text('No prescriptions to review',
                  style: TextStyle(color: SellerTheme.textMuted))),
        )
      else
        ...state.prescriptions.take(3).map((rx) => _rxCard(context, rx)),
    ]);
  }

  Widget _rxCard(BuildContext context, PrescriptionModel rx) {
    final statusColor = rx.status == 'verified'
        ? SellerTheme.successGreen
        : rx.status == 'rejected'
            ? SellerTheme.errorRed
            : rx.status == 'info_needed'
                ? SellerTheme.infoBlue
                : SellerTheme.warningAmber;
    final statusLabel =
        rx.status == 'info_needed' ? 'INFO NEEDED' : rx.status.toUpperCase();

    return GestureDetector(
      onTap: () =>
          Navigator.pushNamed(context, SellerRouter.pharmacyPrescription),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: SellerTheme.elevatedCard(),
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Row(children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: SellerTheme.pharmacy.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                  child: Text('📄', style: TextStyle(fontSize: 20))),
            ),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text('Rx #${rx.id}',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(rx.customerName,
                      style: const TextStyle(
                          color: SellerTheme.textSecondary, fontSize: 12)),
                  Text(rx.doctorName,
                      style: const TextStyle(
                          color: SellerTheme.textMuted, fontSize: 10),
                      overflow: TextOverflow.ellipsis),
                ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(statusLabel,
                    style: TextStyle(
                        color: statusColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 4),
              Text(_elapsed(rx.uploadedAt),
                  style: const TextStyle(
                      fontSize: 9, color: SellerTheme.textMuted)),
            ]),
          ]),
        ),
      ),
    );
  }

  // ── Recent Orders ──────────────────────────────────────────────────────────

  Widget _buildRecentOrders(
      BuildContext context, PharmacySellerState state, String cur) {
    final orders = state.orders.take(4).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Text('Recent Orders',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: SellerTheme.textPrimary)),
        const Spacer(),
        GestureDetector(
          onTap: () =>
              Navigator.pushNamed(context, SellerRouter.pharmacyOrderDetail),
          child: const Text('View All',
              style: TextStyle(
                  color: SellerTheme.pharmacy,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
        ),
      ]),
      const SizedBox(height: 10),
      if (orders.isEmpty)
        Container(
          decoration: SellerTheme.elevatedCard(),
          padding: const EdgeInsets.all(24),
          child: const Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('🎉', style: TextStyle(fontSize: 36)),
            SizedBox(height: 8),
            Text('All caught up!',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          ])),
        )
      else
        ...orders.map((o) => _orderCard(context, o, cur)),
    ]);
  }

  Widget _orderCard(BuildContext context, SellerOrder o, String cur) {
    final hasPrescription = o.moduleData['hasPrescription'] == true;
    final elapsed = DateTime.now().difference(o.createdAt).inMinutes;
    final isUrgent = o.status == SellerOrderStatus.pending && elapsed > 10;

    return GestureDetector(
      onTap: () => Navigator.pushNamed(
          context, SellerRouter.pharmacyOrderDetail,
          arguments: o),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isUrgent
                ? SellerTheme.errorRed.withValues(alpha: 0.4)
                : SellerTheme.border,
          ),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2)),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Row(children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: SellerTheme.pharmacy.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('💊', style: TextStyle(fontSize: 18)),
                    if (hasPrescription)
                      const Text('Rx',
                          style: TextStyle(
                              fontSize: 8,
                              color: SellerTheme.pharmacy,
                              fontWeight: FontWeight.bold)),
                  ]),
            ),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(o.id,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(o.customerName,
                      style: const TextStyle(
                          color: SellerTheme.textSecondary, fontSize: 12),
                      overflow: TextOverflow.ellipsis),
                  Row(children: [
                    if (isUrgent)
                      Container(
                        margin: const EdgeInsets.only(right: 4),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                            color: SellerTheme.errorRed,
                            borderRadius: BorderRadius.circular(4)),
                        child: const Text('URGENT',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 8,
                                fontWeight: FontWeight.bold)),
                      ),
                    Text('${elapsed}m ago',
                        style: const TextStyle(
                            color: SellerTheme.textMuted, fontSize: 10)),
                  ]),
                ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('$cur ${o.total.toStringAsFixed(0)}',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: SellerTheme.pharmacy)),
              const SizedBox(height: 4),
              OrderStatusChip(status: o.status),
            ]),
          ]),
        ),
      ),
    );
  }

  String _elapsed(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${dt.day}/${dt.month}';
  }

  String _fmt(int v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}K';
    return '$v';
  }
}
