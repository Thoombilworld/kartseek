import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';
import 'package:shared_mobile/core/widgets/camera_capture_screen.dart';
import 'package:shared_mobile/core/widgets/voice_search_sheet.dart';

/// Restaurant Home — Swiggy/Zomato inspired food delivery experience.
/// Features: Location header, cuisine filters, promo banner, nearby restaurants,
/// delivery time badges, ratings, price range, cuisine tags.
class RestaurantHomeScreen extends StatelessWidget {
  const RestaurantHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent));

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverAppBar(
            pinned: true,
            floating: true,
            elevation: 0,
            backgroundColor: const Color(0xFFEA580C),
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
          SliverToBoxAdapter(child: _buildFilterChips()),
          SliverToBoxAdapter(child: _buildPromoBanner()),
          SliverToBoxAdapter(child: _buildCuisines()),
          SliverToBoxAdapter(child: _buildNearbyRestaurants(context)),
          SliverToBoxAdapter(child: _buildSectionHeader('🍗 Popular Dishes', 'See All')),
          SliverToBoxAdapter(child: _buildPopularDishes(context)),
          SliverToBoxAdapter(child: _buildSectionHeader('⚡ Under 30 Min', 'See All')),
          SliverToBoxAdapter(child: _buildFastDeliveryRestaurants(context)),
          SliverToBoxAdapter(child: _buildTopRated(context)),
          SliverToBoxAdapter(child: _buildSectionHeader('👨‍👩‍👧 Family Restaurants', 'See All')),
          SliverToBoxAdapter(child: _buildFamilyRestaurants(context)),
          SliverToBoxAdapter(child: _buildSectionHeader('☁️ Cloud Kitchens', 'See All')),
          SliverToBoxAdapter(child: _buildCloudKitchens(context)),
          SliverToBoxAdapter(child: _buildSectionHeader('🔁 Order Again', 'History')),
          SliverToBoxAdapter(child: _buildRecentlyOrdered(context)),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }

  // ── Swiggy-style orange header ───────────────────────────────────────
  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [Color(0xFFEA580C), Color(0xFFF97316)]),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: const Icon(Icons.arrow_back, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.location_on, color: Colors.white, size: 14),
                    SizedBox(width: 4),
                    Text('Home', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                    Icon(Icons.keyboard_arrow_down, color: Colors.white70, size: 16),
                  ],
                ),
                Text('Apt 4B, Skyline Apartments, ${RegionService.instance.lastDetection?.city ?? RegionService.instance.currentCountry.defaultCity}...', style: const TextStyle(color: Colors.white70, fontSize: 11)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
            child: const Row(
              children: [
                Icon(Icons.local_offer, color: Colors.white, size: 14),
                SizedBox(width: 4),
                Text('Offers', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.search, arguments: 'restaurant'),
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(colors: [Color(0xFFEA580C), Color(0xFFF97316)]),
        ),
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
              const Icon(Icons.search_rounded, color: Color(0xFFEA580C), size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Text('Search for restaurant or a dish...', style: TextStyle(color: Colors.grey.shade500, fontSize: 14, fontWeight: FontWeight.w500)),
              ),
              GestureDetector(
                onTap: () => VoiceSearchSheet.show(
                  context: context,
                  accentColor: AppTheme.restaurantColor,
                  hintText: 'Try "biryani" or "pizza near me"',
                  onResult: (text) {
                    Navigator.pushNamed(context, AppRouter.search, arguments: <String, String>{'module': 'restaurant', 'initialQuery': text});
                  },
                ),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8F9FB),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.mic_none_rounded, color: Color(0xFFEA580C), size: 18),
                ),
              ),
              const SizedBox(width: 6),
              GestureDetector(
                onTap: () => Navigator.push<String>(context, MaterialPageRoute(
                  builder: (_) => const CameraCaptureScreen(
                    title: 'Scan Menu / QR',
                    accentColor: AppTheme.restaurantColor,
                    filePrefix: 'restaurant_scan',
                    overlayHint: 'Scan QR code on table for instant ordering',
                  ),
                )),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8F9FB),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.qr_code_scanner, color: Color(0xFFEA580C), size: 18),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Zomato-style filter chips ────────────────────────────────────────
  Widget _buildFilterChips() {
    const filters = ['Sort', 'Fast Delivery', 'Rating 4.0+', 'Pure Veg', 'Offers', 'Cuisines'];
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: i == 0 ? const Color(0xFF0F172A) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: i == 0 ? Colors.transparent : const Color(0xFFE5E7EB)),
          ),
          child: Row(
            children: [
              if (i == 0) const Icon(Icons.swap_vert, size: 14, color: Colors.white),
              if (i == 0) const SizedBox(width: 4),
              Text(filters[i], style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: i == 0 ? Colors.white : AppTheme.textPrimary)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPromoBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      height: 140,
      decoration: BoxDecoration(
        color: const Color(0xFFEA580C),
        borderRadius: BorderRadius.circular(16),
        image: KartseekImage.decoration(
          url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop',
          isBanner: true,
          fit: BoxFit.cover,
          colorFilter: const ColorFilter.mode(Colors.black45, BlendMode.darken),
        ),
      ),
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('FLAT 50% OFF', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                const SizedBox(height: 4),
                const Text('On your first 3 orders', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
                  child: Text('ORDER NOW', style: TextStyle(color: Colors.orange.shade800, fontSize: 11, fontWeight: FontWeight.w900)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Cuisine categories ───────────────────────────────────────────────
  Widget _buildCuisines() {
    const cuisines = [
      _Cuisine('🥘', 'Biryani'), _Cuisine('🍕', 'Pizza'), _Cuisine('🍔', 'Burger'),
      _Cuisine('🥗', 'Healthy'), _Cuisine('🍦', 'Desserts'), _Cuisine('🍜', 'Chinese'),
      _Cuisine('🌮', 'Mexican'), _Cuisine('🍣', 'Sushi'),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('What\'s on your mind?', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          SizedBox(
            height: 90,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: cuisines.length,
              itemBuilder: (_, i) => SizedBox(
                width: 76,
                child: Column(
                  children: [
                    Container(
                      width: 60, height: 60,
                      decoration: BoxDecoration(
                        color: Colors.white, shape: BoxShape.circle,
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4, offset: const Offset(0, 2))],
                      ),
                      child: Center(child: Text(cuisines[i].emoji, style: const TextStyle(fontSize: 28))),
                    ),
                    const SizedBox(height: 6),
                    Text(cuisines[i].label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Nearby restaurants (Swiggy cards) ────────────────────────────────
  Widget _buildNearbyRestaurants(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('Nearby & Fast Delivery', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
              const Spacer(),
              Text('See All', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.orange.shade600)),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 240,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _restaurantCard(context, 'The Grand Biryani House', 'North Indian, Mughlai', '⭐ 4.4', '35 min', '${RegionService.instance.currentCountry.currencySymbol} 300 for two', 'FLAT 50% OFF', true, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=400&auto=format&fit=crop'),
                _restaurantCard(context, 'Domino\'s Pizza', 'Italian, Fast Food', '⭐ 4.2', '25 min', '${RegionService.instance.currentCountry.currencySymbol} 500 for two', '30% OFF', false, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=400&auto=format&fit=crop'),
                _restaurantCard(context, 'Subway', 'Healthy, Sandwiches', '⭐ 4.3', '20 min', '${RegionService.instance.currentCountry.currencySymbol} 400 for two', 'BUY 1 GET 1', false, 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=80'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _restaurantCard(BuildContext context, String name, String cuisine, String rating, String time, String price, String offer, bool promoted, String imageUrl) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.restaurantDetail, arguments: {'name': name, 'imageUrl': imageUrl}),
      child: Container(
      width: 240,
      margin: const EdgeInsets.only(right: 14),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image area
          Container(
            height: 130,
            decoration: const BoxDecoration(
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Stack(
              fit: StackFit.expand,
              children: [
                KartseekImage(
                  url: imageUrl,
                  fit: BoxFit.cover,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                ),
                Container(
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                    gradient: LinearGradient(
                      colors: [Colors.transparent, Colors.black.withValues(alpha: 0.7)],
                      begin: Alignment.topCenter, end: Alignment.bottomCenter,
                    ),
                  ),
                ),
                if (promoted)
                  Positioned(
                    top: 8, left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(6)),
                      child: const Text('PROMOTED', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: AppTheme.textMuted)),
                    ),
                  ),
                Positioned(
                  bottom: 8, left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xFF3B82F6), borderRadius: BorderRadius.circular(6)),
                    child: Text(offer, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800)),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(color: Colors.green.shade700, borderRadius: BorderRadius.circular(4)),
                      child: Row(
                        children: [
                          Text(rating.replaceAll('⭐ ', ''), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                          const Icon(Icons.star, color: Colors.white, size: 8),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(cuisine, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.timer, size: 12, color: Colors.grey.shade500),
                    const SizedBox(width: 3),
                    Text(time, style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                    const SizedBox(width: 8),
                    Text('• $price', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
      ),
    );
  }

  // ── Top rated (list view) ────────────────────────────────────────────
  Widget _buildTopRated(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('🏆 Top Rated Near You', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          _topRatedTile(context, 'Kerala Spice Kitchen', 'South Indian, Seafood', '⭐ 4.8', '45 min', '${RegionService.instance.currentCountry.currencySymbol} 400 for two', 'Free Delivery', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80'),
          _topRatedTile(context, 'Mandarin Palace', 'Chinese, Thai', '⭐ 4.7', '30 min', '${RegionService.instance.currentCountry.currencySymbol} 600 for two', '20% OFF', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=400&auto=format&fit=crop'),
          _topRatedTile(context, 'Green Leaf Cafe', 'Continental, Healthy', '⭐ 4.9', '40 min', '${RegionService.instance.currentCountry.currencySymbol} 350 for two', 'New on KARTSEEK', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=400&auto=format&fit=crop'),
        ],
      ),
    );
  }

  Widget _topRatedTile(BuildContext context, String name, String cuisine, String rating, String time, String price, String badge, String imageUrl) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.restaurantDetail, arguments: {'name': name, 'imageUrl': imageUrl}),
      child: Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Row(
        children: [
          KartseekImage(
            url: imageUrl,
            width: 80,
            height: 80,
            fit: BoxFit.cover,
            borderRadius: BorderRadius.circular(12),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(child: Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(color: Colors.green.shade700, borderRadius: BorderRadius.circular(3)),
                      child: Row(
                        children: [
                          Text(rating.replaceAll('⭐ ', ''), style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700)),
                          const Icon(Icons.star, color: Colors.white, size: 8),
                        ],
                      ),
                    ),
                  ],
                ),
                Text(cuisine, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text('🕐 $time', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                    const SizedBox(width: 6),
                    Flexible(child: Text('• $price', style: TextStyle(fontSize: 10, color: Colors.grey.shade500), overflow: TextOverflow.ellipsis)),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(4)),
                        child: Text(badge, style: TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: Colors.blue.shade700), overflow: TextOverflow.ellipsis),
                      ),
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
  }
}

class _Cuisine { final String emoji, label; const _Cuisine(this.emoji, this.label); }

// ── Extension with new section builders ──────────────────────────────────────
extension RestaurantHomeSections on RestaurantHomeScreen {

  Widget _buildSectionHeader(String title, String action) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          Text(action, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFFEA580C))),
        ],
      ),
    );
  }

  Widget _buildPopularDishes(BuildContext context) {
    final dishes = [
      {'name': 'Chicken Biryani', 'restaurant': 'Biryani House', 'price': '${RegionService.instance.currentCountry.currencySymbol} 299', 'rating': '4.8', 'emoji': '🍛'},
      {'name': 'Margherita Pizza', 'restaurant': 'Pizza Palace', 'price': '${RegionService.instance.currentCountry.currencySymbol} 349', 'rating': '4.6', 'emoji': '🍕'},
      {'name': 'Dragon Roll', 'restaurant': 'Sushi Kingdom', 'price': '${RegionService.instance.currentCountry.currencySymbol} 420', 'rating': '4.9', 'emoji': '🍣'},
      {'name': 'Butter Chicken', 'restaurant': 'Spice Garden', 'price': '${RegionService.instance.currentCountry.currencySymbol} 279', 'rating': '4.5', 'emoji': '🍲'},
      {'name': 'Shawarma Wrap', 'restaurant': 'Arabia Bites', 'price': '${RegionService.instance.currentCountry.currencySymbol} 149', 'rating': '4.4', 'emoji': '🌯'},
    ];
    return SizedBox(
      height: 175,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: dishes.length,
        itemBuilder: (_, i) {
          final d = dishes[i];
          return GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.foodItemDetail, arguments: d['name']),
            child: Container(
              width: 130,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)]),
              child: Column(
                children: [
                  Container(
                    height: 88, decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: const BorderRadius.vertical(top: Radius.circular(14))),
                    child: Center(child: Text(d['emoji']!, style: const TextStyle(fontSize: 44))),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(d['name']!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 2),
                      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                        Text(d['price']!, style: TextStyle(color: Colors.orange.shade600, fontWeight: FontWeight.w700, fontSize: 11)),
                        Row(children: [
                          Icon(Icons.star, size: 10, color: Colors.green.shade600),
                          Text(' ${d['rating']}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.green.shade700)),
                        ]),
                      ]),
                    ]),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFastDeliveryRestaurants(BuildContext context) {
    final restaurants = [
      {'name': 'Pizza Express', 'time': '18 min', 'cuisine': 'Pizza', 'rating': '4.3', 'offer': '20% OFF'},
      {'name': 'Quick Bites', 'time': '22 min', 'cuisine': 'Fast Food', 'rating': '4.1', 'offer': null},
      {'name': 'Wrap & Roll', 'time': '25 min', 'cuisine': 'Shawarma', 'rating': '4.5', 'offer': 'FREE DEL'},
    ];
    return SizedBox(
      height: 130,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: restaurants.length,
        itemBuilder: (_, i) {
          final r = restaurants[i];
          return GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.restaurantDetail, arguments: r['name']),
            child: Container(
              width: 220,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)]),
              child: Row(children: [
                Container(width: 56, height: 56, decoration: BoxDecoration(color: Colors.orange.shade100, borderRadius: BorderRadius.circular(12)),
                  child: const Center(child: Icon(Icons.restaurant, color: Color(0xFFEA580C), size: 28))),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(r['name']!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(r['cuisine']!, style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                  const SizedBox(height: 6),
                  Wrap(spacing: 4, runSpacing: 2, crossAxisAlignment: WrapCrossAlignment.center, children: [
                    DecoratedBox(
                      decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(4)),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        child: Text('⚡ ${r['time']}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.orange.shade700)),
                      ),
                    ),
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.star, size: 12, color: Colors.green.shade600),
                      Text(' ${r['rating']}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.green.shade700)),
                    ]),
                    if (r['offer'] != null)
                      Text(r['offer']!, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFFEA580C)), overflow: TextOverflow.ellipsis),
                  ]),
                ])),
              ]),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFamilyRestaurants(BuildContext context) {
    final items = [
      {'name': 'The Grand Biryani', 'info': 'For 4+ • ${RegionService.instance.currentCountry.currencySymbol} 1,200+', 'rating': '4.7'},
      {'name': 'Family Dine Inn', 'info': 'For 4+ • ${RegionService.instance.currentCountry.currencySymbol} 800+', 'rating': '4.5'},
      {'name': 'Royal Feast', 'info': 'For 6+ • ${RegionService.instance.currentCountry.currencySymbol} 1,500+', 'rating': '4.6'},
    ];
    return SizedBox(
      height: 148,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: items.length,
        itemBuilder: (_, i) {
          final r = items[i];
          return GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.restaurantDetail, arguments: r['name']),
            child: Container(
              width: 200,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [Colors.orange.shade50, Colors.red.shade50]),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.orange.shade100),
              ),
              child: Row(children: [
                const Text('👨‍👩‍👧', style: TextStyle(fontSize: 32)),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(r['name']!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(r['info']!, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                  const SizedBox(height: 4),
                  Row(children: [
                    Icon(Icons.star, size: 12, color: Colors.green.shade600),
                    Text(' ${r['rating']}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.green.shade700)),
                    const SizedBox(width: 8),
                    const Text('📅 Book Table', style: TextStyle(fontSize: 10, color: Color(0xFFEA580C), fontWeight: FontWeight.w700)),
                  ]),
                ])),
              ]),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCloudKitchens(BuildContext context) {
    final kitchens = [
      {'name': 'Cloud Curry Co.', 'cuisine': 'Indian', 'time': '30 min', 'emoji': '☁️'},
      {'name': 'Ghost Kitchen', 'cuisine': 'Multi-cuisine', 'time': '35 min', 'emoji': '👻'},
      {'name': 'Virtual Bites', 'cuisine': 'Chinese', 'time': '28 min', 'emoji': '🏮'},
    ];
    return SizedBox(
      height: 130,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: kitchens.length,
        itemBuilder: (_, i) {
          final k = kitchens[i];
          return GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.restaurantDetail, arguments: k['name']),
            child: Container(
              width: 160,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(k['emoji']!, style: const TextStyle(fontSize: 28)),
                const SizedBox(height: 8),
                Text(k['name']!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                Row(children: [
                  Text(k['cuisine']!, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  const Spacer(),
                  Text('⚡ ${k['time']}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.orange.shade600)),
                ]),
              ]),
            ),
          );
        },
      ),
    );
  }

  Widget _buildRecentlyOrdered(BuildContext context) {
    final orders = [
      {'restaurant': 'Biryani House', 'item': 'Chicken Biryani', 'time': 'Today', 'emoji': '🥘'},
      {'restaurant': 'Sushi Kingdom', 'item': 'Dragon Roll', 'time': 'Yesterday', 'emoji': '🍣'},
      {'restaurant': 'Pizza Palace', 'item': 'Margherita Pizza', 'time': '2 days ago', 'emoji': '🍕'},
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Column(
        children: orders.map((o) => GestureDetector(
          onTap: () => Navigator.pushNamed(context, AppRouter.restaurantDetail, arguments: o['restaurant']),
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [
              Text(o['emoji']!, style: const TextStyle(fontSize: 28)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(o['restaurant']!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                Text(o['item']!, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              ])),
              Text(o['time']!, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(border: Border.all(color: const Color(0xFFEA580C)), borderRadius: BorderRadius.circular(8)),
                child: const Text('Reorder', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFEA580C))),
              ),
            ]),
          ),
        )).toList(),
      ),
    );
  }
}
