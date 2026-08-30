import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_event.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Table Management Screen
// ─────────────────────────────────────────────────────────────────────────────

class RestaurantTableManagementScreen extends StatefulWidget {
  const RestaurantTableManagementScreen({super.key});

  @override
  State<RestaurantTableManagementScreen> createState() =>
      _RestaurantTableManagementScreenState();
}

class _RestaurantTableManagementScreenState
    extends State<RestaurantTableManagementScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tc;
  bool _gridView = true; // toggle between grid and list

  static const _statusTabs = [
    ('all',       'All',       Colors.transparent),
    ('available', 'Available', SellerTheme.successGreen),
    ('occupied',  'Occupied',  SellerTheme.restaurant),
    ('reserved',  'Reserved',  SellerTheme.infoBlue),
    ('cleaning',  'Cleaning',  SellerTheme.warningAmber),
  ];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: _statusTabs.length, vsync: this);
    final ss = context.read<SellerBloc>().state;
    context.read<RestaurantSellerBloc>()
        .add(LoadRestaurantTables(countryCode: ss.countryCode));
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
                : SellerTheme.warningAmber,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<RestaurantSellerBloc, RestaurantSellerState>(
        builder: (context, state) {
          final ss = context.read<SellerBloc>().state;

          // Occupancy stats
          final occupied  = state.tables.where((t) => t.status == TableStatus.occupied).length;
          final available = state.tables.where((t) => t.status == TableStatus.available).length;
          final reserved  = state.tables.where((t) => t.status == TableStatus.reserved).length;
          final cleaning  = state.tables.where((t) => t.status == TableStatus.cleaning).length;
          final total     = state.tables.length;
          final occupancy = total == 0 ? 0.0 : occupied / total;

          return Scaffold(
            backgroundColor: SellerTheme.surface,
            appBar: AppBar(
              backgroundColor: SellerTheme.restaurant,
              foregroundColor: Colors.white,
              elevation: 0,
              title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(
                  'Table Management · ${ss.country.flag}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                Text(
                  '$occupied/$total occupied · ${ss.country.name}',
                  style: const TextStyle(fontSize: 10, color: Colors.white70),
                ),
              ]),
              actions: [
                IconButton(
                  icon: Icon(_gridView ? Icons.list : Icons.grid_view),
                  onPressed: () => setState(() => _gridView = !_gridView),
                  tooltip: _gridView ? 'List view' : 'Grid view',
                ),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => context.read<RestaurantSellerBloc>()
                      .add(LoadRestaurantTables(countryCode: ss.countryCode)),
                ),
              ],
              bottom: TabBar(
                controller: _tc,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white54,
                indicatorColor: Colors.white,
                isScrollable: true,
                tabs: _statusTabs.map((t) => Tab(text: t.$2)).toList(),
              ),
            ),
            body: Column(children: [
              // Occupancy header
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  // Stats row
                  Row(children: [
                    _statChip('$occupied', 'Busy', SellerTheme.restaurant),
                    const SizedBox(width: 8),
                    _statChip('$available', 'Free', SellerTheme.successGreen),
                    const SizedBox(width: 8),
                    _statChip('$reserved', 'Reserved', SellerTheme.infoBlue),
                    const SizedBox(width: 8),
                    _statChip('$cleaning', 'Cleaning', SellerTheme.warningAmber),
                  ]),
                  const SizedBox(height: 12),
                  // Occupancy bar
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      const Text('Occupancy',
                          style: TextStyle(
                              fontSize: 12,
                              color: SellerTheme.textSecondary,
                              fontWeight: FontWeight.w500)),
                      const Spacer(),
                      Text(
                        '${(occupancy * 100).toInt()}%',
                        style: const TextStyle(
                            fontSize: 12,
                            color: SellerTheme.restaurant,
                            fontWeight: FontWeight.bold),
                      ),
                    ]),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: occupancy,
                        minHeight: 8,
                        color: SellerTheme.restaurant,
                        backgroundColor:
                            SellerTheme.restaurant.withValues(alpha: 0.1),
                      ),
                    ),
                  ]),
                ]),
              ),
              // Table views
              Expanded(
                child: TabBarView(
                  controller: _tc,
                  children: _statusTabs.map((t) {
                    final tables = _tablesFor(state.tables, t.$1);
                    if (tables.isEmpty) {
                      return Center(
                        child: Column(mainAxisSize: MainAxisSize.min, children: [
                          const Text('🪑', style: TextStyle(fontSize: 36)),
                          const SizedBox(height: 8),
                          Text('No ${t.$2.toLowerCase()} tables',
                              style: const TextStyle(
                                  color: SellerTheme.textMuted, fontSize: 14)),
                        ]),
                      );
                    }
                    return _gridView
                        ? _GridView(tables: tables)
                        : _ListView(tables: tables);
                  }).toList(),
                ),
              ),
            ]),
          );
        },
      ),
    );
  }

  Widget _statChip(String count, String label, Color color) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(children: [
        Text(count,
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color)),
        Text(label,
            style: const TextStyle(
                fontSize: 9,
                color: SellerTheme.textMuted),
            textAlign: TextAlign.center),
      ]),
    ),
  );

  List<RestaurantTable> _tablesFor(
      List<RestaurantTable> tables, String filter) {
    if (filter == 'all') return tables;
    final statusMap = {
      'available': TableStatus.available,
      'occupied':  TableStatus.occupied,
      'reserved':  TableStatus.reserved,
      'cleaning':  TableStatus.cleaning,
    };
    return tables.where((t) => t.status == statusMap[filter]).toList();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid View
// ─────────────────────────────────────────────────────────────────────────────

class _GridView extends StatelessWidget {
  final List<RestaurantTable> tables;
  const _GridView({required this.tables});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.85,
      ),
      itemCount: tables.length,
      itemBuilder: (ctx, i) => _TableGridCard(table: tables[i]),
    );
  }
}

