import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_event.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

class MarketplaceInventoryScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const MarketplaceInventoryScreen({super.key, this.order, this.appointment, this.booking});

  @override
  State<MarketplaceInventoryScreen> createState() => _MarketplaceInventoryScreenState();
}

class _MarketplaceInventoryScreenState extends State<MarketplaceInventoryScreen> {
  static const _mp = Color(0xFF6C3FC8);
  final _searchCtrl = TextEditingController();
  String _selectedCategory = 'all';
  bool _showLowStockOnly = false;

  @override
  void initState() {
    super.initState();
    final cc = context.read<SellerBloc>().state.countryCode;
    context.read<MarketplaceSellerBloc>().add(LoadMarketplaceProducts(countryCode: cc));
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
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
            backgroundColor: state.actionSuccess ? SellerTheme.successGreen : SellerTheme.warningAmber,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<MarketplaceSellerBloc, MarketplaceSellerState>(
        builder: (ctx, ms) {
          var products = ms.filteredProducts;
          if (_showLowStockOnly) {
            products = products.where((p) => p.isLowStock || p.isOutOfStock).toList();
          }
          final cats = ms.categories;
          final lowCount = ms.lowStockProducts.length;

          return Scaffold(
            backgroundColor: SellerTheme.surface,
            appBar: AppBar(
              backgroundColor: _mp,
              foregroundColor: Colors.white,
              elevation: 0,
              title: Text('Inventory · ${ss.country.flag}', style: const TextStyle(fontWeight: FontWeight.bold)),
              actions: [
                IconButton(
                  icon: const Icon(Icons.add),
                  tooltip: 'Add Product',
                  onPressed: () => Navigator.pushNamed(context, SellerRouter.marketplaceProductEdit),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () => context.read<MarketplaceSellerBloc>()
                      .add(LoadMarketplaceProducts(countryCode: ss.countryCode)),
                ),
              ],
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(56),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                  child: TextField(
                    controller: _searchCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Search products...',
                      hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                      prefixIcon: const Icon(Icons.search, color: Colors.white70, size: 20),
                      suffixIcon: _searchCtrl.text.isNotEmpty
                          ? IconButton(icon: const Icon(Icons.clear, color: Colors.white70, size: 18),
                              onPressed: () {
                                _searchCtrl.clear();
                                context.read<MarketplaceSellerBloc>().add(const SearchMarketplaceProducts(''));
                              })
                          : null,
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.15),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      isDense: true,
                    ),
                    onChanged: (q) => context.read<MarketplaceSellerBloc>().add(SearchMarketplaceProducts(q)),
                  ),
                ),
              ),
            ),
            body: Column(children: [
              // Category chips
              if (cats.length > 1) _buildCategoryChips(cats),
              // Stats + low stock toggle
              _buildStatsRow(ms, lowCount),
              // Product list
              Expanded(
                child: ms.status == MarketplaceBlocStatus.loading
                    ? const Center(child: CircularProgressIndicator(color: _mp))
                    : products.isEmpty
                        ? _emptyState()
                        : ListView.builder(
                            padding: const EdgeInsets.all(12),
                            itemCount: products.length,
                            itemBuilder: (ctx, i) => _ProductCard(
                              product: products[i],
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

  Widget _buildCategoryChips(List<String> cats) => Container(
    color: Colors.white,
    child: SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(children: cats.map((cat) {
        final active = _selectedCategory == cat;
        final label  = cat == 'all' ? 'All' : cat;
        return GestureDetector(
          onTap: () {
            setState(() => _selectedCategory = cat);
            context.read<MarketplaceSellerBloc>().add(FilterMarketplaceProducts(cat));
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: active ? _mp : _mp.withValues(alpha: 0.07),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: active ? _mp : _mp.withValues(alpha: 0.2)),
            ),
            child: Text(label, style: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w600,
              color: active ? Colors.white : _mp,
            )),
          ),
        );
      }).toList()),
    ),
  );

  Widget _buildStatsRow(MarketplaceSellerState ms, int lowCount) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
      child: Row(children: [
        _pill('${ms.products.length} total', SellerTheme.textMuted),
        const SizedBox(width: 8),
        _pill('${ms.products.where((p) => p.isActive).length} active', SellerTheme.successGreen),
        const SizedBox(width: 8),
        if (lowCount > 0) _pill('$lowCount low stock ⚠️', SellerTheme.warningAmber),
        const Spacer(),
        GestureDetector(
          onTap: () => setState(() => _showLowStockOnly = !_showLowStockOnly),
          child: Row(children: [
            Icon(_showLowStockOnly ? Icons.filter_alt : Icons.filter_alt_outlined,
                size: 18, color: _showLowStockOnly ? SellerTheme.warningAmber : SellerTheme.textMuted),
            const SizedBox(width: 4),
            Text('Low Stock', style: TextStyle(
              fontSize: 11,
              color: _showLowStockOnly ? SellerTheme.warningAmber : SellerTheme.textMuted,
              fontWeight: _showLowStockOnly ? FontWeight.bold : FontWeight.normal,
            )),
          ]),
        ),
      ]),
    );
  }

  Widget _pill(String label, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
    child: Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
  );

  Widget _emptyState() => const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
    Text('📦', style: TextStyle(fontSize: 48)),
    SizedBox(height: 12),
    Text('No products found', style: TextStyle(color: SellerTheme.textMuted)),
  ]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Product card
