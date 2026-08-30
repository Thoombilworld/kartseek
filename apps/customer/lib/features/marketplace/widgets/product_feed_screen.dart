import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/utils/responsive.dart';
import 'package:shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_exception.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_empty_state.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_error_state.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_card.dart';
import 'package:kartseek_customer/features/marketplace/widgets/shimmer_product_card.dart';

/// The one product-listing screen.
///
/// Thirteen catalogue screens — deals, flash deals, categories, brands, sellers,
/// search, recently viewed — each read `MarketplaceMockData` synchronously in a
/// `StatelessWidget` build method. None of them called an API, so none of them
/// had a loading state, an error state, an empty state, pull-to-refresh or
/// pagination, and none of them could have: there was nothing to wait for.
///
/// Rather than write those four states thirteen times, they live here once and
/// each screen supplies a [loader]. That mirrors `catalog-feed-page.tsx` on the
/// web, and it means the grid density, the card frame and the retry affordance
/// are defined in a single place instead of drifting per screen.
///
/// ── Pagination ──────────────────────────────────────────────────────────────
/// [loader] receives a zero-based page. A loader that ignores it and returns the
/// whole set is fine — the feed stops asking once a page comes back short, so a
/// non-paginating endpoint simply loads once. Endpoints that do paginate get
/// infinite scroll for free.
class ProductFeedScreen extends StatefulWidget {
  const ProductFeedScreen({
    super.key,
    required this.title,
    required this.loader,
    this.header,
    this.emptyTitle = 'Nothing here yet',
    this.emptySubtitle = 'Check back soon — new products arrive every day.',
    this.emptyIcon = Icons.inventory_2_outlined,
    this.actions,
    this.pageSize = 20,
    this.subjectForErrors,
  });

  final String title;

  /// Fetches one page. Throws [MarketplaceApiException] on failure.
  final Future<List<ProductModel>> Function(int page) loader;

  /// Optional content above the grid — a banner, a countdown, a filter row.
  /// Rebuilt with the loaded products so it can show counts that are real.
  final Widget Function(BuildContext context, List<ProductModel> products)? header;

  final String emptyTitle;
  final String emptySubtitle;
  final IconData emptyIcon;
  final List<Widget>? actions;
  final int pageSize;

  /// Names the thing being loaded in a fallback error message.
  final String? subjectForErrors;

  @override
  State<ProductFeedScreen> createState() => _ProductFeedScreenState();
}

class _ProductFeedScreenState extends State<ProductFeedScreen> {
  final _scroll = ScrollController();
  final List<ProductModel> _products = [];

  bool _loading = true;
  bool _loadingMore = false;
  bool _exhausted = false;
  String? _error;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _load(reset: true);
  }

  @override
  void dispose() {
    _scroll.removeListener(_onScroll);
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_loading || _loadingMore || _exhausted || _error != null) return;
    if (!_scroll.hasClients) return;
    // Start the next page a screen early so the grid does not visibly stall.
    final trigger = _scroll.position.maxScrollExtent - _scroll.position.viewportDimension;
    if (_scroll.position.pixels >= trigger) _load();
  }

  Future<void> _load({bool reset = false}) async {
    if (reset) {
      setState(() {
        _loading = true;
        _error = null;
        _exhausted = false;
        _page = 0;
      });
    } else {
      setState(() => _loadingMore = true);
    }

    try {
      final batch = await widget.loader(reset ? 0 : _page);
      if (!mounted) return;
      setState(() {
        if (reset) _products.clear();
        _products.addAll(batch);
        _page = reset ? 1 : _page + 1;
        // A short page means the endpoint has nothing more; a loader that
        // ignores `page` returns the same set forever, so this is also what
        // stops it looping.
        _exhausted = batch.length < widget.pageSize;
        _loading = false;
        _loadingMore = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      final message = e is MarketplaceApiException
          ? e.message
          : 'Something went wrong loading ${widget.subjectForErrors ?? 'this'}. Please try again.';
      setState(() {
        _loading = false;
        _loadingMore = false;
        // A failed *next* page must not wipe the products already on screen.
        if (reset || _products.isEmpty) _error = message;
        _exhausted = true;
      });
      if (!reset && _products.isNotEmpty && mounted) {
        ScaffoldMessenger.of(context)
          ..clearSnackBars()
          ..showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: Text(widget.title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        actions: widget.actions,
      ),
      body: RefreshIndicator(
        onRefresh: () => _load(reset: true),
        child: _body(),
      ),
    );
  }

  Widget _body() {
    if (_error != null) {
      // Scrollable so pull-to-refresh still works from the error state.
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.18),
          MarketplaceErrorState(message: _error!, onRetry: () => _load(reset: true)),
        ],
      );
    }

    if (!_loading && _products.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.14),
          MarketplaceEmptyState(
            title: widget.emptyTitle,
            subtitle: widget.emptySubtitle,
            icon: widget.emptyIcon,
          ),
        ],
      );
    }

    return CustomScrollView(
      controller: _scroll,
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      slivers: [
        if (widget.header != null)
          SliverToBoxAdapter(child: widget.header!(context, List.unmodifiable(_products))),
        SliverPadding(
          padding: const EdgeInsets.all(12),
          sliver: SliverGrid(
            gridDelegate: Responsive.productGridDelegate,
            delegate: _loading
                ? SliverChildBuilderDelegate(
                    (_, __) => const ShimmerProductCard(),
                    childCount: 6,
                  )
                : SliverChildBuilderDelegate(
                    (_, i) => MarketplaceProductCard(product: _products[i]),
                    childCount: _products.length,
                  ),
          ),
        ),
        if (_loadingMore)
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            ),
          ),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
      ],
    );
  }
}
