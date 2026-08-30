import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_bloc.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_event.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_state.dart';

/// Hotel Booking Home Screen — Premium search and browse interface
/// Matches all sections from the website version.
class HotelBookingHomeScreen extends StatefulWidget {
  const HotelBookingHomeScreen({super.key});

  @override
  State<HotelBookingHomeScreen> createState() => _HotelBookingHomeScreenState();
}

class _HotelBookingHomeScreenState extends State<HotelBookingHomeScreen> {
  final _cityController = TextEditingController();
  DateTime? _checkIn;
  DateTime? _checkOut;
  int _guests = 2;
  int _rooms = 1;

  static const _hotelColor = AppTheme.hotelColor;

  static const _popularCities = [
    {'name': 'Dubai', 'flag': '🇦🇪', 'hotels': 45, 'gradient': [Color(0xFFE11D48), Color(0xFFF97316)]},
    {'name': 'Mumbai', 'flag': '🇮🇳', 'hotels': 32, 'gradient': [Color(0xFFF59E0B), Color(0xFFFBBF24)]},
    {'name': 'Doha', 'flag': '🇶🇦', 'hotels': 18, 'gradient': [Color(0xFF7C3AED), Color(0xFF3B82F6)]},
    {'name': 'London', 'flag': '🇬🇧', 'hotels': 12, 'gradient': [Color(0xFF3B82F6), Color(0xFF06B6D4)]},
    {'name': 'Riyadh', 'flag': '🇸🇦', 'hotels': 22, 'gradient': [Color(0xFF10B981), Color(0xFF14B8A6)]},
    {'name': 'Muscat', 'flag': '🇴🇲', 'hotels': 8, 'gradient': [Color(0xFF14B8A6), Color(0xFF22C55E)]},
  ];

  static const _featuredHotels = [
    {'id': 'htl-01', 'name': 'The Grand Palace Hotel', 'city': 'Dubai, UAE', 'rating': 4.8, 'price': 450, 'currency': 'AED', 'type': 'Luxury', 'emoji': '🏰', 'stars': 5, 'offer': '20% OFF', 'amenities': ['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Parking', 'Bar', 'Concierge'], 'reviewCount': 1240, 'distance': '2.1 km from center', 'description': 'Experience unparalleled luxury in the heart of Dubai. The Grand Palace Hotel offers world-class dining, a rooftop infinity pool with skyline views, and a full-service spa. Perfect for both leisure and business travelers.'},
    {'id': 'htl-02', 'name': 'KARTSEEK Business Suites', 'city': 'Doha, Qatar', 'rating': 4.6, 'price': 280, 'currency': 'QAR', 'type': 'Business', 'emoji': '🏢', 'stars': 4, 'offer': null, 'amenities': ['WiFi', 'Gym', 'Restaurant', 'Meeting Room', 'Parking', 'Bar'], 'reviewCount': 890, 'distance': '1.5 km from center', 'description': 'Modern business suites with state-of-the-art meeting facilities, high-speed connectivity, and executive lounges. Located in the vibrant West Bay financial district.'},
    {'id': 'htl-03', 'name': 'Seaside Family Resort', 'city': 'Mumbai, India', 'rating': 4.7, 'price': 8500, 'currency': '₹', 'type': 'Resort', 'emoji': '🏖️', 'stars': 5, 'offer': 'Free Breakfast', 'amenities': ['WiFi', 'Pool', 'Beach', 'Kids Club', 'Restaurant', 'Spa', 'Gym'], 'reviewCount': 2100, 'distance': 'Beachfront', 'description': 'A beachfront paradise for families with dedicated kids\' clubs, multiple swimming pools, and an award-winning seafood restaurant. Wake up to stunning Arabian Sea views every morning.'},
    {'id': 'htl-04', 'name': 'Heritage Boutique Hotel', 'city': 'London, UK', 'rating': 4.9, 'price': 320, 'currency': '£', 'type': 'Boutique', 'emoji': '🏛️', 'stars': 5, 'offer': 'Suite Upgrade', 'amenities': ['WiFi', 'Bar', 'Restaurant', 'Concierge', 'Spa', 'Gym'], 'reviewCount': 560, 'distance': '0.8 km from center', 'description': 'A beautifully restored Georgian townhouse hotel in Mayfair. Each room is individually designed with period features and modern luxuries. Home to a Michelin-starred restaurant.'},
  ];

