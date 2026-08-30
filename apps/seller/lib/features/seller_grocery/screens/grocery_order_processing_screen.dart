import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_event.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/delivery_dispatch_button.dart';
import 'package:kartseek_seller/features/shared/widgets/order_status_chip.dart';

class GroceryOrderProcessingScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const GroceryOrderProcessingScreen({super.key, this.order, this.appointment, this.booking});

  @override
  State<GroceryOrderProcessingScreen> createState() => _GroceryOrderProcessingScreenState();
}

class _GroceryOrderProcessingScreenState extends State<GroceryOrderProcessingScreen> {
  String _orderFilter = 'all';

  @override
  void initState() {
    super.initState();
    final ss = context.read<SellerBloc>().state;
    context.read<GrocerySellerBloc>().add(LoadGroceryOrders(countryCode: ss.countryCode));
  }

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return BlocListener<GrocerySellerBloc, GrocerySellerState>(
      listenWhen: (prev, curr) => curr.actionMessage != prev.actionMessage,
      listener: (ctx, state) {
        if (state.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.actionMessage!),
            backgroundColor: (state.actionSuccess ?? true) ? SellerTheme.successGreen : SellerTheme.errorRed,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (context, gs) {
          final orders = _filteredOrders(gs.orders);
          return Scaffold(
            backgroundColor: SellerTheme.surface,
            appBar: AppBar(
              backgroundColor: SellerTheme.grocery,
              foregroundColor: Colors.white,
              elevation: 0,
              title: Text('Orders · ${ss.country.flag} ${ss.country.name}',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => context.read<GrocerySellerBloc>().add(LoadGroceryOrders(countryCode: ss.countryCode)),
                ),
              ],
            ),
            body: Column(children: [
              // Status filter bar
              _buildFilterBar(gs),
              // Stats summary
              _buildStatsSummary(gs, ss.country.currencySymbol),
              // Order list
              Expanded(
                child: gs.status == GroceryBlocStatus.loading
                    ? const Center(child: CircularProgressIndicator(color: SellerTheme.grocery))
                    : orders.isEmpty
                        ? _emptyState()
                        : ListView.builder(
                            padding: const EdgeInsets.all(14),
                            itemCount: orders.length,
                            itemBuilder: (ctx, i) => _OrderCard(
                              order: orders[i],
                              currency: ss.country.currencySymbol,
                              pickupLat: _pickupCoords(ss.countryCode).$1,
                              pickupLng: _pickupCoords(ss.countryCode).$2,
                            ),
                          ),
              ),
            ]),
          );
        },
      ),
    );
  }

  static (double, double) _pickupCoords(String countryCode) {
    const coords = <String, (double, double)>{
      'QA': (25.2854, 51.5310),
      'IN': (19.0760, 72.8777),
      'AE': (25.2048, 55.2708),
      'SA': (24.7136, 46.6753),
      'KE': (-1.2921, 36.8219),
      'BH': (26.2361, 50.5860),
      'KW': (29.3759, 47.9774),
      'OM': (23.5880, 58.3829),
      'GB': (51.5074, -0.1278),
      'US': (40.7128, -74.0060),
    };
    return coords[countryCode] ?? (25.2854, 51.5310);
  }

  List<SellerOrder> _filteredOrders(List<SellerOrder> orders) {
    if (_orderFilter == 'all') return orders;
    final statusMap = {
      'pending':   SellerOrderStatus.pending,
      'preparing': SellerOrderStatus.preparing,
      'ready':     SellerOrderStatus.ready,
      'delivered': SellerOrderStatus.delivered,
    };
    final target = statusMap[_orderFilter];
    if (target == null) return orders;
    return orders.where((o) => o.status == target).toList();
  }

  Widget _buildFilterBar(GrocerySellerState gs) {
    final filters = [
      ('all',       'All',       Icons.list_outlined),
      ('pending',   'Pending',   Icons.hourglass_empty),
      ('preparing', 'Packing',   Icons.inventory_2_outlined),
      ('ready',     'Ready',     Icons.check_circle_outline),
      ('delivered', 'Delivered', Icons.local_shipping_outlined),
    ];
    return Container(
      color: SellerTheme.grocery,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
        child: Row(
          children: filters.map((f) {
            final isActive = _orderFilter == f.$1;
            final count = f.$1 == 'all' ? gs.orders.length : _countForFilter(f.$1, gs.orders);
            return GestureDetector(
              onTap: () => setState(() => _orderFilter = f.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: isActive ? Colors.white : Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(children: [
                  Icon(f.$3, size: 14, color: isActive ? SellerTheme.grocery : Colors.white70),
                  const SizedBox(width: 5),
                  Text('${f.$2} ($count)', style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600,
                    color: isActive ? SellerTheme.grocery : Colors.white70,
                  )),
                ]),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  int _countForFilter(String f, List<SellerOrder> orders) {
    const statusMap = {
      'pending':   SellerOrderStatus.pending,
      'preparing': SellerOrderStatus.preparing,
      'ready':     SellerOrderStatus.ready,
      'delivered': SellerOrderStatus.delivered,
    };
    return orders.where((o) => o.status == statusMap[f]).length;
  }

  Widget _buildStatsSummary(GrocerySellerState gs, String currency) {
    final total = gs.orders.fold(0.0, (s, o) => s + o.total);
    return Container(
      margin: const EdgeInsets.all(14),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: SellerTheme.border),
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
        _stat('${gs.orders.length}', 'Total Orders', SellerTheme.grocery),
        _stat('${gs.pendingOrderCount}', 'Pending', SellerTheme.warningAmber),
        _stat('$currency ${total.toStringAsFixed(0)}', 'Total Value', SellerTheme.successGreen),
      ]),
    );
  }

  Widget _stat(String val, String label, Color color) => Column(children: [
    Text(val, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color)),
    Text(label, style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
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
  final double pickupLat;
  final double pickupLng;
  const _OrderCard({required this.order, required this.currency, required this.pickupLat, required this.pickupLng});

  @override
  State<_OrderCard> createState() => _OrderCardState();
}

class _OrderCardState extends State<_OrderCard> {
  bool _expanded = false;
  bool _rejecting = false;
  final _rejectController = TextEditingController();

  @override
  void dispose() {
    _rejectController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.order;
    final age = DateTime.now().difference(o.createdAt);
    final ageLabel = age.inMinutes < 60 ? '${age.inMinutes} min ago' : '${age.inHours}h ago';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: SellerTheme.elevatedCard(),
      child: Column(children: [
        // Header
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(color: SellerTheme.grocery.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                child: const Center(child: Text('🛒', style: TextStyle(fontSize: 22))),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(o.customerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Text('#${o.id} · $ageLabel', style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11)),
                Text('${o.itemCount} items — ${widget.currency} ${o.total.toStringAsFixed(0)} · ${o.paymentMethod}',
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

        // Expanded detail
        if (_expanded) ...[
          const Divider(height: 1),
          // Status stepper
          Padding(
            padding: const EdgeInsets.all(14),
            child: _GroceryStatusStepper(currentStatus: o.status),
          ),
          const Divider(height: 1),
          // Items list
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 10),
              ...o.items.map((item) => _ItemRow(item: item, orderId: o.id, currency: widget.currency)),
              const Divider(height: 24),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                Text('${widget.currency} ${o.total.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: SellerTheme.grocery, fontSize: 16)),
              ]),
              if (o.deliveryAddress != null) ...[
                const SizedBox(height: 10),
                Row(children: [
                  const Icon(Icons.location_on_outlined, size: 15, color: SellerTheme.textMuted),
                  const SizedBox(width: 4),
                  Text(o.deliveryAddress!, style: const TextStyle(fontSize: 12, color: SellerTheme.textSecondary)),
                ]),
              ],
            ]),
          ),
        ],

        // Action buttons
        _buildActions(context, o),
        const SizedBox(height: 4),
      ]),
    );
  }

  Widget _buildActions(BuildContext context, SellerOrder o) {
    final bloc = context.read<GrocerySellerBloc>();

    if (o.status == SellerOrderStatus.pending) {
      if (_rejecting) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
          child: Column(children: [
            TextField(
              controller: _rejectController,
              decoration: InputDecoration(
                hintText: 'Reason for rejection...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: _btn('Cancel', SellerTheme.textMuted, () => setState(() => _rejecting = false))),
              const SizedBox(width: 8),
              Expanded(child: _btn('Confirm Reject ❌', SellerTheme.errorRed, () {
                bloc.add(RejectGroceryOrder(o.id, _rejectController.text.isEmpty ? 'Item unavailable' : _rejectController.text));
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
          Expanded(child: _btn('✅ Accept', SellerTheme.successGreen, () => bloc.add(AcceptGroceryOrder(o.id)))),
        ]),
      );
    }

    if (o.status == SellerOrderStatus.confirmed) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        child: _btn('📦 Start Packing', SellerTheme.warningAmber, () => bloc.add(StartPackingGroceryOrder(o.id))),
      );
    }

    if (o.status == SellerOrderStatus.preparing) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        child: _btn('🚚 Mark Ready & Dispatch', SellerTheme.infoBlue, () =>
            bloc.add(MarkGroceryOrderReady(o.id, pickupLat: widget.pickupLat, pickupLng: widget.pickupLng))),
      );
    }

    if (o.status == SellerOrderStatus.ready) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        child: DeliveryDispatchButton(order: o, pickupAddress: 'Grocery Store', onDispatched: () {}),
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
// Item row with OOS toggle
// ─────────────────────────────────────────────────────────────────────────────

class _ItemRow extends StatelessWidget {
  final SellerOrderItem item;
  final String orderId;
  final String currency;
  const _ItemRow({required this.item, required this.orderId, required this.currency});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Expanded(
          child: Row(children: [
            if (!item.isAvailable)
              const Icon(Icons.cancel_outlined, color: SellerTheme.errorRed, size: 14),
            if (!item.isAvailable) const SizedBox(width: 4),
            Expanded(child: Text(
              item.name,
              style: TextStyle(
                fontSize: 13,
                decoration: item.isAvailable ? null : TextDecoration.lineThrough,
                color: item.isAvailable ? SellerTheme.textPrimary : SellerTheme.textMuted,
              ),
            )),
          ]),
        ),
        Text('×${item.quantity}', style: const TextStyle(color: SellerTheme.textMuted, fontSize: 12)),
        const SizedBox(width: 12),
        Text('$currency ${(item.price * item.quantity).toStringAsFixed(0)}',
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        if (item.isAvailable) ...[
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => context.read<GrocerySellerBloc>().add(MarkGroceryItemOos(orderId, item.id)),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: SellerTheme.warningAmber.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: SellerTheme.warningAmber.withValues(alpha: 0.4)),
              ),
              child: const Text('OOS', style: TextStyle(color: SellerTheme.warningAmber, fontSize: 9, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline status stepper for grocery orders
// ─────────────────────────────────────────────────────────────────────────────

class _GroceryStatusStepper extends StatelessWidget {
  final SellerOrderStatus currentStatus;
  const _GroceryStatusStepper({required this.currentStatus});

  static const _steps = [
    (SellerOrderStatus.pending,   '🛒', 'Received'),
    (SellerOrderStatus.confirmed, '✅', 'Accepted'),
    (SellerOrderStatus.preparing, '📦', 'Packing'),
    (SellerOrderStatus.ready,     '🚚', 'Ready'),
    (SellerOrderStatus.delivered, '🏠', 'Delivered'),
  ];

  int get _currentIdx => _steps.indexWhere((s) => s.$1 == currentStatus);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(_steps.length * 2 - 1, (i) {
        if (i.isOdd) {
          // Connector line
          final stepIdx = i ~/ 2;
          final passed = stepIdx < _currentIdx;
          return Expanded(child: Container(
            height: 2,
            color: passed ? SellerTheme.grocery : SellerTheme.border,
          ));
        }
        final stepIdx = i ~/ 2;
        final step = _steps[stepIdx];
        final isActive = stepIdx == _currentIdx;
        final isDone   = stepIdx < _currentIdx;
        final color = isDone || isActive ? SellerTheme.grocery : SellerTheme.textMuted;

        return Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(
              color: isDone ? SellerTheme.grocery : isActive ? SellerTheme.grocery.withValues(alpha: 0.15) : SellerTheme.surface,
              shape: BoxShape.circle,
              border: Border.all(color: isDone || isActive ? SellerTheme.grocery : SellerTheme.border, width: 2),
            ),
            child: Center(child: isDone
                ? const Icon(Icons.check, size: 16, color: Colors.white)
                : Text(step.$2, style: const TextStyle(fontSize: 13))),
          ),
          const SizedBox(height: 4),
          Text(step.$3, style: TextStyle(fontSize: 9, color: color,
              fontWeight: isActive ? FontWeight.bold : FontWeight.normal)),
        ]);
      }),
    );
  }
}
