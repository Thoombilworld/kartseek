import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_mobile/core/utils/responsive.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_exception.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_error_state.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:kartseek_customer/features/marketplace/widgets/product_card.dart';
import 'package:shared_mobile/core/services/user_behavior_service.dart';
import 'package:shared_mobile/core/widgets/voice_search_sheet.dart';
import 'package:shared_mobile/core/widgets/camera_capture_screen.dart';

/// Marketplace Search — debounced search with recent/popular suggestions.
class MarketplaceSearchScreen extends StatefulWidget {
  final String? initialQuery;
  const MarketplaceSearchScreen({super.key, this.initialQuery});
  @override
  State<MarketplaceSearchScreen> createState() => _MarketplaceSearchScreenState();
}

class _MarketplaceSearchScreenState extends State<MarketplaceSearchScreen> {
  static const _recentSearchesKey = 'marketplace_recent_searches';

  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final _api = MarketplaceApiService();

  String _query = '';
  bool _searching = false;
  Timer? _searchDebounce;
  String? _searchError;

  List<ProductModel> _results = const [];
  List<CategoryModel> _allCategories = const [];
  List<BrandModel> _allBrands = const [];

  /// The customer's own history, persisted. Was a hardcoded list — everyone
  /// opened the screen having apparently searched for "iPhone 15", "Nike
  /// shoes", "MacBook Air" and "Sony headphones", and "Clear" wiped four
  /// strings that came back on the next launch.
  List<String> _recentSearches = const [];

  @override
  void initState() {
    super.initState();
    _loadRecentSearches();
    _loadSuggestionSources();
    if (widget.initialQuery != null && widget.initialQuery!.isNotEmpty) {
      _controller.text = widget.initialQuery!;
      _query = widget.initialQuery!;
      _runSearch(_query);
    } else {
      _focusNode.requestFocus();
    }
  }

