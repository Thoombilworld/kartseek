import 'package:flutter/material.dart';
import 'package:shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_feed_screen.dart';

/// Deals & Offers.
///
/// Was a `StatelessWidget` that filtered `MarketplaceMockData.allProducts` in
/// its build method, so it showed a fabricated catalogue with a hardcoded
/// "05:23:41" countdown that never moved. It now reads `/marketplace/deals`
/// through the shared feed, which brings the loading, error, empty and
/// pull-to-refresh states with it.
class DealsScreen extends StatelessWidget {
  const DealsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final api = MarketplaceApiService();
    return ProductFeedScreen(
      title: 'Deals & Offers',
      subjectForErrors: 'deals',
      emptyTitle: 'No deals running',
      emptySubtitle: 'There are no active offers right now. Check back soon.',
      emptyIcon: Icons.local_offer_outlined,
      // `getDeals` returns the current set in one response, so the feed loads
      // once and stops. It gains pagination the moment the endpoint does.
      loader: (page) => page == 0 ? api.getDeals() : Future.value(<ProductModel>[]),
      header: (context, products) => _DealsHeader(count: products.length),
    );
  }
}

class _DealsHeader extends StatelessWidget {
  const _DealsHeader({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 150,
          margin: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1E40AF), Color(0xFF2563EB)],
            ),
            borderRadius: BorderRadius.circular(18),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              const Text('Deals of the Day',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 24)),
              const SizedBox(height: 6),
              Text(
                // Was "Up to 60% off on top electronics" regardless of what was
                // actually on offer.
                count == 0
                    ? 'Hand-picked offers from verified sellers'
                    : '$count ${count == 1 ? 'deal' : 'deals'} live right now',
                style: const TextStyle(color: Colors.white70, fontSize: 15),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
