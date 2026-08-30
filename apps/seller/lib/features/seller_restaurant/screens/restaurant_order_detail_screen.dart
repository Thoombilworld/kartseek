import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_event.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/delivery_dispatch_button.dart';
import 'package:kartseek_seller/features/shared/widgets/order_status_chip.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Order Processing Screen (Filtered list + swipe-to-accept)
// ─────────────────────────────────────────────────────────────────────────────

class RestaurantOrderProcessingScreen extends StatefulWidget {
  const RestaurantOrderProcessingScreen({super.key});

  @override
  State<RestaurantOrderProcessingScreen> createState() =>
      _RestaurantOrderProcessingScreenState();
}

class _RestaurantOrderProcessingScreenState
    extends State<RestaurantOrderProcessingScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tc;

  static const _tabs = [
    ('all', 'All Orders', Icons.receipt_long),
    ('dine_in', 'Dine-in', Icons.table_restaurant),
    ('takeaway', 'Takeaway', Icons.takeout_dining),
    ('delivery', 'Delivery', Icons.delivery_dining),
  ];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: _tabs.length, vsync: this);
    _tc.addListener(() {
      if (!_tc.indexIsChanging) {
        context
            .read<RestaurantSellerBloc>()
            .add(SelectRestaurantOrderTab(_tabs[_tc.index].$1));
      }
    });
    final ss = context.read<SellerBloc>().state;
    context
        .read<RestaurantSellerBloc>()
        .add(LoadRestaurantOrders(countryCode: ss.countryCode));
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<RestaurantSellerBloc, RestaurantSellerState>(
      listenWhen: (p, c) => c.actionMessage != p.actionMessage,
      listener: (ctx, state) {
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
      child: BlocBuilder<RestaurantSellerBloc, RestaurantSellerState>(
        builder: (context, state) {
          final ss = context.read<SellerBloc>().state;

          return Scaffold(
            backgroundColor: SellerTheme.surface,
            appBar: AppBar(
              backgroundColor: SellerTheme.restaurant,
              foregroundColor: Colors.white,
              elevation: 0,
              title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Orders · ${ss.country.flag}',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    Text(
                      '${state.allOrders.length} total · ${state.pendingCount} pending',
                      style:
                          const TextStyle(fontSize: 10, color: Colors.white70),
                    ),
                  ]),
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => context
                      .read<RestaurantSellerBloc>()
                      .add(LoadRestaurantOrders(countryCode: ss.countryCode)),
                ),
              ],
              bottom: TabBar(
                controller: _tc,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white54,
                indicatorColor: Colors.white,
                indicatorWeight: 3,
                tabs: _tabs
                    .map((t) => Tab(
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            Icon(t.$3, size: 14),
                            const SizedBox(width: 4),
                            Text(t.$2,
                                style: const TextStyle(
                                    fontSize: 11, fontWeight: FontWeight.w600)),
                          ]),
                        ))
                    .toList(),
              ),
            ),
            body: TabBarView(
              controller: _tc,
              children: _tabs.map((t) {
                final orders = _ordersFor(state, t.$1);
                return _OrderList(
                  orders: orders,
                  mode: t.$1,
                  state: state,
                );
              }).toList(),
            ),
          );
        },
      ),
    );
  }

  List<SellerOrder> _ordersFor(RestaurantSellerState s, String tab) {
    return switch (tab) {
      'dine_in' => s.dineInOrders,
      'takeaway' => s.takeawayOrders,
      'delivery' => s.deliveryOrders,
      _ => s.allOrders,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order list per tab
// ─────────────────────────────────────────────────────────────────────────────

class _OrderList extends StatelessWidget {
  final List<SellerOrder> orders;
  final String mode;
  final RestaurantSellerState state;
  const _OrderList(
      {required this.orders, required this.mode, required this.state});

  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(
            mode == 'dine_in'
                ? '🍽️'
                : mode == 'delivery'
                    ? '🚚'
                    : '📦',
            style: const TextStyle(fontSize: 48),
          ),
          const SizedBox(height: 12),
          Text(
            'No ${mode.replaceAll('_', ' ')} orders',
            style: const TextStyle(color: SellerTheme.textMuted, fontSize: 14),
          ),
        ]),
      );
    }

    return RefreshIndicator(
      color: SellerTheme.restaurant,
      onRefresh: () async {
        final ss = context.read<SellerBloc>().state;
        context
            .read<RestaurantSellerBloc>()
            .add(LoadRestaurantOrders(countryCode: ss.countryCode));
      },
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
        itemCount: orders.length,
        itemBuilder: (ctx, i) => _FullOrderCard(order: orders[i]),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Full Order Card with ETA selector
// ─────────────────────────────────────────────────────────────────────────────

class _FullOrderCard extends StatefulWidget {
  final SellerOrder order;
  const _FullOrderCard({required this.order});

  @override
  State<_FullOrderCard> createState() => _FullOrderCardState();
}

class _FullOrderCardState extends State<_FullOrderCard> {
  int _etaMinutes = 20;
  bool _expanded = false;

  SellerOrder get order => widget.order;

  String get _mode => order.moduleData['order_mode'] as String? ?? 'takeaway';
  String? get _table => order.moduleData['table_number'] as String?;
  int? get _guests => order.moduleData['guest_count'] as int?;

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('h:mm a');
    final cur = context.read<SellerBloc>().state.country.currencySymbol;
    final modeEmoji = _mode == 'dine_in'
        ? '🍽️'
        : _mode == 'delivery'
            ? '🚚'
            : '📦';
    final modeLabel = _mode == 'dine_in'
        ? 'Dine-in'
        : _mode == 'delivery'
            ? 'Delivery'
            : 'Takeaway';
    final elapsed = DateTime.now().difference(order.createdAt).inMinutes;

    final urgencyColor = elapsed > 20
        ? SellerTheme.errorRed
        : elapsed > 10
            ? SellerTheme.warningAmber
            : SellerTheme.successGreen;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: order.status == SellerOrderStatus.pending
              ? SellerTheme.warningAmber.withValues(alpha: 0.5)
              : SellerTheme.border,
        ),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // ── Card Header ───────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
          child: Row(children: [
            // Mode badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: SellerTheme.restaurant.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('$modeEmoji $modeLabel',
                  style: const TextStyle(
                      fontSize: 10,
                      color: SellerTheme.restaurant,
                      fontWeight: FontWeight.bold)),
            ),
            if (_table != null) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: SellerTheme.infoBlue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                    'T$_table${_guests != null ? ' · ${_guests}p' : ''}',
                    style: const TextStyle(
                        fontSize: 10,
                        color: SellerTheme.infoBlue,
                        fontWeight: FontWeight.w600)),
              ),
            ],
            const Spacer(),
            // Elapsed timer
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: urgencyColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                elapsed < 60 ? '${elapsed}m ago' : '${elapsed ~/ 60}h ago',
                style: TextStyle(
                    fontSize: 9,
                    color: urgencyColor,
                    fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 6),
            OrderStatusChip(status: order.status),
          ]),
        ),
        // ── Order ID + Customer ───────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
          child: Row(children: [
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(order.customerName,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: SellerTheme.textPrimary),
                      overflow: TextOverflow.ellipsis),
                  Text('${order.id} · ${fmt.format(order.createdAt)}',
                      style: const TextStyle(
                          fontSize: 10, color: SellerTheme.textMuted)),
                ])),
            Text('$cur ${order.total.toStringAsFixed(0)}',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: SellerTheme.restaurant)),
          ]),
        ),
        // ── Delivery address ──────────────────────────────────────────────
        if (_mode == 'delivery' && order.deliveryAddress != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 4, 14, 0),
            child: Row(children: [
              const Icon(Icons.location_on_outlined,
                  size: 12, color: SellerTheme.textMuted),
              const SizedBox(width: 4),
              Expanded(
                child: Text(order.deliveryAddress!,
                    style: const TextStyle(
                        fontSize: 11, color: SellerTheme.textSecondary),
                    overflow: TextOverflow.ellipsis),
              ),
            ]),
          ),
        // ── Items (expandable) ────────────────────────────────────────────
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
            child: Row(children: [
              Text(
                _expanded ? 'Hide items ▲' : '${order.items.length} items ▼',
                style: const TextStyle(
                    fontSize: 11,
                    color: SellerTheme.infoBlue,
                    fontWeight: FontWeight.w600),
              ),
            ]),
          ),
        ),
        if (_expanded)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
            child: Column(
              children: order.items
                  .map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(children: [
                          Text('× ${item.quantity}',
                              style: const TextStyle(
                                  fontSize: 11,
                                  color: SellerTheme.textMuted,
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(item.name,
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: SellerTheme.textPrimary)),
                          ),
                          Text(
                            '+${(item.price * item.quantity).toStringAsFixed(0)}',
                            style: const TextStyle(
                                fontSize: 11,
                                color: SellerTheme.textSecondary,
                                fontWeight: FontWeight.w600),
                          ),
                        ]),
                      ))
                  .toList(),
            ),
          ),
        // ── ETA selector (Pending orders) ─────────────────────────────────
        if (order.status == SellerOrderStatus.pending)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
            child: Row(children: [
              const Text('ETA:',
                  style: TextStyle(
                      fontSize: 12, color: SellerTheme.textSecondary)),
              const SizedBox(width: 8),
              ...[15, 20, 30, 45].map((min) => GestureDetector(
                    onTap: () => setState(() => _etaMinutes = min),
                    child: Container(
                      margin: const EdgeInsets.only(right: 6),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _etaMinutes == min
                            ? SellerTheme.restaurant
                            : SellerTheme.surface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _etaMinutes == min
                              ? SellerTheme.restaurant
                              : SellerTheme.border,
                        ),
                      ),
                      child: Text('${min}m',
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _etaMinutes == min
                                  ? Colors.white
                                  : SellerTheme.textSecondary)),
                    ),
                  )),
            ]),
          ),
        // ── Action buttons ────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
          child: Row(children: [
            if (order.status == SellerOrderStatus.pending) ...[
              _btn(
                  '✅ Accept (${_etaMinutes}m)',
                  SellerTheme.successGreen,
                  () => context.read<RestaurantSellerBloc>().add(
                      AcceptRestaurantOrder(order.id,
                          estimatedMinutes: _etaMinutes))),
              const SizedBox(width: 8),
              _btn('❌', SellerTheme.errorRed, () => _showRejectDialog(context),
                  outline: true),
            ],
            if (order.status == SellerOrderStatus.confirmed)
              _btn(
                  '🍳 Mark Preparing',
                  SellerTheme.warningAmber,
                  () => context
                      .read<RestaurantSellerBloc>()
                      .add(MarkRestaurantOrderPreparing(order.id))),
            if (order.status == SellerOrderStatus.preparing)
              _btn(
                  '📦 Mark Ready',
                  SellerTheme.infoBlue,
                  () => context
                      .read<RestaurantSellerBloc>()
                      .add(MarkRestaurantOrderReady(order.id))),
            if (_mode == 'delivery' && order.status == SellerOrderStatus.ready)
              DeliveryDispatchButton(order: order),
            const Spacer(),
            GestureDetector(
              onTap: () => Navigator.pushNamed(
                context,
                SellerRouter.restaurantOrderDetail,
                arguments: order,
              ),
              child: const Text('View →',
                  style: TextStyle(
                      color: SellerTheme.restaurant,
                      fontSize: 11,
                      fontWeight: FontWeight.w600)),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _btn(String label, Color color, VoidCallback onTap,
      {bool outline = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: outline ? Colors.transparent : color,
          borderRadius: BorderRadius.circular(10),
          border: outline ? Border.all(color: color) : null,
        ),
        child: Text(label,
            style: TextStyle(
                color: outline ? color : Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.bold)),
      ),
    );
  }

  void _showRejectDialog(BuildContext context) {
    final reasons = [
      'Out of ingredients',
      'Kitchen too busy',
      'Restaurant closing soon',
      'Item unavailable',
      'Other',
    ];
    String selected = reasons.first;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx2, setS) => AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Reject Order',
              style: TextStyle(fontWeight: FontWeight.bold)),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Select a reason:',
                style:
                    TextStyle(color: SellerTheme.textSecondary, fontSize: 13)),
            const SizedBox(height: 12),
            RadioGroup<String>(
              groupValue: selected,
              onChanged: (v) => setS(() => selected = v!),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: reasons.map((r) => RadioListTile<String>(
                  title: Text(r, style: const TextStyle(fontSize: 13)),
                  value: r,
                  activeColor: SellerTheme.restaurant,
                  dense: true,
                )).toList(),
              ),
            ),
          ]),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: SellerTheme.errorRed,
                  foregroundColor: Colors.white),
              onPressed: () {
                context
                    .read<RestaurantSellerBloc>()
                    .add(RejectRestaurantOrder(order.id, selected));
                Navigator.pop(ctx);
              },
              child: const Text('Reject'),
            ),
          ],
        ),
      ),
    );
  }
}
