import 'package:flutter/material.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_feed_screen.dart';

/// Products in one subcategory.
///
/// Filtered `MarketplaceMockData.allProducts` in `build`, so the grid was
/// fictional and the `RefreshIndicator` wrapped an `onRefresh` that did nothing
/// — there was no request to repeat. The catalogue is filtered server-side now,
/// which also means the list is not capped at whatever happened to be bundled.
class SubcategoryDetailScreen extends StatelessWidget {
  const SubcategoryDetailScreen({
    super.key,
    required this.subcategoryId,
    this.subcategoryName = 'Subcategory',
  });

  final String subcategoryId;
  final String subcategoryName;

  @override
  Widget build(BuildContext context) {
    final api = MarketplaceApiService();
    return ProductFeedScreen(
      title: subcategoryName,
      subjectForErrors: 'these products',
      emptyTitle: 'No products yet',
      emptySubtitle: 'Nothing is listed in $subcategoryName at the moment.',
      emptyIcon: Icons.category_outlined,
      loader: (page) => api.getProducts(
        filter: ProductFilter(subcategoryId: subcategoryId, page: page + 1),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.search, size: 22),
          onPressed: () => Navigator.pushNamed(context, AppRouter.marketplaceSearch),
        ),
        IconButton(
          icon: const Icon(Icons.shopping_cart_outlined, size: 22),
          onPressed: () => Navigator.pushNamed(context, AppRouter.cart),
        ),
      ],
    );
  }
}
