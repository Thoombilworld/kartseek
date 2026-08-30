import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';

/// Hotel Deals Screen — Flash deals with countdown timers.
///
/// Features:
///   • Live countdown timers for deal expiry
///   • Original vs discounted pricing
///   • Filter by city, hotel type
///   • Deal cards with offer badges
class HotelDealsScreen extends StatefulWidget {
  const HotelDealsScreen({super.key});

  @override
  State<HotelDealsScreen> createState() => _HotelDealsScreenState();
}

class _HotelDealsScreenState extends State<HotelDealsScreen> {
  Timer? _timer;
  late DateTime _now;
  late DateTime _startTime;
  String _filterCity = 'All';

  static const _color = AppTheme.hotelColor;

  static final _deals = [
    {'title': 'Dubai Weekend Escape', 'hotel': 'The Grand Palace Hotel', 'city': 'Dubai', 'discount': '30% OFF', 'price': 315, 'originalPrice': 450, 'currency': 'AED', 'emoji': '🏰', 'expiresIn': const Duration(hours: 47, minutes: 23), 'type': 'Luxury', 'rating': 4.8, 'gradient': [const Color(0xFFFFF1F2), const Color(0xFFFFE4E6)]},
    {'title': 'Mumbai Monsoon Magic', 'hotel': 'Seaside Family Resort', 'city': 'Mumbai', 'discount': 'FREE Breakfast', 'price': 8500, 'originalPrice': 8500, 'currency': '₹', 'emoji': '🏖️', 'expiresIn': const Duration(days: 4, hours: 12), 'type': 'Resort', 'rating': 4.7, 'gradient': [const Color(0xFFF0FDFA), const Color(0xFFCCFBF1)]},
    {'title': 'London Staycation', 'hotel': 'Heritage Boutique Hotel', 'city': 'London', 'discount': '25% OFF', 'price': 240, 'originalPrice': 320, 'currency': '£', 'emoji': '🏛️', 'expiresIn': const Duration(hours: 71, minutes: 45), 'type': 'Boutique', 'rating': 4.9, 'gradient': [const Color(0xFFF5F3FF), const Color(0xFFEDE9FE)]},
    {'title': 'Doha Business Special', 'hotel': 'KARTSEEK Business Suites', 'city': 'Doha', 'discount': '40% OFF', 'price': 168, 'originalPrice': 280, 'currency': 'QAR', 'emoji': '🏢', 'expiresIn': const Duration(hours: 23, minutes: 59), 'type': 'Business', 'rating': 4.6, 'gradient': [const Color(0xFFF0F9FF), const Color(0xFFE0F2FE)]},
    {'title': 'Riyadh Family Fun', 'hotel': 'Royal Palms Resort', 'city': 'Riyadh', 'discount': '20% OFF + Kids Free', 'price': 96, 'originalPrice': 120, 'currency': 'SAR', 'emoji': '🌴', 'expiresIn': const Duration(days: 2, hours: 8), 'type': 'Family', 'rating': 4.5, 'gradient': [const Color(0xFFF0FDF4), const Color(0xFFDCFCE7)]},
    {'title': 'Muscat Serenity', 'hotel': 'Ocean View Spa Resort', 'city': 'Muscat', 'discount': '35% OFF', 'price': 29, 'originalPrice': 45, 'currency': 'OMR', 'emoji': '🌊', 'expiresIn': const Duration(days: 1, hours: 18), 'type': 'Resort', 'rating': 4.4, 'gradient': [const Color(0xFFECFDF5), const Color(0xFFA7F3D0)]},
  ];

  static const _cities = ['All', 'Dubai', 'Doha', 'Mumbai', 'London', 'Riyadh', 'Muscat'];

  List<Map<String, dynamic>> get _filteredDeals {
    if (_filterCity == 'All') return _deals;
    return _deals.where((d) => d['city'] == _filterCity).toList();
  }

  @override
  void initState() {
    super.initState();
    _startTime = DateTime.now();
    _now = _startTime;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _formatCountdown(Duration expiresIn) {
    final elapsed = _now.difference(_startTime);
    final remaining = expiresIn - elapsed;
    if (remaining.isNegative) return 'Expired';
    final h = remaining.inHours;
    final m = remaining.inMinutes % 60;
    final s = remaining.inSeconds % 60;
    if (h > 24) return '${h ~/ 24}d ${h % 24}h ${m}m';
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: const Text('🔥 Hot Deals', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
      ),
      body: Column(
        children: [
          // City filter
          SizedBox(
            height: 50,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _cities.length,
              itemBuilder: (_, i) {
                final city = _cities[i];
                final selected = city == _filterCity;
                return GestureDetector(
                  onTap: () => setState(() => _filterCity = city),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected ? _color : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: selected ? _color : const Color(0xFFE2E8F0)),
                    ),
                    child: Text(city, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: selected ? Colors.white : const Color(0xFF64748B))),
                  ),
                );
              },
            ),
          ),
          // Deals list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              physics: const BouncingScrollPhysics(),
              itemCount: _filteredDeals.length,
              itemBuilder: (_, i) => _buildDealCard(_filteredDeals[i]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDealCard(Map<String, dynamic> deal) {
    final gradient = deal['gradient'] as List<Color>;
    final expiresIn = deal['expiresIn'] as Duration;
    final price = deal['price'] as int;
    final originalPrice = deal['originalPrice'] as int;

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.hotelDetail, arguments: {
        'name': deal['hotel'],
        'city': deal['city'],
        'rating': deal['rating'],
        'price': deal['price'],
        'currency': deal['currency'],
        'emoji': deal['emoji'],
        'type': deal['type'],
        'stars': deal['type'] == 'Luxury' || deal['type'] == 'Resort' ? 5 : 4,
        'offer': deal['discount'],
        'amenities': ['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Parking'],
        'reviewCount': 500,
        'distance': 'City Center',
        'description': '${deal['title']} — An exclusive limited-time offer at ${deal['hotel']}. Book now to enjoy premium hospitality at unbeatable prices.',
      }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(
          children: [
            // Top image area
            Container(
              height: 130,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: gradient),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Stack(
                children: [
                  Center(child: Text(deal['emoji'] as String, style: const TextStyle(fontSize: 56))),
                  // Discount badge
                  Positioned(
                    top: 12, left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(color: _color, borderRadius: BorderRadius.circular(12)),
                      child: Text(deal['discount'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                    ),
                  ),
                  // Countdown timer
                  Positioned(
                    top: 12, right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.timer_outlined, color: Colors.white, size: 14),
                        const SizedBox(width: 4),
                        Text(_formatCountdown(expiresIn), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white, fontFamily: 'monospace')),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(deal['title'] as String, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                  const SizedBox(height: 4),
                  Text(deal['hotel'] as String, style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(children: [
                        Icon(Icons.location_on_outlined, size: 14, color: Colors.grey.shade400),
                        const SizedBox(width: 2),
                        Text(deal['city'] as String, style: TextStyle(fontSize: 13, color: Colors.grey.shade500, fontWeight: FontWeight.w600)),
                        const SizedBox(width: 12),
                        const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B)),
                        const SizedBox(width: 2),
                        Text('${deal['rating']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      ]),
                      Row(children: [
                        if (originalPrice > price) Text('${deal['currency']} $originalPrice', style: TextStyle(fontSize: 13, color: Colors.grey.shade400, decoration: TextDecoration.lineThrough)),
                        if (originalPrice > price) const SizedBox(width: 6),
                        Text('${deal['currency']} $price', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: _color)),
                        Text('/night', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                      ]),
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