class _TableGridCard extends StatelessWidget {
  final RestaurantTable table;
  const _TableGridCard({required this.table});

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(table.status);
    final emoji = _statusEmoji(table.status);

    return GestureDetector(
      onTap: () => _showTableActions(context, table),
      child: Container(
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: color.withValues(alpha: 0.4),
            width: table.status == TableStatus.occupied ? 2 : 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 22)),
            const SizedBox(height: 4),
            Text(
              'T${table.number}',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color),
            ),
            Text(
              '${table.seats}🪑',
              style: const TextStyle(
                  fontSize: 10, color: SellerTheme.textMuted),
            ),
            if (table.guestName != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  table.guestName!.split(' ').first,
                  style: TextStyle(
                      fontSize: 9,
                      color: color,
                      fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            const SizedBox(height: 4),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                table.statusLabel,
                style: TextStyle(
                    fontSize: 8,
                    color: color,
                    fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// List View
// ─────────────────────────────────────────────────────────────────────────────

class _ListView extends StatelessWidget {
  final List<RestaurantTable> tables;
  const _ListView({required this.tables});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: tables.length,
      itemBuilder: (ctx, i) => _TableListCard(table: tables[i]),
    );
  }
}

class _TableListCard extends StatelessWidget {
  final RestaurantTable table;
  const _TableListCard({required this.table});

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(table.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(
            width: 52, height: 52,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(_statusEmoji(table.status),
                  style: const TextStyle(fontSize: 18)),
              Text('T${table.number}',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: color)),
            ]),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text('Table ${table.number} · ${table.seats} seats',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: SellerTheme.textPrimary)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(table.statusLabel,
                    style: TextStyle(
                        fontSize: 10,
                        color: color,
                        fontWeight: FontWeight.bold)),
              ),
            ]),
            if (table.guestName != null) ...[
              const SizedBox(height: 4),
              Row(children: [
                const Icon(Icons.person_outline,
                    size: 12, color: SellerTheme.textMuted),
                const SizedBox(width: 4),
                Text('${table.guestName}',
                    style: const TextStyle(
                        fontSize: 12, color: SellerTheme.textSecondary)),
                if (table.guestCount != null) ...[
                  const SizedBox(width: 8),
                  Text('· ${table.guestCount} guests',
                      style: const TextStyle(
                          fontSize: 11, color: SellerTheme.textMuted)),
                ],
              ]),
            ],
            if (table.currentOrderId != null) ...[
              const SizedBox(height: 2),
              Row(children: [
                const Icon(Icons.receipt_outlined,
                    size: 12, color: SellerTheme.textMuted),
                const SizedBox(width: 4),
                Text(table.currentOrderId!,
                    style: const TextStyle(
                        fontSize: 11, color: SellerTheme.textMuted)),
              ]),
            ],
          ])),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => _showTableActions(context, table),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: SellerTheme.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: SellerTheme.border),
              ),
              child: const Icon(Icons.edit_outlined,
                  size: 16, color: SellerTheme.textMuted),
            ),
          ),
        ]),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Table Action Bottom Sheet
// ─────────────────────────────────────────────────────────────────────────────

