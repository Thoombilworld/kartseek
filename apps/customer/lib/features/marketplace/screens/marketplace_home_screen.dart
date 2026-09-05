import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_bloc.dart';
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_event.dart';
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_state.dart' hide CartState;
import 'package:kartseek_customer/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_card.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/services/recommendation_engine.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_bloc.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_state.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';
import 'package:kartseek_shared_mobile/core/widgets/camera_capture_screen.dart';
import 'package:kartseek_shared_mobile/core/widgets/voice_search_sheet.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Marketplace Home — Premium e-commerce homepage with all required sections.
/// Wired to MarketplaceBloc for live/mock data via the BLoC pattern.
class MarketplaceHomeScreen extends StatefulWidget {
  const MarketplaceHomeScreen({super.key});

  @override
  State<MarketplaceHomeScreen> createState() => _MarketplaceHomeScreenState();
}

class _MarketplaceHomeScreenState extends State<MarketplaceHomeScreen> {
  int _bannerPage = 0;
  late PageController _bannerController;
  List<ScoredProduct> _recommendations = [];
  Timer? _autoSlideTimer;
  Timer? _backgroundRefreshTimer;
  late final AppLifecycleListener _lifecycleListener;
  bool _bannersPrecached = false;

  /// Pre-computed category product lists — avoids filtering in build().
  final Map<String, List<ProductModel>> _categoryProductsCache = {};

  final _api = MarketplaceApiService();

  /// The loaded home payload, or null while it is still in flight.
  ///
  /// The section builders below take `homeData` as a parameter because they are
  /// called from a `BlocBuilder`; the timer and precache callbacks are not, and
  /// used to read `MarketplaceMockData.homeData` instead. This reads the same
  /// bloc state they do.
  MarketplaceHomeData? get _homeData {
    try {
      return context.read<MarketplaceBloc>().homeState.data;
    } catch (_) {
      return null;
    }
  }

  /// Category rows to display on home — (emoji, title, categoryId).
  static const _categoryRows = [
    ('📱', 'Mobile Phones', 'c1'),
    ('👗', 'Fashion & Dresses', 'c4'),
    ('⌚', 'Watches & Clocks', 'c20'),
    ('🧒', 'Kids Products', 'c13'),
    ('💄', 'Beauty Products', 'c9'),
    ('🔌', 'Electronics', 'c2'),
    ('🧊', 'Home Appliances', 'c12'),
    ('🏋️', 'Sports & Fitness', 'c14'),
  ];

