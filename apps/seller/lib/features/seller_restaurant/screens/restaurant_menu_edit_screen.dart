import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_event.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Restaurant Menu Edit Screen
// ─────────────────────────────────────────────────────────────────────────────

class RestaurantMenuEditScreen extends StatefulWidget {
  const RestaurantMenuEditScreen({super.key});

  @override
  State<RestaurantMenuEditScreen> createState() =>
      _RestaurantMenuEditScreenState();
}

class _RestaurantMenuEditScreenState extends State<RestaurantMenuEditScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    final ss = context.read<SellerBloc>().state;
    context
        .read<RestaurantSellerBloc>()
        .add(LoadRestaurantMenu(countryCode: ss.countryCode));
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
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
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<RestaurantSellerBloc, RestaurantSellerState>(
        builder: (context, state) {
          final ss = context.read<SellerBloc>().state;
          final allItems = state.menuItems.where((i) {
            if (_query.isEmpty) return true;
            return i.name.toLowerCase().contains(_query.toLowerCase()) ||
                i.description.toLowerCase().contains(_query.toLowerCase());
          }).toList();

          final availCount = allItems.where((i) => i.isAvailable).length;
          final unavailCount = allItems.where((i) => !i.isAvailable).length;

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
                      'Menu Editor · ${ss.country.flag}',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    Text(
                      '${state.menuItems.length} items · ${ss.country.name}',
                      style:
                          const TextStyle(fontSize: 10, color: Colors.white70),
                    ),
                  ]),
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => context
                      .read<RestaurantSellerBloc>()
                      .add(LoadRestaurantMenu(countryCode: ss.countryCode)),
                ),
              ],
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(52),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                  child: TextField(
                    controller: _searchCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Search menu...',
                      hintStyle:
                          TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                      prefixIcon: const Icon(Icons.search,
                          color: Colors.white70, size: 20),
                      suffixIcon: _query.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear,
                                  color: Colors.white70, size: 18),
                              onPressed: () {
                                _searchCtrl.clear();
                                setState(() => _query = '');
                              })
                          : null,
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.15),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      isDense: true,
                    ),
                    onChanged: (q) => setState(() => _query = q),
                  ),
                ),
              ),
            ),
            floatingActionButton: FloatingActionButton.extended(
              onPressed: () => _showAddItemSheet(context, state),
              backgroundColor: SellerTheme.restaurant,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Add Item',
                  style: TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w700)),
            ),
            body: Column(children: [
              // Summary bar
              if (state.menuItems.isNotEmpty)
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: Row(children: [
                    _pill('$availCount available', SellerTheme.successGreen),
                    const SizedBox(width: 8),
                    if (unavailCount > 0)
                      _pill('$unavailCount 86\'d', SellerTheme.errorRed),
                  ]),
                ),
              // Category sections
              Expanded(
                child: state.status == RestaurantBlocStatus.loading
                    ? const Center(
                        child: CircularProgressIndicator(
                            color: SellerTheme.restaurant))
                    : state.menuCategories.isEmpty
                        ? _emptyState()
                        : _query.isNotEmpty
                            ? _SearchResults(items: allItems, state: state)
                            : ListView(
                                padding:
                                    const EdgeInsets.fromLTRB(16, 12, 16, 100),
                                children: state.menuCategories.map((cat) {
                                  return _CategorySection(
                                      category: cat, state: state);
                                }).toList(),
                              ),
              ),
            ]),
          );
        },
      ),
    );
  }

  Widget _pill(String label, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20)),
        child: Text(label,
            style: TextStyle(
                color: color, fontSize: 11, fontWeight: FontWeight.w600)),
      );

  Widget _emptyState() => const Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('🍽️', style: TextStyle(fontSize: 48)),
          SizedBox(height: 12),
          Text('No menu items yet',
              style: TextStyle(color: SellerTheme.textMuted, fontSize: 14)),
          SizedBox(height: 4),
          Text('Tap + Add Item to get started',
              style: TextStyle(color: SellerTheme.textMuted, fontSize: 12)),
        ]),
      );

  // ── Add Item Bottom Sheet ─────────────────────────────────────────────────

  void _showAddItemSheet(BuildContext context, RestaurantSellerState state) {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    String selCat = state.menuCategories.isNotEmpty
        ? state.menuCategories.first.id
        : 'mains';
    String selEmoji = '🍽️';
    int selPrep = 20;

    const emojis = [
      '🍽️',
      '🥩',
      '🍗',
      '🐟',
      '🦐',
      '🍚',
      '🥗',
      '🍲',
      '🍛',
      '🌮',
      '🍔',
      '🍕',
      '🍝',
      '🍜',
      '🥟',
      '🧀',
      '🥚',
      '🫘',
      '🌶️',
      '🥑',
      '🍮',
      '🍰',
      '🍩',
      '🍫',
      '🍵',
      '☕',
      '🍹',
      '🥤',
      '💧',
      '🫙',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx2, setS) => Padding(
          padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx2).viewInsets.bottom,
              left: 20,
              right: 20,
              top: 20),
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              // Handle
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                    color: SellerTheme.border,
                    borderRadius: BorderRadius.circular(2)),
              ),
              const Text('Add Menu Item',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              // Emoji picker
              SizedBox(
                height: 54,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: emojis
                      .map((e) => GestureDetector(
                            onTap: () => setS(() => selEmoji = e),
                            child: Container(
                              margin: const EdgeInsets.only(right: 8),
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: selEmoji == e
                                    ? SellerTheme.restaurant
                                        .withValues(alpha: 0.15)
                                    : SellerTheme.surface,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                    color: selEmoji == e
                                        ? SellerTheme.restaurant
                                        : SellerTheme.border),
                              ),
                              child: Center(
                                  child: Text(e,
                                      style: const TextStyle(fontSize: 22))),
                            ),
                          ))
                      .toList(),
                ),
              ),
              const SizedBox(height: 14),
              // Name
              TextField(
                controller: nameCtrl,
                decoration: InputDecoration(
                  labelText: 'Item Name *',
                  prefixText: '$selEmoji  ',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 10),
              // Description
              TextField(
                controller: descCtrl,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 10),
              // Price & Category row
              Row(children: [
                Expanded(
                    child: TextField(
                  controller: priceCtrl,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: 'Price *',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                )),
                const SizedBox(width: 10),
                Expanded(
                    child: DropdownButtonFormField<String>(
                  initialValue: selCat,
                  decoration: InputDecoration(
                    labelText: 'Category',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  items: state.menuCategories
                      .map((c) => DropdownMenuItem(
                          value: c.id,
                          child: Text('${c.emoji} ${c.name}',
                              overflow: TextOverflow.ellipsis)))
                      .toList(),
                  onChanged: (v) => setS(() => selCat = v!),
                )),
              ]),
              const SizedBox(height: 10),
              // Prep time selector
              Row(children: [
                const Text('Prep Time:',
                    style: TextStyle(
                        fontSize: 12, color: SellerTheme.textSecondary)),
                const SizedBox(width: 8),
                ...[10, 15, 20, 30, 45].map((m) => GestureDetector(
                      onTap: () => setS(() => selPrep = m),
                      child: Container(
                        margin: const EdgeInsets.only(right: 6),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: selPrep == m
                              ? SellerTheme.restaurant
                              : SellerTheme.surface,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                              color: selPrep == m
                                  ? SellerTheme.restaurant
                                  : SellerTheme.border),
                        ),
                        child: Text('${m}m',
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: selPrep == m
                                    ? Colors.white
                                    : SellerTheme.textSecondary)),
                      ),
                    )),
              ]),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () {
                    final name = nameCtrl.text.trim();
                    final price = double.tryParse(priceCtrl.text);
                    if (name.isEmpty || price == null || price <= 0) return;
                    context.read<RestaurantSellerBloc>().add(AddMenuItem(
                          name: name,
                          description: descCtrl.text.trim(),
                          price: price,
                          emoji: selEmoji,
                          categoryId: selCat,
                          prepTimeMinutes: selPrep,
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
                  child: const Text('Add to Menu',
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
              const SizedBox(height: 20),
            ]),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Section (collapsible)
// ─────────────────────────────────────────────────────────────────────────────

class _CategorySection extends StatefulWidget {
  final MenuCategory category;
  final RestaurantSellerState state;
  const _CategorySection({required this.category, required this.state});

  @override
  State<_CategorySection> createState() => _CategorySectionState();
}

class _CategorySectionState extends State<_CategorySection> {
  bool _expanded = true;

  MenuCategory get cat => widget.category;
  RestaurantSellerState get state => widget.state;

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final availItems = cat.items.where((i) => i.isAvailable).length;
    final allAvail = availItems == cat.items.length;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: SellerTheme.elevatedCard(),
      child: Column(children: [
        // Category header
        InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: SellerTheme.restaurant.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                    child:
                        Text(cat.emoji, style: const TextStyle(fontSize: 18))),
              ),
              const SizedBox(width: 10),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(cat.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: SellerTheme.textPrimary)),
                    Text(
                      '$availItems/${cat.items.length} available',
                      style: TextStyle(
                          fontSize: 11,
                          color: allAvail
                              ? SellerTheme.successGreen
                              : SellerTheme.warningAmber),
                    ),
                  ])),
              // Category 86 toggle
              Transform.scale(
                scale: 0.75,
                child: Switch(
                  value: allAvail,
                  onChanged: (v) => context
                      .read<RestaurantSellerBloc>()
                      .add(ToggleMenuCategoryAvailability(cat.id, v)),
                  activeTrackColor: SellerTheme.successGreen,
                  inactiveTrackColor:
                      SellerTheme.errorRed.withValues(alpha: 0.4),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
              Icon(
                _expanded ? Icons.expand_less : Icons.expand_more,
                color: SellerTheme.textMuted,
              ),
            ]),
          ),
        ),
        // Items
        if (_expanded)
          ...cat.items.map((item) =>
              _MenuItemRow(item: item, currency: ss.country.currencySymbol)),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu Item Row
