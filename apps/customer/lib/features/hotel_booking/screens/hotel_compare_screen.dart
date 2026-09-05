import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Hotel Compare Screen — Side-by-side comparison of hotels.
///
/// Features:
///   • Compare 2-3 hotels side-by-side
///   • Compare: price, rating, amenities, location, room types
///   • "Book Best" CTA
///   • Add/remove hotels from comparison
class HotelCompareScreen extends StatefulWidget {
  final List<Map<String, dynamic>>? initialHotels;

  const HotelCompareScreen({super.key, this.initialHotels});

  @override
  State<HotelCompareScreen> createState() => _HotelCompareScreenState();
}

class _HotelCompareScreenState extends State<HotelCompareScreen> {
  static const _color = AppTheme.hotelColor;

  late List<Map<String, dynamic>> _hotels;

  static const _allHotels = [
    {'id': 'h1', 'name': 'Grand Palace', 'city': 'Dubai', 'emoji': '🏰', 'stars': 5, 'rating': 4.8, 'reviews': 1240, 'price': 450, 'currency': 'AED', 'wifi': true, 'pool': true, 'spa': true, 'gym': true, 'restaurant': true, 'parking': true, 'breakfast': true, 'roomService': true, 'airport': true, 'bar': true},
    {'id': 'h2', 'name': 'Business Suites', 'city': 'Doha', 'emoji': '🏢', 'stars': 4, 'rating': 4.6, 'reviews': 890, 'price': 280, 'currency': 'QAR', 'wifi': true, 'pool': false, 'spa': false, 'gym': true, 'restaurant': true, 'parking': true, 'breakfast': false, 'roomService': true, 'airport': false, 'bar': true},
    {'id': 'h3', 'name': 'Seaside Resort', 'city': 'Mumbai', 'emoji': '🏖️', 'stars': 5, 'rating': 4.7, 'reviews': 2100, 'price': 8500, 'currency': '₹', 'wifi': true, 'pool': true, 'spa': true, 'gym': true, 'restaurant': true, 'parking': true, 'breakfast': true, 'roomService': true, 'airport': true, 'bar': false},
  ];

  @override
  void initState() {
    super.initState();
    _hotels = widget.initialHotels ?? List.from(_allHotels.take(2));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: const Text('⚖️ Compare Hotels', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          children: [
            // Hotel headers
            _buildHeaderRow(),
            const SizedBox(height: 8),
            // Comparison rows
            _buildComparisonSection('Rating', _hotels.map(_ratingWidget).toList()),
            _buildComparisonSection('Price/Night', _hotels.map((h) => Text('${h['currency']} ${h['price']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: _color))).toList()),
            _buildComparisonSection('Star Rating', _hotels.map((h) => Row(mainAxisSize: MainAxisSize.min, children: List.generate(h['stars'] as int, (_) => const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B))))).toList()),
            _buildComparisonSection('Reviews', _hotels.map((h) => Text('${h['reviews']} reviews', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))).toList()),
            const Padding(padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12), child: Align(alignment: Alignment.centerLeft, child: Text('Amenities', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)))),
            _buildAmenityRow('WiFi', 'wifi', Icons.wifi),
            _buildAmenityRow('Pool', 'pool', Icons.pool),
            _buildAmenityRow('Spa', 'spa', Icons.spa),
            _buildAmenityRow('Gym', 'gym', Icons.fitness_center),
            _buildAmenityRow('Restaurant', 'restaurant', Icons.restaurant),
            _buildAmenityRow('Parking', 'parking', Icons.local_parking),
            _buildAmenityRow('Breakfast', 'breakfast', Icons.free_breakfast),
            _buildAmenityRow('Room Service', 'roomService', Icons.room_service),
            _buildAmenityRow('Airport Shuttle', 'airport', Icons.airport_shuttle),
            _buildAmenityRow('Bar', 'bar', Icons.local_bar),
            const SizedBox(height: 20),
            // Add hotel button
            if (_hotels.length < 3) _buildAddHotelButton(),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderRow() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.white,
      child: Row(
        children: _hotels.map((h) => Expanded(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _color.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(children: [
              Text(h['emoji'] as String, style: const TextStyle(fontSize: 36)),
              const SizedBox(height: 6),
              Text(h['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800), textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
              Text(h['city'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            ]),
          ),
        )).toList(),
      ),
    );
  }

  Widget _ratingWidget(Map<String, dynamic> h) {
    final rating = (h['rating'] as num).toDouble();
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: rating >= 4.5 ? const Color(0xFF059669) : const Color(0xFFF59E0B), borderRadius: BorderRadius.circular(8)),
        child: Text(rating.toStringAsFixed(1), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
      ),
    ]);
  }

  Widget _buildComparisonSection(String label, List<Widget> values) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.grey.shade100))),
      child: Row(
        children: [
          SizedBox(width: 90, child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF64748B)))),
          ...values.map((v) => Expanded(child: Center(child: v))),
        ],
      ),
    );
  }

  Widget _buildAmenityRow(String label, String key, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.grey.shade50))),
      child: Row(
        children: [
          SizedBox(
            width: 90,
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(icon, size: 16, color: const Color(0xFF94A3B8)),
              const SizedBox(width: 6),
              Flexible(child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)), overflow: TextOverflow.ellipsis)),
            ]),
          ),
          ..._hotels.map((h) => Expanded(
            child: Center(
              child: h[key] == true
                  ? const Icon(Icons.check_circle, color: Color(0xFF059669), size: 22)
                  : Icon(Icons.cancel, color: Colors.grey.shade300, size: 22),
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildAddHotelButton() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GestureDetector(
        onTap: () {
          // Add next hotel from _allHotels not already in list
          final remaining = _allHotels.where((h) => !_hotels.any((e) => e['id'] == h['id'])).toList();
          if (remaining.isNotEmpty) {
            setState(() => _hotels.add(Map.from(remaining.first)));
          }
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            border: Border.all(color: _color, width: 1.5),
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.add_circle_outline, color: _color, size: 20),
              SizedBox(width: 8),
              Text('Add Hotel to Compare', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: _color)),
            ],
          ),
        ),
      ),
    );
  }
}
