import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/widgets/voice_search_sheet.dart';
import 'package:kartseek_shared_mobile/core/widgets/camera_capture_screen.dart';
import 'package:kartseek_customer/features/home/services/global_search_service.dart';

/// Universal Search Screen — contextual search across all KARTSEEK modules.
/// Supports module-specific search with recent searches and trending items.
///
/// When [module] is 'all', performs global search across Marketplace, Grocery,
/// Restaurant, Doctor, and Pharmacy (excludes Hotel and Taxi).
/// When a specific module is set, restricts search to that module only.
class SearchScreen extends StatefulWidget {
  final String module; // 'all', 'marketplace', 'grocery', 'restaurant', 'doctor', 'pharmacy'
  final String? initialQuery; // Pre-filled query text (e.g., from voice search)
  const SearchScreen({super.key, this.module = 'all', this.initialQuery});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  String _query = '';

  @override
  void initState() {
    super.initState();
    // Pre-fill the search field if an initial query was provided (e.g., voice search)
    if (widget.initialQuery != null && widget.initialQuery!.isNotEmpty) {
      _controller.text = widget.initialQuery!;
      _query = widget.initialQuery!;
    }
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  String get _hint {
    switch (widget.module) {
      case 'marketplace':
        return 'Search products, brands...';
      case 'grocery':
        return 'Search "milk, bread, eggs..."';
      case 'restaurant':
        return 'Search restaurants or dishes...';
      case 'doctor':
        return 'Search doctors, hospitals, specialities...';
      case 'pharmacy':
        return 'Search medicines, health products...';
      default:
        return 'Search anything on KARTSEEK...';
    }
  }

  /// Maps the route-argument module key to the display name used by
  /// [GlobalSearchService] results. Returns null for 'all' (global search).
  Set<String>? get _moduleFilter {
    switch (widget.module) {
      case 'marketplace': return const {'Marketplace'};
      case 'grocery':     return const {'Grocery'};
      case 'restaurant':  return const {'Restaurant'};
      case 'doctor':      return const {'Doctor'};
      case 'pharmacy':    return const {'Pharmacy'};
      default:            return null; // global search
    }
  }

  Color get _accentColor {
    switch (widget.module) {
      case 'marketplace':
        return AppTheme.marketplaceColor;
      case 'grocery':
        return AppTheme.groceryColor;
      case 'restaurant':
        return AppTheme.restaurantColor;
      case 'doctor':
        return AppTheme.doctorColor;
      case 'pharmacy':
        return AppTheme.pharmacyColor;
      default:
        return AppTheme.primaryGreen;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverAppBar(
            pinned: true,
            floating: true,
            elevation: 0,
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.white,
            toolbarHeight: 72,
            automaticallyImplyLeading: false,
            titleSpacing: 0,
            title: Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
              child: Row(
                children: [
                  IconButton(
                      icon: const Icon(Icons.arrow_back,
                          color: Color(0xFF0F172A)),
                      onPressed: () => Navigator.pop(context)),
                  Expanded(
                    child: Container(
                      height: 52,
                      decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withValues(alpha: 0.06),
                                blurRadius: 12,
                                offset: const Offset(0, 4))
                          ],
                          border: Border.all(color: Colors.grey.shade100)),
                      child: TextField(
                        controller: _controller,
                        focusNode: _focusNode,
                        onChanged: (v) => setState(() => _query = v),
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w500),
                        decoration: InputDecoration(
                          hintText: _hint,
                          hintStyle: TextStyle(
                              color: Colors.grey.shade400,
                              fontSize: 14,
                              fontWeight: FontWeight.w500),
                          prefixIcon: Icon(Icons.search_rounded,
                              color: _accentColor, size: 24),
                          suffixIcon: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (_query.isNotEmpty)
                                IconButton(
                                    icon: const Icon(Icons.close_rounded,
                                        size: 20, color: Colors.grey),
                                    onPressed: () {
                                      _controller.clear();
                                      setState(() => _query = '');
                                    }),
                              IconButton(
                                  icon: Icon(Icons.mic_none_rounded,
                                      color: _accentColor, size: 22),
                                  onPressed: () => VoiceSearchSheet.show(
                                    context: context,
                                    accentColor: _accentColor,
                                    hintText: _hint,
                                    onResult: (text) {
                                      setState(() {
                                        _controller.text = text;
                                        _query = text;
                                      });
                                    },
                                  )),
                              IconButton(
                                  icon: Icon(Icons.qr_code_scanner,
                                      color: _accentColor, size: 20),
                                  onPressed: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => CameraCaptureScreen(
                                          title: 'Scan Product',
                                          accentColor: _accentColor,
                                          filePrefix: 'universal_scan',
                                          overlayHint: 'Scan a barcode to find products',
                                        ),
                                      ))),
                            ],
                          ),
                          border: InputBorder.none,
                          contentPadding:
                              const EdgeInsets.symmetric(vertical: 16),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: _query.isEmpty ? _buildSuggestions() : _buildResults(),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestions() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Recent searches
          Row(
            children: [
              const Text('Recent Searches',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const Spacer(),
              GestureDetector(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Search history cleared')),
                    );
                  },
                  child: Text('Clear',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _accentColor))),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              'iPhone 15',
              'Chicken Biryani',
              'Paracetamol',
              'Milk',
              'Cardiologist'
            ]
                .map(
                  (s) => GestureDetector(
                    onTap: () => setState(() {
                      _controller.text = s;
                      _query = s;
                    }),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                          color: const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(20)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.history,
                            size: 14, color: Colors.grey.shade500),
                        const SizedBox(width: 6),
                        Text(s,
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w500)),
                      ]),
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 28),
          // Trending
          const Text('🔥 Trending Now',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          _trendItem(1, 'iPhone 16 Pro Max', '📱', 'Marketplace'),
          _trendItem(2, 'Amul Toned Milk', '🥛', 'Grocery'),
          _trendItem(3, 'Chicken Biryani', '🍗', 'Restaurant'),
          _trendItem(4, 'Dr. Sarah Kamau', '👨‍⚕️', 'Doctor'),
          _trendItem(5, 'Dolo 650mg', '💊', 'Pharmacy'),
          const SizedBox(height: 28),
          // Quick links
          if (widget.module == 'all') ...[
            const Text('Browse by Service',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 14),
            _serviceLink('🛍️', 'Marketplace', AppTheme.marketplaceColor,
                AppRouter.marketplace),
            _serviceLink(
                '🥬', 'Grocery', AppTheme.groceryColor, AppRouter.grocery),
            _serviceLink('🍔', 'Restaurant', AppTheme.restaurantColor,
                AppRouter.restaurant),
            _serviceLink(
                '👨‍⚕️', 'Doctor', AppTheme.doctorColor, AppRouter.doctor),
            _serviceLink(
                '💊', 'Pharmacy', AppTheme.pharmacyColor, AppRouter.pharmacy),
          ],
        ],
      ),
    );
  }

  Widget _buildResults() {
    final results = GlobalSearchService.search(_query, maxPerModule: 5, modules: _moduleFilter);

    if (results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.only(top: 80),
          child: Column(
            children: [
              Icon(Icons.search_off_rounded, size: 64, color: Colors.grey.shade300),
              const SizedBox(height: 16),
              Text('No results for "$_query"',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
              const SizedBox(height: 8),
              Text('Try a different search term',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade400)),
            ],
          ),
        ),
      );
    }

    // Group results by module for visual organization
    final grouped = <String, List<GlobalSearchResult>>{};
    for (final r in results) {
      grouped.putIfAbsent(r.module, () => []).add(r);
    }

    // Module display config
    const moduleColors = <String, Color>{
      'Marketplace': AppTheme.marketplaceColor,
      'Grocery': AppTheme.groceryColor,
      'Restaurant': AppTheme.restaurantColor,
      'Doctor': AppTheme.doctorColor,
      'Pharmacy': AppTheme.pharmacyColor,
      'Hotel': AppTheme.hotelColor,
      'Taxi': AppTheme.taxiColor,
    };

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Result count
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              '${results.length} results across ${grouped.length} modules',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade500, fontWeight: FontWeight.w600),
            ),
          ),

          // Module sections
          ...grouped.entries.map((entry) {
            final moduleName = entry.key;
            final moduleResults = entry.value;
            final color = moduleColors[moduleName] ?? AppTheme.primaryGreen;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Module header
                Padding(
                  padding: const EdgeInsets.only(top: 8, bottom: 10),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: color.withValues(alpha: 0.2)),
                        ),
                        child: Text(moduleName,
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(height: 1, color: Colors.grey.shade200),
                      ),
                      const SizedBox(width: 8),
                      Text('${moduleResults.length}',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade400)),
                    ],
                  ),
                ),
                // Results
                ...moduleResults.map((r) => GestureDetector(
                  onTap: () => Navigator.pushNamed(context, r.route, arguments: r.routeArg),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      children: [
                        Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(child: Text(r.emoji, style: const TextStyle(fontSize: 22))),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(r.title,
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                  maxLines: 1, overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 2),
                              Text(r.subtitle,
                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                  maxLines: 1, overflow: TextOverflow.ellipsis),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right, size: 18, color: Colors.grey.shade400),
                      ],
                    ),
                  ),
                )),
                const SizedBox(height: 4),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _trendItem(int rank, String text, String emoji, String module) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        SizedBox(
            width: 24,
            child: Text('#$rank',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: _accentColor))),
        const SizedBox(width: 8),
        Text(emoji, style: const TextStyle(fontSize: 20)),
        const SizedBox(width: 10),
        Expanded(
            child: Text(text,
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w600))),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
              color: const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(6)),
          child: Text(module,
              style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey.shade500,
                  fontWeight: FontWeight.w600)),
        ),
      ]),
    );
  }

  Widget _serviceLink(String emoji, String label, Color color, String route) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, route),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFF3F4F6)),
            borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10)),
              child: Center(
                  child: Text(emoji, style: const TextStyle(fontSize: 20)))),
          const SizedBox(width: 14),
          Text(label,
              style:
                  const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          const Spacer(),
          const Icon(Icons.chevron_right, size: 18, color: AppTheme.textMuted),
        ]),
      ),
    );
  }
}
