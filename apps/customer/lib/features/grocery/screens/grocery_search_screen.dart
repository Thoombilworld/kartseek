import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/widgets/voice_search_sheet.dart';
import 'package:kartseek_shared_mobile/core/widgets/camera_capture_screen.dart';


/// Grocery Search Screen — Search products across stores.
class GrocerySearchScreen extends StatefulWidget {
  const GrocerySearchScreen({super.key});

  @override
  State<GrocerySearchScreen> createState() => _GrocerySearchScreenState();
}

class _GrocerySearchScreenState extends State<GrocerySearchScreen> {
  final _searchController = TextEditingController();
  String _selectedCategory = 'All';
  static const _groceryColor = AppTheme.groceryColor;

  static const _categories = ['All', '🥬 Vegetables', '🍎 Fruits', '🥛 Dairy', '🍗 Meat', '🍞 Bakery', '🧃 Beverages', '🧹 Household'];

  static const _recentSearches = ['Organic milk', 'Tomatoes', 'Rice 5kg', 'Fresh bread'];

  static const _popularItems = [
    {'name': 'Fresh Bananas', 'price': 60, 'emoji': '🍌', 'store': 'FreshMart', 'unit': '1 dozen'},
    {'name': 'Amul Butter 500g', 'price': 245, 'emoji': '🧈', 'store': 'D-Mart', 'unit': '500g'},
    {'name': 'Onions 1kg', 'price': 35, 'emoji': '🧅', 'store': 'Green Basket', 'unit': '1 kg'},
    {'name': 'Whole Wheat Bread', 'price': 45, 'emoji': '🍞', 'store': 'FreshMart', 'unit': '1 loaf'},
    {'name': 'Full Cream Milk 1L', 'price': 65, 'emoji': '🥛', 'store': 'D-Mart', 'unit': '1 liter'},
    {'name': 'Chicken Breast 500g', 'price': 280, 'emoji': '🍗', 'store': 'Fresh N Easy', 'unit': '500g'},
    {'name': 'Basmati Rice 5kg', 'price': 450, 'emoji': '🍚', 'store': 'FreshMart', 'unit': '5 kg'},
    {'name': 'Tomatoes 1kg', 'price': 40, 'emoji': '🍅', 'store': 'Green Basket', 'unit': '1 kg'},
  ];

  List<Map<String, dynamic>> get _filteredItems {
    var items = _popularItems.toList();
    final q = _searchController.text.toLowerCase();
    if (q.isNotEmpty) items = items.where((i) => (i['name'] as String).toLowerCase().contains(q)).toList();
    return items;
  }

  @override
  void dispose() { _searchController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    final results = _filteredItems;
    final showRecent = _searchController.text.isEmpty;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: Container(
          height: 42,
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(children: [
            const Icon(Icons.search, color: _groceryColor, size: 20),
            const SizedBox(width: 8),
            Expanded(child: TextField(
              controller: _searchController,
              autofocus: true,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(border: InputBorder.none, hintText: 'Search groceries...', hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14)),
              style: const TextStyle(fontSize: 14),
            )),
            if (_searchController.text.isNotEmpty) GestureDetector(
              onTap: () { _searchController.clear(); setState(() {}); },
              child: const Icon(Icons.close, color: Colors.grey, size: 18),
            ),
            const SizedBox(width: 4),
            GestureDetector(
              onTap: () => VoiceSearchSheet.show(
                context: context,
                accentColor: _groceryColor,
                hintText: 'Try "tomatoes" or "milk"',
                onResult: (text) {
                  _searchController.text = text;
                  setState(() {});
                },
              ),
              child: const Icon(Icons.mic_none_rounded, color: _groceryColor, size: 20),
            ),
            const SizedBox(width: 4),
            GestureDetector(
              onTap: () => Navigator.push(context, MaterialPageRoute(
                builder: (_) => const CameraCaptureScreen(
                  title: 'Scan Barcode',
                  accentColor: AppTheme.groceryColor,
                  filePrefix: 'grocery_scan',
                  overlayHint: 'Scan a product barcode to find it',
                ),
              )),
              child: const Icon(Icons.qr_code_scanner, color: _groceryColor, size: 18),
            ),
          ]),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Categories
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final active = _selectedCategory == _categories[i];
                return GestureDetector(
                  onTap: () => setState(() => _selectedCategory = _categories[i]),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: active ? _groceryColor : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: active ? _groceryColor : const Color(0xFFE2E8F0)),
                    ),
                    child: Center(child: Text(_categories[i], style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? Colors.white : const Color(0xFF475569)))),
                  ),
                );
              },
            ),
          ),

          if (showRecent) ...[
            const SizedBox(height: 20),
            const Text('Recent Searches', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: _recentSearches.map((s) => GestureDetector(
              onTap: () { _searchController.text = s; setState(() {}); },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E8F0))),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.history, size: 14, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 6),
                  Text(s, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                ]),
              ),
            )).toList()),
          ],

          const SizedBox(height: 20),
          Text(showRecent ? 'Popular Items' : '${results.length} results', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          const SizedBox(height: 10),

          // Results grid
          ...results.map((item) => Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8)]),
            child: Row(children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(color: _groceryColor.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                child: Center(child: Text(item['emoji'] as String, style: const TextStyle(fontSize: 24))),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                const SizedBox(height: 2),
                Row(children: [
                  Container(
                    width: 12, height: 12,
                    decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6)),
                    child: const Center(child: Text('🏪', style: TextStyle(fontSize: 7))),
                  ),
                  const SizedBox(width: 3),
                  Flexible(child: Text(item['store'] as String, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.green.shade700), maxLines: 1, overflow: TextOverflow.ellipsis)),
                ]),
                const SizedBox(height: 2),
                Text(item['unit'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
              ])),
              Text('$currency ${item['price']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: _groceryColor, borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.add, size: 16, color: Colors.white),
              ),
            ]),
          )),

          if (results.isEmpty) Center(child: Padding(
            padding: const EdgeInsets.all(40),
            child: Column(children: [
              const Text('🔍', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 12),
              const Text('No items found', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              Text('Try a different search term', style: TextStyle(color: Colors.grey.shade400)),
            ]),
          )),
        ],
      ),
    );
  }
}
