import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Product Detail (Read-only) — Full product information view with images,
/// pricing, inventory, ratings, and status. Sellers can navigate to edit from here.
class MarketplaceProductDetailScreen extends StatelessWidget {
  final String productId;
  const MarketplaceProductDetailScreen({super.key, required this.productId});

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;

    return BlocBuilder<MarketplaceSellerBloc, MarketplaceSellerState>(
      builder: (context, state) {
        final product =
            state.products.where((p) => p.id == productId).firstOrNull;

        if (product == null) {
          return Scaffold(
            backgroundColor: SellerTheme.surface,
            appBar: AppBar(
              backgroundColor: _mp,
              foregroundColor: Colors.white,
              elevation: 0,
              title: const Text('Product Detail',
                  style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            body: Center(
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.inventory_2_outlined,
                        size: 64, color: Colors.grey.shade300),
                    const SizedBox(height: 12),
                    Text('Product not found',
                        style: TextStyle(
                            fontSize: 16, color: Colors.grey.shade500)),
                    const SizedBox(height: 4),
                    Text('ID: $productId',
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade400)),
                  ]),
            ),
          );
        }

        return Scaffold(
          backgroundColor: SellerTheme.surface,
          appBar: AppBar(
            backgroundColor: _mp,
            foregroundColor: Colors.white,
            elevation: 0,
            title: Text('Product · ${ss.country.flag}',
                style: const TextStyle(fontWeight: FontWeight.bold)),
            actions: [
              IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () {
                    // Navigate to edit screen
                    Navigator.pushNamed(context,
                        '/seller/marketplace/products/${product.id}/edit');
                  }),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert),
                onSelected: (v) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text('$v action'),
                      duration: const Duration(seconds: 1)));
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(
                      value: 'duplicate', child: Text('Duplicate Product')),
                  const PopupMenuItem(value: 'archive', child: Text('Archive')),
                  const PopupMenuItem(
                      value: 'delete',
                      child:
                          Text('Delete', style: TextStyle(color: Colors.red))),
                ],
              ),
            ],
          ),
          body: Column(
            children: [
              const OfflineBanner(),
              Expanded(
                child: ListView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Product image placeholder
                    Container(
                      height: 220,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Center(
                        child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(product.emoji,
                                  style: const TextStyle(fontSize: 72)),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _statusColor(product.isActive)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  product.isActive ? 'ACTIVE' : 'INACTIVE',
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: _statusColor(product.isActive)),
                                ),
                              ),
                            ]),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Product name & badges
                    Text(product.name,
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    Row(children: [
                      if (product.isFeatured) _badge('⭐ Featured', _mp),
                      if (product.isLowStock)
                        _badge('⚠️ Low Stock', Colors.orange),
                      if (product.isOutOfStock)
                        _badge('❌ Out of Stock', Colors.red),
                      _badge(product.category, Colors.blue),
                    ]),
                    const SizedBox(height: 20),

                    // Pricing card
                    _infoCard('Pricing', [
                      _infoRow(
                          'Selling Price', '$currency ${_fmt(product.price)}'),
                      if (product.sku != null) _infoRow('SKU', product.sku!),
                      _infoRow('Category', product.category),
                      if (product.origin != null)
                        _infoRow('Origin', product.origin!),
                    ]),
                    const SizedBox(height: 12),

                    // Inventory card
                    _infoCard('Inventory', [
                      _infoRow('Current Stock', '${product.stock} units'),
                      _infoRow(
                          'Min Stock Threshold', '${product.minStock} units'),
                      _infoRow(
                          'Stock Status',
                          product.isOutOfStock
                              ? '❌ Out of Stock'
                              : product.isLowStock
                                  ? '⚠️ Low Stock'
                                  : '✅ In Stock'),
                    ]),
                    const SizedBox(height: 12),

                    // Performance card
                    _infoCard('Performance', [
                      _infoRow('Rating',
                          '⭐ ${product.rating.toStringAsFixed(1)} / 5.0'),
                      _infoRow(
                          'Total Sales', '${product.salesCount} units sold'),
                      _infoRow('Revenue',
                          '$currency ${_fmt(product.price * product.salesCount)}'),
                    ]),
                    const SizedBox(height: 12),

                    // Status card
                    _infoCard('Status', [
                      _infoRow('Active', product.isActive ? '✅ Yes' : '❌ No'),
                      _infoRow('Featured', product.isFeatured ? '⭐ Yes' : 'No'),
                    ]),

                    const SizedBox(height: 24),

                    // Action buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => ScaffoldMessenger.of(context)
                                .showSnackBar(SnackBar(
                                    content: Text(
                                        'Opening analytics for ${product.name}'),
                                    duration: const Duration(seconds: 2))),
                            icon:
                                const Icon(Icons.bar_chart_outlined, size: 18),
                            label: const Text('Analytics'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: _mp,
                              side:
                                  BorderSide(color: _mp.withValues(alpha: 0.4)),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              Navigator.pushNamed(context,
                                  '/seller/marketplace/products/${product.id}/edit');
                            },
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            label: const Text('Edit Product'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _mp,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  static const _mp = Color(0xFF6C3FC8);

  Widget _badge(String label, Color color) {
    return Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(6)),
      child: Text(label,
          style: TextStyle(
              fontSize: 11, fontWeight: FontWeight.w600, color: color)),
    );
  }

  Widget _infoCard(String title, List<Widget> rows) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style:
                  const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          ...rows,
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(
              child: Text(label,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade500))),
          Text(value,
              style:
                  const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Color _statusColor(bool isActive) => isActive ? Colors.green : Colors.red;

  String _fmt(double n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) {
      return '${(n / 1000).toStringAsFixed(n % 1000 == 0 ? 0 : 1)}K';
    }
    return n.toStringAsFixed(n % 1 == 0 ? 0 : 2);
  }
}
