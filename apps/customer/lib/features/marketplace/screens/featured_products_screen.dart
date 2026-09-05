import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

import 'package:kartseek_shared_mobile/core/utils/responsive.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_exception.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_card.dart';
import 'package:kartseek_customer/features/marketplace/widgets/shimmer_product_card.dart';

/// Featured Products Screen — curated, high-rated, staff-picked products.
///
/// Fetches from the live API (`/marketplace/featured`) and falls back to
/// locally-filtered mock data (rating ≥ 4.5) when the backend is unreachable.
class FeaturedProductsScreen extends StatefulWidget {
  const FeaturedProductsScreen({super.key});

  @override
  State<FeaturedProductsScreen> createState() => _FeaturedProductsScreenState();
}

class _FeaturedProductsScreenState extends State<FeaturedProductsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  List<dynamic> _products = [];
  bool _loading = true;
  String? _error;
  String _sortBy = 'rating';

  final _sortOptions = const [
    _SortOption('rating', 'Top Rated', Icons.star_rounded),
    _SortOption('newest', 'Newest', Icons.new_releases_outlined),
    _SortOption('price_asc', 'Price: Low→High', Icons.arrow_upward_rounded),
    _SortOption('price_desc', 'Price: High→Low', Icons.arrow_downward_rounded),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadProducts();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    setState(() { _loading = true; _error = null; });
    try {
      final api = MarketplaceApiService();
      final products = await api.getFeaturedProducts();
      setState(() { _products = products; _loading = false; });
    } catch (e) {
      // Was: fall back to `MarketplaceMockData.allProducts` filtered by rating,
      // *and* set `_error` — so the screen showed an error banner over a grid of
      // fabricated products, which is the most confusing possible pairing.
      if (!mounted) return;
      setState(() {
        _products = const [];
        _loading = false;
        _error = e is MarketplaceApiException
            ? e.message
            : "We couldn't load featured products. Please try again.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      body: NestedScrollView(
        physics: const BouncingScrollPhysics(),
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          _buildSliverAppBar(innerBoxIsScrolled),
        ],
        body: Column(
          children: [
            if (_error != null)
              MaterialBanner(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                content: const Text('Showing cached results — couldn\'t reach server',
                    style: TextStyle(fontSize: 12, color: Colors.white70)),
                backgroundColor: Colors.grey.shade700,
                actions: [
                  TextButton(
                    onPressed: _loadProducts,
                    child: const Text('RETRY', style: TextStyle(color: Colors.white, fontSize: 12)),
                  ),
                ],
              ),
            Expanded(
              child: _loading
                  ? const ShimmerProductGrid(count: 6)
                  : _products.isEmpty
                      ? _buildEmptyState()
                      : _buildProductGrid(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSliverAppBar(bool innerBoxIsScrolled) {
    return SliverAppBar(
      expandedHeight: 200,
      floating: false,
      pinned: true,
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      forceElevated: innerBoxIsScrolled,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
        onPressed: () => Navigator.of(context).pop(),
      ),
      title: innerBoxIsScrolled
          ? const Text('Featured Products', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800))
          : null,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppTheme.marketplaceColor, Color(0xFF9D4EDD), Color(0xFFE040FB)],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 56, 24, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Row(children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('⭐ Curated', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text('${_products.length} Products', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
                  ]),
                  const SizedBox(height: 10),
                  const Text('Featured Products', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                  const SizedBox(height: 4),
                  Text('Hand-picked by our team, loved by millions', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 14)),
                ],
              ),
            ),
          ),
        ),
      ),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(48),
        child: Container(
          color: Colors.white,
          child: _buildSortBar(),
        ),
      ),
    );
  }

  Widget _buildSortBar() {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: _sortOptions.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final opt = _sortOptions[i];
          final selected = _sortBy == opt.key;
          return GestureDetector(
            onTap: () {
              setState(() { _sortBy = opt.key; });
              _sortProducts();
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: selected ? AppTheme.marketplaceColor : AppTheme.surfaceMuted,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(opt.icon, size: 16, color: selected ? Colors.white : Colors.grey.shade600),
                const SizedBox(width: 5),
                Text(opt.label, style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: selected ? Colors.white : Colors.grey.shade700,
                )),
              ]),
            ),
          );
        },
      ),
    );
  }

  void _sortProducts() {
    setState(() {
      switch (_sortBy) {
        case 'rating':
          _products.sort((a, b) => _getRating(b).compareTo(_getRating(a)));
          break;
        case 'newest':
          // Keep original server order for newest
          break;
        case 'price_asc':
          _products.sort((a, b) => _getPrice(a).compareTo(_getPrice(b)));
          break;
        case 'price_desc':
          _products.sort((a, b) => _getPrice(b).compareTo(_getPrice(a)));
          break;
      }
    });
  }

  double _getRating(dynamic p) => (p is Map ? (p['rating'] ?? 0).toDouble() : (p.rating ?? 0).toDouble());
  double _getPrice(dynamic p) => (p is Map ? (p['price'] ?? p['mrp'] ?? 0).toDouble() : (p.price ?? p.mrp ?? 0).toDouble());

  Widget _buildProductGrid() {
    return RefreshIndicator(
      color: AppTheme.marketplaceColor,
      onRefresh: _loadProducts,
      child: GridView.builder(
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        padding: const EdgeInsets.all(12),
        gridDelegate: Responsive.productGridDelegate,
        itemCount: _products.length,
        itemBuilder: (_, i) => MarketplaceProductCard(product: _products[i]),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.stars_rounded, size: 64, color: Colors.grey.shade300),
        const SizedBox(height: 16),
        Text('No Featured Products', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.grey.shade600)),
        const SizedBox(height: 8),
        Text('Check back soon — our team is curating the best picks!', style: TextStyle(fontSize: 14, color: Colors.grey.shade400)),
        const SizedBox(height: 24),
        TextButton.icon(
          onPressed: _loadProducts,
          icon: const Icon(Icons.refresh_rounded, size: 18),
          label: const Text('Refresh'),
          style: TextButton.styleFrom(foregroundColor: AppTheme.marketplaceColor),
        ),
      ]),
    );
  }
}

class _SortOption {
  final String key;
  final String label;
  final IconData icon;
  const _SortOption(this.key, this.label, this.icon);
}
