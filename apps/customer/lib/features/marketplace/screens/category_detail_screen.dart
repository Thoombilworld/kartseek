import 'package:flutter/material.dart';
import 'package:shared_mobile/core/utils/responsive.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_exception.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_error_state.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_card.dart';
import 'package:kartseek_customer/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_filter_bottom_sheet.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_sort_bottom_sheet.dart';
import 'package:shimmer/shimmer.dart';

/// Category Detail Screen — Dedicated Amazon/Flipkart-tier category page.
/// Includes category banner, subcategory grid, round brand icons, promotional
/// cards, best sellers, new arrivals, trending products, filters, sorting,
/// and full product listing.
class CategoryDetailScreen extends StatefulWidget {
  final String categoryId;
  final String categoryName;

  const CategoryDetailScreen({super.key, required this.categoryId, this.categoryName = 'Category'});

  @override
  State<CategoryDetailScreen> createState() => _CategoryDetailScreenState();
}

class _CategoryDetailScreenState extends State<CategoryDetailScreen> {
  final _api = MarketplaceApiService();

  bool _loading = true;
  String? _error;
  ProductFilter _filter = const ProductFilter();
  List<ProductModel> _products = [];

  /// Category, brands and the two curated strips, all fetched.
  ///
  /// `build` used to call five `MarketplaceMockData` helpers directly —
  /// `getCategoryById`, `getBrandsForCategory`, `getBestSellersByCategory`,
  /// `getNewArrivalsByCategory` and `getProductsByCategory` — so a page that
  /// looks like a full merchandised category was five reads of a bundled list.
  CategoryModel? _category;
  List<BrandModel> _brands = const [];
  List<ProductModel> _bestSellers = const [];
  List<ProductModel> _newArrivals = const [];

  late PageController _sliderController;
  int _bannerPage = 0;

  @override
  void initState() {
    super.initState();
    _sliderController = PageController();
    _filter = ProductFilter(categoryId: widget.categoryId);
    _loadData();
    _startAutoSlide();
  }

  @override
  void dispose() {
    _sliderController.dispose();
    super.dispose();
  }

