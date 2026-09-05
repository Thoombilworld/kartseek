import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';

/// Hotel Room Types Screen — Browse and select room types.
///
/// Features:
///   • Room type cards with photos, pricing, amenities
///   • Per-room capacity, bed type, view info
///   • "Select Room" button that navigates to checkout
///   • Expandable amenity lists
class HotelRoomTypesScreen extends StatelessWidget {
  final String hotelId;
  final String hotelName;

  const HotelRoomTypesScreen({
    super.key,
    required this.hotelId,
    this.hotelName = 'Hotel',
  });

  static const _color = AppTheme.hotelColor;

  static const _rooms = [
    {'type': 'Standard Room', 'emoji': '🛏️', 'price': 180, 'originalPrice': 220, 'currency': 'QAR', 'capacity': 2, 'bed': 'Queen Bed', 'size': '28 m²', 'view': 'City View', 'amenities': ['WiFi', 'AC', 'TV', 'Mini Bar', 'Safe'], 'breakfast': false, 'cancellation': 'Free until 24h before', 'gradient': [Color(0xFFF0F9FF), Color(0xFFE0F2FE)]},
    {'type': 'Deluxe Room', 'emoji': '🌟', 'price': 280, 'originalPrice': 350, 'currency': 'QAR', 'capacity': 2, 'bed': 'King Bed', 'size': '35 m²', 'view': 'Sea View', 'amenities': ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Safe', 'Bathrobe', 'Nespresso'], 'breakfast': true, 'cancellation': 'Free until 48h before', 'gradient': [Color(0xFFFEF3C7), Color(0xFFFDE68A)]},
    {'type': 'Junior Suite', 'emoji': '👑', 'price': 450, 'originalPrice': 550, 'currency': 'QAR', 'capacity': 3, 'bed': 'King Bed + Sofa', 'size': '48 m²', 'view': 'Panoramic View', 'amenities': ['WiFi', 'AC', '65" TV', 'Living Area', 'Mini Bar', 'Safe', 'Bathrobe', 'Nespresso', 'Rain Shower'], 'breakfast': true, 'cancellation': 'Free until 72h before', 'gradient': [Color(0xFFF5F3FF), Color(0xFFEDE9FE)]},
    {'type': 'Presidential Suite', 'emoji': '🏰', 'price': 950, 'originalPrice': 1200, 'currency': 'QAR', 'capacity': 4, 'bed': 'King Bed + 2 Singles', 'size': '85 m²', 'view': '360° City & Sea', 'amenities': ['WiFi', 'AC', '75" TV', 'Living Room', 'Dining Area', 'Kitchen', 'Jacuzzi', 'Butler Service', 'Airport Transfer'], 'breakfast': true, 'cancellation': 'Non-refundable', 'gradient': [Color(0xFFFFF1F2), Color(0xFFFFE4E6)]},
    {'type': 'Family Room', 'emoji': '👨‍👩‍👧‍👦', 'price': 380, 'originalPrice': 420, 'currency': 'QAR', 'capacity': 4, 'bed': 'King + Bunk Beds', 'size': '42 m²', 'view': 'Garden View', 'amenities': ['WiFi', 'AC', 'TV', 'Mini Fridge', 'Kids Kit', 'Extra Towels', 'Baby Crib (on request)'], 'breakfast': true, 'cancellation': 'Free until 48h before', 'gradient': [Color(0xFFF0FDF4), Color(0xFFDCFCE7)]},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: const Text('Select Room', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        physics: const BouncingScrollPhysics(),
        itemCount: _rooms.length,
        itemBuilder: (_, i) => _buildRoomCard(context, _rooms[i]),
      ),
    );
  }

  Widget _buildRoomCard(BuildContext context, Map<String, dynamic> room) {
    final gradient = room['gradient'] as List<Color>;
    final price = room['price'] as int;
    final originalPrice = room['originalPrice'] as int;
    final hasDiscount = originalPrice > price;
    final amenities = room['amenities'] as List;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          // Room image area
          Container(
            height: 140,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: gradient, begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Stack(
              children: [
                Center(child: Text(room['emoji'] as String, style: const TextStyle(fontSize: 64))),
                if (hasDiscount)
                  Positioned(
                    top: 12, right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: _color, borderRadius: BorderRadius.circular(12)),
                      child: Text('${((1 - price / originalPrice) * 100).toInt()}% OFF', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
                    ),
                  ),
                if (room['breakfast'] == true)
                  Positioned(
                    top: 12, left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: const Color(0xFF059669), borderRadius: BorderRadius.circular(12)),
                      child: const Text('🍳 Breakfast Included', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
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
                // Title and price
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: Text(room['type'] as String, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)))),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      if (hasDiscount) Text('${room['currency']} $originalPrice', style: TextStyle(fontSize: 12, color: Colors.grey.shade400, decoration: TextDecoration.lineThrough)),
                      Text('${room['currency']} $price', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: _color)),
                      Text('/night', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                    ]),
                  ],
                ),
                const SizedBox(height: 12),
                // Details row
                Row(children: [
                  _infoChip(Icons.people_outline, '${room['capacity']} guests'),
                  const SizedBox(width: 8),
                  _infoChip(Icons.bed_outlined, room['bed'] as String),
                  const SizedBox(width: 8),
                  _infoChip(Icons.square_foot, room['size'] as String),
                ]),
                const SizedBox(height: 8),
                _infoChip(Icons.visibility_outlined, room['view'] as String),
                const SizedBox(height: 12),
                // Amenities
                Wrap(
                  spacing: 6, runSpacing: 4,
                  children: amenities.take(6).map<Widget>((a) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                    child: Text(a as String, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                  )).toList(),
                ),
                if (amenities.length > 6)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('+${amenities.length - 6} more amenities', style: const TextStyle(fontSize: 11, color: _color, fontWeight: FontWeight.w600)),
                  ),
                const SizedBox(height: 8),
                // Cancellation
                Row(children: [
                  Icon(Icons.event_available, size: 14, color: room['cancellation'] == 'Non-refundable' ? Colors.red.shade400 : const Color(0xFF059669)),
                  const SizedBox(width: 4),
                  Text(room['cancellation'] as String, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: room['cancellation'] == 'Non-refundable' ? Colors.red.shade400 : const Color(0xFF059669))),
                ]),
                const SizedBox(height: 14),
                // Select button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, AppRouter.hotelCheckout, arguments: {
                      'hotelId': hotelId,
                      'hotelName': hotelName,
                      'roomType': room['type'],
                      'price': price,
                      'currency': room['currency'],
                    }),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _color,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text('Select Room', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoChip(IconData icon, String text) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 14, color: const Color(0xFF94A3B8)),
      const SizedBox(width: 4),
      Flexible(child: Text(text, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
    ]);
  }
}
