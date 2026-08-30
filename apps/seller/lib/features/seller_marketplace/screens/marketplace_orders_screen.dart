import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_event.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/delivery_dispatch_button.dart';
import 'package:kartseek_seller/features/shared/widgets/order_status_chip.dart';


class MarketplaceOrdersScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const MarketplaceOrdersScreen({super.key, this.order, this.appointment, this.booking});

  @override
  State<MarketplaceOrdersScreen> createState() => _MarketplaceOrdersScreenState();
}

class _MarketplaceOrdersScreenState extends State<MarketplaceOrdersScreen> {
  String _filter = 'all';

  static const _mp = Color(0xFF6C3FC8);

  @override
  void initState() {
    super.initState();
    final cc = context.read<SellerBloc>().state.countryCode;
    context.read<MarketplaceSellerBloc>().add(LoadMarketplaceOrders(countryCode: cc));
  }

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return BlocListener<MarketplaceSellerBloc, MarketplaceSellerState>(
      listenWhen: (p, c) => c.actionMessage != p.actionMessage,
      listener: (ctx, state) {
        if (state.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.actionMessage!),
            backgroundColor: state.actionSuccess ? SellerTheme.successGreen : SellerTheme.errorRed,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<MarketplaceSellerBloc, MarketplaceSellerState>(
        builder: (ctx, ms) {
          final orders = _filteredOrders(ms.orders);
          return Scaffold(
            backgroundColor: SellerTheme.surface,
            appBar: AppBar(
              backgroundColor: _mp,
              foregroundColor: Colors.white,
              elevation: 0,
              title: Text('Orders · ${ss.country.flag} ${ss.country.name}',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => context.read<MarketplaceSellerBloc>()
                      .add(LoadMarketplaceOrders(countryCode: ss.countryCode)),
                ),
              ],
            ),
            body: Column(children: [
              _filterBar(ms),
              _statsSummary(ms, ss.country.currencySymbol),
              Expanded(
                child: ms.status == MarketplaceBlocStatus.loading
                    ? const Center(child: CircularProgressIndicator(color: _mp))
                    : orders.isEmpty
                        ? _emptyState()
                        : ListView.builder(
                            padding: const EdgeInsets.all(14),
                            itemCount: orders.length,
                            itemBuilder: (ctx, i) => _OrderCard(
                              order: orders[i],
                              currency: ss.country.currencySymbol,
                            ),
                          ),
              ),
            ]),
          );
        },
      ),
    );
  }

  List<SellerOrder> _filteredOrders(List<SellerOrder> orders) {
    if (_filter == 'all') return orders;
    final map = {
      'pending':   SellerOrderStatus.pending,
      'confirmed': SellerOrderStatus.confirmed,
      'preparing': SellerOrderStatus.preparing,
      'ready':     SellerOrderStatus.ready,
      'shipped':   SellerOrderStatus.outForDelivery,
      'delivered': SellerOrderStatus.delivered,
    };
    final t = map[_filter];
    return t == null ? orders : orders.where((o) => o.status == t).toList();
  }

  Widget _filterBar(MarketplaceSellerState ms) {
    final filters = [
      ('all',      'All',      Icons.list),
      ('pending',  'Pending',  Icons.hourglass_empty),
      ('confirmed','Confirmed',Icons.check_circle_outline),
      ('preparing','Preparing',Icons.inventory_2_outlined),
      ('ready',    'Ready',    Icons.check_circle),
      ('shipped',  'Shipped',  Icons.local_shipping_outlined),
    ];

    return Container(
      color: _mp,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
        child: Row(children: filters.map((f) {
          final active = _filter == f.$1;
          final cnt = _countForFilter(f.$1, ms.orders);
          return GestureDetector(
            onTap: () => setState(() => _filter = f.$1),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(
                color: active ? Colors.white : Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(children: [
                Icon(f.$3, size: 14, color: active ? _mp : Colors.white70),
                const SizedBox(width: 5),
                Text('${f.$2} ($cnt)', style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w600,
                  color: active ? _mp : Colors.white70,
                )),
              ]),
            ),
          );
        }).toList()),
      ),
    );
  }

  int _countForFilter(String f, List<SellerOrder> orders) {
    if (f == 'all') return orders.length;
    final map = {'pending': SellerOrderStatus.pending, 'confirmed': SellerOrderStatus.confirmed,
      'preparing': SellerOrderStatus.preparing, 'ready': SellerOrderStatus.ready,
      'shipped': SellerOrderStatus.outForDelivery, 'delivered': SellerOrderStatus.delivered};
    return orders.where((o) => o.status == map[f]).length;
  }

  Widget _statsSummary(MarketplaceSellerState ms, String currency) {
    final total = ms.orders.fold(0.0, (s, o) => s + o.total);
    return Container(
      margin: const EdgeInsets.all(14),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: SellerTheme.border),
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
        _stat('${ms.orders.length}', 'Total', _mp),
        _stat('${ms.pendingCount}', 'Pending', SellerTheme.warningAmber),
        _stat('$currency ${(total / 1000).toStringAsFixed(1)}K', 'Value', SellerTheme.successGreen),
      ]),
    );
  }

  Widget _stat(String v, String l, Color c) => Column(children: [
    Text(v, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: c)),
    Text(l, style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
  ]);

  Widget _emptyState() => const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
    Text('📦', style: TextStyle(fontSize: 56)),
    SizedBox(height: 16),
    Text('No orders', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
    SizedBox(height: 8),
    Text('New orders will appear here', style: TextStyle(color: SellerTheme.textMuted)),
  ]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Order card