  Future<void> _loadRecentSearches() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() => _recentSearches = prefs.getStringList(_recentSearchesKey) ?? const []);
  }

  Future<void> _rememberSearch(String q) async {
    final term = q.trim();
    if (term.length < 2) return;
    final next = [term, ..._recentSearches.where((s) => s.toLowerCase() != term.toLowerCase())]
        .take(8)
        .toList();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_recentSearchesKey, next);
    if (!mounted) return;
    setState(() => _recentSearches = next);
  }

  Future<void> _clearRecentSearches() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_recentSearchesKey);
    if (!mounted) return;
    setState(() => _recentSearches = const []);
  }

  /// Categories and brands, used to offer non-product matches alongside
  /// results. Loaded once; a failure just means those two strips stay empty.
  Future<void> _loadSuggestionSources() async {
    try {
      final categories = await _api.getCategories();
      if (mounted) setState(() => _allCategories = categories);
    } catch (_) {/* suggestions are optional */}
    try {
      final brands = await _api.getTopBrands();
      if (mounted) setState(() => _allBrands = brands);
    } catch (_) {/* suggestions are optional */}
  }

  /// Run the query against the catalogue.
  ///
  /// `MarketplaceMockData.searchProducts(_query)` ran inside `build`, so the
  /// results were a substring match over a bundled list — a search could only
  /// ever find products that shipped in the binary, and the debounce timer
  /// guarded nothing because there was no request to debounce.
  Future<void> _runSearch(String q) async {
    final term = q.trim();
    if (term.isEmpty) {
      setState(() {
        _results = const [];
        _searching = false;
        _searchError = null;
      });
      return;
    }

    setState(() {
      _searching = true;
      _searchError = null;
    });
    try {
      final results = await _api.searchMarketplace(term);
      if (!mounted || term != _query.trim()) return; // a newer query won
      setState(() {
        _results = results;
        _searching = false;
      });
      unawaited(_rememberSearch(term));
    } catch (e) {
      if (!mounted || term != _query.trim()) return;
      setState(() {
        _searching = false;
        _results = const [];
        _searchError = e is MarketplaceApiException
            ? e.message
            : "We couldn't run that search. Please try again.";
      });
    }
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onSearch(String q) {
    _searchDebounce?.cancel();
    setState(() { _query = q; _searching = q.isNotEmpty; });
    _searchDebounce = Timer(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      if (q.trim().length >= 2) {
        UserBehaviorService.instance.trackSearch(q, module: 'marketplace');
      }
      _runSearch(q);
    });
  }

  @override
  Widget build(BuildContext context) {
    final q = _query.toLowerCase();
    final categories =
        _allCategories.where((c) => c.name.toLowerCase().contains(q)).take(3).toList();
    final brands = _allBrands.where((b) => b.name.toLowerCase().contains(q)).take(3).toList();

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: TextField(
          controller: _controller, focusNode: _focusNode,
          onChanged: _onSearch,
          decoration: InputDecoration(
            hintText: 'Search products, brands, categories...',
            border: InputBorder.none, filled: false,
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 16),
            contentPadding: EdgeInsets.zero,
          ),
          style: const TextStyle(fontSize: 16),
        ),
        actions: [
          if (_query.isNotEmpty)
            IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () { _controller.clear(); setState(() => _query = ''); }),
          IconButton(
            icon: const Icon(Icons.mic_none_rounded, size: 22),
            onPressed: () => VoiceSearchSheet.show(
              context: context,
              accentColor: AppTheme.marketplaceColor,
              hintText: 'Try "iPhone 15" or "Nike shoes"',
              onResult: (text) {
                _controller.text = text;
                _onSearch(text);
                setState(() {});
              },
            ),
          ),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, size: 20),
            onPressed: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => const CameraCaptureScreen(
                title: 'Scan Product',
                accentColor: AppTheme.marketplaceColor,
                filePrefix: 'marketplace_scan',
                overlayHint: 'Scan a product barcode to find it',
              ),
            )),
          ),
        ],
      ),
      body: _query.isEmpty ? _buildSuggestions() : _buildResults(_results, categories, brands),
    );
  }

  Widget _buildSuggestions() {
    return ListView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(16), children: [
      // Recent Searches
      if (_recentSearches.isNotEmpty) ...[
        Row(children: [
          const Text('Recent Searches', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const Spacer(),
          GestureDetector(onTap: _clearRecentSearches, child: Text('Clear', style: TextStyle(fontSize: 13, color: Colors.red.shade600, fontWeight: FontWeight.w600))),
        ]),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: _recentSearches.map((s) =>
          GestureDetector(
            onTap: () { _controller.text = s; _onSearch(s); },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey.shade200)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.history, size: 16, color: Colors.grey.shade400), const SizedBox(width: 6), Text(s, style: const TextStyle(fontSize: 13))]),
            ),
          ),
        ).toList()),
        const SizedBox(height: 24),
      ],
      // Was "Popular Searches" over `MarketplaceMockData.popularSearches` — a
      // fixed list presented as what other shoppers were looking for. There is
      // no popular-terms endpoint, so rather than keep the fiction under a
      // truthful-sounding heading, these are the real categories, labelled as
      // categories.
      if (_allCategories.isNotEmpty) ...[
        const Text('Browse Categories', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: _allCategories.take(10).map((c) =>
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.categoryDetail,
                arguments: {'id': c.id, 'name': c.name}),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(color: AppTheme.marketplaceColor.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(10)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(c.iconEmoji ?? '\u{1F4E6}', style: const TextStyle(fontSize: 14)),
                const SizedBox(width: 6),
                Text(c.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
              ]),
            ),
          ),
        ).toList()),
      ],
    ]);
  }

  Widget _buildResults(List results, List categories, List brands) {
    if (_searching) return const Center(child: CircularProgressIndicator(color: AppTheme.marketplaceColor));
    if (_searchError != null) {
      return MarketplaceErrorState(
        message: _searchError!,
        onRetry: () => _runSearch(_query),
      );
    }
    return CustomScrollView(physics: const BouncingScrollPhysics(), slivers: [
      // Category suggestions
      if (categories.isNotEmpty) SliverToBoxAdapter(
        child: Container(color: Colors.white, padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Categories', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade500)),
          const SizedBox(height: 8),
          ...categories.map((c) => ListTile(
            contentPadding: EdgeInsets.zero, dense: true,
            leading: Text(c.iconEmoji ?? '📦', style: const TextStyle(fontSize: 20)),
            title: Text(c.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            trailing: const Icon(Icons.chevron_right, size: 18),
            onTap: () => Navigator.pushNamed(context, AppRouter.categoryDetail, arguments: {'id': c.id, 'name': c.name}),
          )),
        ])),
      ),
      // Brand suggestions
      if (brands.isNotEmpty) SliverToBoxAdapter(
        child: Container(color: Colors.white, margin: const EdgeInsets.only(top: 8), padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Brands', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade500)),
          const SizedBox(height: 8),
          ...brands.map((b) => ListTile(
            contentPadding: EdgeInsets.zero, dense: true,
            leading: const Icon(Icons.verified, size: 18, color: AppTheme.marketplaceColor),
            title: Text(b.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            trailing: const Icon(Icons.chevron_right, size: 18),
            onTap: () => Navigator.pushNamed(context, AppRouter.brandDetail,
                arguments: {'brandId': b.id, 'brandName': b.name}),
          )),
        ])),
      ),
      // Product results
      if (results.isNotEmpty) ...[
        SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text('${results.length} products found', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade600)))),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 80),
          sliver: SliverGrid(
            gridDelegate: Responsive.productGridDelegate,
            delegate: SliverChildBuilderDelegate((_, i) => MarketplaceProductCard(product: results[i]), childCount: results.length),
          ),
        ),
      ] else SliverFillRemaining(child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.search_off, size: 64, color: Colors.grey.shade300),
        const SizedBox(height: 16),
        Text('No results for "$_query"', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Text('Try searching with different keywords', style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
      ]))),
    ]);
  }
}
