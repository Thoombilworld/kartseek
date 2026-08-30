import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

/// Hotel Detail Screen — Full hotel info, rooms, amenities, reviews, description.
class HotelDetailScreen extends StatefulWidget {
  final Map<String, dynamic> hotelData;
  const HotelDetailScreen({super.key, required this.hotelData});

  @override
  State<HotelDetailScreen> createState() => _HotelDetailScreenState();
}

class _HotelDetailScreenState extends State<HotelDetailScreen> {
  int _selectedRoom = 0;
  static const _hotelColor = AppTheme.hotelColor;

  static final List<Map<String, dynamic>> _defaultAmenities = [
    {'name': 'WiFi', 'icon': Icons.wifi},
    {'name': 'Pool', 'icon': Icons.pool},
    {'name': 'Spa', 'icon': Icons.spa},
    {'name': 'Gym', 'icon': Icons.fitness_center},
    {'name': 'Restaurant', 'icon': Icons.restaurant},
    {'name': 'Parking', 'icon': Icons.local_parking},
  ];

  static final List<Map<String, dynamic>> _rooms = [
    {'type': 'Standard Room', 'multiplier': 1.0, 'size': '28 sqm', 'bed': '1 Queen Bed', 'capacity': 2, 'features': 'WiFi, TV, Mini Bar, AC'},
    {'type': 'Deluxe Room', 'multiplier': 1.35, 'size': '36 sqm', 'bed': '1 King Bed', 'capacity': 2, 'features': 'WiFi, TV, Mini Bar, AC, City View, Bathtub'},
    {'type': 'Premium Suite', 'multiplier': 2.1, 'size': '52 sqm', 'bed': '1 King Bed + Lounge', 'capacity': 3, 'features': 'WiFi, TV, Mini Bar, AC, Living Room, Balcony, Butler'},
  ];

