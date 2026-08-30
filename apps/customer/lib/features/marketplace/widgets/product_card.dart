import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_customer/features/marketplace/models/product_model.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_bloc.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_event.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_state.dart';
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_bloc.dart';
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_event.dart' hide AddToCart;
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_state.dart' hide CartState;

/// Reusable product card — Amazon/Flipkart tier with all required fields:
/// image, name, brand, price, discount, rating, stock status,
/// delivery estimate, wishlist button, and add to cart button.
class MarketplaceProductCard extends StatelessWidget {
  final ProductModel product;
  const MarketplaceProductCard({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    final img = product.images.isNotEmpty ? product.images.first : '';
    final currency = RegionService.instance.currentCountry.currencySymbol;
    return RepaintBoundary(
      child: GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.productDetail, arguments: product.id),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.borderLight),
          boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Product Image ──
            Expanded(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: AppTheme.surfaceWhite,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                  image: img.isNotEmpty ? KartseekImage.decoration(url: img, fit: BoxFit.cover) : null,
                ),
                child: Stack(children: [
                  if (img.isEmpty) const Center(child: Icon(Icons.image_outlined, size: 48, color: AppTheme.textMuted)),
                  // Discount badge
                  if (product.discount > 0) Positioned(top: 8, left: 8, child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(color: Colors.red.shade600, borderRadius: BorderRadius.circular(4)),
                    child: Text('${product.discount}% OFF', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                  )),
                  // Wishlist button
                  // Wishlist toggle.
                  //
                  // This used to show "<product> added to wishlist" and offer a
                  // "View" action leading to a wishlist the product would not be
                  // in — it dispatched nothing and called nothing. It now goes
                  // through MarketplaceBloc like every other wishlist path, and
                  // the heart reflects what the server actually holds.
                  Positioned(top: 8, right: 8, child: _WishlistButton(product: product)),
                  // Out of stock overlay
                  if (!product.inStock) Positioned(bottom: 0, left: 0, right: 0, child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    color: Colors.black54,
                    child: const Center(child: Text('Out of Stock', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700))),
                  )),
                ]),
              ),
            ),
            // ── Product Info ──
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Brand
                  Text(product.brand, style: TextStyle(fontSize: 10, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
                  // Name
                  Text(product.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700), maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  // Rating
                  Row(children: [
                    Container(padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2), decoration: BoxDecoration(color: Colors.green.shade700, borderRadius: BorderRadius.circular(3)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [Text('${product.rating}', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)), const SizedBox(width: 2), const Icon(Icons.star, color: Colors.white, size: 10)])),
                    const SizedBox(width: 6),
                    Text('(${_fmtCount(product.reviewCount)})', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                  ]),
                  const SizedBox(height: 4),
                  // Price
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Row(children: [
                      Text('$currency ${_fmtPrice(product.price)}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
                      if (product.discount > 0) ...[
                        const SizedBox(width: 6),
                        Text('$currency ${_fmtPrice(product.mrp)}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400, decoration: TextDecoration.lineThrough)),
                      ],
                    ]),
                  ),
                  const SizedBox(height: 3),
                  // Delivery estimate + stock
                  Row(children: [
                    if (product.freeDelivery) ...[
                      Icon(Icons.local_shipping_outlined, size: 11, color: Colors.green.shade700),
                      const SizedBox(width: 3),
                      Text('Free', style: TextStyle(fontSize: 10, color: Colors.green.shade700, fontWeight: FontWeight.w600)),
                      const SizedBox(width: 4),
                    ],
                    Expanded(child: Text(product.deliveryEstimate ?? '', style: TextStyle(fontSize: 10, color: Colors.grey.shade500), maxLines: 1, overflow: TextOverflow.ellipsis)),
                  ]),
                  const SizedBox(height: 6),
                  // Add to Cart button — dispatches AddToCart event to CartBloc
                  BlocBuilder<CartBloc, CartState>(
                    buildWhen: (prev, curr) {
                      // Only rebuild this button when this product's cart status changes
                      final wasInCart = prev.items.any((i) => i.productId == product.id);
                      final isInCart = curr.items.any((i) => i.productId == product.id);
                      return wasInCart != isInCart;
                    },
                    builder: (context, cartState) {
                      final isInCart = cartState.items.any((i) => i.productId == product.id);
                      return SizedBox(
                        width: double.infinity, height: 30,
                        child: ElevatedButton(
                          onPressed: product.inStock ? () {
                            if (isInCart) {
                              // Already in cart — navigate to cart
                              Navigator.pushNamed(context, AppRouter.cart);
                            } else {
                              // Add to cart
                              context.read<CartBloc>().add(AddToCart(
                                productId: product.id,
                                productName: product.name,
                                price: product.price,
                                quantity: 1,
                                imageUrl: product.images.isNotEmpty ? product.images.first : null,
                                sellerName: product.sellerName,
                              ));
                              ScaffoldMessenger.of(context).clearSnackBars();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Row(children: [
                                    const Icon(Icons.check_circle, color: Colors.white, size: 18),
                                    const SizedBox(width: 8),
                                    Expanded(child: Text('${product.name} added to cart', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600))),
                                  ]),
                                  backgroundColor: AppTheme.primaryGreen,
                                  duration: const Duration(seconds: 2),
                                  behavior: SnackBarBehavior.floating,
                                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  action: SnackBarAction(
                                    label: 'View Cart',
                                    textColor: Colors.white,
                                    onPressed: () => Navigator.pushNamed(context, AppRouter.cart),
                                  ),
                                ),
                              );
                            }
                          } : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: product.inStock
                                ? (isInCart ? AppTheme.primaryGreen : AppTheme.marketplaceColor)
                                : Colors.grey.shade300,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: EdgeInsets.zero,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                          ),
                          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Icon(isInCart ? Icons.shopping_cart : Icons.add_shopping_cart, size: 13),
                            const SizedBox(width: 4),
                            Text(
                              product.inStock ? (isInCart ? 'Go to Cart' : 'Add to Cart') : 'Notify Me',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                            ),
                          ]),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
    );
  }

  static final _priceRegex = RegExp(r'(\d)(?=(\d{3})+$)');
  static String _fmtPrice(double n) => n.toInt().toString().replaceAllMapped(_priceRegex, (m) => '${m[1]},');
  static String _fmtCount(int n) => n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}k' : '$n';
}