  @override
  void initState() {
    super.initState();
    _bannerController = PageController();
    _startAutoSlide();
    _loadRecommendations();
    _precomputeCategoryProducts();

    // Dispatch BLoC event to load marketplace home data
    final bloc = context.read<MarketplaceBloc>();
    bloc.add(const LoadMarketplaceHome());

    // Connectivity-aware background refresh every 10 minutes
    _backgroundRefreshTimer = Timer.periodic(const Duration(minutes: 10), (_) async {
      if (!mounted) return;
      final connectivity = await Connectivity().checkConnectivity();
      if (connectivity.contains(ConnectivityResult.none)) return;
      if (!mounted) return;
      bloc.add(const RefreshMarketplaceHome());
    });

    // Refresh marketplace data when app resumes from background
    _lifecycleListener = AppLifecycleListener(
      onResume: () {
        if (mounted) {
          context.read<MarketplaceBloc>().add(const RefreshMarketplaceHome());
        }
      },
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Precache banner images once for instant display
    if (!_bannersPrecached) {
      _bannersPrecached = true;
      final banners = _homeData?.banners ?? const [];
      for (final banner in banners.take(5)) {
        if (banner.imageUrl?.isNotEmpty == true) {
          precacheImage(NetworkImage(banner.imageUrl!), context);
        }
      }
    }
  }

  /// Fill the per-category rails from the catalogue.
  ///
  /// Was `MarketplaceMockData.getProductsByCategory(catId)` per row, so every
  /// category strip on the home screen was bundled data. Each row is fetched
  /// once and cached for the session; a row whose request fails stays empty
  /// rather than borrowing products from another category.
  Future<void> _precomputeCategoryProducts() async {
    for (final (_, _, catId) in _categoryRows) {
      try {
        final products = await _api.getProducts(
          filter: ProductFilter(categoryId: catId, limit: 10),
        );
        if (!mounted) return;
        setState(() => _categoryProductsCache[catId] = products);
      } catch (_) {
        if (!mounted) return;
        setState(() => _categoryProductsCache[catId] = const []);
      }
    }
  }

  Future<void> _loadRecommendations() async {
    final engine = RecommendationEngine.instance;
    // Load immediately available cached recommendations
    if (mounted) {
      setState(() {
        _recommendations = List<ScoredProduct>.from(engine.cachedRecommendations);
      });
    }
    // Asynchronously refresh in background isolate
    final refreshed = await engine.refreshRecommendations(limit: 6);
    if (mounted) {
      setState(() {
        _recommendations = refreshed;
      });
    }
  }

  void _startAutoSlide() {
    _autoSlideTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) {
        _autoSlideTimer?.cancel();
        return;
      }
      // Use banners.length dynamically instead of hardcoded 3
      final bannerCount = _homeData?.banners.length ?? 0;
      if (bannerCount == 0) { return; }
      final next = (_bannerPage + 1) % bannerCount;
      _bannerController.animateToPage(next, duration: const Duration(milliseconds: 500), curve: Curves.easeOutCubic);
    });
  }

  @override
  void dispose() {
    _autoSlideTimer?.cancel();
    _backgroundRefreshTimer?.cancel();
    _lifecycleListener.dispose();
    _bannerController.dispose();
    super.dispose();
  }

  void _openVisualSearch(BuildContext context) {
    final messenger = ScaffoldMessenger.of(context);
    Navigator.push<String>(context, MaterialPageRoute(
      builder: (_) => const CameraCaptureScreen(
        title: 'Visual Search',
        accentColor: AppTheme.marketplaceColor,
        filePrefix: 'marketplace_visual',
        overlayHint: 'Point at a product or barcode to search',
      ),
    )).then((path) {
      if (path != null && mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('Image captured: ${path.split('/').last}'), behavior: SnackBarBehavior.floating),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent));

    return Scaffold(
      backgroundColor: AppTheme.surfaceMuted,
      body: BlocBuilder<MarketplaceBloc, MarketplaceState<dynamic>>(
        buildWhen: (prev, curr) => prev != curr,
        builder: (context, state) {
          final bloc = context.read<MarketplaceBloc>();
          final homeData = bloc.homeState.data;

          return RefreshIndicator(
            onRefresh: () async {
              bloc.add(const RefreshMarketplaceHome());
              await Future.delayed(const Duration(milliseconds: 500));
            },
            color: AppTheme.marketplaceColor,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              slivers: [
                SliverAppBar(
                  pinned: true,
                  floating: true,
                  elevation: 0,
                  backgroundColor: AppTheme.textPrimary,
                  surfaceTintColor: Colors.transparent,
                  toolbarHeight: 64,
                  automaticallyImplyLeading: false,
                  titleSpacing: 0,
                  title: _buildPremiumHeader(),
                  bottom: PreferredSize(
                    preferredSize: const Size.fromHeight(64),
                    child: _buildSearchBar(),
                  ),
                ),
                // Show loading shimmer while data is loading
                if (bloc.homeState.isLoading && homeData == null)
                  const SliverFillRemaining(
                    child: Center(child: CircularProgressIndicator(color: AppTheme.marketplaceColor)),
                  )
                else ...[
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildCategoryStrip(homeData))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildBanners(homeData))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildTrustBadges())),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildFlashDealsBanner())),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildBrands(homeData))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildCampaignBanners())),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildDeals(homeData))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildTrendingProducts(homeData))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildCategoryProductRow('📱', 'Mobile Phones', 'c1'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildBrandPromoCards('electronics'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildFestivalOffers())),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildBestSellers(homeData))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildCategoryProductRow('👗', 'Fashion & Dresses', 'c4'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildBrandPromoCards('fashion'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildNewArrivals(homeData))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildCategoryProductRow('⌚', 'Watches & Clocks', 'c20'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildBrandPromotions())),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildCountryBanners())),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildCategoryProductRow('🧒', 'Kids Products', 'c13'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildCategoryProductRow('💄', 'Beauty Products', 'c9'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildBrandPromoCards('beauty'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildCategoryProductRow('🔌', 'Electronics', 'c2'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildCategoryProductRow('🧊', 'Home Appliances', 'c12'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildBrandPromoCards('home'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildCategoryProductRow('🏋️', 'Sports & Fitness', 'c14'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildBrandPromoCards('sports'))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildSponsoredProducts())),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildBudgetDeals())),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildRecommended())),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildVerifiedSellers(homeData))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildRecentlyViewed(homeData))),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildFAQSection())),
                  SliverToBoxAdapter(child: RepaintBoundary(child: _buildMarketplaceFooter())),
                  const SliverToBoxAdapter(child: SizedBox(height: 100)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildPremiumHeader() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [AppTheme.textPrimary, Color(0xFF1E293B)]),
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Column(
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: const Icon(Icons.arrow_back, color: Colors.white, size: 26),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: Text('KARTSEEK', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
              ),
              GestureDetector(
                onTap: () => Navigator.pushNamed(context, AppRouter.notifications),
                child: const Icon(Icons.notifications_none, color: Colors.white, size: 26),
              ),
              const SizedBox(width: 16),
              GestureDetector(
                onTap: () => Navigator.pushNamed(context, AppRouter.wishlist),
                child: const Icon(Icons.favorite_border, color: Colors.white, size: 26),
              ),
              const SizedBox(width: 16),
              BlocBuilder<CartBloc, CartState>(
                builder: (context, cartState) {
                  final cartCount = cartState.items.fold<int>(0, (sum, i) => sum + i.quantity);
                  return GestureDetector(
                    onTap: () => Navigator.pushNamed(context, AppRouter.cart),
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        const Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 26),
                        if (cartCount > 0)
                          Positioned(right: -6, top: -4, child: Container(padding: const EdgeInsets.all(4), decoration: BoxDecoration(color: Colors.red.shade500, shape: BoxShape.circle, border: Border.all(color: AppTheme.textPrimary, width: 1.5)),
                            child: Text('$cartCount', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900, height: 1)))),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 4),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [AppTheme.textPrimary, Color(0xFF1E293B)]),
      ),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        children: [
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.marketplaceSearch),
            child: Container(
              height: 48,
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8, offset: const Offset(0, 4))]),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  Icon(Icons.search, color: Colors.grey.shade500, size: 24),
                  const SizedBox(width: 10),
                  Expanded(child: Text('Search products, brands, categories...', style: TextStyle(color: Colors.grey.shade500, fontSize: 14, fontWeight: FontWeight.w500))),
                  Container(width: 1, height: 24, color: Colors.grey.shade200, margin: const EdgeInsets.symmetric(horizontal: 10)),
                  GestureDetector(
                    onTap: () => _openVisualSearch(context),
                    child: Icon(Icons.camera_alt_outlined, color: Colors.grey.shade500, size: 22),
                  ),
                  const SizedBox(width: 10),
                  GestureDetector(
                    onTap: () => VoiceSearchSheet.show(
                      context: context,
                      accentColor: AppTheme.marketplaceColor,
                      hintText: 'Try "iPhone 15" or "red shoes"',
                      onResult: (text) {
                        Navigator.pushNamed(context, AppRouter.marketplaceSearch, arguments: text);
                      },
                    ),
                    child: Icon(Icons.mic_none_rounded, color: Colors.grey.shade500, size: 22),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryStrip(MarketplaceHomeData? homeData) {
    final cats = (homeData?.categories ?? const []).take(10).toList();
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(0, 16, 0, 16),
      child: SizedBox(
        height: 96,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          itemCount: cats.length + 1,
          itemBuilder: (_, i) {
            if (i == cats.length) {
              return GestureDetector(
                onTap: () => Navigator.pushNamed(context, AppRouter.categoryList),
                child: SizedBox(width: 72, child: Column(children: [
                  Container(width: 56, height: 56, decoration: BoxDecoration(color: Colors.grey.shade100, shape: BoxShape.circle), child: const Center(child: Icon(Icons.grid_view, size: 24, color: Colors.grey))),
                  const SizedBox(height: 8),
                  const Text('View All', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey), textAlign: TextAlign.center),
                ])),
              );
            }
            final cat = cats[i];
            return GestureDetector(
              onTap: () => Navigator.pushNamed(context, AppRouter.categoryDetail, arguments: {'id': cat.id, 'name': cat.name}),
              child: SizedBox(
                width: 72,
                child: Column(children: [
                  Container(width: 56, height: 56, decoration: BoxDecoration(color: AppTheme.marketplaceColor.withValues(alpha: 0.08), shape: BoxShape.circle), child: Center(child: Text(cat.iconEmoji != null ? cat.iconEmoji! : '📦', style: const TextStyle(fontSize: 26)))),
                  const SizedBox(height: 8),
                  Text(cat.name.split(' ').first, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                ]),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildBanners(MarketplaceHomeData? homeData) {
    final banners = homeData?.banners ?? const [];
    return Container(
      height: 220,
      margin: const EdgeInsets.only(top: 8),
      child: Stack(
        children: [
          PageView.builder(
            controller: _bannerController,
            onPageChanged: (p) => setState(() => _bannerPage = p),
            itemCount: banners.length,
            itemBuilder: (_, i) {
              final b = banners[i];
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: b.gradientColors ?? <Color>[AppTheme.marketplaceColor, AppTheme.accentBlue], begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(b.title, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900, height: 1.1, letterSpacing: -0.5)),
                  const SizedBox(height: 8),
                  Text(b.subtitle, style: const TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 20),
                  Container(padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(30)),
                    child: Text('Explore Now', style: TextStyle(color: b.gradientColors?.first ?? AppTheme.marketplaceColor, fontWeight: FontWeight.w800, fontSize: 13))),
                ]),
              );
            },
          ),
          Positioned(
            bottom: 16, left: 0, right: 0,
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(banners.length, (i) => AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: _bannerPage == i ? 18 : 6, height: 6, margin: const EdgeInsets.symmetric(horizontal: 3),
              decoration: BoxDecoration(color: _bannerPage == i ? Colors.white : Colors.white.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(3)),
            ))),
          ),
        ],
      ),
    );
  }

  Widget _buildFlashDealsBanner() {
    // Flash deal deadline — resets daily at next midnight
    final now = DateTime.now();
    final deadline = DateTime(now.year, now.month, now.day).add(const Duration(days: 1));

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.flashDeals),
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppTheme.textPrimary, AppTheme.textSecondary],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(children: [
          Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: Colors.orange.shade500, shape: BoxShape.circle), child: const Icon(Icons.flash_on, color: Colors.white, size: 24)),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            const Text('FLASH DEALS', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 1)),
            const SizedBox(height: 4),
            StreamBuilder<int>(
              stream: Stream.periodic(const Duration(seconds: 1), (i) => i),
              builder: (context, _) {
                final remaining = deadline.difference(DateTime.now());
                if (remaining.isNegative) {
                  return Text('Deals expired — refresh for new deals', style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13, fontWeight: FontWeight.w600));
                }
                final h = remaining.inHours.toString().padLeft(2, '0');
                final m = (remaining.inMinutes % 60).toString().padLeft(2, '0');
                final s = (remaining.inSeconds % 60).toString().padLeft(2, '0');
                return Text('Ending in $h:$m:$s', style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13, fontWeight: FontWeight.w600));
              },
            ),
          ])),
          const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 16),
        ]),
      ),
    );
  }

  Widget _buildBrands(MarketplaceHomeData? homeData) {
    final brands = homeData?.topBrands ?? const [];

    return _section('Official Brands', 'Explore', () => Navigator.pushNamed(context, AppRouter.topBrands),
      child: SizedBox(height: 104, child: ListView.builder(
        scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: brands.length,
        itemBuilder: (_, i) {
          final b = brands[i];
          return GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.brandDetail,
                arguments: {'brandId': b.id, 'brandName': b.name}),
            child: Container(
              width: 90, margin: const EdgeInsets.only(right: 12),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200), boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))]),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                if (b.logoUrl != null && b.logoUrl!.isNotEmpty)
                  Padding(padding: const EdgeInsets.all(8.0), child: KartseekImage(url: b.logoUrl, width: 44, height: 44))
                else
                  Container(width: 44, height: 44, decoration: BoxDecoration(color: Colors.grey.shade100, shape: BoxShape.circle),
                    child: Center(child: Text(b.name[0], style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Colors.grey)))),
                const SizedBox(height: 6),
                Text(b.name, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey)),
              ]),
            ),
          );
        },
      )),
    );
  }

  Widget _buildDeals(MarketplaceHomeData? homeData) {
    final deals = (homeData?.dealOfDay ?? const []).take(4).toList();
    return _section('Deals of the Day', 'View All', () => Navigator.pushNamed(context, AppRouter.deals),
      child: GridView.count(
        shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        crossAxisCount: 2, childAspectRatio: 0.60, crossAxisSpacing: 12, mainAxisSpacing: 12,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: deals.map((p) => MarketplaceProductCard(product: p)).toList(),
      ),
    );
  }

  Widget _buildTrendingProducts(MarketplaceHomeData? homeData) {
    final products = (homeData?.trending ?? const []).take(6).toList();
    return _section('Trending Now', 'See All', () => Navigator.pushNamed(context, AppRouter.featuredProducts),
      child: SizedBox(height: 280, child: ListView.builder(
        scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: products.length,
        itemBuilder: (_, i) => Container(width: 160, margin: const EdgeInsets.only(right: 12), child: MarketplaceProductCard(product: products[i])),
      )),
    );
  }

  Widget _buildBestSellers(MarketplaceHomeData? homeData) {
    final items = homeData?.bestSellers ?? const [];
    return _section('Best Sellers', 'Discover', () => Navigator.pushNamed(context, AppRouter.featuredProducts),
      child: Column(children: items.asMap().entries.map((e) {
        final p = e.value;
        final rank = '#${e.key + 1}';
        return GestureDetector(
          onTap: () => Navigator.pushNamed(context, AppRouter.productDetail, arguments: p.id),
          child: Container(
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 12), padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, border: Border.all(color: Colors.grey.shade200), borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.05), blurRadius: 8, offset: const Offset(0, 2))]),
            child: Row(children: [
              Container(width: 32, height: 32, decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
                child: Center(child: Text(rank, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.orange.shade700)))),
              const SizedBox(width: 12),
              Container(width: 64, height: 64, decoration: BoxDecoration(color: AppTheme.surfaceWhite, borderRadius: BorderRadius.circular(8),
                image: p.images.isNotEmpty ? KartseekImage.decoration(url: p.images.first, fit: BoxFit.cover) : null)),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(p.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text('${p.brand} • ${p.categoryName}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                const SizedBox(height: 4),
                Row(children: [
                  const Icon(Icons.star, size: 12, color: Colors.orange),
                  const SizedBox(width: 4),
                  Text('${p.rating} (${_fmtCount(p.ratingCount)})', style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w500)),
                ]),
              ])),
              Text('${RegionService.instance.currentCountry.currencySymbol} ${_fmtPrice(p.price)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            ]),
          ),
        );
      }).toList()),
    );
  }

  Widget _buildNewArrivals(MarketplaceHomeData? homeData) {
    final products = (homeData?.newArrivals ?? const []).take(6).toList();
    return _section('New Arrivals', 'See All', () => Navigator.pushNamed(context, AppRouter.featuredProducts),
      child: SizedBox(height: 280, child: ListView.builder(
        scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: products.length,
        itemBuilder: (_, i) => Container(width: 160, margin: const EdgeInsets.only(right: 12), child: MarketplaceProductCard(product: products[i])),
      )),
    );
  }

  Widget _buildVerifiedSellers(MarketplaceHomeData? homeData) {
    final sellers = (homeData?.verifiedSellers ?? const []).take(4).toList();
    return _section('Verified Sellers', 'View All', () => Navigator.pushNamed(context, AppRouter.verifiedSellers),
      child: SizedBox(height: 110, child: ListView.builder(
        scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: sellers.length,
        itemBuilder: (_, i) {
          final s = sellers[i];
          return GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.sellerStore,
                arguments: {'sellerId': s.id, 'sellerName': s.name}),
            child: Container(
              width: 200, margin: const EdgeInsets.only(right: 12), padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200), boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))]),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                Row(children: [
                  Container(padding: const EdgeInsets.all(6), decoration: BoxDecoration(color: AppTheme.primaryGreen.withValues(alpha: 0.1), shape: BoxShape.circle), child: const Icon(Icons.storefront, size: 16, color: AppTheme.primaryGreen)),
                  const SizedBox(width: 10),
                  Expanded(child: Text(s.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis)),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  const Icon(Icons.star, size: 12, color: Colors.orange),
                  const SizedBox(width: 4),
                  Text('${s.rating} • ${s.productCount} products', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                ]),
              ]),
            ),
          );
        },
      )),
    );
  }

  Widget _buildRecentlyViewed(MarketplaceHomeData? homeData) {
    final products = (homeData?.recentlyViewed ?? const []).take(4).toList();
    if (products.isEmpty) return const SizedBox.shrink();
    return _section('Recently Viewed', 'Clear', () => Navigator.pushNamed(context, AppRouter.recentlyViewed),
      child: SizedBox(height: 280, child: ListView.builder(
        scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: products.length,
        itemBuilder: (_, i) => Container(width: 160, margin: const EdgeInsets.only(right: 12), child: MarketplaceProductCard(product: products[i])),
      )),
    );
  }

  /// Category-specific horizontal product row — uses pre-computed cache
  Widget _buildCategoryProductRow(String emoji, String title, String catId) {
    final products = _categoryProductsCache[catId] ?? const [];
    if (products.isEmpty) { return const SizedBox.shrink(); }
    return _section('$emoji $title', 'View All', () => Navigator.pushNamed(context, AppRouter.categoryDetail, arguments: {'id': catId, 'name': title}),
      child: SizedBox(height: 280, child: ListView.builder(
        scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: products.length,
        itemBuilder: (_, i) => Container(width: 160, margin: const EdgeInsets.only(right: 12), child: MarketplaceProductCard(product: products[i])),
      )),
    );
  }

  Widget _buildFestivalOffers() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [AppTheme.errorRed, Color(0xFFF97316)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(children: [
        const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('🎉 FESTIVAL OFFERS', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 1)),
          SizedBox(height: 6),
          Text('Up to 80% Off on Top Brands\nLimited period • Don\'t miss out!', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500, height: 1.4)),
        ])),
        GestureDetector(
          onTap: () => Navigator.pushNamed(context, AppRouter.deals),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(30)),
            child: const Text('Shop Now', style: TextStyle(color: AppTheme.errorRed, fontWeight: FontWeight.w800, fontSize: 13)),
          ),
        ),
      ]),
    );
  }

  Widget _buildBrandPromotions() {
    final promos = [
      {'brand': 'Apple', 'text': 'iPhone 15 Series\nStarting ₹59,900', 'colors': [AppTheme.textPrimary, AppTheme.textSecondary]},
      {'brand': 'Samsung', 'text': 'Galaxy S24 Ultra\nFlat ₹15,000 Off', 'colors': [const Color(0xFF1E40AF), AppTheme.marketplaceColor]},
      {'brand': 'Nike', 'text': 'Air Max Collection\nBuy 2 Get 20% Off', 'colors': [const Color(0xFFEA580C), AppTheme.warningAmber]},
    ];
    return _section('🏷️ Brand Promotions', 'Explore', () => Navigator.pushNamed(context, AppRouter.topBrands),
      child: SizedBox(height: 140, child: ListView.builder(
        scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: promos.length,
        itemBuilder: (_, i) {
          final p = promos[i];
          return GestureDetector(
            // `promos` rows carry a brand *name* only, so there is no id to route
            // with. Sending the name would open an arbitrary brand page; the tile
            // goes to the brand directory instead until the promo feed carries ids.
            onTap: () => Navigator.pushNamed(context, AppRouter.topBrands),
            child: Container(
              width: 260, margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: p['colors'] as List<Color>, begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(p['brand'] as String, style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1)),
                const SizedBox(height: 6),
                Text(p['text'] as String, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900, height: 1.3)),
              ]),
            ),
          );
        },
      )),
    );
  }

  /// Sponsored placements.
  ///
  /// Was `MarketplaceMockData.allProducts.where(discount >= 20)` — a rail
  /// labelled "Sponsored" showing products nobody had paid to place, which is
  /// an advertising claim about a commercial relationship that did not exist.
  /// `MarketplaceHomeData` carries no sponsored feed, so the rail renders
  /// nothing until one exists; relabelling it over a discount filter would keep
  /// the same misrepresentation under a different heading.
  Widget _buildSponsoredProducts() {
    const products = <ProductModel>[];
    // ignore: dead_code
    if (products.isEmpty) return const SizedBox.shrink();
    return _section('⚡ Sponsored Products', 'More', () => Navigator.pushNamed(context, AppRouter.featuredProducts),
      child: SizedBox(height: 280, child: ListView.builder(
        scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: products.length,
        itemBuilder: (_, i) => Container(width: 160, margin: const EdgeInsets.only(right: 12), child: MarketplaceProductCard(product: products[i])),
      )),
    );
  }

  Widget _buildBudgetDeals() {
    // Filtered from the bundled list, and the heading hardcoded a rupee
    // threshold regardless of region. Derived from the real deals instead.
    final products = (_homeData?.dealOfDay ?? const <ProductModel>[])
        .where((p) => p.discount >= 15)
        .take(6)
        .toList();
    if (products.isEmpty) return const SizedBox.shrink();
    return _section('💰 Budget Deals Under ₹10,000', 'View All', () => Navigator.pushNamed(context, AppRouter.deals),
      child: SizedBox(height: 280, child: ListView.builder(
        scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: products.length,
        itemBuilder: (_, i) => Container(width: 160, margin: const EdgeInsets.only(right: 12), child: MarketplaceProductCard(product: products[i])),
      )),
    );
  }

  Widget _buildRecommended() {
    // Use asynchronously loaded/cached recommendation engine results
    final scored = _recommendations.take(6).toList();
    final products = scored.map((s) => s.product).toList();
    if (products.isEmpty) {
      // The recommendation engine returned nothing. It used to fall back to
      // `MarketplaceMockData.homeData.recommended`, i.e. recommend products to
      // a customer it knew nothing about.
      const fallback = <ProductModel>[];
      return _section('🎯 Recommended for You', 'See All', () => Navigator.pushNamed(context, AppRouter.recommendedProducts),
        child: SizedBox(height: 280, child: ListView.builder(
          scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: fallback.length,
          itemBuilder: (_, i) => Container(width: 160, margin: const EdgeInsets.only(right: 12), child: MarketplaceProductCard(product: fallback[i])),
        )),
      );
    }
    return _section('🎯 Recommended for You', 'See All', () => Navigator.pushNamed(context, AppRouter.recommendedProducts),
      child: SizedBox(height: 280, child: ListView.builder(
        scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: products.length,
        itemBuilder: (_, i) {
          return Container(
            width: 160,
            margin: const EdgeInsets.only(right: 12),
            child: Column(
              children: [
                Expanded(child: MarketplaceProductCard(product: products[i])),
                // Show recommendation reason
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    scored[i].reason,
                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: Color(0xFF0284C7)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          );
        },
      )),
    );
  }

  /// Section container with title and elegant modern action button
  Widget _section(String title, String action, VoidCallback onAction, {required Widget child}) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      color: Colors.transparent,
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Row(children: [
            Expanded(child: Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: -0.5, color: AppTheme.textPrimary))),
            GestureDetector(
              onTap: onAction,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.grey.shade200), boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.05), blurRadius: 4, offset: const Offset(0, 2))]),
                child: Text(action, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppTheme.textPrimary)),
              ),
            ),
          ]),
        ),
        child,
      ]),
    );
  }

  static final _priceRegex = RegExp(r'(\d)(?=(\d{3})+$)');
  static String _fmtPrice(double n) => n.toInt().toString().replaceAllMapped(_priceRegex, (m) => '${m[1]},');
  static String _fmtCount(int n) => n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}k' : '$n';

  // ══════════════════════════════════════════════════════════════════════════
  // NEW — 5 Premium Sections for Web Parity
  // ══════════════════════════════════════════════════════════════════════════

  /// Trust Badges — horizontal bar below hero banners
  Widget _buildTrustBadges() {
    final badges = (_homeData?.trustBadges ?? const []);
    if (badges.isEmpty) return const SizedBox.shrink();

    final iconMap = <String, IconData>{
      'Truck': Icons.local_shipping_outlined,
      'ShieldCheck': Icons.verified_user_outlined,
      'RotateCcw': Icons.replay_outlined,
      'Headphones': Icons.headset_mic_outlined,
      'BadgeCheck': Icons.workspace_premium_outlined,
    };

    final colorMap = <String, Color>{
      '#2563EB': const Color(0xFF2563EB),
      '#059669': const Color(0xFF059669),
      '#EA580C': const Color(0xFFEA580C),
      '#7C3AED': const Color(0xFF7C3AED),
      '#E11D48': const Color(0xFFE11D48),
    };

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 2))],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: badges.map((b) {
          final color = colorMap[b.colorHex] ?? const Color(0xFF2563EB);
          final icon = iconMap[b.icon] ?? Icons.star_outline;
          return Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, size: 18, color: color),
                ),
                const SizedBox(height: 6),
                Text(b.title, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppTheme.textPrimary, letterSpacing: -0.2), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(b.subtitle, style: TextStyle(fontSize: 7, color: Colors.grey.shade500, height: 1.3), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  /// Campaign Banners — gradient promotional cards
  Widget _buildCampaignBanners() {
    final banners = (_homeData?.campaignBanners ?? const []);
    if (banners.isEmpty) return const SizedBox.shrink();

    final gradientMap = <String, List<Color>>{
      'from-emerald-600 to-teal-600': [const Color(0xFF059669), const Color(0xFF0D9488)],
      'from-indigo-600 to-purple-600': [AppTheme.marketplaceColor, const Color(0xFF9333EA)],
      'from-orange-500 via-amber-500 to-yellow-400': [const Color(0xFFF97316), const Color(0xFFFBBF24)],
    };

    return Container(
      margin: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text('🎯  Special Campaigns', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: -0.5, color: AppTheme.textPrimary)),
          ),
          SizedBox(
            height: 140,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: banners.length,
              itemBuilder: (ctx, i) {
                final b = banners[i];
                final colors = gradientMap[b.gradient] ?? [AppTheme.marketplaceColor, const Color(0xFF7C3AED)];
                return GestureDetector(
                  onTap: () => Navigator.pushNamed(context, AppRouter.categoryProducts, arguments: {'categoryId': 'c2'}),
                  child: Container(
                    width: 280,
                    margin: const EdgeInsets.symmetric(horizontal: 6),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [BoxShadow(color: colors.first.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))],
                    ),
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
                          child: Text(b.tag, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(b.headline, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.3, height: 1.2)),
                            if (b.subheadline.isNotEmpty)
                              Text(b.subheadline, style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 11, height: 1.4)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(b.cta, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 11, fontWeight: FontWeight.w800)),
                              const SizedBox(width: 4),
                              const Icon(Icons.arrow_forward, size: 12, color: AppTheme.textPrimary),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  /// Country Banners — flag-based horizontal scroll
  Widget _buildCountryBanners() {
    final banners = (_homeData?.countryBanners ?? const []);
    if (banners.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text('🌍  Shop by Country', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: -0.5, color: AppTheme.textPrimary)),
          ),
          SizedBox(
            height: 110,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: banners.length,
              itemBuilder: (ctx, i) {
                final b = banners[i];
                return Container(
                  width: 130,
                  margin: const EdgeInsets.symmetric(horizontal: 5),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2))],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(b.flag, style: const TextStyle(fontSize: 32)),
                      const SizedBox(height: 6),
                      Text(b.country, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppTheme.textPrimary), maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 2),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(b.subtitle, style: TextStyle(fontSize: 8, color: Colors.grey.shade500), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  /// Brand Promo Cards — gradient brand cards for category sections
  Widget _buildBrandPromoCards(String category) {
    final promos = _homeData?.brandPromos[category] ?? const [];
    if (promos.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(top: 4),
      child: SizedBox(
        height: 110,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          itemCount: promos.length,
          itemBuilder: (ctx, i) {
            final bp = promos[i];
            return Container(
              width: 155,
              margin: const EdgeInsets.symmetric(horizontal: 5),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: bp.gradientColors,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: bp.gradientColors.first.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 3))],
              ),
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(bp.name, style: TextStyle(color: bp.textColor, fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: -0.3)),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(bp.tagline, style: TextStyle(color: bp.textColor.withValues(alpha: 0.7), fontSize: 9, fontWeight: FontWeight.w500)),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                        child: Text(bp.discount, style: TextStyle(color: bp.textColor, fontSize: 10, fontWeight: FontWeight.w800)),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  /// FAQ Section — expandable accordion at the bottom
  Widget _buildFAQSection() {
    final faqItems = _homeData?.faq ?? const [];
    if (faqItems.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 4),
            child: Row(
              children: [
                Icon(Icons.help_outline_rounded, size: 22, color: AppTheme.textPrimary),
                SizedBox(width: 8),
                Text('Frequently Asked Questions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.textPrimary, letterSpacing: -0.3)),
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Text('Everything you need to know about shopping on KARTSEEK', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          ),
          ...faqItems.asMap().entries.map((entry) {
            final faq = entry.value;
            final isLast = entry.key == faqItems.length - 1;
            return Theme(
              data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                tilePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 0),
                childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                shape: isLast
                    ? const RoundedRectangleBorder(borderRadius: BorderRadius.only(bottomLeft: Radius.circular(20), bottomRight: Radius.circular(20)))
                    : const RoundedRectangleBorder(),
                title: Text(faq.question, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                iconColor: AppTheme.textSecondary,
                collapsedIconColor: AppTheme.textMuted,
                children: [
                  Text(faq.answer, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.5)),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  /// Premium Marketplace Footer
  Widget _buildMarketplaceFooter() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      decoration: BoxDecoration(
        color: AppTheme.textPrimary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Brand
                RichText(text: const TextSpan(children: [
                  TextSpan(text: 'KARTSEEK', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.3)),
                  TextSpan(text: ' Mall', style: TextStyle(color: Color(0xFF60A5FA), fontSize: 18, fontWeight: FontWeight.w900)),
                ])),
                const SizedBox(height: 8),
                Text('The ultimate marketplace for premium shopping — trusted by millions across 5 countries.',
                    style: TextStyle(color: Colors.grey.shade500, fontSize: 12, height: 1.5)),
                const SizedBox(height: 16),

                // Payment Methods
                const Text('We Accept', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6, runSpacing: 6,
                  children: ['Visa', 'MC', 'Amex', 'UPI', 'PayPal', 'GPay', 'COD'].map((pm) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(6)),
                    child: Text(pm, style: const TextStyle(color: AppTheme.textMuted, fontSize: 9, fontWeight: FontWeight.w800)),
                  )).toList(),
                ),
                const SizedBox(height: 16),

                // Available Countries
                const Text('Available In', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                const Row(
                  children: [
                    Text('🇮🇳 ', style: TextStyle(fontSize: 22)),
                    SizedBox(width: 6),
                    Text('🇶🇦 ', style: TextStyle(fontSize: 22)),
                    SizedBox(width: 6),
                    Text('🇦🇪 ', style: TextStyle(fontSize: 22)),
                    SizedBox(width: 6),
                    Text('🇬🇧 ', style: TextStyle(fontSize: 22)),
                    SizedBox(width: 6),
                    Text('🇺🇸', style: TextStyle(fontSize: 22)),
                  ],
                ),
              ],
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: Text('© 2026 KARTSEEK Technologies Ltd.',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 10), textAlign: TextAlign.center),
          ),
        ],
      ),
    );
  }
}
