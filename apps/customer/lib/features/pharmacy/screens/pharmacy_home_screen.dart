import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';
import 'package:kartseek_customer/features/pharmacy/widgets/pharmacy_store_card.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_mock_data.dart';
import 'package:shared_mobile/core/widgets/voice_search_sheet.dart';

/// Pharmacy Home — Category-first, store-focused, premium redesign.
class PharmacyHomeScreen extends StatefulWidget {
  const PharmacyHomeScreen({super.key});

  @override
  State<PharmacyHomeScreen> createState() => _PharmacyHomeScreenState();
}

class _PharmacyHomeScreenState extends State<PharmacyHomeScreen> {
  @override
  void initState() {
    super.initState();
    context.read<PharmacyBloc>().add(const LoadPharmacyHome());
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent));

    return Scaffold(
      backgroundColor: Colors.white,
      body: BlocBuilder<PharmacyBloc, PharmacyState>(
        builder: (context, state) {
          if (state.status == PharmacyStatus.loading &&
              state.typedHomeData == null) {
            return const Center(
              child: CircularProgressIndicator(color: AppTheme.pharmacyColor),
            );
          }

          final home = state.typedHomeData ?? PharmacyMockData.homeData;

          return CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // ── Header ──
              SliverAppBar(
                pinned: true,
                floating: true,
                elevation: 0,
                backgroundColor: Colors.white,
                surfaceTintColor: Colors.white,
                toolbarHeight: 70,
                automaticallyImplyLeading: false,
                titleSpacing: 0,
                title: _buildHeader(context),
                bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(68),
                  child: _buildSearchBar(context),
                ),
              ),

              // ── 1. Shop by Category (TOP) ──
              const SliverToBoxAdapter(child: SizedBox(height: 20)),
              SliverToBoxAdapter(
                  child: _buildShopByCategory(context, state, home.categories)),

              // ── 2. Category-filtered stores (inline below categories) ──
              if (state.selectedCategoryId != null)
                SliverToBoxAdapter(child: _buildCategoryStores(context, state)),

              // ── 3. Quick actions (Reorder, Offers) ──
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
              SliverToBoxAdapter(child: _buildQuickActions(context)),

              // ── 4. Nearby Pharmacies ──
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
              SliverToBoxAdapter(
                  child: _buildStoreSection(context, 'Nearby Pharmacies',
                      home.nearbyStores, home.categories)),

              // ── 5. Featured Pharmacies ──
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
              SliverToBoxAdapter(
                  child: _buildStoreSection(context, 'Featured Pharmacies',
                      home.featuredStores, home.categories)),

              // ── 6. Top Rated Pharmacies ──
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
              SliverToBoxAdapter(
                  child: _buildStoreSection(context, 'Top Rated',
                      home.topRatedStores, home.categories)),

              // ── 7. Fast Delivery Pharmacies ──
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
              SliverToBoxAdapter(
                  child: _buildStoreSection(
                      context,
                      'Fast Delivery',
                      home.fastDeliveryStores.take(6).toList(),
                      home.categories)),

              // ── 8. Promo Banners ──
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
              SliverToBoxAdapter(child: _buildPromoBanners(home.banners)),

              // ── 9. Popular Products ──
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
              SliverToBoxAdapter(
                  child: _buildPopularProducts(context, home.popularProducts)),

              // ── Footer spacing ──
              const SliverToBoxAdapter(child: SizedBox(height: 80)),
            ],
          );
        },
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                  color: Colors.grey.shade50, shape: BoxShape.circle),
              child: const Icon(Icons.arrow_back_ios_new,
                  color: Colors.black87, size: 18),
            ),
          ),
          const SizedBox(width: 16),
          const Text('KARTSEEK',
              style: TextStyle(
                  fontWeight: FontWeight.w900,
                  color: Colors.black87,
                  fontSize: 20,
                  letterSpacing: -0.5)),
          const Text(' Rx',
              style: TextStyle(
                  fontWeight: FontWeight.w400,
                  color: AppTheme.pharmacyColor,
                  fontSize: 20)),
          const Spacer(),
          Stack(
            clipBehavior: Clip.none,
            children: [
              GestureDetector(
                onTap: () =>
                    Navigator.pushNamed(context, AppRouter.pharmacyCart),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                      color: Colors.grey.shade50, shape: BoxShape.circle),
                  child: const Icon(Icons.shopping_bag_outlined,
                      color: Colors.black87, size: 20),
                ),
              ),
              Positioned(
                right: -2,
                top: -2,
                child: BlocBuilder<PharmacyBloc, PharmacyState>(
                  builder: (context, state) {
                    if (state.cartItems.isEmpty) return const SizedBox.shrink();
                    return Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                          color: AppTheme.pharmacyColor,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2)),
                      child: Center(
                          child: Text('${state.cartItems.length}',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 8,
                                  fontWeight: FontWeight.w800))),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH BAR
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildSearchBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
      child: GestureDetector(
        onTap: () => Navigator.pushNamed(context, AppRouter.search,
            arguments: 'pharmacy'),
        child: Container(
          height: 52,
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              const Icon(Icons.search_rounded,
                  color: AppTheme.pharmacyColor, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Text('Search medicines, vitamins...',
                    style: TextStyle(
                        color: Colors.grey.shade500,
                        fontSize: 15,
                        fontWeight: FontWeight.w500)),
              ),
              GestureDetector(
                onTap: () => VoiceSearchSheet.show(
                  context: context,
                  accentColor: AppTheme.pharmacyColor,
                  hintText: 'Try "paracetamol" or "vitamin C"',
                  onResult: (text) {
                    Navigator.pushNamed(context, AppRouter.search,
                        arguments: <String, String>{'module': 'pharmacy', 'initialQuery': text});
                  },
                ),
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 4,
                          offset: const Offset(0, 2))
                    ],
                  ),
                  child: const Icon(Icons.mic_none_rounded,
                      color: Colors.black87, size: 18),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOP BY CATEGORY (with inline selection)
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildShopByCategory(BuildContext context, PharmacyState state,
      List<PharmacyCategory> categories) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Shop by Category',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                      color: Colors.black87)),
              if (state.selectedCategoryId != null)
                GestureDetector(
                  onTap: () => context
                      .read<PharmacyBloc>()
                      .add(const ClearCategoryFilter()),
                  child: const Text('Clear',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.pharmacyColor)),
                )
              else
                const Text('See All',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.pharmacyColor)),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 100,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (_, i) {
                final cat = categories[i];
                final isSelected = state.selectedCategoryId == cat.id;
                return GestureDetector(
                  onTap: () => context
                      .read<PharmacyBloc>()
                      .add(SelectPharmacyCategory(cat.id)),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeOut,
                    child: Column(
                      children: [
                        Container(
                          height: 64,
                          width: 64,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppTheme.pharmacyColor.withValues(alpha: 0.12)
                                : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected
                                  ? AppTheme.pharmacyColor
                                  : const Color(0xFFF1F5F9),
                              width: isSelected ? 2 : 1,
                            ),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: AppTheme.pharmacyColor
                                          .withValues(alpha: 0.15),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Center(
                              child: Text(cat.emoji,
                                  style: const TextStyle(fontSize: 28))),
                        ),
                        const SizedBox(height: 8),
                        Text(cat.name,
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: isSelected
                                    ? FontWeight.w800
                                    : FontWeight.w600,
                                color: isSelected
                                    ? AppTheme.pharmacyColor
                                    : Colors.black87),
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
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

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY-FILTERED STORES (shown below categories when selected)
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildCategoryStores(BuildContext context, PharmacyState state) {
    final categories = state.categories.isNotEmpty
        ? state.categories
        : PharmacyMockData.categories;
    final catName = categories
        .firstWhere((c) => c.id == state.selectedCategoryId,
            orElse: () => categories.first)
        .name;

    return AnimatedSize(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      child: Padding(
        padding: const EdgeInsets.only(top: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Text('$catName Pharmacies',
                      style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                          color: Colors.black87)),
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.pharmacyColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('${state.filteredStores.length}',
                        style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.pharmacyColor)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (state.categoryStatus == PharmacyStatus.loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(
                    child: CircularProgressIndicator(
                        color: AppTheme.pharmacyColor)),
              )
            else if (state.filteredStores.isEmpty)
              Padding(
                padding:
                    const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.storefront_outlined,
                          size: 48, color: Colors.grey.shade300),
                      const SizedBox(height: 12),
                      Text('No pharmacies in $catName yet',
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Colors.grey.shade400)),
                      const SizedBox(height: 4),
                      Text('Try another category',
                          style: TextStyle(
                              fontSize: 12, color: Colors.grey.shade400)),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: state.filteredStores.length,
                separatorBuilder: (_, __) => const SizedBox(height: 16),
                itemBuilder: (_, i) {
                  final store = state.filteredStores[i];
                  return PharmacyStoreCard(
                    store: store,
                    allCategories: categories,
                    isVertical: true,
                    onTap: () => Navigator.pushNamed(
                        context, AppRouter.pharmacyStoreDetail,
                        arguments: store.name),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUICK ACTIONS (Reorder + Offers — slim row)
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildQuickActions(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Expanded(
            child: _quickAction(context, Icons.replay_rounded, 'Reorder',
                Colors.blue.shade600, AppRouter.orders),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _quickAction(context, Icons.local_offer_rounded, 'Offers',
                Colors.orange.shade600, AppRouter.couponsOffers),
          ),
        ],
      ),
    );
  }

  Widget _quickAction(BuildContext context, IconData icon, String label,
      Color color, String route) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, route),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.15)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 8),
            Text(label,
                style: TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w800, color: color)),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE SECTIONS (Nearby, Featured, Top Rated, Fast Delivery)
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildStoreSection(BuildContext context, String title,
      List<PharmacyStore> stores, List<PharmacyCategory> categories) {
    if (stores.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                      color: Colors.black87)),
              Icon(Icons.arrow_forward_ios_rounded,
                  size: 14, color: Colors.grey.shade400),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 310,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: stores.length > 6 ? 6 : stores.length,
            separatorBuilder: (_, __) => const SizedBox(width: 16),
            itemBuilder: (_, i) => PharmacyStoreCard(
              store: stores[i],
              allCategories: categories,
              onTap: () => Navigator.pushNamed(
                  context, AppRouter.pharmacyStoreDetail,
                  arguments: stores[i].name),
            ),
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMO BANNERS
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildPromoBanners(List<PharmacyBanner> banners) {
    return SizedBox(
      height: 160,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: banners.length,
        separatorBuilder: (_, __) => const SizedBox(width: 16),
        itemBuilder: (_, i) {
          final b = banners[i];
          return Container(
            width: 300,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                  colors: b.gradientColors,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                    color: b.gradientColors[1].withValues(alpha: 0.3),
                    blurRadius: 16,
                    offset: const Offset(0, 8))
              ],
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(b.title,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 22,
                        letterSpacing: -0.5)),
                const SizedBox(height: 4),
                Text(b.subtitle,
                    style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 13,
                        fontWeight: FontWeight.w500)),
                const Spacer(),
                if (b.code != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8)),
                    child: Text(b.code!,
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1)),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POPULAR PRODUCTS
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildPopularProducts(
      BuildContext context, List<PharmacyProduct> products) {
    if (products.isEmpty) return const SizedBox.shrink();

    final cs = RegionService.instance.currentCountry.currencySymbol;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Popular Products',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                      color: Colors.black87)),
              Icon(Icons.arrow_forward_ios_rounded,
                  size: 14, color: Colors.grey.shade400),
            ],
          ),
          const SizedBox(height: 16),
          ...products.take(8).map((med) => _medTile(context, med, cs)),
        ],
      ),
    );
  }

  Widget _medTile(BuildContext context, PharmacyProduct med, String cs) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.medicineDetail,
          arguments: med.name),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4))
          ],
          border: Border.all(color: const Color(0xFFF8FAFC)),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.medication_liquid_rounded,
                  color: Colors.black26, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                          child: Text(med.name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14,
                                  color: Colors.black87),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis)),
                      if (med.needsRx) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(6)),
                          child: Text('Rx',
                              style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.red.shade600)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('${med.brand} • ${med.pack}',
                      style: const TextStyle(
                          fontSize: 12,
                          color: Colors.black54,
                          fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text('$cs ${med.price.toInt()}',
                          style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 16,
                              color: Colors.black87)),
                      const SizedBox(width: 6),
                      Text('$cs ${med.mrp.toInt()}',
                          style: const TextStyle(
                              fontSize: 12,
                              color: Colors.black26,
                              decoration: TextDecoration.lineThrough,
                              fontWeight: FontWeight.w600)),
                      if (med.discount > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text('${med.discount}% OFF',
                              style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.green.shade700)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'View',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Colors.black54),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
