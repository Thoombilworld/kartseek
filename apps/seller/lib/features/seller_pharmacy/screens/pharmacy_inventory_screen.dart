import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_event.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// Pharmacy Inventory Screen
///
/// Features:
/// • Category tabs auto-built from the item list
/// • Search bar to filter across all categories
/// • Per-item: availability toggle, stock progress bar, price editor, Rx badge
/// • Low-stock items highlighted with amber/red border
/// • Bulk Restock All Low-Stock Items button in each category header
/// • Add Item FAB with full form (name/category/price/stock/Rx toggle)
class PharmacyInventoryScreen extends StatefulWidget {
  const PharmacyInventoryScreen({super.key});

  @override
  State<PharmacyInventoryScreen> createState() =>
      _PharmacyInventoryScreenState();
}

class _PharmacyInventoryScreenState extends State<PharmacyInventoryScreen>
    with SingleTickerProviderStateMixin {
  static const _pharma = Color(0xFF3B82F6);

  TabController? _tabCtrl;
  List<String> _categories = [];
  String _search = '';
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    final ss = context.read<SellerBloc>().state;
    context
        .read<PharmacySellerBloc>()
        .add(LoadPharmacyInventory(countryCode: ss.countryCode));
  }

  @override
  void dispose() {
    _tabCtrl?.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _initTabs(List<PharmacyItem> items) {
    final cats = [
      'All',
      ...{...items.map((i) => i.category)}.toList()..sort()
    ];
    if (cats.length != _categories.length ||
        !cats.every((c) => _categories.contains(c))) {
      _categories = cats;
      _tabCtrl?.dispose();
      _tabCtrl = TabController(length: cats.length, vsync: this);
    }
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
            if (state.items.isNotEmpty) _initTabs(state.items);
            final cur = ss.country.currencySymbol;

            return Scaffold(
              backgroundColor: SellerTheme.surface,
              appBar: AppBar(
                backgroundColor: _pharma,
                foregroundColor: Colors.white,
                elevation: 0,
                title: _search.isEmpty
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                            const Text('Inventory',
                                style: TextStyle(
                                    fontSize: 16, fontWeight: FontWeight.bold)),
                            Text(
                                '${state.items.length} items · ${state.lowStockCount} low stock',
                                style: const TextStyle(
                                    fontSize: 11, color: Colors.white70)),
                          ])
                    : TextField(
                        controller: _searchCtrl,
                        autofocus: true,
                        style: const TextStyle(color: Colors.white),
                        cursorColor: Colors.white70,
                        decoration: InputDecoration(
                          hintText: 'Search medicines...',
                          hintStyle: const TextStyle(color: Colors.white60),
                          border: InputBorder.none,
                          suffixIcon: IconButton(
                            icon:
                                const Icon(Icons.close, color: Colors.white70),
                            onPressed: () => setState(() {
                              _search = '';
                              _searchCtrl.clear();
                            }),
                          ),
                        ),
                        onChanged: (v) => setState(() => _search = v),
                      ),
                actions: [
                  if (_search.isEmpty)
                    IconButton(
                      icon: const Icon(Icons.search, color: Colors.white),
                      onPressed: () => setState(() => _search = ' '),
                    ),
                  if (state.lowStockCount > 0)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Center(
                        child: GestureDetector(
                          onTap: () => context
                              .read<PharmacySellerBloc>()
                              .add(const BulkRestockLowItems()),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text('Restock All',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ),
                    ),
                ],
                bottom: _search.isEmpty && _tabCtrl != null
                    ? TabBar(
                        controller: _tabCtrl!,
                        indicatorColor: Colors.white,
                        indicatorWeight: 3,
                        labelColor: Colors.white,
                        unselectedLabelColor: Colors.white60,
                        labelStyle: const TextStyle(
                            fontSize: 11, fontWeight: FontWeight.bold),
                        unselectedLabelStyle: const TextStyle(fontSize: 10),
                        isScrollable: true,
                        tabAlignment: TabAlignment.start,
                        tabs: _categories.map((c) => Tab(text: c)).toList(),
                      )
                    : null,
              ),
              floatingActionButton: FloatingActionButton.extended(
                onPressed: () => _showAddItemSheet(context, cur, state.items),
                backgroundColor: _pharma,
                icon: const Icon(Icons.add, color: Colors.white),
                label: const Text('Add Item',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w700)),
              ),
              body: state.items.isEmpty
                  ? const Center(
                      child: CircularProgressIndicator(color: _pharma))
                  : _search.trim().isNotEmpty
                      ? _buildSearchResults(context, state, cur)
                      : _tabCtrl != null
                          ? TabBarView(
                              controller: _tabCtrl!,
                              children: _categories.map((cat) {
                                final filtered = cat == 'All'
                                    ? state.items
                                    : state.items
                                        .where((i) => i.category == cat)
                                        .toList();
                                return _buildItemList(context, filtered, cur);
                              }).toList(),
                            )
                          : _buildItemList(context, state.items, cur),
            );
          },
        ),
      ),
    );
  }

  // ── Search Results ─────────────────────────────────────────────────────────

  Widget _buildSearchResults(
      BuildContext context, PharmacySellerState state, String cur) {
    final q = _search.trim().toLowerCase();
    final results = state.items
        .where((i) =>
            i.name.toLowerCase().contains(q) ||
            i.category.toLowerCase().contains(q))
        .toList();

    if (results.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('💊', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 12),
          Text('No results for "$q"',
              style: const TextStyle(
                  color: SellerTheme.textSecondary, fontSize: 14)),
        ]),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(14),
      itemCount: results.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) => _ItemCard(item: results[i], cur: cur),
    );
  }

  // ── Item List by Category ──────────────────────────────────────────────────

  Widget _buildItemList(
      BuildContext context, List<PharmacyItem> items, String cur) {
    final lowCount = items.where((i) => i.isLowStock || i.isOutOfStock).length;

    return Column(children: [
      // Category stats bar
      Container(
        color: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(children: [
          Text('${items.length} items',
              style: const TextStyle(
                  fontSize: 12,
                  color: SellerTheme.textSecondary,
                  fontWeight: FontWeight.w500)),
          if (lowCount > 0) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: SellerTheme.errorRed.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('$lowCount low stock',
                  style: const TextStyle(
                      color: SellerTheme.errorRed,
                      fontSize: 10,
                      fontWeight: FontWeight.bold)),
            ),
          ],
          const Spacer(),
          if (lowCount > 0)
            GestureDetector(
              onTap: () => context
                  .read<PharmacySellerBloc>()
                  .add(const BulkRestockLowItems()),
              child: const Text('🔄 Restock Low',
                  style: TextStyle(
                      color: _pharma,
                      fontSize: 11,
                      fontWeight: FontWeight.w600)),
            ),
        ]),
      ),
      const Divider(height: 1, color: SellerTheme.border),
      Expanded(
        child: ListView.separated(
          padding: const EdgeInsets.all(14),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, i) => _ItemCard(item: items[i], cur: cur),
        ),
      ),
    ]);
  }

  // ── Add Item Sheet ─────────────────────────────────────────────────────────

  void _showAddItemSheet(
      BuildContext context, String cur, List<PharmacyItem> items) {
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    final stockCtrl = TextEditingController();
    final cats = {...items.map((i) => i.category)}.toList()..sort();
    String selectedCat = cats.isNotEmpty ? cats.first : 'General';
    String selectedEmoji = '💊';
    bool requiresRx = false;

    const emojis = [
      '💊',
      '🔵',
      '🩺',
      '❤️',
      '🫃',
      '☀️',
      '🍊',
      '🐟',
      '🤧',
      '💨',
      '💉',
      '🩹',
      '🌡️',
      '🧪',
      '🔬',
      '💧',
      '🩸',
      '🫁',
      '🦴',
      '🧠',
      '👁️',
      '👂',
      '🦷',
      '🏋️',
      '🌿',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.fromLTRB(
              20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: SingleChildScrollView(
            child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Add Inventory Item',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 14),

                  // Emoji picker
                  const Text('Emoji',
                      style: TextStyle(
                          fontSize: 12, color: SellerTheme.textSecondary)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: emojis
                        .map((e) => GestureDetector(
                              onTap: () => setS(() => selectedEmoji = e),
                              child: Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: selectedEmoji == e
                                      ? _pharma.withValues(alpha: 0.15)
                                      : SellerTheme.surface,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: selectedEmoji == e
                                        ? _pharma
                                        : SellerTheme.border,
                                  ),
                                ),
                                child: Center(
                                    child: Text(e,
                                        style: const TextStyle(fontSize: 18))),
                              ),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 14),

                  // Name
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(
                      labelText: 'Medicine Name',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10)),
                      prefixText: '$selectedEmoji ',
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Category
                  DropdownButtonFormField<String>(
                    initialValue: selectedCat,
                    decoration: InputDecoration(
                      labelText: 'Category',
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    items: cats
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) =>
                        setS(() => selectedCat = v ?? selectedCat),
                  ),
                  const SizedBox(height: 12),

                  // Price & Stock
                  Row(children: [
                    Expanded(
                      child: TextField(
                        controller: priceCtrl,
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true),
                        decoration: InputDecoration(
                          labelText: 'Price ($cur)',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: stockCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Stock (units)',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 12),

                  // Prescription toggle
                  SwitchListTile(
                    value: requiresRx,
                    onChanged: (v) => setS(() => requiresRx = v),
                    activeThumbColor: _pharma,
                    title: const Text('Requires Prescription',
                        style: TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w500)),
                    subtitle: const Text('Patient must upload a valid Rx',
                        style: TextStyle(
                            fontSize: 11, color: SellerTheme.textMuted)),
                    contentPadding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: 14),

                  // Submit
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _pharma,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      onPressed: () {
                        final name = nameCtrl.text.trim();
                        final price = double.tryParse(priceCtrl.text) ?? 0;
                        final stock = int.tryParse(stockCtrl.text) ?? 0;
                        if (name.isEmpty || price <= 0) return;
                        context.read<PharmacySellerBloc>().add(AddInventoryItem(
                              name: name,
                              category: selectedCat,
                              price: price,
                              stock: stock,
                              emoji: selectedEmoji,
                              requiresPrescription: requiresRx,
                            ));
                        Navigator.pop(ctx);
                      },
                      child: const Text('Add to Inventory',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                  ),
                ]),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Item Card
// ─────────────────────────────────────────────────────────────────────────────

class _ItemCard extends StatelessWidget {
  final PharmacyItem item;
  final String cur;

  const _ItemCard({required this.item, required this.cur});

  static const _pharma = Color(0xFF3B82F6);

  Color get _borderColor {
    if (item.isOutOfStock) return SellerTheme.errorRed;
    if (item.isLowStock) return SellerTheme.warningAmber;
    return SellerTheme.border;
  }

  @override
  Widget build(BuildContext context) {
    final pct = item.stock / (item.minStock * 5).clamp(1, 500);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: _borderColor,
            width: (item.isOutOfStock || item.isLowStock) ? 1.5 : 1.0),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            // Emoji
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _pharma.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                  child:
                      Text(item.emoji, style: const TextStyle(fontSize: 20))),
            ),
            const SizedBox(width: 12),
            // Name & category
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Row(children: [
                    Expanded(
                        child: Text(item.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 13),
                            overflow: TextOverflow.ellipsis)),
                    if (item.requiresPrescription)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 1),
                        margin: const EdgeInsets.only(left: 4),
                        decoration: BoxDecoration(
                          color: _pharma.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('Rx',
                            style: TextStyle(
                                color: _pharma,
                                fontSize: 9,
                                fontWeight: FontWeight.bold)),
                      ),
                  ]),
                  Text(item.category,
                      style: const TextStyle(
                          color: SellerTheme.textMuted, fontSize: 11)),
                ])),
            // Availability toggle
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Switch(
                value: item.isAvailable,
                onChanged: (v) => context
                    .read<PharmacySellerBloc>()
                    .add(ToggleInventoryItemAvailability(item.id, v)),
                activeTrackColor: SellerTheme.successGreen,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              Text(item.isAvailable ? 'Available' : 'Hidden',
                  style: TextStyle(
                      fontSize: 9,
                      color: item.isAvailable
                          ? SellerTheme.successGreen
                          : SellerTheme.textMuted)),
            ]),
          ]),

          const SizedBox(height: 10),

          // Price & stock info row
          Row(children: [
            GestureDetector(
              onTap: () => _showPriceEditor(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _pharma.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _pharma.withValues(alpha: 0.2)),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text('$cur ${item.price.toStringAsFixed(0)}',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: _pharma)),
                  const SizedBox(width: 4),
                  const Icon(Icons.edit, size: 10, color: _pharma),
                ]),
              ),
            ),
            const SizedBox(width: 10),
            Text('/ ${item.unit}',
                style: const TextStyle(
                    color: SellerTheme.textMuted, fontSize: 11)),
            const Spacer(),
            GestureDetector(
              onTap: () => _showStockEditor(context),
              child: Row(children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: item.isOutOfStock
                        ? SellerTheme.errorRed.withValues(alpha: 0.1)
                        : item.isLowStock
                            ? SellerTheme.warningAmber.withValues(alpha: 0.1)
                            : SellerTheme.successGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: item.isOutOfStock
                          ? SellerTheme.errorRed.withValues(alpha: 0.3)
                          : item.isLowStock
                              ? SellerTheme.warningAmber.withValues(alpha: 0.3)
                              : SellerTheme.successGreen.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Text(
                      item.isOutOfStock
                          ? '❌ Out of Stock'
                          : item.isLowStock
                              ? '⚠️ ${item.stock} left'
                              : '✅ ${item.stock} in stock',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: item.isOutOfStock
                              ? SellerTheme.errorRed
                              : item.isLowStock
                                  ? SellerTheme.warningAmber
                                  : SellerTheme.successGreen),
                    ),
                    const SizedBox(width: 4),
                    Icon(Icons.edit,
                        size: 9,
                        color: item.isOutOfStock
                            ? SellerTheme.errorRed
                            : item.isLowStock
                                ? SellerTheme.warningAmber
                                : SellerTheme.successGreen),
                  ]),
                ),
              ]),
            ),
          ]),

          // Stock progress bar
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct.clamp(0.0, 1.0),
              minHeight: 5,
              backgroundColor: SellerTheme.border,
              valueColor: AlwaysStoppedAnimation(
                item.isOutOfStock
                    ? SellerTheme.errorRed
                    : item.isLowStock
                        ? SellerTheme.warningAmber
                        : SellerTheme.successGreen,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Min: ${item.minStock} ${item.unit}s',
                style:
                    const TextStyle(fontSize: 9, color: SellerTheme.textMuted)),
            Text(
                'Manufacturer: ${item.manufacturer.isEmpty ? "—" : item.manufacturer}',
                style:
                    const TextStyle(fontSize: 9, color: SellerTheme.textMuted)),
          ]),
        ]),
      ),
    );
  }

  void _showStockEditor(BuildContext context) {
    final ctrl = TextEditingController(text: '${item.stock}');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(children: [
          Text(item.emoji, style: const TextStyle(fontSize: 22)),
          const SizedBox(width: 8),
          const Expanded(
              child: Text('Update Stock',
                  style: TextStyle(fontSize: 15),
                  overflow: TextOverflow.ellipsis)),
        ]),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'New stock count (${item.unit}s)',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _pharma,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              final n = int.tryParse(ctrl.text) ?? item.stock;
              context
                  .read<PharmacySellerBloc>()
                  .add(UpdateInventoryItemStock(item.id, n));
              Navigator.pop(ctx);
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  void _showPriceEditor(BuildContext context) {
    final ctrl = TextEditingController(text: item.price.toStringAsFixed(0));
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(children: [
          Text(item.emoji, style: const TextStyle(fontSize: 22)),
          const SizedBox(width: 8),
          const Expanded(
              child: Text('Update Price',
                  style: TextStyle(fontSize: 15),
                  overflow: TextOverflow.ellipsis)),
        ]),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: 'New price ($cur)',
            prefixText: '$cur ',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _pharma,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              final p = double.tryParse(ctrl.text) ?? item.price;
              context
                  .read<PharmacySellerBloc>()
                  .add(UpdateInventoryItemPrice(item.id, p));
              Navigator.pop(ctx);
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }
}