  IconData _amenityIcon(String name) {
    switch (name.toLowerCase()) {
      case 'wifi': return Icons.wifi;
      case 'pool': return Icons.pool;
      case 'spa': return Icons.spa;
      case 'gym': return Icons.fitness_center;
      case 'restaurant': return Icons.restaurant;
      case 'parking': return Icons.local_parking;
      case 'bar': return Icons.local_bar;
      case 'beach': return Icons.beach_access;
      case 'kids club': return Icons.child_care;
      case 'meeting room': return Icons.meeting_room;
      case 'concierge': return Icons.room_service;
      case 'lounge': return Icons.weekend;
      case 'desert safari': return Icons.terrain;
      default: return Icons.check_circle_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final hotel = widget.hotelData;
    final name = (hotel['name'] ?? 'Hotel').toString();
    final city = (hotel['city'] ?? '').toString();
    final ratingValue = hotel['rating'];
    final rating = ratingValue is num ? ratingValue.toDouble() : 0.0;
    final priceValue = hotel['price'];
    final basePrice = priceValue is num ? priceValue.toDouble() : 100.0;
    final currency = (hotel['currency'] ?? '\$').toString();
    final starsValue = hotel['stars'];
    final stars = (starsValue is int ? starsValue : 4).clamp(0, 5);
    final rawAmenities = hotel['amenities'];
    final reviewCountValue = hotel['reviewCount'];
    final reviewCount = reviewCountValue is int ? reviewCountValue : 0;
    final distance = (hotel['distance'] ?? '').toString();
    final emoji = (hotel['emoji'] ?? '🏨').toString();
    final type = (hotel['type'] ?? '').toString();
    final offer = hotel['offer']?.toString();
    final description = (hotel['description'] ?? 'Discover a wonderful stay at $name. Enjoy premium amenities, outstanding service, and a convenient location in $city.').toString();

    final selectedRoomData = _rooms[_selectedRoom];
    final multiplier = selectedRoomData['multiplier'] as double;
    final roomPrice = (basePrice * multiplier).round();

    // Build amenity widgets
    final List<Widget> amenityWidgets;
    if (rawAmenities is List && rawAmenities.isNotEmpty) {
      amenityWidgets = rawAmenities.map<Widget>((a) {
        final aName = a.toString();
        return _amenityChip(aName, _amenityIcon(aName));
      }).toList();
    } else {
      amenityWidgets = _defaultAmenities.map<Widget>((a) {
        return _amenityChip(a['name'] as String, a['icon'] as IconData);
      }).toList();
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: Column(
        children: [
          // ── Scrollable Content ──
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Hero Section ──
                  Stack(
                    children: [
                      Container(
                        width: double.infinity,
                        height: 280,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [_hotelColor.withValues(alpha: 0.15), const Color(0xFFFFF7ED)],
                          ),
                        ),
                        child: Center(child: Text(emoji, style: const TextStyle(fontSize: 90))),
                      ),
                      // Back button
                      Positioned(
                        top: MediaQuery.of(context).padding.top + 8,
                        left: 16,
                        child: GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(12)),
                            child: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
                          ),
                        ),
                      ),
                      // Favorite + Share
                      Positioned(
                        top: MediaQuery.of(context).padding.top + 8,
                        right: 16,
                        child: Row(children: [
                          GestureDetector(
                            onTap: () {},
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(12)),
                              child: const Icon(Icons.favorite_border, color: Colors.white, size: 20),
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () {},
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(12)),
                              child: const Icon(Icons.share, color: Colors.white, size: 20),
                            ),
                          ),
                        ]),
                      ),
                      // Offer badge
                      if (offer != null) Positioned(
                        bottom: 16, left: 16,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(color: _hotelColor, borderRadius: BorderRadius.circular(10)),
                          child: Text(offer, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
                        ),
                      ),
                      // Type badge
                      if (type.isNotEmpty) Positioned(
                        bottom: 16, right: 16,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.9), borderRadius: BorderRadius.circular(10)),
                          child: Text(type, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        ),
                      ),
                    ],
                  ),

                  // ── Hotel Info ──
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.all(20),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      // Stars
                      Row(children: [
                        ...List.generate(stars, (_) => const Icon(Icons.star, size: 16, color: Color(0xFFF59E0B))),
                        ...List.generate(5 - stars, (_) => Icon(Icons.star_border, size: 16, color: Colors.grey.shade300)),
                      ]),
                      const SizedBox(height: 6),
                      // Name
                      Text(name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                      const SizedBox(height: 4),
                      // Location
                      Row(children: [
                        const Icon(Icons.location_on, size: 14, color: Color(0xFF64748B)),
                        const SizedBox(width: 3),
                        Flexible(child: Text(
                          distance.isNotEmpty ? '$city  •  $distance' : city,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                          overflow: TextOverflow.ellipsis,
                        )),
                      ]),
                      const SizedBox(height: 12),
                      // Rating + Price
                      Row(children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            const Icon(Icons.star, size: 16, color: Color(0xFFF59E0B)),
                            const SizedBox(width: 4),
                            Text('$rating', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF92400E))),
                          ]),
                        ),
                        const SizedBox(width: 8),
                        Text('$reviewCount reviews', style: const TextStyle(fontSize: 13, color: _hotelColor, fontWeight: FontWeight.w600)),
                        const Spacer(),
                        Text('$currency ${basePrice.round()}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                        Text(' / night', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                      ]),
                    ]),
                  ),

                  // ── Quick Action Buttons ──
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Row(children: [
                      _actionButton(Icons.photo_library_outlined, 'Gallery', () => Navigator.pushNamed(context, AppRouter.hotelGallery, arguments: {'hotelId': hotel['id']?.toString() ?? '', 'hotelName': name})),
                      const SizedBox(width: 8),
                      _actionButton(Icons.reviews_outlined, 'Reviews', () => Navigator.pushNamed(context, AppRouter.hotelReviews, arguments: {'hotelId': hotel['id']?.toString() ?? '', 'hotelName': name, 'rating': rating})),
                      const SizedBox(width: 8),
                      _actionButton(Icons.king_bed_outlined, 'Rooms', () => Navigator.pushNamed(context, AppRouter.hotelRoomTypes, arguments: {'hotelId': hotel['id']?.toString() ?? '', 'hotelName': name})),
                      const SizedBox(width: 8),
                      _actionButton(Icons.map_outlined, 'Map', () => Navigator.pushNamed(context, AppRouter.hotelMapSearch)),
                    ]),
                  ),

                  const SizedBox(height: 8),

                  // ── Description ──
                  _sectionCard('About This Hotel', [
                    Text(description, style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.6)),
                  ]),

                  const SizedBox(height: 12),

                  // ── Amenities ──
                  _sectionCard('Amenities & Facilities', [
                    Wrap(spacing: 8, runSpacing: 8, children: amenityWidgets),
                  ]),

                  const SizedBox(height: 12),

                  // ── Highlights ──
                  _sectionCard('Highlights', [
                    _highlightRow('🏆', 'Top Rated', 'Rated $rating by $reviewCount guests'),
                    _highlightRow('📍', 'Great Location', distance.isNotEmpty ? distance : 'Conveniently located'),
                    _highlightRow('🛎️', '$type Hotel', '$stars-star property in $city'),
                    if (offer != null) _highlightRow('🎉', 'Special Offer', offer),
                  ]),

                  const SizedBox(height: 12),

                  // ── Room Types ──
                  _sectionCard('Choose Your Room', List.generate(_rooms.length, (i) {
                    final room = _rooms[i];
                    final roomMultiplier = room['multiplier'] as double;
                    final price = (basePrice * roomMultiplier).round();
                    final selected = _selectedRoom == i;
                    final features = (room['features'] as String).split(', ');
                    return GestureDetector(
                      onTap: () => setState(() => _selectedRoom = i),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: EdgeInsets.only(bottom: i < _rooms.length - 1 ? 10 : 0),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: selected ? _hotelColor.withValues(alpha: 0.05) : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: selected ? _hotelColor : const Color(0xFFE2E8F0), width: selected ? 2 : 1),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Container(
                              width: 56, height: 56,
                              decoration: BoxDecoration(color: _hotelColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                              child: const Icon(Icons.king_bed, color: _hotelColor, size: 26),
                            ),
                            const SizedBox(width: 12),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(room['type'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                              const SizedBox(height: 2),
                              Text('${room['bed']}  •  ${room['size']}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                              const SizedBox(height: 2),
                              Row(children: [
                                Icon(Icons.person, size: 12, color: Colors.grey.shade400),
                                Text(' ${room['capacity']} guests', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                              ]),
                            ])),
                            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                              Text('$currency $price', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                              Text('/ night', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                            ]),
                          ]),
                          if (selected) ...[
                            const SizedBox(height: 10),
                            Wrap(spacing: 6, runSpacing: 4, children: features.map((f) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(color: _hotelColor.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(6)),
                              child: Text(f.trim(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _hotelColor)),
                            )).toList()),
                          ],
                        ]),
                      ),
                    );
                  })),

                  const SizedBox(height: 12),

                  // ── Policies ──
                  _sectionCard('Policies', [
                    _policyRow(Icons.cancel_outlined, 'Free cancellation up to 24h before check-in'),
                    _policyRow(Icons.access_time, 'Check-in: 2:00 PM  •  Check-out: 12:00 PM'),
                    _policyRow(Icons.child_care, 'Children under 6 stay free'),
                    _policyRow(Icons.pets, 'No pets allowed'),
                    _policyRow(Icons.credit_card, 'All major credit cards accepted'),
                  ]),

                  const SizedBox(height: 12),

                  // ── Guest Reviews ──
                  _sectionCard('Guest Reviews', [
                    _reviewItem('Ahmad K.', 5, 'Amazing stay! The staff was incredibly helpful and the room was spotlessly clean. Will definitely return.', '1 week ago'),
                    _reviewItem('Maria S.', 4, 'Great location, clean rooms. Breakfast could be better but overall a wonderful experience.', '2 weeks ago'),
                    _reviewItem('James T.', 5, 'Outstanding service from check-in to check-out. The spa facilities were world-class.', '3 weeks ago'),
                    GestureDetector(
                      onTap: () => Navigator.pushNamed(context, AppRouter.hotelReviews, arguments: {'hotelId': hotel['id']?.toString() ?? '', 'hotelName': name, 'rating': rating}),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        alignment: Alignment.center,
                        child: const Text('View All Reviews →', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _hotelColor)),
                      ),
                    ),
                  ]),

                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),

          // ── Bottom CTA (always visible) ──
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, -2))],
            ),
            child: SafeArea(
              top: false,
              child: Row(children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                  Text('$currency $roomPrice', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                  Text('${selectedRoomData['type']} / night', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                ]),
                const SizedBox(width: 16),
                Expanded(child: ElevatedButton(
                  onPressed: () {
                    final bookingArgs = <String, dynamic>{
                      'name': name,
                      'city': city,
                      'price': roomPrice,
                      'currency': currency,
                      'type': type,
                      'emoji': emoji,
                      'selectedRoom': Map<String, dynamic>.from(selectedRoomData),
                      'roomPrice': roomPrice,
                    };
                    Navigator.pushNamed(context, CustomerRouter.hotelCheckout, arguments: bookingArgs);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _hotelColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Book Now', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                )),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  // ── Helper Widgets ──────────────────────────────────────────────────────

  Widget _actionButton(IconData icon, String label, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: _hotelColor.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _hotelColor.withValues(alpha: 0.15)),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 20, color: _hotelColor),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _hotelColor)),
          ]),
        ),
      ),
    );
  }

  Widget _sectionCard(String title, List<Widget> children) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        const SizedBox(height: 12),
        ...children,
      ]),
    );
  }

  Widget _amenityChip(String name, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16, color: _hotelColor),
        const SizedBox(width: 6),
        Text(name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
      ]),
    );
  }

  Widget _policyRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 16, color: const Color(0xFF64748B)),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.4))),
      ]),
    );
  }

  Widget _highlightRow(String emojiChar, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(children: [
        Text(emojiChar, style: const TextStyle(fontSize: 20)),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
          Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
        ])),
      ]),
    );
  }

  Widget _reviewItem(String name, int stars, String text, String date) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(color: _hotelColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16)),
            child: Center(child: Text(name[0], style: const TextStyle(fontWeight: FontWeight.w800, color: _hotelColor, fontSize: 13))),
          ),
          const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            Text(date, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
          ])),
          ...List.generate(stars, (_) => const Icon(Icons.star, size: 12, color: Color(0xFFF59E0B))),
        ]),
        const SizedBox(height: 8),
        Text(text, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4)),
      ]),
    );
  }
}
