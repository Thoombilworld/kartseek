import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_feed_screen.dart';

/// A seller's storefront.
///
/// Keyed on `sellerName`, defaulting to 'Apple India Store', and matched
/// products with `p.sellerName.toLowerCase() == sellerName.toLowerCase()` over
/// the bundled mock list. On a marketplace where sellers choose their own trade
/// names, matching on the name is not an identity check — two sellers can share
/// one, and a seller who rebrands loses their whole storefront.
class SellerStoreScreen extends StatelessWidget {
  const SellerStoreScreen({super.key, required this.sellerId, this.sellerName});

  final String sellerId;
  final String? sellerName;

  @override
  Widget build(BuildContext context) {
    final api = MarketplaceApiService();
    return ProductFeedScreen(
      title: sellerName ?? 'Seller Store',
      subjectForErrors: 'this seller',
      emptyTitle: 'Nothing listed yet',
      emptySubtitle: 'This seller has no products on sale right now.',
      emptyIcon: Icons.storefront_outlined,
      loader: (page) => api.getProducts(
        filter: ProductFilter(sellerId: sellerId, page: page + 1),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.shopping_cart_outlined, size: 22, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pushNamed(context, AppRouter.cart),
        ),
      ],
    );
  }
}