// ─────────────────────────────────────────────────────────────────────────────

class _MenuItemRow extends StatelessWidget {
  final MenuItem item;
  final String currency;
  const _MenuItemRow({required this.item, required this.currency});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      decoration: BoxDecoration(
        border: const Border(
            top: BorderSide(color: SellerTheme.border, width: 0.5)),
        color: item.isAvailable ? Colors.white : SellerTheme.surface,
      ),
      child: Row(children: [
        // Emoji + popular badge
        Stack(children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: item.isAvailable
                  ? SellerTheme.restaurant.withValues(alpha: 0.07)
                  : SellerTheme.border.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
                child: Text(item.emoji,
                    style: TextStyle(
                        fontSize: 22,
                        color: item.isAvailable ? null : Colors.black38))),
          ),
          if (item.isPopular)
            Positioned(
              right: 0,
              top: 0,
              child: Container(
                width: 14,
                height: 14,
                decoration: const BoxDecoration(
                    color: SellerTheme.warningAmber, shape: BoxShape.circle),
                child: const Icon(Icons.star, size: 9, color: Colors.white),
              ),
            ),
        ]),
        const SizedBox(width: 10),
        // Details
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(item.name,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: item.isAvailable
                    ? SellerTheme.textPrimary
                    : SellerTheme.textMuted,
                decoration:
                    item.isAvailable ? null : TextDecoration.lineThrough,
              ),
              overflow: TextOverflow.ellipsis),
          Text(item.description,
              style:
                  const TextStyle(fontSize: 10, color: SellerTheme.textMuted),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Row(children: [
            Text(
              '$currency ${item.price.toStringAsFixed(2)}',
              style: const TextStyle(
                  color: SellerTheme.restaurant,
                  fontSize: 12,
                  fontWeight: FontWeight.bold),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: SellerTheme.infoBlue.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text('⏱ ${item.prepTimeMinutes}m',
                  style: const TextStyle(
                      fontSize: 9,
                      color: SellerTheme.infoBlue,
                      fontWeight: FontWeight.w600)),
            ),
          ]),
        ])),
        // Controls
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Transform.scale(
            scale: 0.8,
            child: Switch(
              value: item.isAvailable,
              onChanged: (v) => context
                  .read<RestaurantSellerBloc>()
                  .add(ToggleMenuItemAvailability(item.id, v)),
              activeTrackColor: SellerTheme.restaurant,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
          _miniBtn(context, 'Edit Price', SellerTheme.infoBlue,
              () => _showPriceDialog(context)),
        ]),
      ]),
    );
  }

  Widget _miniBtn(BuildContext context, String label, Color color,
          VoidCallback onTap) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Text(label,
              style: TextStyle(
                  fontSize: 9, color: color, fontWeight: FontWeight.w600)),
        ),
      );

  void _showPriceDialog(BuildContext context) {
    final ctrl = TextEditingController(text: item.price.toStringAsFixed(2));
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('${item.emoji} ${item.name}',
            style: const TextStyle(fontSize: 15)),
        content: TextField(
          controller: ctrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: 'New Price ($currency)',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            prefixText: '$currency ',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: SellerTheme.restaurant,
                foregroundColor: Colors.white),
            onPressed: () {
              final p = double.tryParse(ctrl.text);
              if (p != null && p > 0) {
                context
                    .read<RestaurantSellerBloc>()
                    .add(UpdateMenuItemPrice(item.id, p));
              }
              Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Results View
// ─────────────────────────────────────────────────────────────────────────────

class _SearchResults extends StatelessWidget {
  final List<MenuItem> items;
  final RestaurantSellerState state;
  const _SearchResults({required this.items, required this.state});

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    if (items.isEmpty) {
      return const Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('🔍', style: TextStyle(fontSize: 36)),
          SizedBox(height: 8),
          Text('No items match your search',
              style: TextStyle(color: SellerTheme.textMuted)),
        ]),
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
      children: [
        Container(
          decoration: SellerTheme.elevatedCard(),
          child: Column(
            children: items
                .map((item) => _MenuItemRow(
                    item: item, currency: ss.country.currencySymbol))
                .toList(),
          ),
        ),
      ],
    );
  }
}