// ─────────────────────────────────────────────────────────────────────────────

class _OrderCard extends StatefulWidget {
  final SellerOrder order;
  final String currency;
  const _OrderCard({required this.order, required this.currency});

  @override
  State<_OrderCard> createState() => _OrderCardState();
}

class _OrderCardState extends State<_OrderCard> {
  bool _expanded = false;
  bool _rejecting = false;
  final _rejectCtrl = TextEditingController();

  static const _mp = Color(0xFF6C3FC8);

  @override
  void dispose() { _rejectCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final o   = widget.order;
    final age = DateTime.now().difference(o.createdAt);
    final ageLabel = age.inMinutes < 60 ? '${age.inMinutes} min ago' : '${age.inHours}h ago';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: SellerTheme.elevatedCard(),
      child: Column(children: [
        // Header tap to expand
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(color: _mp.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                child: const Center(child: Text('🛍️', style: TextStyle(fontSize: 22))),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(o.customerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Text('#${o.id} · $ageLabel', style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11)),
                Text('${o.itemCount} items · ${widget.currency} ${o.total.toStringAsFixed(0)} · ${o.paymentMethod}',
                    style: const TextStyle(color: SellerTheme.textSecondary, fontSize: 12)),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                OrderStatusChip(status: o.status),
                const SizedBox(height: 6),
                Icon(_expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                    color: SellerTheme.textMuted, size: 18),
              ]),
            ]),
          ),
        ),

        // Expanded details
        if (_expanded) ...[
          const Divider(height: 1),
          // Status stepper
          Padding(
            padding: const EdgeInsets.all(14),
            child: _MktStatusStepper(currentStatus: o.status),
          ),
          const Divider(height: 1),
          // Items
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(children: [
              ...o.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(children: [
                  const Text('📦', style: TextStyle(fontSize: 14)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(item.name, style: const TextStyle(fontSize: 13))),
                  Text('×${item.quantity}', style: const TextStyle(color: SellerTheme.textMuted, fontSize: 12)),
                  const SizedBox(width: 12),
                  Text('${widget.currency} ${(item.price * item.quantity).toStringAsFixed(0)}',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                ]),
              )),
              const Divider(height: 20),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                Text('${widget.currency} ${o.total.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: _mp, fontSize: 15)),
              ]),
              if (o.deliveryAddress != null) ...[
                const SizedBox(height: 8),
                Row(children: [
                  const Icon(Icons.location_on_outlined, size: 14, color: SellerTheme.textMuted),
                  const SizedBox(width: 4),
                  Text(o.deliveryAddress!, style: const TextStyle(fontSize: 12, color: SellerTheme.textSecondary)),
                ]),
              ],
            ]),
          ),
        ],

        // Actions
        _buildActions(context, o),
        const SizedBox(height: 4),
      ]),
    );
  }

  Widget _buildActions(BuildContext context, SellerOrder o) {
    final bloc = context.read<MarketplaceSellerBloc>();

    if (o.status == SellerOrderStatus.pending) {
      if (_rejecting) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
          child: Column(children: [
            TextField(
              controller: _rejectCtrl,
              decoration: InputDecoration(
                hintText: 'Reason for rejection...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                isDense: true,
              ),
            ),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: _btn('Cancel', SellerTheme.textMuted, () => setState(() => _rejecting = false))),
              const SizedBox(width: 8),
              Expanded(child: _btn('Confirm ❌', SellerTheme.errorRed, () {
                bloc.add(RejectMarketplaceOrder(o.id, _rejectCtrl.text.isEmpty ? 'Stock unavailable' : _rejectCtrl.text));
                setState(() => _rejecting = false);
              })),
            ]),
          ]),
        );
      }
      return Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        child: Row(children: [
          Expanded(child: _btn('❌ Reject', SellerTheme.errorRed, () => setState(() => _rejecting = true))),
          const SizedBox(width: 8),
          Expanded(child: _btn('✅ Accept', SellerTheme.successGreen, () => bloc.add(AcceptMarketplaceOrder(o.id)))),
        ]),
      );
    }

    if (o.status == SellerOrderStatus.confirmed) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        child: _btn('📦 Start Preparing', SellerTheme.warningAmber, () => bloc.add(StartPreparingMarketplaceOrder(o.id))),
      );
    }

    if (o.status == SellerOrderStatus.preparing) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        child: _btn('🚚 Mark Ready & Dispatch', _mp, () => bloc.add(MarkMarketplaceOrderReady(o.id))),
      );
    }

    if (o.status == SellerOrderStatus.ready) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        child: DeliveryDispatchButton(order: o, pickupAddress: 'Marketplace Warehouse', onDispatched: () {}),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _btn(String label, Color color, VoidCallback onTap) => SizedBox(
    width: double.infinity, height: 38,
    child: ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0),
      child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Marketplace status stepper
