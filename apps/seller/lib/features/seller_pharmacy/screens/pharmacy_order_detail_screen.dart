import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_event.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/delivery_dispatch_button.dart';
import 'package:kartseek_seller/features/shared/widgets/order_status_chip.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Pharmacy Order Processing Screen
//
// Replaces the old PharmacyOrderDetailScreen. Now shows a full 5-tab layout:
//   All · Pending · Dispensing · Ready · Delivered
// with per-order accept / dispense / reject / dispatch actions inline.
// ─────────────────────────────────────────────────────────────────────────────

class PharmacyOrderDetailScreen extends StatefulWidget {
  final dynamic order;
  const PharmacyOrderDetailScreen({super.key, this.order});

  @override
  State<PharmacyOrderDetailScreen> createState() =>
      _PharmacyOrderDetailScreenState();
}

class _PharmacyOrderDetailScreenState extends State<PharmacyOrderDetailScreen>
    with SingleTickerProviderStateMixin {
  static const _tabs = [
    (label: 'All', status: 'all'),
    (label: 'Pending', status: 'pending'),
    (label: 'Dispensing', status: 'dispensing'),
    (label: 'Ready', status: 'ready'),
    (label: 'Delivered', status: 'delivered'),
  ];

  late TabController _tabCtrl;
  static const _pharma = Color(0xFF3B82F6);

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this);
    _tabCtrl.addListener(() {
      if (!_tabCtrl.indexIsChanging) {
        context
            .read<PharmacySellerBloc>()
            .add(SelectPharmacyOrderTab(_tabs[_tabCtrl.index].status));
      }
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
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
            final cur = ss.country.currencySymbol;
            return Scaffold(
              backgroundColor: SellerTheme.surface,
              appBar: AppBar(
                backgroundColor: _pharma,
                foregroundColor: Colors.white,
                elevation: 0,
                title: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Order Processing',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold)),
                      Text(
                          '${state.orders.length} orders · ${state.pendingOrderCount} pending',
                          style: const TextStyle(
                              fontSize: 11, color: Colors.white70)),
                    ]),
                bottom: TabBar(
                  controller: _tabCtrl,
                  indicatorColor: Colors.white,
                  indicatorWeight: 3,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white60,
                  labelStyle: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.bold),
                  unselectedLabelStyle: const TextStyle(fontSize: 10),
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  tabs: _tabs.map((t) {
                    final count = _tabCount(state, t.status);
                    return Tab(
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Text(t.label),
                        if (count > 0) ...[
                          const SizedBox(width: 5),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text('$count',
                                style: const TextStyle(fontSize: 9)),
                          ),
                        ],
                      ]),
                    );
                  }).toList(),
                ),
              ),
              body: TabBarView(
                controller: _tabCtrl,
                children: _tabs
                    .map((t) => _OrderList(
                          tab: t.status,
                          state: state,
                          cur: cur,
                          pharmaColor: _pharma,
                        ))
                    .toList(),
              ),
            );
          },
        ),
      ),
    );
  }

  int _tabCount(PharmacySellerState state, String tab) {
    if (tab == 'all') return state.orders.length;
    final statusMap = {
      'pending': SellerOrderStatus.pending,
      'dispensing': SellerOrderStatus.preparing,
      'ready': SellerOrderStatus.ready,
      'delivered': SellerOrderStatus.delivered,
    };
    final s = statusMap[tab];
    return s != null ? state.orders.where((o) => o.status == s).length : 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order List Widget
// ─────────────────────────────────────────────────────────────────────────────

class _OrderList extends StatelessWidget {
  final String tab;
  final PharmacySellerState state;
  final String cur;
  final Color pharmaColor;

  const _OrderList({
    required this.tab,
    required this.state,
    required this.cur,
    required this.pharmaColor,
  });

  List<SellerOrder> get orders {
    if (tab == 'all') return state.orders;
    final statusMap = {
      'pending': SellerOrderStatus.pending,
      'dispensing': SellerOrderStatus.preparing,
      'ready': SellerOrderStatus.ready,
      'delivered': SellerOrderStatus.delivered,
    };
    final s = statusMap[tab];
    return s != null
        ? state.orders.where((o) => o.status == s).toList()
        : state.orders;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = orders;
    if (filtered.isEmpty) {
      return const Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text('💊', style: TextStyle(fontSize: 48)),
          SizedBox(height: 12),
          Text('No orders in this category',
              style: TextStyle(color: SellerTheme.textSecondary, fontSize: 14)),
        ]),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(14),
      itemCount: filtered.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, i) => _PharmacyOrderCard(
        order: filtered[i],
        cur: cur,
        pharmaColor: pharmaColor,
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Order Card
// ─────────────────────────────────────────────────────────────────────────────

class _PharmacyOrderCard extends StatefulWidget {
  final SellerOrder order;
  final String cur;
  final Color pharmaColor;

  const _PharmacyOrderCard({
    required this.order,
    required this.cur,
    required this.pharmaColor,
  });

  @override
  State<_PharmacyOrderCard> createState() => _PharmacyOrderCardState();
}

class _PharmacyOrderCardState extends State<_PharmacyOrderCard> {
  bool _expanded = false;
  bool _loading = false;
  int _selectedEta = 15;

  SellerOrder get o => widget.order;
  bool get hasPrescription => o.moduleData['hasPrescription'] == true;

  int get _elapsedMin => DateTime.now().difference(o.createdAt).inMinutes;
  bool get _isUrgent =>
      o.status == SellerOrderStatus.pending && _elapsedMin > 10;

  Color get _urgencyColor {
    if (_elapsedMin < 10) return SellerTheme.successGreen;
    if (_elapsedMin < 20) return SellerTheme.warningAmber;
    return SellerTheme.errorRed;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isUrgent
              ? SellerTheme.errorRed.withValues(alpha: 0.4)
              : SellerTheme.border,
          width: _isUrgent ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // ── Header ─────────────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.all(14),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              // Rx / OTC badge
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: widget.pharmaColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('💊', style: TextStyle(fontSize: 19)),
                      Text(hasPrescription ? 'Rx' : 'OTC',
                          style: TextStyle(
                              fontSize: 8,
                              color: widget.pharmaColor,
                              fontWeight: FontWeight.bold)),
                    ]),
              ),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Row(children: [
                      Text(o.id,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 14)),
                      if (_isUrgent) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: SellerTheme.errorRed,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text('URGENT',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ]),
                    Text(o.customerName,
                        style: const TextStyle(
                            color: SellerTheme.textSecondary, fontSize: 12)),
                    if (o.customerPhone != null)
                      Text(o.customerPhone!,
                          style: const TextStyle(
                              color: SellerTheme.textMuted, fontSize: 11)),
                  ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('${widget.cur} ${o.total.toStringAsFixed(0)}',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: widget.pharmaColor)),
                const SizedBox(height: 4),
                OrderStatusChip(status: o.status),
                const SizedBox(height: 2),
                Row(children: [
                  Icon(Icons.timer_outlined, size: 10, color: _urgencyColor),
                  const SizedBox(width: 2),
                  Text('${_elapsedMin}m',
                      style: TextStyle(
                          color: _urgencyColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w600)),
                ]),
              ]),
            ]),

            // ── Prescription tag ────────────────────────────────────────────
            if (hasPrescription) ...[
              const SizedBox(height: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: widget.pharmaColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: widget.pharmaColor.withValues(alpha: 0.25)),
                ),
                child: Row(children: [
                  Icon(Icons.verified_outlined,
                      size: 14, color: widget.pharmaColor),
                  const SizedBox(width: 6),
                  const Text('Prescription Required',
                      style:
                          TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                  const Spacer(),
                  const Text('Verify Rx before dispensing',
                      style: TextStyle(
                          fontSize: 10, color: SellerTheme.textMuted)),
                ]),
              ),
            ],

            // ── ETA picker (pending orders only) ────────────────────────────
            if (o.status == SellerOrderStatus.pending) ...[
              const SizedBox(height: 10),
              Row(children: [
                const Text('Ready in: ',
                    style:
                        TextStyle(fontSize: 11, color: SellerTheme.textMuted)),
                ...([10, 15, 20, 30].map((min) => GestureDetector(
                      onTap: () => setState(() => _selectedEta = min),
                      child: Container(
                        margin: const EdgeInsets.only(right: 6),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _selectedEta == min
                              ? widget.pharmaColor
                              : widget.pharmaColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text('${min}m',
                            style: TextStyle(
                                fontSize: 11,
                                color: _selectedEta == min
                                    ? Colors.white
                                    : widget.pharmaColor,
                                fontWeight: FontWeight.w600)),
                      ),
                    ))),
              ]),
            ],

            // ── Delivery address ─────────────────────────────────────────────
            if (o.deliveryAddress != null) ...[
              const SizedBox(height: 6),
              Row(children: [
                const Icon(Icons.location_on_outlined,
                    size: 12, color: SellerTheme.textMuted),
                const SizedBox(width: 4),
                Expanded(
                    child: Text(o.deliveryAddress!,
                        style: const TextStyle(
                            color: SellerTheme.textMuted, fontSize: 11),
                        overflow: TextOverflow.ellipsis)),
              ]),
            ],

            // ── Items expand/collapse ────────────────────────────────────────
            GestureDetector(
              onTap: () => setState(() => _expanded = !_expanded),
              child: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(children: [
                  Text('${o.itemCount} item${o.itemCount != 1 ? 's' : ''}',
                      style: const TextStyle(
                          color: SellerTheme.textSecondary, fontSize: 11)),
                  const SizedBox(width: 4),
                  Icon(
                    _expanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    size: 16,
                    color: SellerTheme.textMuted,
                  ),
                ]),
              ),
            ),

            if (_expanded) ...[
              const SizedBox(height: 8),
              const Divider(height: 1, color: SellerTheme.border),
              const SizedBox(height: 8),
              ...o.items.map((item) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(children: [
                      const Text('💊', style: TextStyle(fontSize: 14)),
                      const SizedBox(width: 8),
                      Expanded(
                          child: Text(item.name,
                              style: const TextStyle(fontSize: 12),
                              overflow: TextOverflow.ellipsis)),
                      Text('× ${item.quantity}',
                          style: const TextStyle(
                              color: SellerTheme.textMuted, fontSize: 11)),
                      const SizedBox(width: 12),
                      Text(
                          '${widget.cur} ${(item.price * item.quantity).toStringAsFixed(0)}',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 12)),
                    ]),
                  )),
            ],
          ]),
        ),

        // ── Action Buttons ─────────────────────────────────────────────────
        if (o.status != SellerOrderStatus.delivered &&
            o.status != SellerOrderStatus.cancelled) ...[
          const Divider(height: 1, color: SellerTheme.border),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: _buildActions(context),
          ),
        ],

        // ── Dispatch button for ready orders ───────────────────────────────
        if (o.status == SellerOrderStatus.ready) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: DeliveryDispatchButton(
              order: o,
              pickupAddress:
                  o.moduleData['pickup_address'] as String? ?? 'Pharmacy Store',
              onDispatched: () => context
                  .read<PharmacySellerBloc>()
                  .add(DispatchPharmacyOrder(o.id)),
            ),
          ),
        ],
      ]),
    );
  }

  Widget _buildActions(BuildContext context) {
    final bloc = context.read<PharmacySellerBloc>();

    Widget actionBtn(String label, Color bg, VoidCallback onTap,
        {bool outline = false}) {
      return Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 3),
          child: outline
              ? OutlinedButton(
                  onPressed: _loading ? null : onTap,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: bg,
                    side: BorderSide(color: bg.withValues(alpha: 0.5)),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: Text(label, style: const TextStyle(fontSize: 11)),
                )
              : ElevatedButton(
                  onPressed: _loading ? null : onTap,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: bg,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    elevation: 0,
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
                      : Text(label,
                          style: const TextStyle(
                              fontSize: 11, fontWeight: FontWeight.bold)),
                ),
        ),
      );
    }

    switch (o.status) {
      case SellerOrderStatus.pending:
        return Row(children: [
          actionBtn(
              '❌ Reject', SellerTheme.errorRed, () => _rejectDialog(context),
              outline: true),
          actionBtn('✅ Accept', widget.pharmaColor, () {
            setState(() => _loading = true);
            bloc.add(AcceptPharmacyOrder(o.id, estimatedMinutes: _selectedEta));
            Future.delayed(const Duration(milliseconds: 600), () {
              if (mounted) setState(() => _loading = false);
            });
          }),
        ]);
      case SellerOrderStatus.confirmed:
        return Row(children: [
          actionBtn('💊 Start Dispensing', widget.pharmaColor, () {
            bloc.add(MarkPharmacyOrderDispensing(o.id));
          }),
        ]);
      case SellerOrderStatus.preparing:
        return Row(children: [
          actionBtn('📦 Mark Ready', SellerTheme.successGreen, () {
            bloc.add(MarkPharmacyOrderReady(
              o.id,
              pickupLat: o.moduleData['pickup_lat'] as double? ?? 25.2854,
              pickupLng: o.moduleData['pickup_lng'] as double? ?? 51.5310,
              pickupAddress:
                  o.moduleData['pickup_address'] as String? ?? 'Pharmacy Store',
            ));
          }),
        ]);
      default:
        return const SizedBox.shrink();
    }
  }

  void _rejectDialog(BuildContext context) {
    const reasons = [
      'Medicine not in stock',
      'Invalid or expired prescription',
      'Cannot verify prescription',
      'Customer cancelled',
      'Delivery not available in area',
    ];
    int selectedIdx = 0;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.fromLTRB(
              20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Reject Order',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Order ${o.id} · ${o.customerName}',
                    style: const TextStyle(
                        color: SellerTheme.textMuted, fontSize: 12)),
                const SizedBox(height: 14),
                RadioGroup<int>(
                  groupValue: selectedIdx,
                  onChanged: (v) => setS(() => selectedIdx = v ?? 0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: reasons.asMap().entries.map((e) => RadioListTile<int>(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text(e.value, style: const TextStyle(fontSize: 13)),
                      value: e.key,
                      activeColor: SellerTheme.errorRed,
                    )).toList(),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: SellerTheme.errorRed,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    onPressed: () {
                      context
                          .read<PharmacySellerBloc>()
                          .add(RejectPharmacyOrder(o.id, reasons[selectedIdx]));
                      Navigator.pop(ctx);
                    },
                    child: const Text('Confirm Rejection',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ]),
        ),
      ),
    );
  }
}
