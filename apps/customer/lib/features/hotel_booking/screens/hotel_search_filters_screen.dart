import 'package:flutter/material.dart';

class HotelSearchFiltersScreen extends StatefulWidget {
  const HotelSearchFiltersScreen({super.key});

  @override
  State<HotelSearchFiltersScreen> createState() => _HotelSearchFiltersScreenState();
}

class _HotelSearchFiltersScreenState extends State<HotelSearchFiltersScreen> {
  // Filter state
  RangeValues _priceRange = const RangeValues(100, 1000);
  final Set<int> _selectedStars = {};
  double _minGuestRating = 0;
  bool _freeCancellation = false;
  bool _breakfastIncluded = false;
  final Set<String> _selectedAmenities = {};
  String _sortBy = 'recommended';

  final _amenityOptions = ['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Parking', 'Room Service', 'Bar', 'Concierge', 'Beach', 'Kids Club', 'Business Center', 'Laundry', 'Airport Shuttle'];
  final _sortOptions = [
    {'value': 'recommended', 'label': 'Recommended'},
    {'value': 'price-asc', 'label': 'Price: Low to High'},
    {'value': 'price-desc', 'label': 'Price: High to Low'},
    {'value': 'rating-desc', 'label': 'Guest Rating'},
    {'value': 'stars-desc', 'label': 'Star Rating'},
    {'value': 'distance-asc', 'label': 'Distance'},
    {'value': 'reviews-desc', 'label': 'Most Reviews'},
  ];
  final _ratingLabels = ['Any', '3.0+', '3.5+', '4.0+', '4.5+'];

  int get _activeFilterCount {
    int count = 0;
    if (_selectedStars.isNotEmpty) count++;
    if (_minGuestRating > 0) count++;
    if (_freeCancellation) count++;
    if (_breakfastIncluded) count++;
    if (_selectedAmenities.isNotEmpty) count++;
    if (_priceRange.start > 100 || _priceRange.end < 1000) count++;
    return count;
  }