  void _startAutoSlide() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 5));
      if (!mounted) return false;
      final next = (_bannerPage + 1) % 3;
      _sliderController.animateToPage(next, duration: const Duration(milliseconds: 500), curve: Curves.easeOutCubic);
      return true;
    });
  }

  /// Load the category and its product strips.
  ///
  /// Was: a 400ms `Future.delayed` standing in for latency, then six `.where()`
  /// passes and a `sort` over a bundled list. Every filter is a query parameter
  /// the catalogue already understands, so narrowing by price or rating now
  /// searches the whole category rather than whatever shipped in the binary.
  ///
  /// The main grid decides the page's success; the two curated strips are
  /// supporting content, so a failure there leaves them empty rather than
  /// taking the page down with it.
  Future<void> _loadData() async {
    setState(() { _loading = true; _error = null; });

    try {
      final products = await _api.getProducts(
        filter: ProductFilter(
          categoryId: widget.categoryId,
          minPrice: _filter.minPrice,
          maxPrice: _filter.maxPrice,
          minRating: _filter.minRating,
          minDiscount: _filter.minDiscount,
          inStockOnly: _filter.inStockOnly,
          freeDeliveryOnly: _filter.freeDeliveryOnly,
          sortBy: _filter.sortBy,
        ),
      );
      if (!mounted) return;
      setState(() { _products = products; _loading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is MarketplaceApiException
            ? e.message
            : "We couldn't load this category. Please try again.";
      });
      return;
    }

    try {
      final category = await _api.getCategoryById(widget.categoryId);
      if (mounted) setState(() => _category = category);
    } catch (_) {/* the header falls back to the name the route carried */}

    try {
      final brands = await _api.getTopBrands();
      if (mounted) setState(() => _brands = brands.take(10).toList());
    } catch (_) {/* the brand strip is optional */}

    // Best sellers and new arrivals are the same catalogue under a different
    // sort, which is why they need no endpoints of their own.
    try {
      final best = await _api.getProducts(
        filter: ProductFilter(categoryId: widget.categoryId, sortBy: 'rating', limit: 6),
      );
      if (mounted) setState(() => _bestSellers = best.take(6).toList());
    } catch (_) {/* strip stays empty */}

    try {
      final fresh = await _api.getProducts(
        filter: ProductFilter(categoryId: widget.categoryId, sortBy: 'newest', limit: 6),
      );
      if (mounted) setState(() => _newArrivals = fresh.take(6).toList());
    } catch (_) {/* strip stays empty */}
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        backgroundColor: AppTheme.surfaceMuted,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          title: Text(_category?.name ?? widget.categoryName,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        ),
        body: MarketplaceErrorState(message: _error!, onRetry: _loadData),
      );
    }

    final subcategories = _category?.subcategories ?? const [];
    final brands = _brands;
    final bestSellers = _bestSellers;
    final newArrivals = _newArrivals;

    final bannerGradients = _getCategoryGradients(widget.categoryId);

    return Scaffold(
      backgroundColor: AppTheme.surfaceMuted,
      body: RefreshIndicator(
        onRefresh: () async { await _loadData(); },
        color: AppTheme.marketplaceColor,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          slivers: [
            // ── App Bar with Banner ──
            SliverAppBar(
              expandedHeight: 180, pinned: true,
              backgroundColor: bannerGradients[0],
              flexibleSpace: FlexibleSpaceBar(
                title: Text((_category?.name ?? widget.categoryName), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    PageView.builder(
                      controller: _sliderController,
                      onPageChanged: (p) => setState(() => _bannerPage = p),
                      itemCount: 3,
                      itemBuilder: (_, index) => Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [bannerGradients[index % bannerGradients.length], bannerGradients[(index + 1) % bannerGradients.length]], begin: Alignment.topLeft, end: Alignment.bottomRight),
                        ),
                        padding: const EdgeInsets.fromLTRB(24, 60, 24, 40),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.end, children: [
                          Text(_getCategoryBannerTexts(widget.categoryId)[index], style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900, height: 1.2)),
                        ]),
                      ),
                    ),
                    Positioned(
                      bottom: 50, right: 16,
                      child: Row(children: List.generate(3, (i) => AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        width: _bannerPage == i ? 16 : 6, height: 6, margin: const EdgeInsets.only(left: 4),
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: _bannerPage == i ? 1.0 : 0.4), borderRadius: BorderRadius.circular(3)),
                      ))),
                    ),
                  ],
                ),
              ),
              actions: [
                IconButton(icon: const Icon(Icons.search, color: Colors.white), onPressed: () => Navigator.pushNamed(context, AppRouter.marketplaceSearch)),
                IconButton(icon: const Icon(Icons.shopping_cart_outlined, color: Colors.white), onPressed: () => Navigator.pushNamed(context, AppRouter.cart)),
              ],
            ),

            // ── Subcategory Grid ──
            if (subcategories.isNotEmpty) SliverToBoxAdapter(child: _buildSubcategoryGrid(subcategories)),

            // ── Round Brand Icons ──
            if (brands.isNotEmpty) SliverToBoxAdapter(child: _buildBrandIcons(brands)),

            // ── Promotional Cards ──
            SliverToBoxAdapter(child: _buildPromotionalCards()),

            // ── Best Sellers ──
            if (bestSellers.isNotEmpty) SliverToBoxAdapter(child: _buildHorizontalSection('🏆 Best Sellers', bestSellers)),

            // ── New Arrivals ──
            if (newArrivals.isNotEmpty) SliverToBoxAdapter(child: _buildHorizontalSection('✨ New Arrivals', newArrivals)),

            // ── Trending Products ──
            if (_products.length > 2) SliverToBoxAdapter(child: _buildHorizontalSection('🔥 Trending in ${(_category?.name ?? widget.categoryName)}', _products.take(6).toList())),

            // ── Filter/Sort bar ──
            SliverToBoxAdapter(child: _buildFilterSortBar()),

            // ── All Products Grid ──
            _loading
              ? SliverPadding(
                  padding: const EdgeInsets.all(12),
                  sliver: SliverGrid(
                    gridDelegate: Responsive.productGridDelegate,
                    delegate: SliverChildBuilderDelegate((_, __) => Shimmer.fromColors(baseColor: Colors.grey.shade200, highlightColor: Colors.grey.shade50, child: Container(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)))), childCount: 6),
                  ),
                )
              : _products.isEmpty
                ? const SliverFillRemaining(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.search_off, size: 64, color: Colors.grey), SizedBox(height: 12), Text('No products match your filters', style: TextStyle(fontSize: 16, color: Colors.grey))])))
                : SliverPadding(
                    padding: const EdgeInsets.all(12),
                    sliver: SliverGrid(
                      gridDelegate: Responsive.productGridDelegate,
                      delegate: SliverChildBuilderDelegate((_, i) => MarketplaceProductCard(product: _products[i]), childCount: _products.length),
                    ),
                  ),

            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
    );
  }

  // ── Subcategory Grid ──
  Widget _buildSubcategoryGrid(List<SubcategoryModel> subcategories) {
    return Container(
      color: Colors.white, padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Shop by Subcategory', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppTheme.textPrimary)),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: subcategories.map((sc) =>
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.subcategoryDetail, arguments: {'id': sc.id, 'name': sc.name}),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(color: AppTheme.marketplaceColor.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(10), border: Border.all(color: AppTheme.marketplaceColor.withValues(alpha: 0.15))),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(sc.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.marketplaceColor)),
                const SizedBox(width: 4),
                Text('(${sc.productCount})', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ]),
            ),
          ),
        ).toList()),
      ]),
    );
  }

  // ── Round Brand Icons ──
  Widget _buildBrandIcons(List<BrandModel> brands) {
    return Container(
      color: Colors.white,
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: Text('Shop by Brand', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppTheme.textPrimary))),
        const SizedBox(height: 12),
        SizedBox(
          height: 90,
          child: ListView.builder(
            scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: brands.length,
            itemBuilder: (_, i) {
              final b = brands[i];
              return GestureDetector(
                onTap: () => Navigator.pushNamed(context, AppRouter.brandDetail,
                    arguments: {'brandId': b.id, 'brandName': b.name}),
                child: Container(
                  width: 78, margin: const EdgeInsets.only(right: 12),
                  child: Column(children: [
                    Container(
                      width: 56, height: 56,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                        border: Border.all(color: AppTheme.marketplaceColor.withValues(alpha: 0.2), width: 2),
                        boxShadow: [BoxShadow(color: Colors.grey.withValues(alpha: 0.1), blurRadius: 8, offset: const Offset(0, 2))],
                      ),
                      child: Center(child: Text(b.name[0], style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: AppTheme.marketplaceColor.withValues(alpha: 0.8)))),
                    ),
                    const SizedBox(height: 8),
                    Text(b.name, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF475569)), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                  ]),
                ),
              );
            },
          ),
        ),
      ]),
    );
  }

  // ── Promotional Cards ──
  Widget _buildPromotionalCards() {
    final promos = _getCategoryPromos(widget.categoryId);
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: SizedBox(
        height: 110,
        child: ListView.builder(
          scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: promos.length,
          itemBuilder: (_, i) {
            final p = promos[i];
            return GestureDetector(
              onTap: () => Navigator.pushNamed(context, AppRouter.deals),
              child: Container(
                width: 220, margin: const EdgeInsets.only(right: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: p['colors'] as List<Color>, begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(p['title'] as String, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 4),
                  Text(p['subtitle'] as String, style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12, fontWeight: FontWeight.w500)),
                ]),
              ),
            );
          },
        ),
      ),
    );
  }

  // ── Horizontal Product Section ──
  Widget _buildHorizontalSection(String title, List<ProductModel> products) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Row(children: [
            Expanded(child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.textPrimary))),
            GestureDetector(
              onTap: () => Navigator.pushNamed(context, AppRouter.productListing, arguments: {'categoryId': widget.categoryId}),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(color: AppTheme.surfaceMuted, borderRadius: BorderRadius.circular(16)),
                child: const Text('View All', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              ),
            ),
          ]),
        ),
        SizedBox(height: 280, child: ListView.builder(
          scrollDirection: Axis.horizontal, physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: products.length,
          itemBuilder: (_, i) => Container(width: 160, margin: const EdgeInsets.only(right: 12), child: MarketplaceProductCard(product: products[i])),
        )),
      ]),
    );
  }

  // ── Filter/Sort Bar ──
  Widget _buildFilterSortBar() {
    return Container(
      color: Colors.white, margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: AppTheme.marketplaceColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
          child: Text('${_products.length} products', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.marketplaceColor)),
        ),
        const Spacer(),
        GestureDetector(
          onTap: () => MarketplaceFilterBottomSheet.show(context, current: _filter, onApply: (f) { setState(() => _filter = f); _loadData(); }),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(color: AppTheme.surfaceMuted, borderRadius: BorderRadius.circular(8)),
            child: Row(children: [Icon(Icons.tune, size: 16, color: Colors.grey.shade700), const SizedBox(width: 6), Text('Filter', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade700))]),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: () => MarketplaceSortBottomSheet.show(context, current: _filter.sortBy ?? 'relevance', onSelect: (s) { setState(() => _filter = _filter.copyWith(sortBy: s)); _loadData(); }),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(color: AppTheme.surfaceMuted, borderRadius: BorderRadius.circular(8)),
            child: Row(children: [Icon(Icons.sort, size: 16, color: Colors.grey.shade700), const SizedBox(width: 6), Text('Sort', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade700))]),
          ),
        ),
      ]),
    );
  }

  // ── Category-specific gradients ──
  List<Color> _getCategoryGradients(String catId) {
    switch (catId) {
      case 'c1': return [AppTheme.textPrimary, const Color(0xFF1E40AF), AppTheme.marketplaceColor]; // Mobiles
      case 'c2': return [const Color(0xFF1E3A5F), const Color(0xFF2563EB), const Color(0xFF60A5FA)]; // Electronics
      case 'c4': return [const Color(0xFFDB2777), const Color(0xFFF472B6), const Color(0xFFFDA4AF)]; // Fashion
      case 'c9': return [const Color(0xFFBE185D), const Color(0xFFEC4899), const Color(0xFFF9A8D4)]; // Beauty
      case 'c13': return [const Color(0xFFEA580C), AppTheme.warningAmber, const Color(0xFFFBBF24)]; // Kids
      case 'c20': return [AppTheme.textPrimary, AppTheme.textSecondary, AppTheme.textSecondary]; // Watches
      case 'c12': return [const Color(0xFF059669), AppTheme.successGreen, const Color(0xFF6EE7B7)]; // Appliances
      case 'c8': return [const Color(0xFF7C3AED), const Color(0xFFA855F7), const Color(0xFFC4B5FD)]; // Footwear
      case 'c11': return [const Color(0xFF92400E), const Color(0xFFD97706), const Color(0xFFFBBF24)]; // Furniture
      case 'c14': return [const Color(0xFF065F46), AppTheme.successGreen, const Color(0xFF34D399)]; // Sports
      case 'c15': return [const Color(0xFF312E81), AppTheme.marketplaceColor, const Color(0xFF818CF8)]; // Books
      case 'c19': return [const Color(0xFF7C2D12), const Color(0xFFEA580C), const Color(0xFFFB923C)]; // Bags
      case 'c3': return [AppTheme.textPrimary, const Color(0xFF475569), AppTheme.textMuted]; // Computers
      case 'c10': return [const Color(0xFF166534), AppTheme.successGreen, const Color(0xFF86EFAC)]; // Home & Kitchen
      default: return [AppTheme.textPrimary, AppTheme.textSecondary, AppTheme.textSecondary];
    }
  }

  List<String> _getCategoryBannerTexts(String catId) {
    switch (catId) {
      case 'c1': return ['Top Smartphones\nUp to 30% Off', 'New Launches\nPre-order Now', 'Budget Phones\nStarting ₹7,999'];
      case 'c4': return ['Summer Collection\nBuy 2 Get 1 Free', 'Designer Wear\n50% Off', 'Trending Styles\nNew In'];
      case 'c20': return ['Luxury Watches\nPremium Collection', 'Smart Watches\nFlat 25% Off', 'Casio Collection\nStarting ₹2,999'];
      case 'c9': return ['Beauty Fest\nUp to 60% Off', 'New Launches\nFlat 30% Off', 'Skincare Essentials\nBuy 2 Get 1'];
      case 'c13': return ['Kids Special\nUp to 40% Off', 'Toy Bonanza\nBuy 3 Pay 2', 'Back to School\nEssentials Sale'];
      default: return ['Big Sale\nUp to 50% Off', 'New Collection\nJust Arrived', 'Best Deals\nLimited Time'];
    }
  }

  List<Map<String, Object>> _getCategoryPromos(String catId) {
    switch (catId) {
      case 'c1': return [
        {'title': 'iPhone Deals', 'subtitle': 'Up to ₹15,000 off + exchange', 'colors': <Color>[AppTheme.textPrimary, AppTheme.textSecondary]},
        {'title': 'Samsung Fest', 'subtitle': 'Galaxy S24 flat ₹10K off', 'colors': <Color>[const Color(0xFF1E40AF), AppTheme.marketplaceColor]},
        {'title': 'Budget Picks', 'subtitle': 'Under ₹15,000 smartphones', 'colors': <Color>[const Color(0xFF059669), AppTheme.successGreen]},
      ];
      case 'c4': return [
        {'title': 'Fashion Fest', 'subtitle': 'Min 40% off on top brands', 'colors': <Color>[const Color(0xFFDB2777), const Color(0xFFF472B6)]},
        {'title': 'Sneaker Drop', 'subtitle': 'Nike, Adidas & more', 'colors': <Color>[const Color(0xFF7C3AED), const Color(0xFFA855F7)]},
        {'title': 'Ethnic Wear', 'subtitle': 'Starting at ₹999', 'colors': <Color>[const Color(0xFFEA580C), AppTheme.warningAmber]},
      ];
      default: return [
        {'title': 'Top Deals', 'subtitle': 'Up to 50% off', 'colors': <Color>[const Color(0xFF7C3AED), const Color(0xFFA855F7)]},
        {'title': 'New Arrivals', 'subtitle': 'Fresh collection', 'colors': <Color>[const Color(0xFF059669), AppTheme.successGreen]},
        {'title': 'Clearance', 'subtitle': 'Last few left', 'colors': <Color>[AppTheme.errorRed, const Color(0xFFF97316)]},
      ];
    }
  }
}