// ─────────────────────────────────────────────────────────────────────────────

class _ProductCard extends StatelessWidget {
  final MarketplaceProduct product;
  final String currency;
  const _ProductCard({required this.product, required this.currency});

  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final stockColor = product.isOutOfStock
        ? SellerTheme.errorRed
        : product.isLowStock ? SellerTheme.warningAmber : SellerTheme.successGreen;
    final stockLabel = product.isOutOfStock ? 'Out of Stock'
        : product.isLowStock ? 'Low (${product.stock} left)' : 'In Stock (${product.stock})';
    final stockPct = product.minStock == 0 ? 1.0
        : (product.stock / (product.minStock * 3)).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: SellerTheme.elevatedCard(),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(children: [
          Row(children: [
            // Emoji + badges
            Stack(children: [
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(
                  color: product.isActive
                      ? _mp.withValues(alpha: 0.08)
                      : Colors.grey.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(child: Text(product.emoji,
                    style: TextStyle(fontSize: 26, color: product.isActive ? null : Colors.black38))),
              ),
              if (product.isFeatured)
                Positioned(right: 0, top: 0,
                    child: Container(width: 16, height: 16,
                        decoration: const BoxDecoration(color: SellerTheme.warningAmber, shape: BoxShape.circle),
                        child: const Icon(Icons.star, size: 10, color: Colors.white))),
              if (!product.isActive)
                Positioned(right: 0, bottom: 0,
                    child: Container(width: 16, height: 16,
                        decoration: const BoxDecoration(color: Colors.grey, shape: BoxShape.circle),
                        child: const Icon(Icons.pause, size: 10, color: Colors.white))),
            ]),
            const SizedBox(width: 12),
            // Info
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(product.name, style: TextStyle(
                fontWeight: FontWeight.bold, fontSize: 13,
                color: product.isActive ? SellerTheme.textPrimary : SellerTheme.textMuted,
                decoration: product.isActive ? null : TextDecoration.lineThrough,
              )),
              const SizedBox(height: 2),
              Text('$currency ${product.price.toStringAsFixed(2)} · ⭐ ${product.rating} · ${product.salesCount} sold',
                  style: const TextStyle(color: SellerTheme.textSecondary, fontSize: 11)),
              if (product.sku != null)
                Text('SKU: ${product.sku}', style: const TextStyle(color: SellerTheme.textMuted, fontSize: 10)),
            ])),
            // Controls column
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              // Active toggle
              Transform.scale(
                scale: 0.8,
                child: Switch(
                  value: product.isActive,
                  onChanged: (v) => context.read<MarketplaceSellerBloc>()
                      .add(ToggleMarketplaceProductActive(product.id, v)),
                  activeTrackColor: _mp,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
              // Feature toggle
              GestureDetector(
                onTap: () => context.read<MarketplaceSellerBloc>()
                    .add(ToggleMarketplaceProductFeatured(product.id, !product.isFeatured)),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(
                    color: product.isFeatured
                        ? SellerTheme.warningAmber.withValues(alpha: 0.12)
                        : Colors.grey.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(product.isFeatured ? '⭐ Featured' : 'Feature',
                      style: TextStyle(
                        fontSize: 9, fontWeight: FontWeight.w600,
                        color: product.isFeatured ? SellerTheme.warningAmber : SellerTheme.textMuted,
                      )),
                ),
              ),
            ]),
          ]),
          const SizedBox(height: 10),
          // Stock bar
          Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: stockColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(stockLabel, style: TextStyle(fontSize: 10, color: stockColor, fontWeight: FontWeight.w600)),
                ),
                if (product.origin != null) ...[
                  const SizedBox(width: 8),
                  Text('🌍 ${product.origin}', style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
                ],
              ]),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: stockPct,
                  backgroundColor: stockColor.withValues(alpha: 0.1),
                  color: stockColor,
                  minHeight: 5,
                ),
              ),
            ])),
            const SizedBox(width: 12),
            // Quick actions
            Row(children: [
              _iconBtn(Icons.edit_outlined, 'Price', _mp, () => _showPriceDialog(context)),
              const SizedBox(width: 6),
              _iconBtn(Icons.add_box_outlined, 'Stock', SellerTheme.infoBlue, () => _showStockDialog(context)),
            ]),
          ]),
        ]),
      ),
    );
  }

  Widget _iconBtn(IconData icon, String tooltip, Color color, VoidCallback onTap) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: color.withValues(alpha: 0.25)),
          ),
          child: Icon(icon, size: 16, color: color),
        ),
      ),
    );
  }

  void _showPriceDialog(BuildContext context) {
    final ctrl = TextEditingController(text: product.price.toStringAsFixed(2));
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Update Price — ${product.name}', style: const TextStyle(fontSize: 14)),
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
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: _mp, foregroundColor: Colors.white),
            onPressed: () {
              final p = double.tryParse(ctrl.text);
              if (p != null && p > 0) {
                context.read<MarketplaceSellerBloc>().add(UpdateMarketplaceProductPrice(product.id, p));
              }
              Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showStockDialog(BuildContext context) {
    final ctrl = TextEditingController(text: product.stock.toString());
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(children: [
          Text(product.emoji, style: const TextStyle(fontSize: 22)),
          const SizedBox(width: 10),
          Expanded(child: Text(product.name, style: const TextStyle(fontSize: 14))),
        ]),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _dialogStat('Current', '${product.stock}', product.isOutOfStock ? SellerTheme.errorRed : SellerTheme.textPrimary),
            _dialogStat('Min',     '${product.minStock}', SellerTheme.warningAmber),
          ]),
          const SizedBox(height: 12),
          TextField(
            controller: ctrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: 'Set Stock Quantity',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            autofocus: true,
          ),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: SellerTheme.infoBlue, foregroundColor: Colors.white),
            onPressed: () {
              final qty = int.tryParse(ctrl.text);
              if (qty != null && qty >= 0) {
                context.read<MarketplaceSellerBloc>().add(UpdateMarketplaceStock(product.id, qty));
              }
              Navigator.pop(ctx);
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  Widget _dialogStat(String l, String v, Color c) => Column(children: [
    Text(l, style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
    Text(v, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: c)),
  ]);
}
