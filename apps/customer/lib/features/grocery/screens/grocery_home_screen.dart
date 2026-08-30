import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/utils/responsive.dart';
import 'package:flutter/services.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';
import 'package:shared_mobile/core/widgets/camera_capture_screen.dart';
import 'package:shared_mobile/core/widgets/voice_search_sheet.dart';
import 'package:kartseek_customer/features/grocery/blocs/grocery_bloc.dart';
import 'package:kartseek_customer/features/grocery/blocs/grocery_event.dart';
import 'package:kartseek_customer/features/grocery/blocs/grocery_state.dart';

/// Grocery Home — Zepto/Blinkit/BigBasket inspired local store experience.
/// Features: Instant delivery promise, product categories, local store cards,
/// quick-buy items, and express delivery tracking.
class GroceryHomeScreen extends StatefulWidget {
  const GroceryHomeScreen({super.key});
  @override
  State<GroceryHomeScreen> createState() => _GroceryHomeScreenState();
}

class _GroceryHomeScreenState extends State<GroceryHomeScreen> {
  @override
  void initState() {
    super.initState();
    // Trigger global category load if not already cached in bloc state.
    // This fires LoadGroceryHome (stores + categories in parallel) or
    // a standalone LoadGroceryGlobalCategories if only categories are needed.
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final bloc = context.read<GroceryBloc>();
      if (!bloc.state.globalCategoriesLoaded) {
        bloc.add(const LoadGroceryGlobalCategories());
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light
        .copyWith(statusBarColor: Colors.transparent));

    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverAppBar(
            pinned: true,
            floating: true,
            elevation: 0,
            backgroundColor: const Color(0xFF1B5E20),
            surfaceTintColor: Colors.transparent,
            toolbarHeight: 64,
            automaticallyImplyLeading: false,
            titleSpacing: 0,
            title: _buildHeader(context),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(64),
              child: _buildSearchBar(context),
            ),
          ),
          SliverToBoxAdapter(child: _buildDeliveryPromise()),
          SliverToBoxAdapter(child: _buildFlashDealsSection(context)),
          SliverToBoxAdapter(child: _buildQuickCategories(context)),
          SliverToBoxAdapter(child: _buildTrendingStores(context)),
          SliverToBoxAdapter(child: _buildBestSellingStores(context)),
          SliverToBoxAdapter(child: _buildCategoryBestSellers(context)),
          SliverToBoxAdapter(child: _buildNearbyStoresWithin20km(context)),
          SliverToBoxAdapter(child: _buildQuickBuyProducts()),
          SliverToBoxAdapter(child: _buildFreshSection()),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }

  // ── Blinkit-style header with delivery time ──────────────────────────
  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      decoration: const BoxDecoration(
        color: Color(0xFF1B5E20),
      ),
      child: Column(
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child:
                    const Icon(Icons.arrow_back, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Delivery in',
                        style: TextStyle(color: Colors.white60, fontSize: 12)),
                    Row(
                      children: [
                        Text('10 minutes',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.w900)),
                        SizedBox(width: 4),
                        Text('⚡', style: TextStyle(fontSize: 16)),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8)),
                child: Row(
                  children: [
                    const Icon(Icons.location_on,
                        color: Colors.white, size: 14),
                    const SizedBox(width: 4),
                    Text(
                        RegionService.instance.lastDetection?.city ??
                            RegionService.instance.currentCountry.defaultCity,
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                    const Icon(Icons.keyboard_arrow_down,
                        color: Colors.white, size: 16),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return GestureDetector(
      onTap: () =>
          Navigator.pushNamed(context, AppRouter.search, arguments: 'grocery'),
      child: Container(
        color: const Color(0xFF1B5E20),
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Container(
          height: 48,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 10,
                offset: const Offset(0, 4),
              )
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              const Icon(Icons.search_rounded,
                  color: Color(0xFF1B5E20), size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Text('Search "milk, bread, eggs..."',
                    style: TextStyle(
                        color: Colors.grey.shade500,
                        fontSize: 14,
                        fontWeight: FontWeight.w500)),
              ),
              GestureDetector(
                onTap: () => VoiceSearchSheet.show(
                  context: context,
                  accentColor: AppTheme.groceryColor,
                  hintText: 'Try "milk" or "bread and eggs"',
                  onResult: (text) {
                    Navigator.pushNamed(context, AppRouter.search,
                        arguments: <String, String>{'module': 'grocery', 'initialQuery': text});
                  },
                ),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8F9FB),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.mic_none_rounded,
                      color: Color(0xFF1B5E20), size: 18),
                ),
              ),
              const SizedBox(width: 6),
              GestureDetector(
                onTap: () => Navigator.push<String>(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const CameraCaptureScreen(
                        title: 'Scan Barcode',
                        accentColor: AppTheme.groceryColor,
                        filePrefix: 'grocery_scan',
                        overlayHint:
                            'Scan a product barcode to find it instantly',
                      ),
                    )),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8F9FB),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.qr_code_scanner,
                      color: Color(0xFF1B5E20), size: 18),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Delivery promise banner ──────────────────────────────────────────
  Widget _buildDeliveryPromise() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
            colors: [Color(0xFFE8F5E9), Color(0xFFC8E6C9)]),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(10)),
            child:
                const Center(child: Text('🚀', style: TextStyle(fontSize: 22))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                    'Free delivery on orders above ${RegionService.instance.currentCountry.currencySymbol} 199',
                    style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: Color(0xFF1B5E20))),
                const SizedBox(height: 2),
                const Text('From your nearest local stores',
                    style: TextStyle(fontSize: 11, color: Color(0xFF4CAF50))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Quick categories (dynamic, admin-configured via BLoC) ─────────────
  Widget _buildQuickCategories(BuildContext context) {
    return BlocBuilder<GroceryBloc, GroceryState>(
      buildWhen: (prev, curr) =>
          prev.globalCategories != curr.globalCategories ||
          prev.globalCategoriesLoaded != curr.globalCategoriesLoaded,
      builder: (context, state) {
        final cats = state.globalCategories;

        if (!state.globalCategoriesLoaded || cats.isEmpty) {
          // Show a shimmer-style skeleton while loading
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Shop by Category',
                    style:
                        TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: Responsive.categoryGridColumns,
                    childAspectRatio: Responsive.categoryCardAspectRatio,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                  ),
                  itemCount: 12,
                  itemBuilder: (_, __) => Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Shop by Category',
                      style:
                          TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
                  Text(
                    '${cats.length} categories',
                    style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF4CAF50),
                        fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: Responsive.categoryGridColumns,
                  childAspectRatio: Responsive.categoryCardAspectRatio,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                ),
                itemCount: cats.length,
                itemBuilder: (_, i) {
                  final cat = cats[i];
                  final id = cat['id'] as String? ?? '';
                  final name = cat['name'] as String? ?? '';
                  final emoji = cat['emoji'] as String? ?? '🛒';
                  final imageUrl = cat['imageUrl'] as String?;

                  // Deterministic pastel background from the category index
                  final bgColors = [
                    const Color(0xFFFFF8E1),
                    const Color(0xFFFCE4EC),
                    const Color(0xFFE8F5E9),
                    const Color(0xFFFFF3E0),
                    const Color(0xFFFFEBEE),
                    const Color(0xFFE3F2FD),
                    const Color(0xFFF3E5F5),
                    const Color(0xFFE0F7FA),
                    const Color(0xFFE8EAF6),
                    const Color(0xFFFCE4EC),
                    const Color(0xFFE0F2F1),
                    const Color(0xFFEDE7F6),
                  ];
                  final bg = bgColors[i % bgColors.length];

                  return GestureDetector(
                    onTap: () => Navigator.pushNamed(
                      context,
                      AppRouter.groceryCategoryStores,
                      // Pass both id and name so the category stores screen
                      // can load stores filtered by category id
                      arguments: {
                        'categoryId': id,
                        'categoryName': name,
                        'imageUrl': imageUrl
                      },
                    ),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: bg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: bg.withValues(alpha: 0.5)),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (imageUrl != null && imageUrl.isNotEmpty)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: KartseekImage(
                                url: imageUrl,
                                width: 38,
                                height: 38,
                                fit: BoxFit.cover,
                              ),
                            )
                          else
                            Text(emoji, style: const TextStyle(fontSize: 28)),
                          const SizedBox(height: 4),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: Text(
                              name,
                              style: const TextStyle(
                                  fontSize: 9, fontWeight: FontWeight.w700),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // ── Trending Stores ────────────────────────────────
  Widget _buildTrendingStores(BuildContext context) {
    return _buildStoreSection(
        context,
        '🔥 Trending Stores',
        [
          _storeData(
              'FreshMart Supermarket',
              '0.8 km',
              '⭐ 4.8 (2.1k)',
              '10 min',
              true,
              '${RegionService.instance.currentCountry.currencySymbol} 0 delivery',
              'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=400'),
          _storeData(
              'QuickMart Express',
              '0.5 km',
              '⭐ 4.7 (1.8k)',
              '8 min',
              true,
              '${RegionService.instance.currentCountry.currencySymbol} 0 delivery',
              'https://images.unsplash.com/photo-1534723452862-4c874018d66d?q=80&w=400'),
        ],
        isHorizontal: true);
  }

  // ── Best-Selling Stores ────────────────────────────
  Widget _buildBestSellingStores(BuildContext context) {
    return _buildStoreSection(context, '🏆 Best-Selling Stores', [
      _storeData(
          'Naivas Supermarket',
          '1.2 km',
          '⭐ 4.6 (5.4k)',
          '15 min',
          false,
          '${RegionService.instance.currentCountry.currencySymbol} 49 delivery',
          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=400'),
      _storeData(
          'Carrefour Local',
          '2.1 km',
          '⭐ 4.9 (8.9k)',
          '20 min',
          false,
          '${RegionService.instance.currentCountry.currencySymbol} 29 delivery',
          'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?q=80&w=400'),
    ]);
  }

  // ── Category Best-Sellers ──────────────────────────
  Widget _buildCategoryBestSellers(BuildContext context) {
    return _buildStoreSection(
        context,
        '🍞 Best-Selling Bakery Stores',
        [
          _storeData(
              'The Daily Bread',
              '3.4 km',
              '⭐ 4.8 (1.2k)',
              '25 min',
              true,
              '${RegionService.instance.currentCountry.currencySymbol} 0 delivery',
              'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400'),
          _storeData(
              'Bakehouse Delights',
              '5.1 km',
              '⭐ 4.5 (800)',
              '35 min',
              false,
              '${RegionService.instance.currentCountry.currencySymbol} 19 delivery',
              'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?q=80&w=400'),
        ],
        isHorizontal: true);
  }

  // ── Nearby Stores (20km radius) ──────────────────────
  Widget _buildNearbyStoresWithin20km(BuildContext context) {
    return _buildStoreSection(context, '📍 Stores within 20 km radius', [
      _storeData(
          'Green Grocery',
          '12 km',
          '⭐ 4.4 (3.1k)',
          '45 min',
          false,
          '${RegionService.instance.currentCountry.currencySymbol} 59 delivery',
          'https://images.unsplash.com/photo-1610348725531-843dff563e2c?q=80&w=400'),
      _storeData(
          'Wholesale Club',
          '18 km',
          '⭐ 4.7 (12k)',
          '90 min',
          false,
          '${RegionService.instance.currentCountry.currencySymbol} 99 delivery',
          'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?q=80&w=400'),
    ]);
  }

  Map<String, dynamic> _storeData(String name, String distance, String rating,
      String time, bool free, String fee, String img) {
    return {
      'name': name,
      'distance': distance,
      'rating': rating,
      'time': time,
      'freeDelivery': free,
      'deliveryFee': fee,
      'image': img
    };
  }

  Widget _buildStoreSection(
      BuildContext context, String title, List<Map<String, dynamic>> stores,
      {bool isHorizontal = false}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800)),
              const Spacer(),
              const Text('View All',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.groceryColor)),
            ],
          ),
          const SizedBox(height: 12),
          if (isHorizontal)
            SizedBox(
              height: 140,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: stores.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (_, i) => SizedBox(
                  width: Responsive.storeCardWidth,
                  child: _storeCard(
                      context,
                      stores[i]['name'],
                      stores[i]['distance'],
                      stores[i]['rating'],
                      stores[i]['time'],
                      stores[i]['freeDelivery'],
                      stores[i]['deliveryFee'],
                      stores[i]['image']),
                ),
              ),
            )
          else
            ...stores.map((s) => _storeCard(
                context,
                s['name'],
                s['distance'],
                s['rating'],
                s['time'],
                s['freeDelivery'],
                s['deliveryFee'],
                s['image'])),
        ],
      ),
    );
  }

  Widget _storeCard(
      BuildContext context,
      String name,
      String distance,
      String rating,
      String time,
      bool freeDelivery,
      String deliveryFee,
      String imageUrl) {
    return GestureDetector(
      onTap: () =>
          Navigator.pushNamed(context, AppRouter.storeDetail, arguments: name),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE5E7EB)),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4))
          ],
        ),
        child: Row(
          children: [
            KartseekImage(
              url: imageUrl,
              width: 64,
              height: 64,
              fit: BoxFit.cover,
              borderRadius: BorderRadius.circular(12),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 14)),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Text(distance,
                          style: TextStyle(
                              fontSize: 11, color: Colors.grey.shade500)),
                      const Text(' • ',
                          style: TextStyle(
                              fontSize: 11, color: AppTheme.textMuted)),
                      Text(rating, style: const TextStyle(fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(4)),
                        child: Text('🕐 $time',
                            style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1B5E20))),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: freeDelivery
                              ? const Color(0xFFF0FDF4)
                              : const Color(0xFFFFF7ED),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(deliveryFee,
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: freeDelivery
                                    ? Colors.green.shade700
                                    : Colors.orange.shade700)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right,
                color: AppTheme.textMuted, size: 20),
          ],
        ),
      ),
    );
  }

  // ── Quick-Buy Products ───────────────────────────────────────────────
  Widget _buildQuickBuyProducts() {
    final items = [
      _Item(
          'Amul Toned Milk',
          '500ml',
          '${RegionService.instance.currentCountry.currencySymbol} 28',
          '${RegionService.instance.currentCountry.currencySymbol} 32',
          true,
          'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=400&auto=format&fit=crop'),
      _Item(
          'Farm Fresh Eggs',
          'Pack of 6',
          '${RegionService.instance.currentCountry.currencySymbol} 55',
          '${RegionService.instance.currentCountry.currencySymbol} 65',
          true,
          'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?q=80&w=400&auto=format&fit=crop'),
      _Item(
          'Whole Wheat Bread',
          '400g',
          '${RegionService.instance.currentCountry.currencySymbol} 42',
          '${RegionService.instance.currentCountry.currencySymbol} 48',
          false,
          'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400&auto=format&fit=crop'),
      _Item(
          'Organic Bananas',
          '1 dozen',
          '${RegionService.instance.currentCountry.currencySymbol} 40',
          '${RegionService.instance.currentCountry.currencySymbol} 50',
          false,
          'https://images.unsplash.com/photo-1571501679680-de32f1e7aad4?q=80&w=400&auto=format&fit=crop'),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('⚡ Buy Again',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          SizedBox(
            height: 180,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, i) => _quickBuyCard(items[i]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _quickBuyCard(_Item item) {
    return Container(
      width: 130,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: Color(0xFFF9FAFB),
                borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  KartseekImage(
                    url: item.imageUrl,
                    fit: BoxFit.cover,
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(12)),
                  ),
                  if (item.inStock)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                            color: Colors.green.shade600,
                            borderRadius: BorderRadius.circular(4)),
                        child: const Text('IN STOCK',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 7,
                                fontWeight: FontWeight.w800)),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.name,
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w700),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                Text(item.qty,
                    style:
                        TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(item.price,
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w900)),
                    const SizedBox(width: 4),
                    Text(item.mrp,
                        style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey.shade400,
                            decoration: TextDecoration.lineThrough)),
                    const Spacer(),
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                          color: AppTheme.groceryColor,
                          borderRadius: BorderRadius.circular(6)),
                      child:
                          const Icon(Icons.add, color: Colors.white, size: 16),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Fresh Picks ──────────────────────────────────────────────────────
  Widget _buildFreshSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('🥬 Fresh from Farm',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              image: KartseekImage.decoration(
                url:
                    'https://images.unsplash.com/photo-1610348725531-843dff563e2c?q=80&w=800&auto=format&fit=crop',
                fit: BoxFit.cover,
                colorFilter:
                    const ColorFilter.mode(Colors.black45, BlendMode.darken),
                isBanner: true,
              ),
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 4))
              ],
            ),
            child: Row(
              children: [
                const Text('🌿', style: TextStyle(fontSize: 36)),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Organic Vegetables',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 16)),
                      SizedBox(height: 2),
                      Text('Sourced from local farms • Pesticide free',
                          style:
                              TextStyle(color: Colors.white70, fontSize: 11)),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8)),
                  child: const Text('Explore',
                      style: TextStyle(
                          color: Color(0xFF1B5E20),
                          fontWeight: FontWeight.w700,
                          fontSize: 12)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── ⚡ Flash Deals Section ───────────────────────────────────────
  Widget _buildFlashDealsSection(BuildContext context) {
    final flashStores = [
      {
        'name': 'FreshMart Express',
        'emoji': '🏪',
        'deals': 5,
        'maxDiscount': 60
      },
      {'name': 'Green Basket', 'emoji': '🥬', 'deals': 3, 'maxDiscount': 45},
      {'name': 'Daily Needs', 'emoji': '🛒', 'deals': 4, 'maxDiscount': 50},
      {'name': 'Organic Hub', 'emoji': '🌿', 'deals': 2, 'maxDiscount': 40},
    ];

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  Color(0xFFEF4444),
                  Color(0xFFF97316),
                  Color(0xFFF59E0B)
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Text('⚡', style: TextStyle(fontSize: 28)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Flash Deals',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w800)),
                      Text('Ends in 02:45:30',
                          style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 12,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text('See All →',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Store cards
          SizedBox(
            height: 130,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: flashStores.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final store = flashStores[index];
                return GestureDetector(
                  onTap: () {
                    // Navigate to store
                  },
                  child: Container(
                    width: 140,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.red.shade100),
                      boxShadow: [
                        BoxShadow(
                            color: Colors.red.withValues(alpha: 0.08),
                            blurRadius: 8,
                            offset: const Offset(0, 2))
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(store['emoji'] as String,
                            style: const TextStyle(fontSize: 32)),
                        const SizedBox(height: 6),
                        Text(
                          store['name'] as String,
                          style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1E293B)),
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEE2E2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Up to ${store['maxDiscount']}% OFF',
                            style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFDC2626)),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text('${store['deals']} deals',
                            style: TextStyle(
                                fontSize: 10, color: Colors.grey.shade600)),
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
}

class _Item {
  final String name, qty, price, mrp;
  final bool inStock;
  final String imageUrl;
  const _Item(
      this.name, this.qty, this.price, this.mrp, this.inStock, this.imageUrl);
}
