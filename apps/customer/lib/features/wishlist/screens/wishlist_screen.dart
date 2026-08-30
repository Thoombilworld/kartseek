import 'package:flutter/material.dart';
import 'package:shared_mobile/core/utils/responsive.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_mock_data.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_card.dart';

/// Wishlist — Saved products with move-to-cart and remove.
class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});
  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  final _ids = ['p1', 'p2', 'p5', 'p7'];

  @override
  Widget build(BuildContext context) {
    final items = _ids.map(MarketplaceMockData.getProductById).toList();
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: Text('Wishlist (${items.length})',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
              icon: const Icon(Icons.shopping_cart_outlined, size: 22),
              onPressed: () => Navigator.pushNamed(context, AppRouter.cart)),
        ],
      ),
      body: items.isEmpty
          ? Center(
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                  Icon(Icons.favorite_border,
                      size: 80, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  const Text('Your wishlist is empty',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text('Save items you love to buy later',
                      style:
                          TextStyle(fontSize: 14, color: Colors.grey.shade500)),
                  const SizedBox(height: 24),
                  ElevatedButton(
                      onPressed: () =>
                          Navigator.pushNamed(context, AppRouter.marketplace),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.marketplaceColor,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12))),
                      child: const Text('Start Shopping',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700))),
                ]))
          : GridView.builder(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(12),
              gridDelegate: Responsive.productGridDelegate,
              itemCount: items.length,
              itemBuilder: (_, i) {
                final p = items[i];
                return Stack(children: [
                  MarketplaceProductCard(product: p),
                  Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: DecoratedBox(
                        decoration: const BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.vertical(
                                bottom: Radius.circular(14))),
                        child: Row(children: [
                          Expanded(
                              child: GestureDetector(
                                  onTap: () =>
                                      setState(() => _ids.remove(p.id)),
                                  child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 10),
                                      decoration: BoxDecoration(
                                          border: Border(
                                              top: BorderSide(
                                                  color: Colors.grey.shade200),
                                              right: BorderSide(
                                                  color:
                                                      Colors.grey.shade200))),
                                      child: const Center(
                                          child: Text('Remove',
                                              style: TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                  color: AppTheme
                                                      .textSecondary)))))),
                          Expanded(
                              child: GestureDetector(
                                  onTap: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                          content:
                                              Text('${p.name} moved to cart')),
                                    );
                                    setState(() => _ids.remove(p.id));
                                  },
                                  child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 10),
                                      decoration: BoxDecoration(
                                          border: Border(
                                              top: BorderSide(
                                                  color:
                                                      Colors.grey.shade200))),
                                      child: const Center(
                                          child: Text('Move to Cart',
                                              style: TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w700,
                                                  color: AppTheme
                                                      .marketplaceColor)))))),
                        ]),
                      )),
                ]);
              },
            ),
    );
  }
}
