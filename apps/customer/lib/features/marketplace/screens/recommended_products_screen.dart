import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/services/recommendation_engine.dart';
import 'package:kartseek_shared_mobile/core/services/user_behavior_service.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Recommended Products Screen — AI-powered personalized product suggestions.
///
/// Uses [RecommendationEngine] to score and rank products based on the user's
/// browsing history, search queries, brand/category affinities, and price preferences.
class RecommendedProductsScreen extends StatefulWidget {
  const RecommendedProductsScreen({super.key});

  @override
  State<RecommendedProductsScreen> createState() => _RecommendedProductsScreenState();
}

class _RecommendedProductsScreenState extends State<RecommendedProductsScreen> {
  late List<ScoredProduct> _recommendations;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadRecommendations();
  }

  Future<void> _loadRecommendations() async {
    setState(() => _isLoading = true);
    // Small delay to simulate network call and avoid jank
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;
    final recs = await RecommendationEngine.instance.refreshRecommendations(limit: 30);
    setState(() {
      _recommendations = recs;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    final behavior = UserBehaviorService.instance;

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      body: RefreshIndicator(
        onRefresh: _loadRecommendations,
        color: AppTheme.marketplaceColor,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          slivers: [
            // ── App Bar ──────────────────────────────────────────────────────
            SliverAppBar(
              pinned: true,
              elevation: 0,
              backgroundColor: Colors.white,
              surfaceTintColor: Colors.transparent,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
                onPressed: () => Navigator.pop(context),
              ),
              title: const Text(
                'Recommended for You',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.tune, color: AppTheme.textSecondary),
                  onPressed: () => _showFilterInfo(context),
                ),
              ],
            ),

            // ── Behavior Summary Banner ──────────────────────────────────────
            if (!_isLoading && behavior.viewHistory.isNotEmpty)
              SliverToBoxAdapter(
                child: Container(
                  margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF7C3AED), Color(0xFFA855F7)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48, height: 48,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Center(child: Text('🎯', style: TextStyle(fontSize: 24))),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Personalized picks just for you',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'Based on ${behavior.viewHistory.length} views & ${behavior.searchHistory.length} searches',
                              style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // ── Top Interests Chips ──────────────────────────────────────────
            if (!_isLoading && behavior.topCategories.isNotEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Your interests', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textSecondary)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: behavior.topCategories.take(5).map((entry) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppTheme.marketplaceColor.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppTheme.marketplaceColor.withValues(alpha: 0.2)),
                            ),
                            child: Text(
                              entry.key,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.marketplaceColor),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ),

            // ── Loading State ────────────────────────────────────────────────
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: AppTheme.marketplaceColor),
                      SizedBox(height: 16),
                      Text('Analyzing your preferences...', style: TextStyle(color: AppTheme.textMuted, fontSize: 14)),
                    ],
                  ),
                ),
              ),

            // ── Empty State ──────────────────────────────────────────────────
            if (!_isLoading && _recommendations.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.recommend, size: 64, color: AppTheme.textMuted),
                      const SizedBox(height: 12),
                      const Text('No recommendations yet', style: AppTheme.headingSM),
                      const SizedBox(height: 4),
                      const Text('Browse products to get personalized picks', style: AppTheme.bodySM),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: () => Navigator.pushNamed(context, AppRouter.marketplace),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.marketplaceColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        ),
                        child: const Text('Start Browsing'),
                      ),
                    ],
                  ),
                ),
              ),

            // ── Product Grid ─────────────────────────────────────────────────
            if (!_isLoading && _recommendations.isNotEmpty)
              SliverPadding(
                padding: const EdgeInsets.all(12),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 220,
                    childAspectRatio: 0.55,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final scored = _recommendations[index];
                      return _RecommendedProductCard(
                        scored: scored,
                        currency: currency,
                      );
                    },
                    childCount: _recommendations.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showFilterInfo(BuildContext context) {
    final behavior = UserBehaviorService.instance;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('How recommendations work', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            _infoRow('🔍', 'Search history', '${behavior.searchHistory.length} queries'),
            _infoRow('👁️', 'Products viewed', '${behavior.viewHistory.length} items'),
            _infoRow('🛒', 'Past purchases', '${behavior.purchaseHistory.length} orders'),
            _infoRow('📂', 'Categories tracked', '${behavior.categoryViews.length} categories'),
            _infoRow('🏷️', 'Brand preferences', '${behavior.brandViews.length} brands'),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () {
                  behavior.clearHistory();
                  Navigator.pop(context);
                  _loadRecommendations();
                },
                child: const Text('Clear recommendation data', style: TextStyle(color: Colors.red)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String emoji, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 20)),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
          Text(value, style: const TextStyle(color: AppTheme.textMuted)),
        ],
      ),
    );
  }
}

/// Product card with recommendation reason badge.
class _RecommendedProductCard extends StatelessWidget {
  final ScoredProduct scored;
  final String currency;

  const _RecommendedProductCard({required this.scored, required this.currency});

  @override
  Widget build(BuildContext context) {
    final product = scored.product;
    return GestureDetector(
      onTap: () {
        // Track the view in behavior service
        UserBehaviorService.instance.trackProductView(
          productId: product.id,
          productName: product.name,
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          brandName: product.brand,
          price: product.price,
        );
        Navigator.pushNamed(context, AppRouter.productDetail, arguments: product.id);
      },
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.surfaceMuted),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 3))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Image
            Expanded(
              flex: 3,
              child: Stack(
                children: [
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                      color: AppTheme.surfaceWhite,
                      image: product.images.isNotEmpty
                          ? KartseekImage.decoration(url: product.images.first, fit: BoxFit.cover)
                          : null,
                    ),
                    child: product.images.isEmpty
                        ? const Center(child: Icon(Icons.image_outlined, size: 40, color: Colors.grey))
                        : null,
                  ),
                  if (product.discount > 0)
                    Positioned(
                      top: 8, left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(color: Colors.red.shade500, borderRadius: BorderRadius.circular(4)),
                        child: Text('-${product.discount}%', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                      ),
                    ),
                ],
              ),
            ),
            // Product Info
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Reason badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F9FF),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        scored.reason,
                        style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: Color(0xFF0284C7)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      product.name,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, height: 1.2),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Text('$currency ${_fmtPrice(product.price)}',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppTheme.primaryGreen)),
                        if (product.mrp > product.price) ...[
                          const SizedBox(width: 4),
                          Text('$currency ${_fmtPrice(product.mrp)}',
                              style: TextStyle(fontSize: 10, color: Colors.grey.shade400, decoration: TextDecoration.lineThrough)),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.star, size: 11, color: Colors.orange),
                        const SizedBox(width: 2),
                        Text('${product.rating}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                        const SizedBox(width: 4),
                        Text('(${_fmtCount(product.ratingCount)})', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _fmtPrice(double n) => n.toInt().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},');
  static String _fmtCount(int n) => n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}k' : '$n';
}