  void _clearAll() {
    setState(() {
      _priceRange = const RangeValues(100, 1000);
      _selectedStars.clear();
      _minGuestRating = 0;
      _freeCancellation = false;
      _breakfastIncluded = false;
      _selectedAmenities.clear();
      _sortBy = 'recommended';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            Text('Filters', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Colors.grey.shade900)),
            if (_activeFilterCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: const Color(0xFFE11D48), borderRadius: BorderRadius.circular(10)),
                child: Text('$_activeFilterCount', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)),
              ),
            ],
          ],
        ),
        centerTitle: false,
        actions: [
          TextButton(
            onPressed: _activeFilterCount > 0 ? _clearAll : null,
            child: Text('Clear All', style: TextStyle(fontWeight: FontWeight.w700, color: _activeFilterCount > 0 ? const Color(0xFFE11D48) : Colors.grey.shade300)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Sort By
          _buildSection('Sort By', Column(
            children: _sortOptions.map((opt) => _buildRadioTile(opt['value']!, opt['label']!, _sortBy, (v) => setState(() => _sortBy = v))).toList(),
          )),

          const SizedBox(height: 20),

          // Price Range
          _buildSection('Price Range (AED)', Column(
            children: [
              RangeSlider(
                values: _priceRange,
                min: 0, max: 2000,
                divisions: 40,
                activeColor: const Color(0xFFE11D48),
                inactiveColor: Colors.grey.shade200,
                labels: RangeLabels('AED ${_priceRange.start.round()}', 'AED ${_priceRange.end.round()}'),
                onChanged: (v) => setState(() => _priceRange = v),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('AED ${_priceRange.start.round()}', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.grey.shade700)),
                    Text('AED ${_priceRange.end.round()}', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.grey.shade700)),
                  ],
                ),
              ),
            ],
          )),

          const SizedBox(height: 20),

          // Star Rating
          _buildSection('Star Rating', Wrap(
            spacing: 8, runSpacing: 8,
            children: List.generate(5, (i) {
              final star = i + 1;
              final selected = _selectedStars.contains(star);
              return FilterChip(
                label: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('$star', style: TextStyle(fontWeight: FontWeight.w800, color: selected ? Colors.white : Colors.grey.shade700)),
                    const SizedBox(width: 2),
                    Icon(Icons.star, size: 14, color: selected ? Colors.white : Colors.amber.shade400),
                  ],
                ),
                selected: selected,
                onSelected: (val) => setState(() => val ? _selectedStars.add(star) : _selectedStars.remove(star)),
                selectedColor: const Color(0xFFE11D48),
                backgroundColor: Colors.white,
                side: BorderSide(color: selected ? const Color(0xFFE11D48) : Colors.grey.shade200),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              );
            }),
          )),

          const SizedBox(height: 20),

          // Guest Rating
          _buildSection('Minimum Guest Rating', Column(
            children: [
              Slider(
                value: _minGuestRating,
                min: 0, max: 4.5,
                divisions: 9,
                activeColor: const Color(0xFFE11D48),
                inactiveColor: Colors.grey.shade200,
                label: _minGuestRating == 0 ? 'Any' : '${_minGuestRating.toStringAsFixed(1)}+',
                onChanged: (v) => setState(() => _minGuestRating = v),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: _ratingLabels.map((l) => Text(l, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.grey.shade400))).toList(),
                ),
              ),
            ],
          )),

          const SizedBox(height: 20),

          // Quick Toggles
          _buildSection('Quick Filters', Column(
            children: [
              _buildToggleTile('Free Cancellation', Icons.cancel_outlined, _freeCancellation, (v) => setState(() => _freeCancellation = v)),
              const SizedBox(height: 8),
              _buildToggleTile('Breakfast Included', Icons.free_breakfast_outlined, _breakfastIncluded, (v) => setState(() => _breakfastIncluded = v)),
            ],
          )),

          const SizedBox(height: 20),

          // Amenities
          _buildSection('Amenities', Wrap(
            spacing: 8, runSpacing: 8,
            children: _amenityOptions.map((a) {
              final selected = _selectedAmenities.contains(a);
              return FilterChip(
                label: Text(a, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: selected ? Colors.white : Colors.grey.shade700)),
                selected: selected,
                onSelected: (val) => setState(() => val ? _selectedAmenities.add(a) : _selectedAmenities.remove(a)),
                selectedColor: const Color(0xFFE11D48),
                backgroundColor: Colors.white,
                side: BorderSide(color: selected ? const Color(0xFFE11D48) : Colors.grey.shade200),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              );
            }).toList(),
          )),

          const SizedBox(height: 100), // Space for bottom button
        ],
      ),

      // Apply Button
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Colors.grey.shade100))),
        child: SafeArea(
          child: SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE11D48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: Text('Apply Filters${_activeFilterCount > 0 ? ' ($_activeFilterCount)' : ''}',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String title, Widget child) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.grey.shade900)),
        const SizedBox(height: 12),
        child,
      ],
    );
  }

  Widget _buildRadioTile(String value, String label, String groupValue, ValueChanged<String> onChanged) {
    final selected = value == groupValue;
    return GestureDetector(
      onTap: () => onChanged(value),
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selected ? const Color(0xFFE11D48) : Colors.grey.shade200, width: selected ? 2 : 1),
        ),
        child: Row(
          children: [
            Container(
              width: 18, height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: selected ? const Color(0xFFE11D48) : Colors.grey.shade300, width: 2),
                color: selected ? const Color(0xFFE11D48) : Colors.transparent,
              ),
              child: selected ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
            ),
            const SizedBox(width: 12),
            Text(label, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.grey.shade800)),
          ],
        ),
      ),
    );
  }

  Widget _buildToggleTile(String label, IconData icon, bool value, ValueChanged<bool> onChanged) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey.shade200)),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade600),
          const SizedBox(width: 12),
          Text(label, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.grey.shade800)),
          const Spacer(),
          Switch.adaptive(
            value: value,
            onChanged: onChanged,
            activeTrackColor: const Color(0xFFE11D48),
          ),
        ],
      ),
    );
  }
}
