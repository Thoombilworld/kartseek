import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_event.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

class GroceryLowStockScreen extends StatelessWidget {
  const GroceryLowStockScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return BlocListener<GrocerySellerBloc, GrocerySellerState>(
      listenWhen: (prev, curr) => curr.actionMessage != prev.actionMessage,
      listener: (ctx, state) {
        if (state.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.actionMessage!),
            backgroundColor: (state.actionSuccess ?? true) ? SellerTheme.successGreen : SellerTheme.warningAmber,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
        }
      },
      child: BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
        builder: (context, gs) {
          final lowStock = gs.lowStockProducts;
          final oos = lowStock.where((p) => p.stockLevel == StockLevel.outOfStock).toList();
          final low = lowStock.where((p) => p.stockLevel == StockLevel.low).toList();

          return Scaffold(
            backgroundColor: SellerTheme.surface,
            appBar: AppBar(
              backgroundColor: SellerTheme.warningAmber,
              foregroundColor: Colors.white,
              elevation: 0,
              title: Text('Low Stock · ${ss.country.flag}', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
            body: lowStock.isEmpty
                ? _emptyState()
                : ListView(
                    padding: const EdgeInsets.all(14),
                    children: [
                      _buildAlertBanner(oos.length, low.length, context, gs),
                      const SizedBox(height: 16),

                      // Out of stock section
                      if (oos.isNotEmpty) ...[
                        _sectionHeader('🔴 Out of Stock', oos.length, SellerTheme.errorRed),
                        const SizedBox(height: 10),
                        ...oos.map((p) => _StockCard(product: p, currency: ss.country.currencySymbol)),
                        const SizedBox(height: 20),
                      ],

                      // Low stock section
                      if (low.isNotEmpty) ...[
                        _sectionHeader('🟡 Low Stock', low.length, SellerTheme.warningAmber),
                        const SizedBox(height: 10),
                        ...low.map((p) => _StockCard(product: p, currency: ss.country.currencySymbol)),
                      ],

                      const SizedBox(height: 40),
                      // Bulk restock tip
                      _buildTip(),
                    ],
                  ),
          );
        },
      ),
    );
  }

  Widget _buildAlertBanner(int oos, int low, BuildContext context, GrocerySellerState gs) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: oos > 0
              ? [SellerTheme.errorRed.withValues(alpha: 0.85), SellerTheme.warningAmber]
              : [SellerTheme.warningAmber.withValues(alpha: 0.85), const Color(0xFFF59E0B)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: SellerTheme.warningAmber.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('⚠️', style: TextStyle(fontSize: 36)),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Inventory Alert', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
            const SizedBox(height: 4),
            if (oos > 0)
              Text('$oos product${oos > 1 ? 's' : ''} out of stock — customer orders may be affected',
                  style: const TextStyle(color: Colors.white70, fontSize: 12)),
            if (low > 0)
              Text('$low product${low > 1 ? 's' : ''} running low — restock soon',
                  style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ])),
        ]),
        if (oos > 0) ...[
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 38,
            child: ElevatedButton.icon(
              onPressed: () {
                // Bulk restock all out-of-stock items (sets to 3x min stock)
                for (final p in gs.lowStockProducts.where((p) => p.stockLevel == StockLevel.outOfStock)) {
                  context.read<GrocerySellerBloc>().add(RestockGroceryProduct(p.id, p.minStockQty * 3));
                }
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                  content: Text('All out-of-stock items restocked ✅'),
                  backgroundColor: SellerTheme.successGreen,
                  behavior: SnackBarBehavior.floating,
                ));
              },
              icon: const Icon(Icons.refresh, size: 16, color: Colors.white),
              label: const Text('Restock All Out-of-Stock Items', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white.withValues(alpha: 0.2),
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ]),
    );
  }

  Widget _sectionHeader(String title, int count, Color color) => Row(children: [
    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
    const SizedBox(width: 8),
    Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(20)),
      child: Text('$count', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
    ),
  ]);

  Widget _buildTip() => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: SellerTheme.infoBlue.withValues(alpha: 0.06),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: SellerTheme.infoBlue.withValues(alpha: 0.2)),
    ),
    child: const Row(children: [
      Icon(Icons.lightbulb_outline, color: SellerTheme.infoBlue, size: 18),
      SizedBox(width: 10),
      Expanded(child: Text(
        'Tip: Restock items before they run out to avoid order rejections and customer dissatisfaction.',
        style: TextStyle(fontSize: 12, color: SellerTheme.textSecondary),
      )),
    ]),
  );

  Widget _emptyState() => const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
    Text('✅', style: TextStyle(fontSize: 56)),
    SizedBox(height: 16),
    Text('All stocked up!', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
    SizedBox(height: 8),
    Text('No low stock items detected', style: TextStyle(color: SellerTheme.textMuted, fontSize: 14)),
  ]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock card
