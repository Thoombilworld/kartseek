import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/async_list_screen.dart';

/// Sellers the platform has verified.
///
/// Filtered `MarketplaceMockData.sellers` on `verified` in `build` and opened
/// the storefront by seller *name*. `getVerifiedSellers` already existed and
/// nothing called it; the endpoint is also the only thing that can say whether
/// a seller is genuinely verified, which is the whole claim this screen makes.
class VerifiedSellersScreen extends StatelessWidget {
  const VerifiedSellersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final api = MarketplaceApiService();
    return AsyncListScreen<SellerModel>(
      title: 'Verified Sellers',
      subjectForErrors: 'verified sellers',
      emptyTitle: 'No verified sellers yet',
      emptySubtitle: 'Sellers appear here once their documents are approved.',
      emptyIcon: Icons.storefront_outlined,
      loader: api.getVerifiedSellers,
      itemBuilder: (context, s) => GestureDetector(
        onTap: () => Navigator.pushNamed(
          context,
          AppRouter.sellerStore,
          arguments: {'sellerId': s.id, 'sellerName': s.name},
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
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Center(
                  child: Icon(Icons.storefront, color: AppTheme.primaryGreen, size: 28)),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Flexible(
                    child: Text(s.name,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                        overflow: TextOverflow.ellipsis),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                        color: Colors.green.shade50, borderRadius: BorderRadius.circular(4)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.verified, size: 12, color: Colors.green.shade700),
                      const SizedBox(width: 3),
                      Text('Verified',
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Colors.green.shade700)),
                    ]),
                  ),
                ]),
                const SizedBox(height: 4),
                // Each fact is printed only when the seller actually has it —
                // the old row rendered "Since N/A" for every seller missing a
                // join date.
                Text(
                  [
                    '${s.productCount} products',
                    if (s.rating > 0) '★ ${s.rating.toStringAsFixed(1)}',
                    if (s.since != null && s.since!.isNotEmpty) 'Since ${s.since}',
                  ].join(' • '),
                  style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                ),
                if (s.location?.isNotEmpty == true) ...[
                  const SizedBox(height: 2),
                  Text(s.location!,
                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                ],
              ]),
            ),
            const Icon(Icons.chevron_right, color: AppTheme.textMuted),
          ]),
        ),
      ),
    );
  }
}
