import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_feed_screen.dart';

/// A brand's products.
///
/// Keyed on `brandName` with 'Apple' as the default, and resolved through
/// `MarketplaceMockData.getBrandByName(...)` — so the page opened on a
/// hardcoded brand when the route carried no argument, and matched products by
/// comparing brand *strings* case-insensitively rather than by id. Two brands
/// with similar names collided, and a rename orphaned the page.
class BrandDetailScreen extends StatelessWidget {
  const BrandDetailScreen({super.key, required this.brandId, this.brandName});

  final String brandId;

  /// Shown in the app bar while the products load; the catalogue is the
  /// authority on the brand's own name.
  final String? brandName;

  @override
  Widget build(BuildContext context) {
    final api = MarketplaceApiService();
    return ProductFeedScreen(
      title: brandName ?? 'Brand',
      subjectForErrors: 'this brand',
      emptyTitle: 'No products listed',
      emptySubtitle: 'This brand has nothing on sale right now.',
      emptyIcon: Icons.sell_outlined,
      loader: (page) => api.getProducts(
        filter: ProductFilter(brandId: brandId, page: page + 1),
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
