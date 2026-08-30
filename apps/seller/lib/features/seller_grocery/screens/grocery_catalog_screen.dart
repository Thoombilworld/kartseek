import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_event.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

// ─────────────────────────────────────────────────────────────────────────────
// GroceryCatalogScreen
// ─────────────────────────────────────────────────────────────────────────────

class GroceryCatalogScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const GroceryCatalogScreen({super.key, this.order, this.appointment, this.booking});

  @override
  State<GroceryCatalogScreen> createState() => _GroceryCatalogScreenState();
}

// NOTE: No SingleTickerProviderStateMixin needed — we use DefaultTabController.
class _GroceryCatalogScreenState extends State<GroceryCatalogScreen> {
  final _searchController = TextEditingController();
  bool _showUnavailable = true;
  String _sortMode = 'name'; // 'name' | 'price' | 'stock'

  @override
  void initState() {
    super.initState();
    final ss = context.read<SellerBloc>().state;
    context.read<GrocerySellerBloc>().add(LoadGroceryCatalog(countryCode: ss.countryCode));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
            backgroundColor:
                (state.actionSuccess ?? true) ? SellerTheme.successGreen : SellerTheme.warningAmber,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (context, gs) {
          // ── Derived product list ────────────────────────────────────────────
          var products = gs.filteredProducts;
          if (!_showUnavailable) {
            products = products.where((p) => p.isAvailable).toList();
          }
          switch (_sortMode) {
            case 'price':
              products = [...products]..sort((a, b) => a.price.compareTo(b.price));
            case 'stock':
              products = [...products]..sort((a, b) => a.stockQty.compareTo(b.stockQty));
            default:
              break;
          }

          final categories   = gs.categories;
          final availCount   = products.where((p) => p.isAvailable).length;
          final unavailCount = products.where((p) => !p.isAvailable).length;

          // ── DefaultTabController ────────────────────────────────────────────
          // The ValueKey ensures Flutter recreates the controller with the
          // correct length whenever the category count changes — eliminating
          // the "Controller's length does not match tabs" crash entirely.
          return DefaultTabController(
            key: ValueKey(categories.length),
            length: categories.isEmpty ? 1 : categories.length,
            child: Scaffold(
              backgroundColor: SellerTheme.surface,

              // ── AppBar ────────────────────────────────────────────────────
              appBar: AppBar(
                backgroundColor: SellerTheme.grocery,
                foregroundColor: Colors.white,
                elevation: 0,
                title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(
                    'Product Catalog · ${ss.country.flag}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  Text(
                    '${gs.allProducts.length} products · ${ss.country.name}',
                    style: const TextStyle(fontSize: 10, color: Colors.white70),
                  ),
                ]),
                actions: [
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.sort, color: Colors.white),
                    tooltip: 'Sort',
                    onSelected: (v) => setState(() => _sortMode = v),
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'name',  child: Text('Sort: Name')),
                      PopupMenuItem(value: 'price', child: Text('Sort: Price ↑')),
                      PopupMenuItem(value: 'stock', child: Text('Sort: Stock ↑')),
                    ],
                  ),
                  IconButton(
                    icon: Icon(
                      _showUnavailable ? Icons.visibility : Icons.visibility_off,
                      color: Colors.white,
                    ),
                    tooltip: _showUnavailable ? 'Hide unavailable' : 'Show unavailable',
                    onPressed: () => setState(() => _showUnavailable = !_showUnavailable),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh),
                    onPressed: () => context.read<GrocerySellerBloc>()
                        .add(LoadGroceryCatalog(countryCode: ss.countryCode)),
                  ),
                ],
                // TabBar only rendered when categories exist
                bottom: categories.isEmpty
                    ? null
                    : PreferredSize(
                        preferredSize: const Size.fromHeight(94),
                        child: Column(children: [
                          // Search bar
                          Padding(
                            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                            child: TextField(
                              controller: _searchController,
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                hintText: 'Search products...',
                                hintStyle:
                                    TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                                prefixIcon:
                                    const Icon(Icons.search, color: Colors.white70, size: 20),
                                suffixIcon: _searchController.text.isNotEmpty
                                    ? IconButton(
                                        icon: const Icon(Icons.clear,
                                            color: Colors.white70, size: 18),
                                        onPressed: () {
                                          _searchController.clear();
                                          context.read<GrocerySellerBloc>()
                                              .add(const SearchGroceryCatalog(''));
                                        })
                                    : null,
                                filled: true,
                                fillColor: Colors.white.withValues(alpha: 0.15),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(vertical: 8),
                                isDense: true,
                              ),
                              onChanged: (q) => context.read<GrocerySellerBloc>()
                                  .add(SearchGroceryCatalog(q)),
                            ),
                          ),
                          // Category tabs — no explicit controller needed;
                          // DefaultTabController above provides it.
                          TabBar(
                            isScrollable: true,
                            labelColor: Colors.white,
                            unselectedLabelColor: Colors.white54,
                            indicatorColor: Colors.white,
                            indicatorWeight: 3,
                            labelStyle:
                                const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                            onTap: (i) {
                              if (i < categories.length) {
                                context.read<GrocerySellerBloc>()
                                    .add(FilterGroceryCatalog(categories[i].id));
                              }
                            },
                            tabs: categories
                                .map((c) => Tab(text: '${c.emoji} ${c.name}'))
                                .toList(),
                          ),
                        ]),
                      ),
              ),

              // ── FAB ───────────────────────────────────────────────────────
              floatingActionButton: FloatingActionButton.extended(
                onPressed: () => _showAddProductSheet(context, gs),
                backgroundColor: SellerTheme.grocery,
                icon: const Icon(Icons.add, color: Colors.white),
                label: const Text(
                  'Add Product',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                ),
              ),

              // ── Body ──────────────────────────────────────────────────────
              body: Column(children: [
                if (gs.allProducts.isNotEmpty)
                  _buildSummaryRow(availCount, unavailCount, products.length, gs, context),
                Expanded(
                  child: gs.status == GroceryBlocStatus.loading
                      ? const Center(
                          child: CircularProgressIndicator(color: SellerTheme.grocery))
                      : products.isEmpty
                          ? _emptyState(gs.catalogSearch)
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(12, 8, 12, 100),
                              itemCount: products.length,
                              itemBuilder: (ctx, i) => _ProductCard(
                                product: products[i],
                                currency: ss.country.currencySymbol,
                              ),
                            ),
                ),
              ]),
            ),
          );
        },
      ),
    );
  }

  // ── Summary row (avail / unavail / total + bulk restock) ───────────────────

  Widget _buildSummaryRow(
      int avail, int unavail, int total, GrocerySellerState gs, BuildContext context) {
    final currentCatId = gs.selectedCategoryId;
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      child: Row(children: [
        _pill('$avail avail', SellerTheme.successGreen),
        const SizedBox(width: 6),
        if (unavail > 0) _pill('$unavail off', SellerTheme.errorRed),
        if (unavail > 0) const SizedBox(width: 6),
        _pill('$total total', SellerTheme.textMuted),
        const Spacer(),
        // Bulk restock button for current category
        if (currentCatId != 'all')
          GestureDetector(
            onTap: () => context.read<GrocerySellerBloc>()
                .add(BulkRestockCategory(currentCatId)),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: SellerTheme.infoBlue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: SellerTheme.infoBlue.withValues(alpha: 0.3)),
              ),
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.refresh, size: 12, color: SellerTheme.infoBlue),
                SizedBox(width: 4),
                Text('Bulk Restock',
                    style: TextStyle(
                        fontSize: 10,
                        color: SellerTheme.infoBlue,
                        fontWeight: FontWeight.w700)),
              ]),
            ),
          ),
      ]),
    );
  }

  Widget _pill(String label, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
    child: Text(label,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
  );

  Widget _emptyState(String query) => Center(
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      const Text('🔍', style: TextStyle(fontSize: 48)),
      const SizedBox(height: 12),
      Text(
        query.isNotEmpty
            ? 'No products match "$query"'
            : 'No products in this category',
        style: const TextStyle(color: SellerTheme.textMuted, fontSize: 14),
      ),
    ]),
  );

  // ── Add Product Bottom Sheet ──────────────────────────────────────────────

  void _showAddProductSheet(BuildContext context, GrocerySellerState gs) {
    final nameCtrl  = TextEditingController();
    final priceCtrl = TextEditingController();
    final stockCtrl = TextEditingController(text: '20');
    String selectedCat   = gs.categories.isNotEmpty ? gs.categories.first.id : 'fruits_veg';
    String selectedEmoji = '🛒';
    String selectedUnit  = 'kg';
    const emojis = [
      '🍅', '🥦', '🥛', '🥚', '🥩', '🍗', '🍞', '🧀', '🍎', '🥕',
      '🫘', '🍚', '🌿', '💧', '🧃', '🫙', '🌶️', '🥑', '🍓', '🌽',
    ];
    const units = ['kg', 'L', 'pcs', 'bundle', 'tray', 'dozen', 'bag', 'gal', 'lb', 'punnet'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx2, setSheetState) => Padding(
          padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx2).viewInsets.bottom,
              left: 20, right: 20, top: 20),
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                    color: SellerTheme.border,
                    borderRadius: BorderRadius.circular(2)),
              ),
              const Text('Add New Product',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              // Emoji picker
              SizedBox(
                height: 54,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: emojis.map((e) => GestureDetector(
                    onTap: () => setSheetState(() => selectedEmoji = e),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      width: 48, height: 48,
                      decoration: BoxDecoration(
                        color: selectedEmoji == e
                            ? SellerTheme.grocery.withValues(alpha: 0.15)
                            : SellerTheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: selectedEmoji == e
                                ? SellerTheme.grocery
                                : SellerTheme.border),
                      ),
                      child: Center(
                          child: Text(e, style: const TextStyle(fontSize: 22))),
                    ),
                  )).toList(),
                ),
              ),
              const SizedBox(height: 14),
              // Name
              TextField(
                controller: nameCtrl,
                decoration: InputDecoration(
                  labelText: 'Product Name *',
                  prefixText: '$selectedEmoji  ',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              // Price & Unit
              Row(children: [
                Expanded(child: TextField(
                  controller: priceCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: 'Price *',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                )),
                const SizedBox(width: 12),
                Expanded(child: DropdownButtonFormField<String>(
                  initialValue: selectedUnit,
                  decoration: InputDecoration(
                    labelText: 'Unit',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: units
                      .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                      .toList(),
                  onChanged: (v) => setSheetState(() => selectedUnit = v ?? 'kg'),
                )),
              ]),
              const SizedBox(height: 12),
              // Stock & Category
              Row(children: [
                Expanded(child: TextField(
                  controller: stockCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Initial Stock',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                )),
                const SizedBox(width: 12),
                Expanded(child: DropdownButtonFormField<String>(
                  initialValue: selectedCat,
                  decoration: InputDecoration(
                    labelText: 'Category',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: gs.categories
                      .map((c) => DropdownMenuItem(
                          value: c.id, child: Text('${c.emoji} ${c.name}')))
                      .toList(),
                  onChanged: (v) =>
                      setSheetState(() => selectedCat = v ?? gs.categories.first.id),
                )),
              ]),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity, height: 50,
                child: ElevatedButton(
                  onPressed: () {
                    final name  = nameCtrl.text.trim();
                    final price = double.tryParse(priceCtrl.text);
                    final stock = int.tryParse(stockCtrl.text) ?? 20;
                    if (name.isEmpty || price == null || price <= 0) return;
                    context.read<GrocerySellerBloc>().add(AddNewGroceryProduct(
                      name: name, emoji: selectedEmoji, categoryId: selectedCat,
                      price: price, unit: selectedUnit, stockQty: stock,
                    ));
                    Navigator.pop(ctx);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: SellerTheme.grocery,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text('Add to Catalog',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
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
// Product card
// ─────────────────────────────────────────────────────────────────────────────

class _ProductCard extends StatelessWidget {
  final GroceryProduct product;
  final String currency;
  const _ProductCard({required this.product, required this.currency});

  @override
  Widget build(BuildContext context) {
    final stockColor = switch (product.stockLevel) {
      StockLevel.outOfStock => SellerTheme.errorRed,
      StockLevel.low        => SellerTheme.warningAmber,
      StockLevel.ok         => SellerTheme.successGreen,
    };
    final stockLabel = switch (product.stockLevel) {
      StockLevel.outOfStock => 'Out of Stock',
      StockLevel.low        => 'Low — ${product.stockLabel}',
      StockLevel.ok         => product.stockLabel,
    };
    final stockPct = product.minStockQty == 0
        ? 1.0
        : (product.stockQty / (product.minStockQty * 3)).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: SellerTheme.elevatedCard(),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          // Emoji badge
          Stack(children: [
            Container(
              width: 54, height: 54,
              decoration: BoxDecoration(
                color: product.isAvailable
                    ? SellerTheme.grocery.withValues(alpha: 0.08)
                    : SellerTheme.errorRed.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(child: Text(
                product.emoji,
                style: TextStyle(
                    fontSize: 26,
                    color: product.isAvailable ? null : Colors.black38),
              )),
            ),
            if (!product.isAvailable)
              Positioned(right: 0, bottom: 0, child: Container(
                width: 16, height: 16,
                decoration: const BoxDecoration(
                    color: SellerTheme.errorRed, shape: BoxShape.circle),
                child: const Icon(Icons.close, size: 10, color: Colors.white),
              )),
            if (product.isPopular)
              Positioned(right: 0, top: 0, child: Container(
                width: 16, height: 16,
                decoration: const BoxDecoration(
                    color: SellerTheme.warningAmber, shape: BoxShape.circle),
                child: const Icon(Icons.star, size: 10, color: Colors.white),
              )),
          ]),
          const SizedBox(width: 12),
          // Product details
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(product.name,
                  style: TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 13,
                    decoration: product.isAvailable ? null : TextDecoration.lineThrough,
                    color: product.isAvailable
                        ? SellerTheme.textPrimary
                        : SellerTheme.textMuted,
                  ))),
              if (product.isPopular)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: SellerTheme.warningAmber.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('⭐ Popular',
                      style: TextStyle(
                          fontSize: 9,
                          color: SellerTheme.warningAmber,
                          fontWeight: FontWeight.bold)),
                ),
            ]),
            const SizedBox(height: 3),
            Text(
              '$currency ${product.price.toStringAsFixed(2)} / ${product.unit}',
              style: const TextStyle(
                  color: SellerTheme.grocery,
                  fontWeight: FontWeight.w600,
                  fontSize: 12),
            ),
            const SizedBox(height: 4),
            // Stock progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: stockPct,
                minHeight: 4,
                backgroundColor: stockColor.withValues(alpha: 0.1),
                color: stockColor,
              ),
            ),
            const SizedBox(height: 3),
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: stockColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(stockLabel,
                    style: TextStyle(
                        fontSize: 10,
                        color: stockColor,
                        fontWeight: FontWeight.w600)),
              ),
              if (product.origin != null) ...[
                const SizedBox(width: 6),
                Text('🌍 ${product.origin}',
                    style: const TextStyle(
                        fontSize: 10, color: SellerTheme.textMuted)),
              ],
            ]),
          ])),
          // Controls column
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Transform.scale(
              scale: 0.8,
              child: Switch(
                value: product.isAvailable,
                onChanged: (v) => context.read<GrocerySellerBloc>()
                    .add(ToggleCatalogItemAvailability(product.id, v)),
                activeTrackColor: SellerTheme.grocery,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
            _miniBtn('Edit Price', SellerTheme.grocery,
                () => _showPriceEditor(context, product)),
            const SizedBox(height: 4),
            _miniBtn('📦 Restock', SellerTheme.infoBlue,
                () => _showRestockDialog(context, product)),
          ]),
        ]),
      ),
    );
  }

  Widget _miniBtn(String label, Color color, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label,
          style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
    ),
  );

  void _showPriceEditor(BuildContext context, GroceryProduct product) {
    final ctrl = TextEditingController(text: product.price.toStringAsFixed(2));
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Update Price — ${product.name}',
            style: const TextStyle(fontSize: 15)),
        content: TextField(
          controller: ctrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: 'Price ($currency / ${product.unit})',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            prefixText: '$currency ',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: SellerTheme.grocery,
                foregroundColor: Colors.white),
            onPressed: () {
              final price = double.tryParse(ctrl.text);
              if (price != null && price > 0) {
                context.read<GrocerySellerBloc>()
                    .add(UpdateGroceryProductPrice(product.id, price));
              }
              Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showRestockDialog(BuildContext context, GroceryProduct product) {
    final ctrl = TextEditingController(text: '10');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(children: [
          Text(product.emoji, style: const TextStyle(fontSize: 22)),
          const SizedBox(width: 8),
          Expanded(child: Text('Restock — ${product.name}',
              style: const TextStyle(fontSize: 14))),
        ]),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('Current stock: ${product.stockLabel}',
              style: const TextStyle(color: SellerTheme.textSecondary)),
          const SizedBox(height: 12),
          TextField(
            controller: ctrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: 'Quantity to add (${product.unit})',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            autofocus: true,
          ),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: SellerTheme.infoBlue,
                foregroundColor: Colors.white),
            onPressed: () {
              final qty = int.tryParse(ctrl.text);
              if (qty != null && qty > 0) {
                context.read<GrocerySellerBloc>()
                    .add(RestockGroceryProduct(product.id, qty));
              }
              Navigator.pop(ctx);
            },
            child: const Text('Add Stock'),
          ),
        ],
      ),
    );
  }
}
