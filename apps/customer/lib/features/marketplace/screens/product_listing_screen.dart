import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/utils/responsive.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_customer/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_card.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_filter_bottom_sheet.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_sort_bottom_sheet.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_empty_state.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_error_state.dart';
import 'package:shimmer/shimmer.dart';

/// Product Listing Screen — Generic filterable/sortable product listing.
class ProductListingScreen extends StatefulWidget {
  final String title;
  final String? categoryId;
  final String? subcategoryId;
  final String? brandId;
  final String? sellerId;

  const ProductListingScreen({
    super.key,
    this.title = 'Products',
    this.categoryId,
    this.subcategoryId,
    this.brandId,
    this.sellerId,
  });

  @override
  State<ProductListingScreen> createState() => _ProductListingScreenState();
}

class _ProductListingScreenState extends State<ProductListingScreen> {
  final _api = MarketplaceApiService();

  List<ProductModel> _products = [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _error = false;
  bool _exhausted = false;
  int _page = 0;

  /// Matches `ProductFilter.limit`'s default — the page size the gateway serves.
  static const int _pageSize = 20;

  ProductFilter _filter = const ProductFilter();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _filter = ProductFilter(categoryId: widget.categoryId, subcategoryId: widget.subcategoryId, brandId: widget.brandId, sellerId: widget.sellerId);
    _loadProducts();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  /// Fetch the next page once the grid is within a screen of the end.
  ///
  /// The body of this used to be the comment `// Pagination trigger point` —
  /// the listener was attached and did nothing, so the screen showed whatever
  /// the first response held and no more.
  void _onScroll() {
    if (_loadingMore || _exhausted || _loading || _error) return;
    if (!_scrollController.hasClients) return;
    final trigger = _scrollController.position.maxScrollExtent -
        _scrollController.position.viewportDimension;
    if (_scrollController.position.pixels >= trigger) _loadProducts(append: true);
  }

  /// Load the catalogue for the current filter.
  ///
  /// Was: a 400ms `Future.delayed` to imitate latency, then nine `.where()`
  /// passes and a `sort` over `MarketplaceMockData.allProducts`. Filtering a
  /// bundled list client-side meant the results were fictional *and* capped at
  /// whatever shipped in the binary — a price filter could only ever narrow the
  /// same few dozen products. `ProductFilter` already carried every one of these
  /// fields; the query now goes to the catalogue, which is what can actually
  /// answer it.
  Future<void> _loadProducts({bool append = false}) async {
    if (append) {
      setState(() => _loadingMore = true);
    } else {
      setState(() { _loading = true; _error = false; _page = 0; _exhausted = false; });
    }

    try {
      final batch = await _api.getProducts(
        filter: ProductFilter(
          categoryId: _filter.categoryId,
          subcategoryId: _filter.subcategoryId,
          brandId: _filter.brandId,
          sellerId: _filter.sellerId,
          minPrice: _filter.minPrice,
          maxPrice: _filter.maxPrice,
          minRating: _filter.minRating,
          minDiscount: _filter.minDiscount,
          inStockOnly: _filter.inStockOnly,
          freeDeliveryOnly: _filter.freeDeliveryOnly,
          sortBy: _filter.sortBy,
          page: (append ? _page : 0) + 1,
        ),
      );
      if (!mounted) return;
      setState(() {
        if (append) {
          _products.addAll(batch);
          _page += 1;
        } else {
          _products = batch;
          _page = 1;
        }
        // A short page means there is no next one.
        _exhausted = batch.length < _pageSize;
        _loading = false;
        _loadingMore = false;
        _error = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadingMore = false;
        // A failed *next* page must not discard what is already on screen.
        if (!append) _error = true;
        _exhausted = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: Text(widget.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        actions: [
          IconButton(icon: const Icon(Icons.search, size: 22), onPressed: () => Navigator.pushNamed(context, AppRouter.marketplaceSearch)),
          IconButton(icon: const Icon(Icons.shopping_cart_outlined, size: 22), onPressed: () => Navigator.pushNamed(context, AppRouter.cart)),
        ],
      ),
      body: Column(
        children: [
          // Filter / Sort bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(children: [
              _actionChip(Icons.tune, 'Filter', () => MarketplaceFilterBottomSheet.show(context, current: _filter, onApply: (f) { setState(() => _filter = f); _loadProducts(); })),
              const SizedBox(width: 10),
              _actionChip(Icons.sort, 'Sort', () => MarketplaceSortBottomSheet.show(context, current: _filter.sortBy ?? 'relevance', onSelect: (s) { setState(() => _filter = _filter.copyWith(sortBy: s)); _loadProducts(); })),
              const Spacer(),
              Text('${_products.length} items', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
            ]),
          ),
          const Divider(height: 1),
          // Content
          Expanded(
            child: _loading
              ? _buildShimmer()
              : _error
                ? MarketplaceErrorState(onRetry: _loadProducts)
                : _products.isEmpty
                  ? MarketplaceEmptyState(title: 'No products found', subtitle: 'Try adjusting your filters', icon: Icons.search_off, actionLabel: 'Clear Filters', onAction: () { setState(() => _filter = ProductFilter(categoryId: widget.categoryId)); _loadProducts(); })
                  : RefreshIndicator(
                      onRefresh: _loadProducts,
                      color: AppTheme.marketplaceColor,
                      child: GridView.builder(
                        controller: _scrollController,
                        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                        padding: const EdgeInsets.all(12),
                        gridDelegate: Responsive.productGridDelegate,
                        itemCount: _products.length,
                        itemBuilder: (_, i) => MarketplaceProductCard(product: _products[i]),
                      ),
                    ),
          ),
        ],
      ),
    );
  }

  Widget _actionChip(IconData icon, String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(10)),
        child: Row(children: [
          Icon(icon, size: 16, color: AppTheme.textSecondary),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }

  Widget _buildShimmer() {
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: Responsive.productGridDelegate,
      itemCount: 6,
      itemBuilder: (_, __) => Shimmer.fromColors(
        baseColor: Colors.grey.shade200,
        highlightColor: Colors.grey.shade50,
        child: Container(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14))),
      ),
    );
  }
}