// ─────────────────────────────────────────────────────────────────────────────

class _StockCard extends StatelessWidget {
  final GroceryProduct product;
  final String currency;
  const _StockCard({required this.product, required this.currency});

  @override
  Widget build(BuildContext context) {
    final isOos = product.stockLevel == StockLevel.outOfStock;
    final color = isOos ? SellerTheme.errorRed : SellerTheme.warningAmber;
    final stockPct = product.minStockQty == 0 ? 0.0
        : (product.stockQty / product.minStockQty).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: SellerTheme.elevatedCard(),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(children: [
          Row(children: [
            // Emoji
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(child: Text(product.emoji, style: const TextStyle(fontSize: 26))),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(product.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 3),
              Text('$currency ${product.price.toStringAsFixed(2)} / ${product.unit}',
                  style: const TextStyle(color: SellerTheme.grocery, fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 3),
              Text('${product.minLabel} · Category: ${product.category}',
                  style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11)),
            ])),
            // Stock badge
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: color.withValues(alpha: 0.3))),
                child: Text(isOos ? '0 ${product.unit}' : product.stockLabel,
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
              ),
              const SizedBox(height: 4),
              Text(isOos ? 'OUT OF STOCK' : 'LOW STOCK',
                  style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
            ]),
          ]),
          const SizedBox(height: 10),
          // Stock level progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: stockPct,
              backgroundColor: color.withValues(alpha: 0.1),
              color: color,
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 12),
          // Actions
          Row(children: [
            Expanded(child: _outlineBtn('Mark Available', SellerTheme.successGreen, () =>
                context.read<GrocerySellerBloc>().add(ToggleCatalogItemAvailability(product.id, true)))),
            const SizedBox(width: 8),
            Expanded(child: _outlineBtn('📦 Restock', SellerTheme.infoBlue, () => _showRestockDialog(context, product))),
          ]),
        ]),
      ),
    );
  }

  Widget _outlineBtn(String label, Color color, VoidCallback onTap) => SizedBox(
    height: 36,
    child: OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        side: BorderSide(color: color.withValues(alpha: 0.4)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: EdgeInsets.zero,
      ),
      child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
    ),
  );

  void _showRestockDialog(BuildContext context, GroceryProduct product) {
    final ctrl = TextEditingController(text: product.minStockQty.toString());
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(children: [
          Text(product.emoji, style: const TextStyle(fontSize: 24)),
          const SizedBox(width: 10),
          Expanded(child: Text(product.name, style: const TextStyle(fontSize: 15))),
        ]),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _statCol('Current', product.stockLabel, SellerTheme.errorRed),
            _statCol('Minimum', product.minLabel, SellerTheme.warningAmber),
            _statCol('Add', '?', SellerTheme.successGreen),
          ]),
          const SizedBox(height: 14),
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
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: SellerTheme.successGreen, foregroundColor: Colors.white),
            onPressed: () {
              final qty = int.tryParse(ctrl.text);
              if (qty != null && qty > 0) {
                context.read<GrocerySellerBloc>().add(RestockGroceryProduct(product.id, qty));
              }
              Navigator.pop(ctx);
            },
            child: const Text('Add Stock'),
          ),
        ],
      ),
    );
  }

  Widget _statCol(String label, String value, Color color) => Column(children: [
    Text(label, style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
    Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color)),
  ]);
}