// ─────────────────────────────────────────────────────────────────────────────

class _MktStatusStepper extends StatelessWidget {
  final SellerOrderStatus currentStatus;
  const _MktStatusStepper({required this.currentStatus});

  static const _steps = [
    (SellerOrderStatus.pending,        '🛍️', 'Received'),
    (SellerOrderStatus.confirmed,      '✅',  'Accepted'),
    (SellerOrderStatus.preparing,      '📦',  'Packing'),
    (SellerOrderStatus.ready,          '🚚',  'Ready'),
    (SellerOrderStatus.outForDelivery, '🚛',  'Shipped'),
    (SellerOrderStatus.delivered,      '🏠',  'Delivered'),
  ];

  int get _idx => _steps.indexWhere((s) => s.$1 == currentStatus);

  @override
  Widget build(BuildContext context) {
    const mp = Color(0xFF6C3FC8);
    return Row(children: List.generate(_steps.length * 2 - 1, (i) {
      if (i.isOdd) {
        return Expanded(child: Container(height: 2, color: (i ~/ 2) < _idx ? mp : SellerTheme.border));
      }
      final si = i ~/ 2;
      final s = _steps[si];
      final isDone   = si < _idx;
      final isActive = si == _idx;
      final c = isDone || isActive ? mp : SellerTheme.textMuted;
      return Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 28, height: 28,
          decoration: BoxDecoration(
            color: isDone ? mp : isActive ? mp.withValues(alpha: 0.15) : SellerTheme.surface,
            shape: BoxShape.circle,
            border: Border.all(color: isDone || isActive ? mp : SellerTheme.border, width: 2),
          ),
          child: Center(child: isDone
              ? const Icon(Icons.check, size: 14, color: Colors.white)
              : Text(s.$2, style: const TextStyle(fontSize: 11))),
        ),
        const SizedBox(height: 3),
        Text(s.$3, style: TextStyle(fontSize: 8, color: c, fontWeight: isActive ? FontWeight.bold : FontWeight.normal)),
      ]);
    }));
  }
}
