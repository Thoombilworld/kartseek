import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_event.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Low Stock Alerts — Products at or below minimum stock threshold, with quick restock actions.
class MarketplaceLowStockScreen extends StatelessWidget {
  const MarketplaceLowStockScreen({super.key});

  static const _mp = Color(0xFF6C3FC8);

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Low Stock Alerts · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context
                .read<MarketplaceSellerBloc>()
                .add(LoadMarketplaceProducts(countryCode: ss.countryCode)),
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: BlocBuilder<MarketplaceSellerBloc, MarketplaceSellerState>(
              builder: (ctx, ms) {
                final lowStock = ms.lowStockProducts;

                if (ms.status == MarketplaceBlocStatus.loading) {
                  return const Center(
                      child: CircularProgressIndicator(color: _mp));
                }

                if (lowStock.isEmpty) {
                  return Center(
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                                color: SellerTheme.successGreen
                                    .withValues(alpha: 0.1),
                                shape: BoxShape.circle),
                            child: const Icon(Icons.check_circle_outline,
                                size: 44, color: SellerTheme.successGreen),
                          ),
                          const SizedBox(height: 16),
                          const Text('All stocked up!',
                              style: TextStyle(
                                  fontSize: 20, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          const Text('No products are running low on inventory',
                              style: TextStyle(
                                  fontSize: 14, color: SellerTheme.textMuted)),
                        ]),
                  );
                }

                final outOfStock =
                    lowStock.where((p) => p.isOutOfStock).toList();
                final criticalLow = lowStock
                    .where(
                        (p) => p.isLowStock && p.stock <= 5 && !p.isOutOfStock)
                    .toList();
                final lowStockItems =
                    lowStock.where((p) => p.isLowStock && p.stock > 5).toList();

                return ListView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Summary
                    _buildSummaryRow(outOfStock.length, criticalLow.length,
                        lowStockItems.length),
                    const SizedBox(height: 16),

                    // Out of Stock
                    if (outOfStock.isNotEmpty) ...[
                      _sectionHeader(
                          'Out of Stock',
                          '${outOfStock.length} items',
                          SellerTheme.errorRed,
                          Icons.error_outline),
                      const SizedBox(height: 8),
                      ...outOfStock.map((p) =>
                          _buildProductTile(context, p, SellerTheme.errorRed)),
                      const SizedBox(height: 16),
                    ],

                    // Critical (≤5)
                    if (criticalLow.isNotEmpty) ...[
                      _sectionHeader(
                          'Critical Low',
                          '${criticalLow.length} items',
                          SellerTheme.warningAmber,
                          Icons.warning_amber),
                      const SizedBox(height: 8),
                      ...criticalLow.map((p) => _buildProductTile(
                          context, p, SellerTheme.warningAmber)),
                      const SizedBox(height: 16),
                    ],

                    // Low (>5 but ≤ threshold)
                    if (lowStockItems.isNotEmpty) ...[
                      _sectionHeader(
                          'Low Stock',
                          '${lowStockItems.length} items',
                          SellerTheme.infoBlue,
                          Icons.info_outline),
                      const SizedBox(height: 8),
                      ...lowStockItems.map((p) =>
                          _buildProductTile(context, p, SellerTheme.infoBlue)),
                    ],

                    const SizedBox(height: 80),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(int outOfStock, int critical, int low) {
    return Row(
      children: [
        Expanded(
            child: _summaryCard('Out of Stock', '$outOfStock',
                SellerTheme.errorRed, Icons.block)),
        const SizedBox(width: 8),
        Expanded(
            child: _summaryCard('Critical', '$critical',
                SellerTheme.warningAmber, Icons.warning)),
        const SizedBox(width: 8),
        Expanded(
            child: _summaryCard(
                'Low', '$low', SellerTheme.infoBlue, Icons.trending_down)),
      ],
    );
  }

  Widget _summaryCard(String label, String count, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(height: 6),
        Text(count,
            style: TextStyle(
                fontSize: 22, fontWeight: FontWeight.w800, color: color)),
        const SizedBox(height: 2),
        Text(label,
            style:
                TextStyle(fontSize: 11, color: color.withValues(alpha: 0.8))),
      ]),
    );
  }

  Widget _sectionHeader(
      String title, String badge, Color color, IconData icon) {
    return Row(children: [
      Icon(icon, color: color, size: 18),
      const SizedBox(width: 6),
      Text(title,
          style: TextStyle(
              fontSize: 15, fontWeight: FontWeight.w700, color: color)),
      const SizedBox(width: 8),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8)),
        child: Text(badge,
            style: TextStyle(
                fontSize: 11, fontWeight: FontWeight.w600, color: color)),
      ),
    ]);
  }

  Widget _buildProductTile(
      BuildContext context, MarketplaceProduct product, Color statusColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: SellerTheme.cardDecoration(),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
                color: _mp.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12)),
            child: Center(
                child:
                    Text(product.emoji, style: const TextStyle(fontSize: 22))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(product.name,
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
              const SizedBox(height: 3),
              Row(children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6)),
                  child: Text(
                    product.isOutOfStock
                        ? 'OUT OF STOCK'
                        : '${product.stock} left (min: ${product.minStock})',
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: statusColor),
                  ),
                ),
                const SizedBox(width: 6),
                Text(product.category,
                    style: const TextStyle(
                        fontSize: 11, color: SellerTheme.textMuted)),
              ]),
            ]),
          ),
          Column(children: [
            SizedBox(
              height: 30,
              child: ElevatedButton(
                onPressed: () => _showRestockDialog(context, product),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _mp,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  textStyle: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600),
                ),
                child: const Text('Restock'),
              ),
            ),
          ]),
        ],
      ),
    );
  }

  void _showRestockDialog(BuildContext context, MarketplaceProduct product) {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Restock: ${product.name}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(
              'Current stock: ${product.stock} · Min threshold: ${product.minStock}',
              style: const TextStyle(
                  fontSize: 13, color: SellerTheme.textSecondary)),
          const SizedBox(height: 14),
          TextField(
            controller: ctrl,
            keyboardType: TextInputType.number,
            autofocus: true,
            decoration: InputDecoration(
              labelText: 'New stock quantity',
              prefixIcon: const Icon(Icons.inventory, size: 20),
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final qty = int.tryParse(ctrl.text);
              if (qty != null && qty > 0) {
                context
                    .read<MarketplaceSellerBloc>()
                    .add(UpdateMarketplaceStock(product.id, qty));
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: _mp),
            child: const Text('Update', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
