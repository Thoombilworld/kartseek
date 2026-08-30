import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_mock_data.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_mock_data.dart';

/// Unified cross-module search for the central home search bar.
///
/// Aggregates results from KARTSEEK modules into a single ranked list.
/// By default, the global search covers Marketplace, Grocery, Restaurant,
/// Doctor, and Pharmacy. Hotel and Taxi are excluded from global search
/// as they have their own dedicated search flows.
///
/// For module-specific search bars, pass a `modules` set containing only
/// the target module name (e.g., `{'Marketplace'}`).
class GlobalSearchService {
  GlobalSearchService._();

  /// The default set of modules searched from the central home search bar.
  /// Excludes Hotel and Taxi which have their own search experiences.
  static const Set<String> globalModules = {
    'Marketplace',
    'Grocery',
    'Restaurant',
    'Doctor',
    'Pharmacy',
  };

  /// Perform a search across the specified [modules].
  ///
  /// When [modules] is null, defaults to [globalModules] (Marketplace,
  /// Grocery, Restaurant, Doctor, Pharmacy — excludes Hotel & Taxi).
  ///
  /// Returns a list of [GlobalSearchResult] sorted by relevance:
  ///   1. Exact name matches
  ///   2. Starts-with matches
  ///   3. Contains matches
  ///
  /// Results are capped at [maxPerModule] items per module to ensure
  /// diverse representation across all categories.
  static List<GlobalSearchResult> search(String query, {int maxPerModule = 5, Set<String>? modules}) {
    final activeModules = modules ?? globalModules;
    if (query.trim().isEmpty) return [];

    final q = query.trim().toLowerCase();
    final all = <GlobalSearchResult>[];
    final cs = RegionService.instance.currentCountry.currencySymbol;

    // ── Marketplace Products ─────────────────────────────────────────────
    if (activeModules.contains('Marketplace')) {
    try {
      final products = MarketplaceMockData.searchProducts(q);
      for (final p in products.take(maxPerModule)) {
        all.add(GlobalSearchResult(
          module: 'Marketplace',
          emoji: '🛍️',
          title: p.name,
          subtitle: '${p.brand} • $cs ${p.price.toStringAsFixed(0)}',
          route: AppRouter.productDetail,
          routeArg: p.id,
          matchScore: _score(q, p.name),
        ));
      }
    } catch (_) {}
    } // end Marketplace

    // ── Grocery Items ────────────────────────────────────────────────────
    if (activeModules.contains('Grocery')) {
    final groceryItems = [
      {'name': 'Fresh Bananas', 'price': 60, 'emoji': '🍌', 'store': 'FreshMart', 'unit': '1 dozen'},
      {'name': 'Amul Butter 500g', 'price': 245, 'emoji': '🧈', 'store': 'D-Mart', 'unit': '500g'},
      {'name': 'Onions 1kg', 'price': 35, 'emoji': '🧅', 'store': 'Green Basket', 'unit': '1 kg'},
      {'name': 'Whole Wheat Bread', 'price': 45, 'emoji': '🍞', 'store': 'FreshMart', 'unit': '1 loaf'},
      {'name': 'Full Cream Milk 1L', 'price': 65, 'emoji': '🥛', 'store': 'D-Mart', 'unit': '1 liter'},
      {'name': 'Chicken Breast 500g', 'price': 280, 'emoji': '🍗', 'store': 'Fresh N Easy', 'unit': '500g'},
      {'name': 'Basmati Rice 5kg', 'price': 450, 'emoji': '🍚', 'store': 'FreshMart', 'unit': '5 kg'},
      {'name': 'Tomatoes 1kg', 'price': 40, 'emoji': '🍅', 'store': 'Green Basket', 'unit': '1 kg'},
      {'name': 'Organic Milk 1L', 'price': 85, 'emoji': '🥛', 'store': 'FreshMart', 'unit': '1 liter'},
      {'name': 'Eggs 12 Pack', 'price': 75, 'emoji': '🥚', 'store': 'D-Mart', 'unit': '12 pcs'},
      {'name': 'Potato 1kg', 'price': 30, 'emoji': '🥔', 'store': 'Green Basket', 'unit': '1 kg'},
      {'name': 'Greek Yogurt', 'price': 120, 'emoji': '🍶', 'store': 'FreshMart', 'unit': '400g'},
    ];
    final groceryMatches = groceryItems
        .where((g) => (g['name'] as String).toLowerCase().contains(q))
        .take(maxPerModule);
    for (final g in groceryMatches) {
      all.add(GlobalSearchResult(
        module: 'Grocery',
        emoji: g['emoji'] as String,
        title: g['name'] as String,
        subtitle: '${g['store']} • $cs ${g['price']}',
        route: AppRouter.grocery,
        routeArg: g['name'] as String,
        matchScore: _score(q, (g['name'] as String)),
      ));
    }
    } // end Grocery

    // ── Restaurant ───────────────────────────────────────────────────────
    if (activeModules.contains('Restaurant')) {
    final restaurants = [
      {'name': 'The Grand Biryani House', 'cuisine': 'Indian', 'rating': 4.8, 'time': '25-35 min', 'emoji': '🍛'},
      {'name': 'Pizza Paradise', 'cuisine': 'Pizza', 'rating': 4.6, 'time': '20-30 min', 'emoji': '🍕'},
      {'name': 'Mandarin Palace', 'cuisine': 'Chinese', 'rating': 4.7, 'time': '30-40 min', 'emoji': '🥡'},
      {'name': 'Green Leaf Cafe', 'cuisine': 'Healthy', 'rating': 4.5, 'time': '15-25 min', 'emoji': '🥗'},
      {'name': 'Burger Barn', 'cuisine': 'Burgers', 'rating': 4.4, 'time': '20-25 min', 'emoji': '🍔'},
      {'name': 'Kerala Spice Kitchen', 'cuisine': 'South Indian', 'rating': 4.9, 'time': '35-45 min', 'emoji': '🦐'},
      {'name': 'Sushi Express', 'cuisine': 'Japanese', 'rating': 4.6, 'time': '25-35 min', 'emoji': '🍣'},
      {'name': 'Taco Fiesta', 'cuisine': 'Mexican', 'rating': 4.3, 'time': '15-25 min', 'emoji': '🌮'},
    ];
    final restMatches = restaurants
        .where((r) =>
            (r['name'] as String).toLowerCase().contains(q) ||
            (r['cuisine'] as String).toLowerCase().contains(q))
        .take(maxPerModule);
    for (final r in restMatches) {
      all.add(GlobalSearchResult(
        module: 'Restaurant',
        emoji: r['emoji'] as String,
        title: r['name'] as String,
        subtitle: '${r['cuisine']} • ⭐ ${r['rating']} • ${r['time']}',
        route: AppRouter.restaurantDetail,
        routeArg: r['name'] as String,
        matchScore: _score(q, (r['name'] as String)),
      ));
    }
    } // end Restaurant

    // ── Doctors ──────────────────────────────────────────────────────────
    if (activeModules.contains('Doctor')) {
    final doctors = [
      {'name': 'Dr. Sarah Kamau', 'spec': 'Cardiologist', 'fee': 800, 'emoji': '🫀'},
      {'name': 'Dr. Raj Patel', 'spec': 'Dermatologist', 'fee': 600, 'emoji': '💆'},
      {'name': 'Dr. Aisha Khan', 'spec': 'Pediatrician', 'fee': 500, 'emoji': '👶'},
      {'name': 'Dr. James Ochieng', 'spec': 'Orthopedic', 'fee': 1000, 'emoji': '🦴'},
      {'name': 'Dr. Priya Singh', 'spec': 'Gynecologist', 'fee': 700, 'emoji': '🤰'},
      {'name': 'Dr. Kevin Mwangi', 'spec': 'Neurologist', 'fee': 1200, 'emoji': '🧠'},
      {'name': 'Dr. Fatima Hassan', 'spec': 'General Physician', 'fee': 400, 'emoji': '🩺'},
      {'name': 'Dr. David Njeru', 'spec': 'Dentist', 'fee': 500, 'emoji': '🦷'},
    ];
    final docMatches = doctors
        .where((d) =>
            (d['name'] as String).toLowerCase().contains(q) ||
            (d['spec'] as String).toLowerCase().contains(q))
        .take(maxPerModule);
    for (final d in docMatches) {
      all.add(GlobalSearchResult(
        module: 'Doctor',
        emoji: d['emoji'] as String,
        title: d['name'] as String,
        subtitle: '${d['spec']} • $cs ${d['fee']}',
        route: AppRouter.doctorBooking,
        routeArg: d['name'] as String,
        matchScore: _score(q, (d['name'] as String)),
      ));
    }
    } // end Doctor

    // ── Pharmacy Medicines ───────────────────────────────────────────────
    if (activeModules.contains('Pharmacy')) {
    try {
      final meds = PharmacyMockData.allProducts
          .where((p) =>
              p.name.toLowerCase().contains(q) ||
              p.brand.toLowerCase().contains(q) ||
              (p.genericName?.toLowerCase().contains(q) ?? false))
          .take(maxPerModule);
      for (final m in meds) {
        all.add(GlobalSearchResult(
          module: 'Pharmacy',
          emoji: m.needsRx ? '💊' : '🧴',
          title: m.name,
          subtitle: '${m.brand} • $cs ${m.price.toStringAsFixed(0)}${m.needsRx ? ' • Rx' : ''}',
          route: AppRouter.medicineDetail,
          routeArg: m.name,
          matchScore: _score(q, m.name),
        ));
      }
    } catch (_) {}
    } // end Pharmacy

    // ── Hotels ────────────────────────────────────────────────────────────
    if (activeModules.contains('Hotel')) {
    final hotels = [
      {'name': 'Grand Palace Hotel', 'city': 'Dubai', 'stars': 5, 'price': 45000, 'emoji': '🏨'},
      {'name': 'Marina Bay Resort', 'city': 'Mombasa', 'stars': 4, 'price': 12000, 'emoji': '🏖️'},
      {'name': 'Serena Safari Lodge', 'city': 'Nairobi', 'stars': 5, 'price': 25000, 'emoji': '🦁'},
      {'name': 'Taj Lake Palace', 'city': 'Udaipur', 'stars': 5, 'price': 35000, 'emoji': '🏯'},
      {'name': 'Hilton Garden Inn', 'city': 'Dubai', 'stars': 4, 'price': 18000, 'emoji': '🏢'},
      {'name': 'Beach Resort Goa', 'city': 'Goa', 'stars': 4, 'price': 8000, 'emoji': '🏝️'},
    ];
    final hotelMatches = hotels
        .where((h) =>
            (h['name'] as String).toLowerCase().contains(q) ||
            (h['city'] as String).toLowerCase().contains(q))
        .take(maxPerModule);
    for (final h in hotelMatches) {
      all.add(GlobalSearchResult(
        module: 'Hotel',
        emoji: h['emoji'] as String,
        title: h['name'] as String,
        subtitle: '${h['city']} • ${'⭐' * (h['stars'] as int)} • $cs ${h['price']}',
        route: AppRouter.hotelBooking,
        routeArg: h['name'] as String,
        matchScore: _score(q, (h['name'] as String)),
      ));
    }
    } // end Hotel

    // ── Taxi Destinations ────────────────────────────────────────────────
    if (activeModules.contains('Taxi')) {
    final taxiPlaces = [
      {'name': 'Jomo Kenyatta Airport', 'type': 'Airport', 'emoji': '✈️'},
      {'name': 'Nairobi CBD', 'type': 'City Center', 'emoji': '🏙️'},
      {'name': 'Westlands Mall', 'type': 'Shopping', 'emoji': '🛒'},
      {'name': 'Karen Hospital', 'type': 'Hospital', 'emoji': '🏥'},
      {'name': 'Railway Station', 'type': 'Transport', 'emoji': '🚂'},
    ];
    final taxiMatches = taxiPlaces
        .where((t) =>
            (t['name'] as String).toLowerCase().contains(q) ||
            (t['type'] as String).toLowerCase().contains(q))
        .take(maxPerModule);
    for (final t in taxiMatches) {
      all.add(GlobalSearchResult(
        module: 'Taxi',
        emoji: t['emoji'] as String,
        title: t['name'] as String,
        subtitle: 'Ride to ${t['type']}',
        route: AppRouter.taxi,
        routeArg: t['name'] as String,
        matchScore: _score(q, (t['name'] as String)),
      ));
    }
    } // end Taxi

    // Sort by relevance score (lower = better match)
    all.sort((a, b) => a.matchScore.compareTo(b.matchScore));

    return all;
  }

  /// Compute a match score. Lower = better.
  ///   0 = exact match
  ///   1 = starts with query
  ///   2 = contains query
  static int _score(String query, String target) {
    final t = target.toLowerCase();
    if (t == query) return 0;
    if (t.startsWith(query)) return 1;
    return 2;
  }
}

/// A single search result from any module.
class GlobalSearchResult {
  final String module;   // 'Marketplace', 'Grocery', 'Restaurant', etc.
  final String emoji;
  final String title;
  final String subtitle;
  final String route;
  final String routeArg;
  final int matchScore;

  const GlobalSearchResult({
    required this.module,
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.route,
    required this.routeArg,
    required this.matchScore,
  });
}
