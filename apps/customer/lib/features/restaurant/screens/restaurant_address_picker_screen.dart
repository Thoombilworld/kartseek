import 'package:flutter/material.dart';

/// Restaurant — Address Picker Screen with custom selection (no deprecated Radio).
class RestaurantAddressPickerScreen extends StatefulWidget {
  const RestaurantAddressPickerScreen({super.key});
  @override
  State<RestaurantAddressPickerScreen> createState() => _RestaurantAddressPickerScreenState();
}

class _RestaurantAddressPickerScreenState extends State<RestaurantAddressPickerScreen> {
  static const _brandColor = Color(0xFFEA580C);
  int _selectedIndex = 0;

  final _addresses = [
    {'label': 'Home', 'icon': Icons.home, 'line': '45/2, 100 Feet Road, HAL 2nd Stage, Bengaluru 560008'},
    {'label': 'Office', 'icon': Icons.business, 'line': 'WeWork Galaxy, #43, Residency Road, Bengaluru 560025'},
    {'label': 'Other', 'icon': Icons.location_on, 'line': 'Choose a different delivery location'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Select Address', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: Column(children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search for area, street name...',
              hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
              prefixIcon: const Icon(Icons.search, color: Color(0xFFEA580C)),
              filled: true, fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: _brandColor)),
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
        // Current location button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: GestureDetector(
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('\ud83d\udccd Detecting your current location\u2026'), backgroundColor: _brandColor, behavior: SnackBarBehavior.floating));
              Navigator.pop(context, {'type': 'current_location'});
            },
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: _brandColor.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: _brandColor.withValues(alpha: 0.2))),
              child: const Row(children: [
                Icon(Icons.my_location, color: _brandColor, size: 20),
                SizedBox(width: 10),
                Text('Use Current Location', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _brandColor)),
                Spacer(),
                Icon(Icons.chevron_right, color: _brandColor, size: 20),
              ]),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Align(alignment: Alignment.centerLeft, child: Text('SAVED ADDRESSES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey.shade500, letterSpacing: 1))),
        ),
        const SizedBox(height: 8),
        // Address list with custom selection
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _addresses.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, i) {
              final a = _addresses[i];
              final isSelected = i == _selectedIndex;
              return GestureDetector(
                onTap: () => setState(() => _selectedIndex = i),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSelected ? _brandColor.withValues(alpha: 0.05) : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isSelected ? _brandColor : Colors.grey.shade200, width: isSelected ? 2 : 1),
                  ),
                  child: Row(children: [
                    Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(color: _brandColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                      child: Icon(a['icon'] as IconData, color: _brandColor, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(a['label'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 2),
                      Text(a['line'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ])),
                    // Custom radio indicator
                    Container(
                      width: 22, height: 22,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: isSelected ? _brandColor : Colors.grey.shade300, width: 2),
                      ),
                      child: isSelected
                          ? Center(child: Container(width: 12, height: 12, decoration: const BoxDecoration(shape: BoxShape.circle, color: _brandColor)))
                          : null,
                    ),
                  ]),
                ),
              );
            },
          ),
        ),
        // Confirm button
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))]),
          child: SafeArea(
            top: false,
            child: SizedBox(width: double.infinity, height: 48, child: ElevatedButton(
              onPressed: () => Navigator.pop(context, _addresses[_selectedIndex]),
              style: ElevatedButton.styleFrom(backgroundColor: _brandColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
              child: const Text('Confirm Address', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            )),
          ),
        ),
      ]),
    );
  }
}
