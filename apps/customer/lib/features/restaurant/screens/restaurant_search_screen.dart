import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/routing/customer_router.dart';
import 'package:kartseek_shared_mobile/core/widgets/voice_search_sheet.dart';
import 'package:kartseek_shared_mobile/core/widgets/camera_capture_screen.dart';

/// Restaurant Search Screen — Search and filter restaurants.
class RestaurantSearchScreen extends StatefulWidget {
  const RestaurantSearchScreen({super.key});

  @override
  State<RestaurantSearchScreen> createState() => _RestaurantSearchScreenState();
}

class _RestaurantSearchScreenState extends State<RestaurantSearchScreen> {
  final _searchController = TextEditingController();
  String _selectedCuisine = 'All';
  String _sortBy = 'rating';
  static const _restaurantColor = AppTheme.restaurantColor;

  static const _cuisines = ['All', '🍕 Pizza', '🍔 Burgers', '🍣 Asian', '🌮 Mexican', '🥘 Indian', '🍝 Italian', '☕ Cafe'];

  static const _restaurants = [
    {'name': 'The Grand Biryani House', 'cuisine': 'Indian', 'rating': 4.8, 'deliveryTime': '25-35 min', 'minOrder': 200, 'distance': '1.2 km', 'offer': '20% OFF', 'tags': ['Biryani', 'North Indian'], 'emoji': '🍛'},
    {'name': 'Pizza Paradise', 'cuisine': 'Pizza', 'rating': 4.6, 'deliveryTime': '20-30 min', 'minOrder': 150, 'distance': '0.8 km', 'tags': ['Pizza', 'Italian'], 'emoji': '🍕'},
    {'name': 'Mandarin Palace', 'cuisine': 'Asian', 'rating': 4.7, 'deliveryTime': '30-40 min', 'minOrder': 250, 'distance': '2.1 km', 'offer': 'Free Delivery', 'tags': ['Chinese', 'Thai'], 'emoji': '🥡'},
    {'name': 'Green Leaf Cafe', 'cuisine': 'Cafe', 'rating': 4.5, 'deliveryTime': '15-25 min', 'minOrder': 100, 'distance': '0.5 km', 'tags': ['Healthy', 'Salads'], 'emoji': '🥗'},
    {'name': 'Burger Barn', 'cuisine': 'Burgers', 'rating': 4.4, 'deliveryTime': '20-25 min', 'minOrder': 180, 'distance': '1.5 km', 'tags': ['Burgers', 'Fries'], 'emoji': '🍔'},
    {'name': 'Kerala Spice Kitchen', 'cuisine': 'Indian', 'rating': 4.9, 'deliveryTime': '35-45 min', 'minOrder': 300, 'distance': '3.0 km', 'offer': 'Buy 1 Get 1', 'tags': ['South Indian', 'Seafood'], 'emoji': '🦐'},
  ];

  List<Map<String, dynamic>> get _filtered {
    var items = _restaurants.where((r) {
      final q = _searchController.text.toLowerCase();
      if (q.isNotEmpty && !(r['name'] as String).toLowerCase().contains(q) && !(r['cuisine'] as String).toLowerCase().contains(q)) return false;
      if (_selectedCuisine != 'All' && !(r['cuisine'] as String).toLowerCase().contains(_selectedCuisine.split(' ').last.toLowerCase())) return false;
      return true;
    }).toList();

    switch (_sortBy) {
      case 'delivery': items.sort((a, b) => (a['deliveryTime'] as String).compareTo(b['deliveryTime'] as String));
      case 'distance': items.sort((a, b) => (a['distance'] as String).compareTo(b['distance'] as String));
      default: items.sort((a, b) => ((b['rating'] as num)).compareTo(a['rating'] as num));
    }
    return items;
  }

