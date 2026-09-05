import 'dart:ui' show ImageFilter;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/utils/responsive.dart';
import 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';
import 'package:kartseek_shared_mobile/core/blocs/region_bloc.dart';
import 'package:kartseek_shared_mobile/core/blocs/region_state.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_shared_mobile/core/widgets/voice_search_sheet.dart';
import 'package:kartseek_customer/features/home/widgets/offline_banner.dart';

/// KARTSEEK Super App — Modern Central Dashboard
/// Refactored with premium iOS design aesthetics, frosted glass header,
/// interactive service cards, and robust overflow protection.
class SuperAppHome extends StatelessWidget {
  const SuperAppHome({super.key});

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final pad = Responsive.hPad;

    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent));

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFE8F4EC), // Soft mint green tint at the top
              Color(0xFFEDF2F7), // Transition shade
              Color(0xFFF6F8FB), // Off-white/light gray body color
            ],
            stops: [0.0, 0.2, 0.45],
          ),
        ),
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            SliverAppBar(
              pinned: true,
              floating: true,
              elevation: 0,
              backgroundColor: Colors.transparent,
              surfaceTintColor: Colors.transparent,
              toolbarHeight: 74,
              title: _buildHeader(context, pad),
              titleSpacing: 0,
              flexibleSpace: ClipRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                  child: Container(
                    color: const Color(0xFFF6F8FB).withValues(alpha: 0.82),
                  ),
                ),
              ),
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(64),
                child: _buildSearchBar(context, pad),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 12)),
            SliverToBoxAdapter(child: RepaintBoundary(child: _buildModuleGrid(context, pad))),
            SliverToBoxAdapter(child: RepaintBoundary(child: _buildActiveOrder(pad))),
            SliverToBoxAdapter(child: RepaintBoundary(child: _buildQuickActions(context, pad))),
            SliverToBoxAdapter(child: RepaintBoundary(child: _buildPromos(pad))),
            SliverToBoxAdapter(child: RepaintBoundary(child: _buildPharmacySection(context, pad))),
            SliverToBoxAdapter(child: RepaintBoundary(child: _buildDoctorSection(context, pad))),
            SliverToBoxAdapter(child: RepaintBoundary(child: _buildMarketplaceShowcase(context, pad))),
            SliverToBoxAdapter(child: RepaintBoundary(child: _buildNearYou(pad))),
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  // ── Header ───────────────────────────────────────────────────────────────
  Widget _buildHeader(BuildContext context, double pad) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: pad),
      child: Row(
        children: [
          // Left Logo
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF16A34A), Color(0xFF0F766E)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF16A34A).withValues(alpha: 0.35),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                )
              ],
            ),
            child: const Center(
              child: Text(
                'K',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  fontFamily: AppTheme.fontFamily,
                ),
              ),
            ),
          ),
          const SizedBox(width: 6),
          // Online/Offline status dot (Amazon/Flipkart-style)
          const ConnectivityDot(size: 9),
          const SizedBox(width: 10),
          // Center Location Capsule
          Expanded(
            child: BlocBuilder<RegionBloc, RegionState>(
              builder: (context, regionState) {
                String locationText = 'Detecting...';
                String regionBadge = '🌍';

                if (regionState is RegionDetected) {
                  final country = regionState.country;
                  locationText = '${country.defaultCity}, ${country.name}';
                  regionBadge = country.flag;
                } else if (regionState is RegionDetecting) {
                  locationText = 'Detecting location...';
                }

                return GestureDetector(
                  onTap: () {
                    // Triggers location selection or settings
                    Navigator.pushNamed(context, AppRouter.settings);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.55),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(regionBadge, style: const TextStyle(fontSize: 14)),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            locationText,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0F172A),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.keyboard_arrow_down_rounded,
                          size: 16,
                          color: Color(0xFF64748B),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(width: 10),
          // Right Action Buttons
          _headerIcon(Icons.notifications_outlined, () {
            Navigator.pushNamed(context, AppRouter.notifications);
          }, hasNotification: true),
          const SizedBox(width: 8),
          _headerIcon(Icons.person_outline_rounded, () {
            Navigator.pushNamed(context, AppRouter.profile);
          }),
        ],
      ),
    );
  }

  Widget _headerIcon(IconData icon, VoidCallback onTap, {bool hasNotification = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                )
              ],
            ),
            child: Icon(icon, color: const Color(0xFF0F172A), size: 20),
          ),
          if (hasNotification)
            Positioned(
              right: 1,
              top: 1,
              child: Container(
                width: 9,
                height: 9,
                decoration: const BoxDecoration(
                  color: Color(0xFFEF4444),
                  shape: BoxShape.circle,
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ── Search Bar ───────────────────────────────────────────────────────────
  Widget _buildSearchBar(BuildContext context, double pad) {
    return Padding(
      padding: EdgeInsets.fromLTRB(pad, 4, pad, 10),
      child: GestureDetector(
        onTap: () => Navigator.pushNamed(context, AppRouter.search),
        child: Container(
          height: 48,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              const Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 20),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Search for services, stores, medicines...',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () => VoiceSearchSheet.show(
                  context: context,
                  accentColor: AppTheme.primaryGreen,
                  hintText: 'Search anything on KARTSEEK...',
                  onResult: (text) {
                    Navigator.pushNamed(context, AppRouter.search, arguments: text);
                  },
                ),
                child: Icon(Icons.mic_none_rounded, color: Colors.grey.shade400, size: 20),
              ),
              const SizedBox(width: 8),
              Icon(Icons.camera_alt_outlined, color: Colors.grey.shade400, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  // ── 6 Module Grid ────────────────────────────────────────────────────────
  Widget _buildModuleGrid(BuildContext context, double pad) {
    const modules = [
      _M('Marketplace', '🛍️', AppTheme.marketplaceColor, AppRouter.marketplace, 'Shop anything'),
      _M('Grocery', '🥬', AppTheme.groceryColor, AppRouter.grocery, '10 min delivery'),
      _M('Restaurant', '🍔', AppTheme.restaurantColor, AppRouter.restaurant, 'Dine & deliver'),
      _M('Doctor', '👨‍⚕️', AppTheme.doctorColor, AppRouter.doctor, 'Book appointments'),
      _M('Pharmacy', '💊', AppTheme.pharmacyColor, AppRouter.pharmacy, 'Meds in 30 min'),
      _M('Hotels', '🏨', AppTheme.hotelColor, AppRouter.hotelBooking, 'Book your stay'),
      _M('Taxi', '🚕', AppTheme.taxiColor, AppRouter.taxi, 'Ride anywhere'),
    ];

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: pad),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Services',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 12),
          LayoutBuilder(builder: (_, constraints) {
            final cols = Responsive.moduleGridColumns;
            final iconSize = Responsive.value<double>(phone: 44, smallPhone: 38, foldable: 50, tablet: 54);
            final labelSize = Responsive.value<double>(phone: 14, smallPhone: 13, foldable: 15, tablet: 16);
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: cols,
                childAspectRatio: Responsive.moduleCardAspectRatio,
                crossAxisSpacing: Responsive.isLargeScreen ? 14 : 12,
                mainAxisSpacing: Responsive.isLargeScreen ? 14 : 12,
              ),
              itemCount: modules.length,
              itemBuilder: (ctx, i) {
                final m = modules[i];
                return GestureDetector(
                  onTap: () => Navigator.pushNamed(context, m.route),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          m.color.withValues(alpha: 0.08),
                          m.color.withValues(alpha: 0.15),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: m.color.withValues(alpha: 0.12), width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: m.color.withValues(alpha: 0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        Positioned(
                          right: -10,
                          bottom: -10,
                          child: Opacity(
                            opacity: 0.12,
                            child: Text(m.emoji, style: TextStyle(fontSize: Responsive.sp(64))),
                          ),
                        ),
                        Padding(
                          padding: EdgeInsets.all(Responsive.isLargeScreen ? 14 : 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                width: iconSize,
                                height: iconSize,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: m.color.withValues(alpha: 0.15), width: 1),
                                  boxShadow: [
                                    BoxShadow(
                                      color: m.color.withValues(alpha: 0.1),
                                      blurRadius: 6,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Center(
                                  child: Text(
                                    m.emoji,
                                    style: TextStyle(fontSize: Responsive.sp(22)),
                                  ),
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    m.label,
                                    style: TextStyle(
                                      fontSize: labelSize,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF0F172A),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    m.sub,
                                    style: TextStyle(
                                      fontSize: Responsive.sp(11),
                                      color: const Color(0xFF64748B),
                                      fontWeight: FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          }),
        ],
      ),
    );
  }

  // ── Active Order Banner ──────────────────────────────────────────────────
  Widget _buildActiveOrder(double pad) {
    return Padding(
      padding: EdgeInsets.fromLTRB(pad, 20, pad, 0),
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF10B981), Color(0xFF059669)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF10B981).withValues(alpha: 0.25),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Text('🛵', style: TextStyle(fontSize: 22)),
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Active Order',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Grocery order is on the way!',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Arriving in ~8 minutes',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Text(
                'Track',
                style: TextStyle(
                  color: Color(0xFF059669),
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Quick Actions ────────────────────────────────────────────────────────
  Widget _buildQuickActions(BuildContext context, double pad) {
    const actions = [
      _Q('Offers', Icons.local_offer_outlined, AppTheme.accentOrange),
      _Q('Wallet', Icons.account_balance_wallet_outlined, AppTheme.accentBlue),
      _Q('Orders', Icons.receipt_long_outlined, AppTheme.primaryGreen),
      _Q('Help', Icons.help_outline, AppTheme.doctorColor),
    ];

    return Padding(
      padding: EdgeInsets.fromLTRB(pad, 24, pad, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: actions.map((a) => GestureDetector(
            onTap: () {
              if (a.label == 'Orders') Navigator.pushNamed(context, AppRouter.orders);
              if (a.label == 'Wallet') Navigator.pushNamed(context, AppRouter.wallet);
              if (a.label == 'Offers') Navigator.pushNamed(context, AppRouter.couponsOffers);
              if (a.label == 'Help') Navigator.pushNamed(context, AppRouter.support);
            },
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: a.color.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: a.color.withValues(alpha: 0.15), width: 1),
                  ),
                  child: Icon(a.icon, color: a.color, size: 24),
                ),
                const SizedBox(height: 8),
                Text(
                  a.label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          )).toList(),
        ),
      ),
    );
  }

  // ── Promotions ───────────────────────────────────────────────────────────
  Widget _buildPromos(double pad) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(pad, 28, pad, 14),
          child: const Text(
            'Deals & Offers',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
        ),
        SizedBox(
          height: 160,
          child: ListView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: EdgeInsets.symmetric(horizontal: pad - 4),
            children: [
              _promo('🔥 Flash Sale', 'Up to 60% off electronics', const [Color(0xFF1E40AF), Color(0xFF3B82F6)]),
              _promo('🥬 Grocery Fest', 'Flat ${RegionService.instance.currentCountry.currencySymbol} 100 off on ${RegionService.instance.currentCountry.currencySymbol} 499+', const [Color(0xFF15803D), Color(0xFF22C55E)]),
              _promo('🍔 Food Fiesta', 'Buy 1 Get 1 on meals', const [Color(0xFFC2410C), Color(0xFFF97316)]),
            ],
          ),
        ),
      ],
    );
  }

  Widget _promo(String title, String sub, List<Color> colors) {
    return Container(
      width: Responsive.promoBannerWidth,
      margin: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: colors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: colors[0].withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: EdgeInsets.all(Responsive.isLargeScreen ? 22 : 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: Responsive.sp(18),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'LIMITED',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 9),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Expanded(
            child: Text(
              sub,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.85),
                fontSize: Responsive.sp(13),
                fontWeight: FontWeight.w500,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.bottomLeft,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                'Claim Offer',
                style: TextStyle(
                  color: colors[0],
                  fontWeight: FontWeight.w800,
                  fontSize: Responsive.sp(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Marketplace Showcase ─────────────────────────────────────────────────
  Widget _buildMarketplaceShowcase(BuildContext context, double pad) {
    return Padding(
      padding: EdgeInsets.fromLTRB(pad, 28, pad, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Trending Products',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              GestureDetector(
                onTap: () => Navigator.pushNamed(context, AppRouter.marketplace),
                child: const Text(
                  'See All',
                  style: TextStyle(
                    color: AppTheme.primaryGreen,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Was four hardcoded cards — an iPhone at ₹1,34,900, a MacBook, a
          // pair of Nikes — with the region's currency symbol pasted in front
          // of rupee amounts, and each one navigating by product *name* to a
          // detail page that looked the name up in a mock table. Nothing on the
          // app's home screen was a real product.
          const _TrendingProductsRail(),
        ],
      ),
    );
  }

  static Widget _productCard(BuildContext context, String name, String price, String imageUrl, {String? productId}) {
    return GestureDetector(
      onTap: productId == null
          ? null
          : () => Navigator.pushNamed(context, AppRouter.productDetail, arguments: productId),
      child: Container(
        width: Responsive.horizontalCardWidth,
        margin: const EdgeInsets.only(right: 14, bottom: 6, top: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: KartseekImage(
                  url: imageUrl,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.all(Responsive.isLargeScreen ? 12 : 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: Responsive.sp(13),
                      color: const Color(0xFF0F172A),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    price,
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: Responsive.sp(14),
                      color: AppTheme.primaryGreen,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Doctor Appointment Section ──────────────────────────────────────────
  Widget _buildDoctorSection(BuildContext context, double pad) {
    return Padding(
      padding: EdgeInsets.fromLTRB(pad, 28, pad, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '👨‍⚕️ Doctor',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              GestureDetector(
                onTap: () => Navigator.pushNamed(context, AppRouter.doctor),
                child: const Text(
                  'See All',
                  style: TextStyle(
                    color: AppTheme.doctorColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Doctor Consultation Banner
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.doctor),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF7C3AED), Color(0xFF8B5CF6)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF7C3AED).withValues(alpha: 0.25),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Book Appointment',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 20,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Consult top doctors near you instantly',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Find Doctors →',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Text('🩺', style: TextStyle(fontSize: 56)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          // Speciality Quick Chips
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              children: [
                _specialityChip('🫀', 'Cardiology'),
                _specialityChip('🧠', 'Neurology'),
                _specialityChip('🦷', 'Dentist'),
                _specialityChip('👁️', 'Eye Care'),
                _specialityChip('🦴', 'Orthopedic'),
                _specialityChip('👶', 'Pediatrics'),
              ],
            ),
          ),
          const SizedBox(height: 14),
          // Top Doctors Horizontal List
          SizedBox(
            height: 198,
            child: ListView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              children: [
                _doctorCard(context, 'Dr. Priya Sharma', 'Cardiologist', '⭐ 4.9', '12 yrs exp', 'Available Today'),
                _doctorCard(context, 'Dr. Arun Mehta', 'Dermatologist', '⭐ 4.8', '8 yrs exp', 'Available Today'),
                _doctorCard(context, 'Dr. Sneha Rajan', 'Pediatrician', '⭐ 4.7', '15 yrs exp', 'Tomorrow 10 AM'),
                _doctorCard(context, 'Dr. Rajesh Kumar', 'Orthopedic', '⭐ 4.9', '20 yrs exp', 'Available Today'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _specialityChip(String emoji, String label) {
    return Container(
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.doctorColor.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.doctorColor.withValues(alpha: 0.15), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 14)),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: Responsive.sp(12),
              fontWeight: FontWeight.w700,
              color: const Color(0xFF5B21B6),
            ),
          ),
        ],
      ),
    );
  }

  Widget _doctorCard(BuildContext context, String name, String speciality, String rating, String experience, String availability) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.doctorBooking, arguments: name),
      child: Container(
        width: 200,
        margin: const EdgeInsets.only(right: 12, bottom: 6, top: 4),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.doctorColor.withValues(alpha: 0.15),
                        AppTheme.doctorColor.withValues(alpha: 0.08),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.doctorColor.withValues(alpha: 0.1), width: 1),
                  ),
                  child: const Icon(Icons.person_rounded, color: AppTheme.doctorColor, size: 20),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFDCFCE7), width: 0.5),
                  ),
                  child: Text(
                    rating,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.successGreen,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              name,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: Responsive.sp(13),
                color: const Color(0xFF0F172A),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              '$speciality • $experience',
              style: TextStyle(
                fontSize: Responsive.sp(11),
                color: const Color(0xFF64748B),
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const Spacer(),
            // Availability badge + Book button
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      availability,
                      style: TextStyle(
                        fontSize: Responsive.sp(9),
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF16A34A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.doctorColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Book',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 10,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ── Near You ─────────────────────────────────────────────────────────────
  Widget _buildNearYou(double pad) {
    return Padding(
      padding: EdgeInsets.fromLTRB(pad, 28, pad, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Near You',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 14),
          _nearTile('🏪', 'FreshMart Supermarket', 'Grocery • 0.8 km', '⭐ 4.6', AppTheme.groceryColor),
          _nearTile('🍕', 'Pizza Palace', 'Restaurant • 1.2 km', '⭐ 4.8', AppTheme.restaurantColor),
          _nearTile('💊', 'HealthPlus Pharmacy', 'Pharmacy • 0.5 km', '⭐ 4.5', AppTheme.pharmacyColor),
          _nearTile('🏥', 'CityMed Clinic', 'Doctor • 2.1 km', '⭐ 4.9', AppTheme.doctorColor),
        ],
      ),
    );
  }

  Widget _nearTile(String emoji, String name, String info, String rating, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: color.withValues(alpha: 0.12), width: 1),
            ),
            child: Center(
              child: Text(emoji, style: TextStyle(fontSize: Responsive.sp(22))),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: Responsive.sp(14),
                    color: const Color(0xFF0F172A),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Text(
                  info,
                  style: TextStyle(
                    fontSize: Responsive.sp(12),
                    color: const Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFDCFCE7), width: 0.5),
            ),
            child: Text(
              rating,
              style: TextStyle(
                fontSize: Responsive.sp(12),
                fontWeight: FontWeight.bold,
                color: const Color(0xFF16A34A),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Bottom Nav ───────────────────────────────────────────────────────────
  Widget _buildBottomNav(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 20,
            offset: const Offset(0, -4),
          )
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.only(bottom: bottomPadding > 0 ? 0 : 4),
          child: BottomNavigationBar(
            currentIndex: 0,
            elevation: 0,
            backgroundColor: Colors.transparent,
            type: BottomNavigationBarType.fixed,
            selectedItemColor: AppTheme.primaryGreen,
            unselectedItemColor: const Color(0xFF94A3B8),
            selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
            iconSize: 24,
            onTap: (i) {
              if (i == 2) Navigator.pushNamed(context, AppRouter.orders);
              if (i == 3) Navigator.pushNamed(context, AppRouter.profile);
            },
            items: const [
              BottomNavigationBarItem(
                icon: Padding(
                  padding: EdgeInsets.only(bottom: 4),
                  child: Icon(Icons.home_rounded),
                ),
                label: 'Home',
              ),
              BottomNavigationBarItem(
                icon: Padding(
                  padding: EdgeInsets.only(bottom: 4),
                  child: Icon(Icons.explore_rounded),
                ),
                label: 'Explore',
              ),
              BottomNavigationBarItem(
                icon: Padding(
                  padding: EdgeInsets.only(bottom: 4),
                  child: Icon(Icons.receipt_long_rounded),
                ),
                label: 'Orders',
              ),
              BottomNavigationBarItem(
                icon: Padding(
                  padding: EdgeInsets.only(bottom: 4),
                  child: Icon(Icons.person_rounded),
                ),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Pharmacy Section ────────────────────────────────────────────────────
  Widget _buildPharmacySection(BuildContext context, double pad) {
    return Padding(
      padding: EdgeInsets.fromLTRB(pad, 28, pad, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '💊 Pharmacy',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              GestureDetector(
                onTap: () => Navigator.pushNamed(context, AppRouter.pharmacy),
                child: const Text(
                  'See All',
                  style: TextStyle(
                    color: AppTheme.pharmacyColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Pharmacy Offer Banner
          GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.pharmacy),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0E7490), Color(0xFF06B6D4)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0E7490).withValues(alpha: 0.2),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Flat 25% OFF',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 20,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'On all medicines & health products',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Order Now →',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Text('💊', style: TextStyle(fontSize: 56)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          // Nearby Pharmacy Tiles
          SizedBox(
            height: 126, // Height to safely prevent vertical RenderFlex overflow
            child: ListView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              children: [
                _pharmacyTile(context, 'HealthPlus Pharmacy', '0.5 km • 25 min', '⭐ 4.5'),
                _pharmacyTile(context, 'Apollo Pharmacy', '1.2 km • 35 min', '⭐ 4.8'),
                _pharmacyTile(context, 'MedPlus', '0.8 km • 20 min', '⭐ 4.6'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _pharmacyTile(BuildContext context, String name, String info, String rating) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.pharmacyStoreDetail, arguments: name),
      child: Container(
        width: 200,
        margin: const EdgeInsets.only(right: 12, bottom: 6, top: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppTheme.pharmacyColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.local_pharmacy_rounded, color: AppTheme.pharmacyColor, size: 16),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFDCFCE7), width: 0.5),
                  ),
                  child: Text(
                    rating,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.successGreen,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              name,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: Responsive.sp(13),
                color: const Color(0xFF0F172A),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              info,
              style: TextStyle(
                fontSize: Responsive.sp(11),
                color: const Color(0xFF64748B),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _M {
  final String label, emoji, route, sub;
  final Color color;
  const _M(this.label, this.emoji, this.color, this.route, this.sub);
}

class _Q {
  final String label;
  final IconData icon;
  final Color color;
  const _Q(this.label, this.icon, this.color);
}

/// The home screen's "Trending Products" rail.
///
/// Reads the marketplace's featured products so the cards are real listings
/// with real prices, and navigates by id. When the call fails the rail renders
/// nothing at all rather than falling back to sample products: an absent
/// section on a multi-module home screen costs the customer nothing, whereas a
/// fake one invites them to tap into a product that does not exist.
class _TrendingProductsRail extends StatefulWidget {
  const _TrendingProductsRail();

  @override
  State<_TrendingProductsRail> createState() => _TrendingProductsRailState();
}

class _TrendingProductsRailState extends State<_TrendingProductsRail> {
  List<ProductModel> _products = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final products = await MarketplaceApiService().getFeaturedProducts();
      if (!mounted) return;
      setState(() {
        _products = products.take(8).toList();
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _products = const [];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox(
        height: 235,
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }
    if (_products.isEmpty) return const SizedBox.shrink();

    final symbol = RegionService.instance.currentCountry.currencySymbol;
    return SizedBox(
      height: 235,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        clipBehavior: Clip.none,
        itemCount: _products.length,
        itemBuilder: (context, i) {
          final p = _products[i];
          return SuperAppHome._productCard(
            context,
            p.name,
            '$symbol ${p.payablePrice.toStringAsFixed(0)}',
            p.images.isNotEmpty ? p.images.first : '',
            productId: p.id,
          );
        },
      ),
    );
  }
}
