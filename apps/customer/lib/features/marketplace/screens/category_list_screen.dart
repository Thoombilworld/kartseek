import 'package:flutter/material.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/async_list_screen.dart';

/// Every marketplace category.
///
/// Rendered `MarketplaceMockData.categories` in `build`, so the app's category
/// taxonomy was whatever shipped in the binary — a category an admin added was
/// invisible until the next release, and one they removed stayed browsable.
class CategoryListScreen extends StatelessWidget {
  const CategoryListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final api = MarketplaceApiService();
    return AsyncListScreen<CategoryModel>(
      title: 'All Categories',
      subjectForErrors: 'categories',
      emptyTitle: 'No categories yet',
      emptySubtitle: 'Categories appear here once the catalogue is set up.',
      emptyIcon: Icons.category_outlined,
      loader: api.getCategories,
      itemBuilder: (context, cat) => GestureDetector(
        onTap: () => Navigator.pushNamed(
          context,
          AppRouter.categoryDetail,
          arguments: {'id': cat.id, 'name': cat.name},
        ),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.borderLight),
          ),
          child: Row(children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppTheme.marketplaceColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(cat.iconEmoji ?? '\u{1F4E6}', style: const TextStyle(fontSize: 24)),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(cat.name,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                    overflow: TextOverflow.ellipsis),
                Text('${cat.productCount} products',
                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
              ]),
            ),
            if (cat.subcategories.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.marketplaceColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text('${cat.subcategories.length} sub',
                    style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.marketplaceColor)),
              ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 20),
          ]),
        ),
      ),
    );
  }
}
