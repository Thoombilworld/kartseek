import 'package:flutter/material.dart';

import 'package:shared_mobile/core/utils/responsive.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';
import 'package:kartseek_customer/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_exception.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_error_state.dart';

/// Products in a category.
///
/// The doc comment claimed "wired to BLoC with fallback to mock data"; there
/// was no bloc and no fallback — `_products` was a getter that read
/// `MarketplaceMockData.getProductsByCategory(...)` on every build and, when
/// that came back empty, quietly returned twelve unrelated products so the
/// grid never looked bare. An empty category now reads as empty.
class CategoryProductsScreen extends StatefulWidget {
  final String categoryId;
  final String categoryName;
  final Color accentColor;
  const CategoryProductsScreen({
    super.key,
    required this.categoryId,
    required this.categoryName,
    this.accentColor = AppTheme.marketplaceColor,
  });

  @override
  State<CategoryProductsScreen> createState() => _CategoryProductsScreenState();
}

class _CategoryProductsScreenState extends State<CategoryProductsScreen> {
  final _api = MarketplaceApiService();

  String _sortBy = 'relevance';
  final ScrollController _scrollController = ScrollController();

  List<ProductModel> _products = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _changeSort(String sortBy) {
    if (_sortBy == sortBy) return;
    setState(() => _sortBy = sortBy);
    _load();
  }

  /// Sorting is a query parameter, so changing it refetches rather than
  /// reordering a page of results in memory.
  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final products = await _api.getProducts(
        filter: ProductFilter(
          categoryId: widget.categoryId,
          sortBy: _sortBy == 'relevance' ? null : _sortBy,
        ),
      );
      if (!mounted) return;
      setState(() { _products = products; _loading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _products = const [];
        _error = e is MarketplaceApiException
            ? e.message
            : "We couldn't load ${widget.categoryName}. Please try again.";
      });
    }
  }


  String get _currencySymbol => RegionService.instance.currentCountry.currencySymbol;

  @override
  Widget build(BuildContext context) {
    final products = _products;

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: Text(widget.categoryName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [
          IconButton(icon: const Icon(Icons.search, size: 22), onPressed: () => Navigator.pushNamed(context, AppRouter.search, arguments: 'marketplace')),
          IconButton(icon: const Icon(Icons.filter_list, size: 22), onPressed: () => _showFilters(context)),
        ],
      ),
      body: Column(
        children: [
          // Sort bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                Text(_loading ? 'Loading…' : '${products.length} Products',
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                const Spacer(),
                _sortChip('Relevance', _sortBy == 'relevance', () => _changeSort('relevance')),
                const SizedBox(width: 8),
                _sortChip('Price ↑', _sortBy == 'price_asc', () => _changeSort('price_asc')),
                const SizedBox(width: 8),
                _sortChip('Rating', _sortBy == 'rating', () => _changeSort('rating')),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                : _error != null
                    // A failed load is distinct from an empty category. Showing
                    // "No products found" for both is what let an outage read as
                    // a category nobody stocks.
                    ? MarketplaceErrorState(message: _error!, onRetry: _load)
                    : products.isEmpty
                        ? Center(
                            child: Column(mainAxisSize: MainAxisSize.min, children: [
                              Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey.shade300),
                              const SizedBox(height: 16),
                              Text('No products found', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey.shade500)),
                            ]),
                          )
                        : RefreshIndicator(
                            onRefresh: _load,
                            color: widget.accentColor,
                            child: GridView.builder(
                              controller: _scrollController,
                              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                              padding: const EdgeInsets.all(12),
                              gridDelegate: Responsive.productGridDelegate,
                              itemCount: products.length,
                              itemBuilder: (_, i) => _buildProductCard(context, products[i]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductCard(BuildContext context, ProductModel p) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.productDetail, arguments: p.id),
      child: DecoratedBox(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.borderLight)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 3,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: AppTheme.surfaceWhite,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                  image: p.images.isNotEmpty ? KartseekImage.decoration(url: p.images.first, fit: BoxFit.cover) : null,
                ),
                child: Stack(children: [
                  if (p.discount > 0) Positioned(top: 8, left: 8, child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(color: Colors.red.shade600, borderRadius: BorderRadius.circular(4)),
                    child: Text('${p.discount}% OFF', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                  )),
                  if (!p.inStock) Positioned(top: 8, left: 8, child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(color: Colors.grey.shade700, borderRadius: BorderRadius.circular(4)),
                    child: const Text('OUT OF STOCK', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                  )),
                  Positioned(top: 8, right: 8, child: Container(
                    width: 32, height: 32, decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4)]),
                    child: const Icon(Icons.favorite_border, size: 16, color: AppTheme.textMuted),
                  )),
                ]),
              ),
            ),
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.brand, style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
                    Text(p.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700), maxLines: 2, overflow: TextOverflow.ellipsis),
                    const Spacer(),
                    Row(children: [
                      Container(padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2), decoration: BoxDecoration(color: Colors.green.shade700, borderRadius: BorderRadius.circular(3)),
                        child: Row(children: [Text('${p.rating}', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)), const Icon(Icons.star, color: Colors.white, size: 10)])),
                      const SizedBox(width: 6),
                      Text('(${_fmtCount(p.ratingCount)})', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                    ]),
                    const SizedBox(height: 4),
                    Row(children: [
                      Text('$_currencySymbol ${_fmtPrice(p.price)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                      if (p.mrp > p.price) ...[
                        const SizedBox(width: 6),
                        Text('$_currencySymbol ${_fmtPrice(p.mrp)}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400, decoration: TextDecoration.lineThrough)),
                      ],
                    ]),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sortChip(String label, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? widget.accentColor.withValues(alpha: 0.1) : AppTheme.surfaceMuted,
          borderRadius: BorderRadius.circular(8),
          border: active ? Border.all(color: widget.accentColor) : null,
        ),
        child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: active ? widget.accentColor : AppTheme.textSecondary)),
      ),
    );
  }

  void _showFilters(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Filters', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 20),
          _filterRow('Price Range', '$_currencySymbol 0 - $_currencySymbol 50,000'),
          _filterRow('Brand', 'All Brands'),
          _filterRow('Rating', '4★ & above'),
          _filterRow('Availability', 'In Stock'),
          _filterRow('Discount', 'All'),
          const SizedBox(height: 20),
          Row(children: [
            Expanded(
              child: SizedBox(height: 48, child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Reset', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              )),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: SizedBox(height: 48, child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(backgroundColor: widget.accentColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Apply', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
              )),
            ),
          ]),
          const SizedBox(height: 16),
        ]),
      ),
    );
  }

  Widget _filterRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(children: [
        Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        const Spacer(),
        Text(value, style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
        const SizedBox(width: 8),
        const Icon(Icons.chevron_right, size: 18, color: AppTheme.textMuted),
      ]),
    );
  }

  static final _priceRegex = RegExp(r'(\d)(?=(\d{3})+$)');
  static String _fmtPrice(double n) => n.toInt().toString().replaceAllMapped(_priceRegex, (m) => '${m[1]},');
  static String _fmtCount(int n) => n >= 1000 ? '${(n / 1000).toStringAsFixed(1)}k' : '$n';
}