void _showTableActions(BuildContext context, RestaurantTable table) {
  final color = _statusColor(table.status);
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        // Handle
        Container(
          width: 40, height: 4,
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
              color: SellerTheme.border,
              borderRadius: BorderRadius.circular(2)),
        ),
        // Title
        Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(child: Text(_statusEmoji(table.status),
                style: const TextStyle(fontSize: 22))),
          ),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Table ${table.number}',
                style: const TextStyle(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            Text('${table.seats} seats · ${table.statusLabel}',
                style: const TextStyle(
                    fontSize: 12, color: SellerTheme.textMuted)),
          ]),
        ]),
        const SizedBox(height: 20),
        const Divider(height: 1),
        const SizedBox(height: 16),

        // Status actions
        if (table.status != TableStatus.available)
          _actionTile(ctx, context,
            icon: Icons.check_circle_outline,
            color: SellerTheme.successGreen,
            label: 'Mark Available',
            onTap: () => context.read<RestaurantSellerBloc>()
                .add(ToggleTableStatus(table.id, 'available')),
          ),
        if (table.status != TableStatus.reserved)
          _actionTile(ctx, context,
            icon: Icons.bookmark_outline,
            color: SellerTheme.infoBlue,
            label: 'Mark Reserved',
            onTap: () => context.read<RestaurantSellerBloc>()
                .add(ToggleTableStatus(table.id, 'reserved')),
          ),
        if (table.status == TableStatus.occupied)
          _actionTile(ctx, context,
            icon: Icons.cleaning_services_outlined,
            color: SellerTheme.warningAmber,
            label: 'Clear Table (Guest left)',
            onTap: () => context.read<RestaurantSellerBloc>()
                .add(ClearRestaurantTable(table.id)),
          ),
        if (table.status == TableStatus.cleaning)
          _actionTile(ctx, context,
            icon: Icons.done_all,
            color: SellerTheme.successGreen,
            label: 'Cleaning Done — Mark Available',
            onTap: () => context.read<RestaurantSellerBloc>()
                .add(ToggleTableStatus(table.id, 'available')),
          ),
        if (table.status == TableStatus.available)
          _actionTile(ctx, context,
            icon: Icons.people_outline,
            color: SellerTheme.restaurant,
            label: 'Assign to Walk-in',
            onTap: () {
              Navigator.pop(ctx);
              _showAssignSheet(context, table);
            },
          ),
      ]),
    ),
  );
}

Widget _actionTile(
  BuildContext sheetCtx,
  BuildContext pageCtx, {
  required IconData icon,
  required Color color,
  required String label,
  required VoidCallback onTap,
}) {
  return ListTile(
    leading: Container(
      width: 38, height: 38,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: color, size: 18),
    ),
    title: Text(label,
        style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: SellerTheme.textPrimary)),
    onTap: () {
      onTap();
      Navigator.pop(sheetCtx);
    },
  );
}

void _showAssignSheet(BuildContext context, RestaurantTable table) {
  final nameCtrl  = TextEditingController();
  final countCtrl = TextEditingController(text: '2');
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 24, right: 24, top: 20),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 40, height: 4,
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
              color: SellerTheme.border,
              borderRadius: BorderRadius.circular(2)),
        ),
        Text('Assign Table ${table.number}',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        TextField(
          controller: nameCtrl,
          decoration: InputDecoration(
            labelText: 'Guest / Reservation Name',
            prefixIcon: const Icon(Icons.person_outline),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: countCtrl,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'Number of Guests',
            prefixIcon: const Icon(Icons.people_outline),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity, height: 50,
          child: ElevatedButton(
            onPressed: () {
              final name  = nameCtrl.text.trim();
              final count = int.tryParse(countCtrl.text) ?? 2;
              if (name.isEmpty) return;
              context.read<RestaurantSellerBloc>().add(AssignTableToOrder(
                tableId:    table.id,
                orderId:    'WALKIN-${DateTime.now().millisecondsSinceEpoch}',
                guestName:  name,
                guestCount: count,
              ));
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: SellerTheme.restaurant,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: const Text('Assign Table',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          ),
        ),
        const SizedBox(height: 20),
      ]),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

Color _statusColor(TableStatus s) => switch (s) {
  TableStatus.available => SellerTheme.successGreen,
  TableStatus.occupied  => SellerTheme.restaurant,
  TableStatus.reserved  => SellerTheme.infoBlue,
  TableStatus.cleaning  => SellerTheme.warningAmber,
};

String _statusEmoji(TableStatus s) => switch (s) {
  TableStatus.available => '✅',
  TableStatus.occupied  => '🍽️',
  TableStatus.reserved  => '📌',
  TableStatus.cleaning  => '🧹',
};