/// The heart on a product card, bound to the wishlist the server holds.
class _WishlistButton extends StatelessWidget {
  const _WishlistButton({required this.product});

  final ProductModel product;

  @override
  Widget build(BuildContext context) {
    // Not every surface that renders a card has MarketplaceBloc above it — the
    // home rails, for one. Where it is absent the control is hidden rather than
    // shown inert, because a heart that does nothing is the fault being fixed.
    final bloc = context.read<MarketplaceBloc?>();
    if (bloc == null) return const SizedBox.shrink();

    return BlocBuilder<MarketplaceBloc, MarketplaceState<dynamic>>(
      buildWhen: (prev, curr) {
        final was = _contains(prev);
        final now = _contains(curr);
        return was != now;
      },
      builder: (context, state) {
        final saved = _contains(state);
        return GestureDetector(
          onTap: () {
            context.read<MarketplaceBloc>().add(ToggleWishlistItem(product.id));
            ScaffoldMessenger.of(context)
              ..clearSnackBars()
              ..showSnackBar(SnackBar(
                content: Text(saved
                    ? '${product.name} removed from wishlist'
                    : '${product.name} added to wishlist'),
                duration: const Duration(seconds: 2),
                behavior: SnackBarBehavior.floating,
                action: saved
                    ? null
                    : SnackBarAction(
                        label: 'View',
                        textColor: Colors.white,
                        onPressed: () => Navigator.pushNamed(context, AppRouter.wishlist),
                      ),
              ));
          },
          child: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4)],
            ),
            child: Icon(
              saved ? Icons.favorite : Icons.favorite_border,
              size: 16,
              color: saved ? const Color(0xFFDC2626) : AppTheme.textMuted,
            ),
          ),
        );
      },
    );
  }

  bool _contains(MarketplaceState<dynamic> state) {
    final items = state.data;
    if (items is! List) return false;
    return items.any((p) => p is ProductModel && p.id == product.id);
  }
}