  static const _trendingHotels = [
    {'id': 'htl-07', 'name': 'Desert Oasis Villa', 'city': 'Dubai, UAE', 'rating': 4.9, 'reviews': 312, 'reviewCount': 312, 'price': 1200, 'currency': 'AED', 'emoji': '🏡', 'type': 'Villa', 'stars': 5, 'tag': '🔥 Trending', 'amenities': ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Parking', 'Beach'], 'distance': '15 km from center', 'description': 'An exclusive private villa retreat in the Dubai desert, featuring a private pool, outdoor majlis, and personalized butler service. Ideal for romantic getaways and special celebrations.'},
    {'id': 'htl-08', 'name': 'Central City Apartments', 'city': 'London, UK', 'rating': 4.5, 'reviews': 845, 'reviewCount': 845, 'price': 180, 'currency': '£', 'emoji': '🏢', 'type': 'Apartment', 'stars': 4, 'tag': '📈 Popular', 'amenities': ['WiFi', 'Gym', 'Parking', 'Meeting Room'], 'distance': '0.3 km from center', 'description': 'Fully serviced apartments in the heart of the City of London. Featuring modern kitchens, workspaces, and concierge services, perfect for extended business stays.'},
    {'id': 'htl-09', 'name': 'Marina Bay Suites', 'city': 'Doha, Qatar', 'rating': 4.7, 'reviews': 520, 'reviewCount': 520, 'price': 550, 'currency': 'QAR', 'emoji': '🛥️', 'type': 'Luxury', 'stars': 5, 'tag': '⚡ Hot Deal', 'amenities': ['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Concierge'], 'distance': '2.0 km from center', 'description': 'Stunning waterfront suites overlooking Doha\'s Marina. Features infinity pool, yacht charter service, and access to The Pearl-Qatar\'s premium dining and shopping.'},
  ];

  static const _nearbyHotels = [
    {'id': 'htl-10', 'name': 'Downtown Express', 'distance': '0.8 km', 'rating': 4.2, 'price': 85, 'currency': '\$', 'emoji': '🏨', 'type': 'Budget', 'city': 'Nearby', 'stars': 3, 'amenities': ['WiFi', 'Parking', 'Restaurant'], 'reviewCount': 320, 'description': 'Affordable and clean accommodation in the city center. Great transport links and 24-hour reception. Perfect for budget-conscious travelers looking for a convenient base.'},
    {'id': 'htl-11', 'name': 'Riverside Boutique', 'distance': '1.2 km', 'rating': 4.6, 'price': 150, 'currency': '\$', 'emoji': '🏛️', 'type': 'Boutique', 'offer': '10% OFF', 'city': 'Nearby', 'stars': 4, 'amenities': ['WiFi', 'Spa', 'Restaurant', 'Bar', 'Gym'], 'reviewCount': 485, 'description': 'Charming boutique hotel on the riverside with artisanal decor and a farm-to-table restaurant. Enjoy sunset cocktails on the waterfront terrace.'},
    {'id': 'htl-12', 'name': 'Airport Transit Hotel', 'distance': '3.5 km', 'rating': 4.0, 'price': 120, 'currency': '\$', 'emoji': '✈️', 'type': 'Business', 'city': 'Near Airport', 'stars': 3, 'amenities': ['WiFi', 'Gym', 'Restaurant', 'Parking', 'Meeting Room'], 'reviewCount': 710, 'description': 'Convenient airport hotel with complimentary shuttle service, soundproofed rooms, and 24-hour dining. Ideal for layovers and early departures.'},
  ];

  static const _collections = [
    {'label': 'Luxury Hotels', 'emoji': '✨', 'desc': '5-star experiences', 'gradient': [Color(0xFFF59E0B), Color(0xFFEF4444)]},
    {'label': 'Budget Stays', 'emoji': '💰', 'desc': 'Great value deals', 'gradient': [Color(0xFF10B981), Color(0xFF14B8A6)]},
    {'label': 'Business Hotels', 'emoji': '💼', 'desc': 'Work-ready suites', 'gradient': [Color(0xFF3B82F6), Color(0xFF6366F1)]},
    {'label': 'Family Friendly', 'emoji': '👨‍👩‍👧‍👦', 'desc': 'Kids love it', 'gradient': [Color(0xFFEC4899), Color(0xFFF43F5E)]},
    {'label': 'Resorts', 'emoji': '🏝️', 'desc': 'Beachside paradise', 'gradient': [Color(0xFF06B6D4), Color(0xFF3B82F6)]},
    {'label': 'Serviced Apartments', 'emoji': '🏠', 'desc': 'Home away from home', 'gradient': [Color(0xFF8B5CF6), Color(0xFF7C3AED)]},
    {'label': 'Villas', 'emoji': '🏡', 'desc': 'Private retreats', 'gradient': [Color(0xFF84CC16), Color(0xFF22C55E)]},
    {'label': 'Apartments', 'emoji': '🏢', 'desc': 'City living spaces', 'gradient': [Color(0xFFD946EF), Color(0xFFEC4899)]},
  ];

  static const _hotDeals = [
    {'title': 'Dubai Weekend Escape', 'discount': '30% OFF', 'hotel': 'The Grand Palace Hotel', 'price': 315, 'originalPrice': 450, 'currency': 'AED', 'emoji': '🏰', 'expires': '2 days left'},
    {'title': 'Mumbai Monsoon Magic', 'discount': 'FREE Breakfast', 'hotel': 'Seaside Family Resort', 'price': 8500, 'originalPrice': 8500, 'currency': '₹', 'emoji': '🏖️', 'expires': '5 days left'},
    {'title': 'London Staycation', 'discount': '25% OFF', 'hotel': 'Heritage Boutique Hotel', 'price': 240, 'originalPrice': 320, 'currency': '£', 'emoji': '🏛️', 'expires': '3 days left'},
  ];

  bool _gpsLoading = true;

  @override
  void initState() {
    super.initState();
    _initGps();
  }

  Future<void> _initGps() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) { _loadDefaultNearby(); return; }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        _loadDefaultNearby();
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 8)),
      );
      if (mounted) {
        context.read<HotelBloc>().add(SearchNearbyHotels(lat: position.latitude, lng: position.longitude, radius: 10.0));
        setState(() => _gpsLoading = false);
      }
    } catch (e) {
      debugPrint('[HotelHome] GPS error: $e');
      _loadDefaultNearby();
    }
  }

  void _loadDefaultNearby() {
    if (mounted) {
      // Use Dubai as default search location
      context.read<HotelBloc>().add(const SearchNearbyHotels(lat: 25.2048, lng: 55.2708));
      setState(() => _gpsLoading = false);
    }
  }

  @override
  void dispose() { _cityController.dispose(); super.dispose(); }

  Future<void> _pickDate(bool isCheckIn) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isCheckIn ? DateTime.now().add(const Duration(days: 1)) : (_checkIn ?? DateTime.now()).add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(data: Theme.of(ctx).copyWith(colorScheme: const ColorScheme.light(primary: _hotelColor)), child: child!),
    );
    if (picked != null) setState(() { if (isCheckIn) { _checkIn = picked; if (_checkOut != null && _checkOut!.isBefore(picked)) _checkOut = null; } else { _checkOut = picked; } });
  }

  String _fmt(DateTime? d) => d == null ? 'Select' : '${d.day}/${d.month}/${d.year}';

  @override
  Widget build(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent));

    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // Pinned header bar — stays visible while scrolling
          SliverAppBar(
            pinned: true,
            floating: false,
            elevation: 0,
            backgroundColor: const Color(0xFFE11D48),
            surfaceTintColor: Colors.transparent,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            title: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('🏨', style: TextStyle(fontSize: 18)),
                SizedBox(width: 6),
                Text('KARTSEEK Hotels', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Colors.white)),
              ],
            ),
            centerTitle: true,
            actions: [
              IconButton(
                icon: const Icon(Icons.person_outline, color: Colors.white),
                onPressed: () => Navigator.pushNamed(context, AppRouter.profile),
              ),
            ],
          ),
          // Scrollable hero with search card
          SliverToBoxAdapter(child: _buildHeroSearch()),
          SliverToBoxAdapter(child: _buildQuickActions()),
          SliverToBoxAdapter(child: _buildCities()),
          SliverToBoxAdapter(child: _buildFeatured()),
          SliverToBoxAdapter(child: _buildTrending()),
          SliverToBoxAdapter(child: _buildNearby()),
          SliverToBoxAdapter(child: _buildCollections()),
          SliverToBoxAdapter(child: _buildHotDeals()),
          SliverToBoxAdapter(child: _buildUSP()),
          SliverToBoxAdapter(child: _buildQuickLinks()),
          const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
        ],
      ),
    );
  }

  Widget _buildHeroSearch() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFE11D48), Color(0xFFBE123C)]),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Find Your\nPerfect Stay', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.white, height: 1.1)),
            const SizedBox(height: 8),
            const Text('Premium hotels worldwide. Best prices guaranteed.', style: TextStyle(fontSize: 14, color: Colors.white70)),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 20, offset: const Offset(0, 8))],
              ),
              child: Column(children: [
                TextField(
                  controller: _cityController,
                  decoration: InputDecoration(
                    hintText: 'City, area or landmark',
                    hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                    prefixIcon: const Icon(Icons.location_on_outlined, color: _hotelColor, size: 20),
                    filled: true, fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: GestureDetector(
                    onTap: () => _pickDate(true),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(14)),
                      child: Row(children: [
                        const Icon(Icons.calendar_today, size: 16, color: _hotelColor),
                        const SizedBox(width: 8),
                        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('Check-in', style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.w600)),
                          Text(_fmt(_checkIn), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                        ]),
                      ]),
                    ),
                  )),
                  const SizedBox(width: 8),
                  Expanded(child: GestureDetector(
                    onTap: () => _pickDate(false),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(14)),
                      child: Row(children: [
                        const Icon(Icons.calendar_today, size: 16, color: _hotelColor),
                        const SizedBox(width: 8),
                        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('Check-out', style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.w600)),
                          Text(_fmt(_checkOut), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                        ]),
                      ]),
                    ),
                  )),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(14)),
                    child: Row(children: [
                      const Icon(Icons.people_outline, size: 16, color: _hotelColor),
                      const SizedBox(width: 8),
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Guests', style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.w600)),
                        Text('$_guests guests', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      ]),
                      const Spacer(),
                      GestureDetector(onTap: () { if (_guests > 1) setState(() => _guests--); }, child: Icon(Icons.remove_circle_outline, size: 22, color: Colors.grey.shade400)),
                      const SizedBox(width: 6),
                      GestureDetector(onTap: () => setState(() => _guests++), child: const Icon(Icons.add_circle_outline, size: 22, color: _hotelColor)),
                    ]),
                  )),
                  const SizedBox(width: 8),
                  Expanded(child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(14)),
                    child: Row(children: [
                      const Icon(Icons.meeting_room_outlined, size: 16, color: _hotelColor),
                      const SizedBox(width: 8),
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Rooms', style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.w600)),
                        Text('$_rooms room${_rooms > 1 ? 's' : ''}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      ]),
                      const Spacer(),
                      GestureDetector(onTap: () { if (_rooms > 1) setState(() => _rooms--); }, child: Icon(Icons.remove_circle_outline, size: 22, color: Colors.grey.shade400)),
                      const SizedBox(width: 6),
                      GestureDetector(onTap: () => setState(() => _rooms++), child: const Icon(Icons.add_circle_outline, size: 22, color: _hotelColor)),
                    ]),
                  )),
                ]),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.pushNamed(context, AppRouter.hotelSearchResults, arguments: {'city': _cityController.text, 'guests': _guests, 'rooms': _rooms}),
                    icon: const Icon(Icons.search, size: 18),
                    label: const Text('Search Hotels', style: TextStyle(fontWeight: FontWeight.w800)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _hotelColor, foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 4,
                    ),
                  ),
                ),
              ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    final actions = [
      {'label': 'Deals', 'icon': Icons.local_fire_department, 'color': const Color(0xFFEF4444), 'route': AppRouter.hotelDeals},
      {'label': 'Trip Plan', 'icon': Icons.flight_takeoff, 'color': const Color(0xFF3B82F6), 'route': AppRouter.hotelTripPlanner},
      {'label': 'Compare', 'icon': Icons.compare_arrows, 'color': const Color(0xFF8B5CF6), 'route': AppRouter.hotelCompare},
      {'label': 'Alerts', 'icon': Icons.notifications_active, 'color': const Color(0xFFF59E0B), 'route': AppRouter.hotelPriceAlerts},
      {'label': 'Map', 'icon': Icons.map_outlined, 'color': const Color(0xFF10B981), 'route': AppRouter.hotelMapSearch},
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: actions.map((a) => GestureDetector(
          onTap: () => Navigator.pushNamed(context, a['route'] as String),
          child: Column(children: [
            Container(
              width: 50, height: 50,
              decoration: BoxDecoration(
                color: (a['color'] as Color).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(a['icon'] as IconData, color: a['color'] as Color, size: 24),
            ),
            const SizedBox(height: 6),
            Text(a['label'] as String, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
          ]),
        )).toList(),
      ),
    );
  }

  Widget _buildCities() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.location_on, size: 18, color: _hotelColor),
            SizedBox(width: 6),
            Text('Popular Destinations', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          ]),
          const SizedBox(height: 14),
          SizedBox(
            height: 100,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _popularCities.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, i) {
                final c = _popularCities[i];
                final gradientColors = c['gradient'] as List<Color>;
                return GestureDetector(
                  onTap: () => Navigator.pushNamed(context, AppRouter.hotelSearchResults, arguments: {'city': c['name']}),
                  child: Container(
                    width: 100,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: gradientColors),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(c['flag'] as String, style: const TextStyle(fontSize: 20)),
                        const SizedBox(height: 4),
                        Text(c['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                        Text('${c['hotels']} hotels', style: TextStyle(fontSize: 10, color: Colors.white.withValues(alpha: 0.8))),
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

  Widget _buildFeatured() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.auto_awesome, size: 18, color: _hotelColor),
            SizedBox(width: 6),
            Text('Featured Hotels', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          ]),
          const SizedBox(height: 14),
          ..._featuredHotels.map((h) => GestureDetector(
            onTap: () => Navigator.pushNamed(context, AppRouter.hotelDetail, arguments: h),
            child: Container(
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 12, offset: const Offset(0, 4))],
                border: Border.all(color: const Color(0xFFF1F5F9)),
              ),
              child: Column(children: [
                Container(
                  height: 130,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [_hotelColor.withValues(alpha: 0.1), const Color(0xFFFFF7ED)]),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  ),
                  child: Stack(children: [
                    Center(child: Text(h['emoji'] as String, style: const TextStyle(fontSize: 50))),
                    if (h['offer'] != null) Positioned(top: 10, left: 10, child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: _hotelColor, borderRadius: BorderRadius.circular(8)),
                      child: Text(h['offer'] as String, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                    )),
                    Positioned(top: 10, right: 10, child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.9), borderRadius: BorderRadius.circular(8)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.star, size: 12, color: Color(0xFFF59E0B)),
                        const SizedBox(width: 2),
                        Text('${h['rating']}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                      ]),
                    )),
                  ]),
                ),
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(h['name'] as String, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 3),
                      Row(children: [
                        const Icon(Icons.location_on, size: 12, color: Colors.grey),
                        const SizedBox(width: 3),
                        Text(h['city'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                        const SizedBox(width: 8),
                        Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: _hotelColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)), child: Text(h['type'] as String, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: _hotelColor))),
                      ]),
                    ])),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('${h['currency']} ${h['price']}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
                      Text('/ night', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                    ]),
                  ]),
                ),
              ]),
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildTrending() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.trending_up, size: 18, color: _hotelColor),
            SizedBox(width: 6),
            Text('Trending Now', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          ]),
          const SizedBox(height: 14),
          SizedBox(
            height: 190,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _trendingHotels.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (_, i) {
                final h = _trendingHotels[i];
                return GestureDetector(
                  onTap: () => Navigator.pushNamed(context, AppRouter.hotelDetail, arguments: h),
                  child: Container(
                    width: 200,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)],
                    ),
                    child: Column(children: [
                      Container(
                        height: 100,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [_hotelColor.withValues(alpha: 0.08), const Color(0xFFFFF7ED)]),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                        ),
                        child: Stack(children: [
                          Center(child: Text(h['emoji'] as String, style: const TextStyle(fontSize: 40))),
                          Positioned(top: 8, left: 8, child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(8)),
                            child: Text(h['tag'] as String, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
                          )),
                        ]),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(10),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(h['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
                          Row(children: [
                            const Icon(Icons.star_rounded, size: 12, color: Color(0xFFF59E0B)),
                            Text(' ${h['rating']} (${h['reviews']})', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                          ]),
                          const SizedBox(height: 4),
                          Text('${h['currency']} ${h['price']}/night', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: _hotelColor)),
                        ]),
                      ),
                    ]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNearby() {
    return BlocBuilder<HotelBloc, HotelState>(
      builder: (context, state) {
        final hotels = state.nearbyHotels.isNotEmpty ? state.nearbyHotels : _nearbyHotels;
        final isSearching = _gpsLoading || state.status == HotelStatus.searching;

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                const Icon(Icons.near_me, size: 18, color: _hotelColor),
                const SizedBox(width: 6),
                const Text('Near You', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                if (isSearching) ...[
                  const SizedBox(width: 8),
                  const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: _hotelColor)),
                ],
              ]),
              const SizedBox(height: 14),
              ...hotels.map((h) {
                final name = (h['name'] ?? 'Hotel').toString();
                final emoji = (h['emoji'] ?? '🏨').toString();
                final distance = (h['distance'] ?? '').toString();
                final rating = h['rating'] ?? 0.0;
                final currency = (h['currency'] ?? '\$').toString();
                final price = h['price'] ?? 0;
                return GestureDetector(
                  onTap: () => Navigator.pushNamed(context, AppRouter.hotelDetail, arguments: h),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFF1F5F9)),
                    ),
                    child: Row(children: [
                      Container(
                        width: 50, height: 50,
                        decoration: BoxDecoration(color: _hotelColor.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                        child: Center(child: Text(emoji, style: const TextStyle(fontSize: 24))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                        Row(children: [
                          Icon(Icons.location_on, size: 12, color: Colors.grey.shade400),
                          Flexible(child: Text(' $distance', style: TextStyle(fontSize: 12, color: Colors.grey.shade500), overflow: TextOverflow.ellipsis)),
                          const SizedBox(width: 8),
                          const Icon(Icons.star_rounded, size: 12, color: Color(0xFFF59E0B)),
                          Text(' $rating', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ]),
                      ])),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text('$currency $price', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: _hotelColor)),
                        Text('/night', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                      ]),
                    ]),
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCollections() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.collections_bookmark, size: 18, color: _hotelColor),
            SizedBox(width: 6),
            Text('Collections', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          ]),
          const SizedBox(height: 14),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 0.85,
            ),
            itemCount: _collections.length,
            itemBuilder: (_, i) {
              final c = _collections[i];
              final gradient = c['gradient'] as List<Color>;
              return GestureDetector(
                onTap: () => Navigator.pushNamed(context, AppRouter.hotelSearchResults, arguments: {'type': c['label']}),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: gradient),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  padding: const EdgeInsets.all(8),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(c['emoji'] as String, style: const TextStyle(fontSize: 24)),
                      const SizedBox(height: 4),
                      Text(c['label'] as String, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white), textAlign: TextAlign.center, maxLines: 2),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildHotDeals() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.local_fire_department, size: 18, color: _hotelColor),
            const SizedBox(width: 6),
            const Expanded(child: Text('Hot Deals', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)))),
            GestureDetector(
              onTap: () => Navigator.pushNamed(context, AppRouter.hotelDeals),
              child: const Text('View All →', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _hotelColor)),
            ),
          ]),
          const SizedBox(height: 14),
          SizedBox(
            height: 165,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _hotDeals.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (_, i) {
                final d = _hotDeals[i];
                return GestureDetector(
                  onTap: () => Navigator.pushNamed(context, AppRouter.hotelDetail, arguments: {'name': d['hotel'], 'price': d['price'], 'currency': d['currency'], 'emoji': d['emoji'], 'offer': d['discount'], 'type': 'Deal', 'stars': 5, 'rating': 4.7, 'amenities': ['WiFi', 'Pool', 'Spa', 'Restaurant'], 'reviewCount': 500, 'distance': 'City Center', 'description': '${d['title']} — An exclusive limited-time offer at ${d['hotel']}. Book now to enjoy premium hospitality at unbeatable prices.'}),
                  child: Container(
                    width: 260,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)],
                    ),
                    child: Column(children: [
                      Container(
                        height: 80,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [_hotelColor.withValues(alpha: 0.08), const Color(0xFFFFF1F2)]),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                        ),
                        child: Stack(children: [
                          Center(child: Text(d['emoji'] as String, style: const TextStyle(fontSize: 36))),
                          Positioned(top: 8, left: 8, child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: _hotelColor, borderRadius: BorderRadius.circular(8)),
                            child: Text(d['discount'] as String, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white)),
                          )),
                          Positioned(top: 8, right: 8, child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(8)),
                            child: Row(mainAxisSize: MainAxisSize.min, children: [
                              const Icon(Icons.timer, size: 10, color: Colors.white),
                              const SizedBox(width: 3),
                              Text(d['expires'] as String, style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w600)),
                            ]),
                          )),
                        ]),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(10),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(d['title'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
                          Row(children: [
                            Text('${d['currency']} ${d['price']}/night', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: _hotelColor)),
                            if ((d['originalPrice'] as int) > (d['price'] as int)) ...[
                              const SizedBox(width: 6),
                              Text('${d['currency']} ${d['originalPrice']}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400, decoration: TextDecoration.lineThrough)),
                            ],
                          ]),
                        ]),
                      ),
                    ]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUSP() {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E293B)]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(children: [
        const Text('Why KARTSEEK Hotels?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
        const SizedBox(height: 16),
        ...[
          ['🛡️', 'Best Price Guarantee', 'We match any lower price'],
          ['⭐', 'Loyalty Points', 'Earn points on every stay'],
          ['🔄', 'Free Cancellation', 'Cancel 24h before check-in'],
          ['✅', 'Verified Reviews', 'Real reviews from guests'],
        ].map((f) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(children: [
            Text(f[0], style: const TextStyle(fontSize: 22)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(f[1], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)),
              Text(f[2], style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.5))),
            ])),
          ]),
        )),
      ]),
    );
  }

  Widget _buildQuickLinks() {
    final links = [
      {'label': 'My Bookings', 'icon': Icons.book_outlined, 'route': AppRouter.hotelMyBookings},
      {'label': 'Trip Planner', 'icon': Icons.flight_takeoff_outlined, 'route': AppRouter.hotelTripPlanner},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Quick Links', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          ...links.map((l) => GestureDetector(
            onTap: () => Navigator.pushNamed(context, l['route'] as String),
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFF1F5F9)),
              ),
              child: Row(children: [
                Icon(l['icon'] as IconData, color: _hotelColor, size: 20),
                const SizedBox(width: 12),
                Text(l['label'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                const Spacer(),
                const Icon(Icons.chevron_right, color: Color(0xFF94A3B8), size: 20),
              ]),
            ),
          )),
        ],
      ),
    );
  }
}
