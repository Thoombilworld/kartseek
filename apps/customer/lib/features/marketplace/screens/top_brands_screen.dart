import 'package:flutter/material.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/async_list_screen.dart';

/// The brand directory.
///
/// Read `MarketplaceMockData.brands` in `build` and passed `b.name` to the
/// brand page, which then matched products by comparing brand strings. Both
/// halves are ids now.
class TopBrandsScreen extends StatelessWidget {
  const TopBrandsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final api = MarketplaceApiService();
    return AsyncListScreen<BrandModel>(
      title: 'Top Brands',
      subjectForErrors: 'brands',
      emptyTitle: 'No brands yet',
      emptySubtitle: 'Brands appear here as sellers register them.',
      emptyIcon: Icons.sell_outlined,
      loader: api.getTopBrands,
      itemBuilder: (context, b) => GestureDetector(
        onTap: () => Navigator.pushNamed(
          context,
          AppRouter.brandDetail,
          arguments: {'brandId': b.id, 'brandName': b.name},
        ),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.borderLight),
          ),
          child: Row(children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppTheme.marketplaceColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text(
                  b.name.isNotEmpty ? b.name[0].toUpperCase() : '?',
                  style: const TextStyle(
                      fontSize: 22, fontWeight: FontWeight.w900, color: AppTheme.marketplaceColor),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Flexible(
                    child: Text(b.name,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        overflow: TextOverflow.ellipsis),
                  ),
                  if (b.verified) ...[
                    const SizedBox(width: 6),
                    Icon(Icons.verified, size: 16, color: Colors.blue.shade600),
                  ],
                ]),
                const SizedBox(height: 4),
                Row(children: [
                  Text('${b.productCount} products',
                      style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                  // Ratings render only when the brand has one — the old row
                  // printed "⭐ 0" for every brand nobody had reviewed.
                  if (b.rating > 0) ...[
                    const Text(' • ', style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                    const Icon(Icons.star, size: 13, color: AppTheme.warningAmber),
                    const SizedBox(width: 2),
                    Text(b.rating.toStringAsFixed(1),
                        style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                  ],
                ]),
              ]),
            ),
            const Icon(Icons.chevron_right, color: AppTheme.textMuted),
          ]),
        ),
      ),
    );
  }
}