  @override
  void dispose() { _searchController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final results = _filtered;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _restaurantColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: Container(
          height: 42,
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(children: [
            const Icon(Icons.search, color: _restaurantColor, size: 20),
            const SizedBox(width: 8),
            Expanded(child: TextField(
              controller: _searchController, autofocus: true,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(border: InputBorder.none, hintText: 'Search restaurants, cuisines...', hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14)),
            )),
            if (_searchController.text.isNotEmpty) GestureDetector(
              onTap: () { _searchController.clear(); setState(() {}); },
              child: const Icon(Icons.close, color: Colors.grey, size: 18),
            ),
            const SizedBox(width: 4),
            GestureDetector(
              onTap: () => VoiceSearchSheet.show(
                context: context,
                accentColor: _restaurantColor,
                hintText: 'Try "biryani" or "pizza"',
                onResult: (text) {
                  _searchController.text = text;
                  setState(() {});
                },
              ),
              child: const Icon(Icons.mic_none_rounded, color: _restaurantColor, size: 20),
            ),
            const SizedBox(width: 4),
            GestureDetector(
              onTap: () => Navigator.push(context, MaterialPageRoute(
                builder: (_) => const CameraCaptureScreen(
                  title: 'Scan Menu',
                  accentColor: AppTheme.restaurantColor,
                  filePrefix: 'restaurant_scan',
                  overlayHint: 'Scan a menu QR code',
                ),
              )),
              child: const Icon(Icons.qr_code_scanner, color: _restaurantColor, size: 18),
            ),
          ]),
        ),
      ),
      body: Column(children: [
        // Cuisine chips
        Container(
          height: 50, color: Colors.white,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            itemCount: _cuisines.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final active = _selectedCuisine == _cuisines[i];
              return GestureDetector(
                onTap: () => setState(() => _selectedCuisine = _cuisines[i]),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: active ? _restaurantColor : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: active ? _restaurantColor : const Color(0xFFE2E8F0)),
                  ),
                  child: Center(child: Text(_cuisines[i], style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? Colors.white : const Color(0xFF475569)))),
                ),
              );
            },
          ),
        ),

        // Sort bar
        Container(
          color: Colors.white, padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
          child: Row(children: [
            Text('${results.length} restaurants', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFFE2E8F0))),
              child: DropdownButtonHideUnderline(child: DropdownButton<String>(
                value: _sortBy, isDense: true,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                items: const [
                  DropdownMenuItem(value: 'rating', child: Text('Top Rated')),
                  DropdownMenuItem(value: 'delivery', child: Text('Fastest')),
                  DropdownMenuItem(value: 'distance', child: Text('Nearest')),
                ],
                onChanged: (v) => setState(() => _sortBy = v!),
              )),
            ),
          ]),
        ),
        const Divider(height: 1),

        // Results
        Expanded(child: results.isEmpty
          ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('🔍', style: TextStyle(fontSize: 48)),
              SizedBox(height: 12),
              Text('No restaurants found', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            ]))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: results.length,
              itemBuilder: (_, i) {
                final r = results[i];
                return GestureDetector(
                  onTap: () => Navigator.pushNamed(context, CustomerRouter.restaurantDetail, arguments: {'name': r['name']}),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
                    child: Row(children: [
                      Container(
                        width: 90, height: 90,
                        decoration: BoxDecoration(color: _restaurantColor.withValues(alpha: 0.08), borderRadius: const BorderRadius.horizontal(left: Radius.circular(16))),
                        child: Stack(children: [
                          Center(child: Text(r['emoji'] as String, style: const TextStyle(fontSize: 36))),
                          if (r['offer'] != null) Positioned(top: 6, left: 6, child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: _restaurantColor, borderRadius: BorderRadius.circular(4)),
                            child: Text(r['offer'] as String, style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w800)),
                          )),
                        ]),
                      ),
                      Expanded(child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(r['name'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 3),
                          Row(children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                              decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(4)),
                              child: Row(mainAxisSize: MainAxisSize.min, children: [
                                const Icon(Icons.star, size: 10, color: Color(0xFFF59E0B)),
                                Text(' ${r['rating']}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF92400E))),
                              ]),
                            ),
                            const SizedBox(width: 6),
                            Text(r['deliveryTime'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                            const SizedBox(width: 6),
                            Text('• ${r['distance']}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                          ]),
                          const SizedBox(height: 6),
                          Wrap(spacing: 4, children: (r['tags'] as List).map((t) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(4)),
                            child: Text(t.toString(), style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: Colors.grey.shade500)),
                          )).toList()),
                        ]),
                      )),
                    ]),
                  ),
                );
              },
            ),
        ),
      ]),
    );
  }
}
