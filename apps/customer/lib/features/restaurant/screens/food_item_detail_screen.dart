import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';

/// Food item detail screen with add-ons, variants, and customization.
class FoodItemDetailScreen extends StatefulWidget {
  final String itemName;
  const FoodItemDetailScreen({super.key, this.itemName = 'Chicken Biryani'});

  @override
  State<FoodItemDetailScreen> createState() => _FoodItemDetailScreenState();
}

class _FoodItemDetailScreenState extends State<FoodItemDetailScreen> {
  int _qty = 1;
  String _selectedSize = 'Regular ${RegionService.instance.currentCountry.currencySymbol} 299';
  String _selectedSpice = 'Medium';
  final Set<String> _addOns = {};

  static const _addOnOptions = [
    {'name': 'Extra Raita', 'price': 30},
    {'name': 'Extra Masala', 'price': 20},
    {'name': 'Gulab Jamun', 'price': 79},
    {'name': 'Soft Drink', 'price': 49},
    {'name': 'Papad', 'price': 25},
  ];

  List<String> get _sizes => ['Regular ${RegionService.instance.currentCountry.currencySymbol} 299', 'Large ${RegionService.instance.currentCountry.currencySymbol} 399', 'Family ${RegionService.instance.currentCountry.currencySymbol} 599'];
  static const _spiceLevels = ['Mild', 'Medium', 'Spicy', 'Extra Spicy'];

  int get _basePrice => _selectedSize == 'Regular ${RegionService.instance.currentCountry.currencySymbol} 299' ? 299 : _selectedSize == 'Large ${RegionService.instance.currentCountry.currencySymbol} 399' ? 399 : 599;
  int get _addOnTotal => _addOns.fold(0, (s, a) {
    final option = _addOnOptions.firstWhere((o) => o['name'] == a, orElse: () => {'price': 0});
    return s + (option['price'] as int);
  });
  int get _total => (_basePrice + _addOnTotal) * _qty;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: Column(
        children: [
          Expanded(
            child: CustomScrollView(
              slivers: [
                // App Bar with hero image
                SliverAppBar(
                  expandedHeight: 260,
                  pinned: true,
                  backgroundColor: Colors.white,
                  leading: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      margin: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 6)]),
                      child: const Icon(Icons.arrow_back, color: Colors.black87),
                    ),
                  ),
                  flexibleSpace: FlexibleSpaceBar(
                    background: Stack(
                      fit: StackFit.expand,
                      children: [
                        const KartseekImage(
                          url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80',
                          fit: BoxFit.cover,
                        ),
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
                              colors: [Colors.transparent, Colors.black.withValues(alpha: 0.4)]),
                          ),
                        ),
                        Positioned(
                          bottom: 12, left: 16,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(6)),
                            child: Row(children: [
                              Container(width: 10, height: 10, margin: const EdgeInsets.only(right: 4),
                                decoration: BoxDecoration(border: Border.all(color: Colors.green, width: 1.5), borderRadius: BorderRadius.circular(2)),
                                child: Center(child: Container(width: 4, height: 4, decoration: BoxDecoration(color: Colors.green, borderRadius: BorderRadius.circular(1)))),
                              ),
                              const Text('Pure Veg', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.green)),
                            ]),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Item name & rating
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(widget.itemName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(color: Colors.green.shade700, borderRadius: BorderRadius.circular(8)),
                              child: const Row(children: [
                                Icon(Icons.star, size: 14, color: Colors.white),
                                SizedBox(width: 4),
                                Text('4.6', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                              ]),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text('Aromatic basmati rice cooked with tender chicken pieces and premium spices.',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 14, height: 1.4)),
                        const SizedBox(height: 4),
                        Text('Prep time: 20-25 min', style: TextStyle(color: Colors.orange.shade600, fontSize: 12, fontWeight: FontWeight.w600)),

                        const SizedBox(height: 20),
                        _sectionTitle('Choose Size'),
                        ...List.generate(_sizes.length, (i) => _radioTile(_sizes[i], _selectedSize, (v) => setState(() => _selectedSize = v))),

                        const SizedBox(height: 16),
                        _sectionTitle('Spice Level'),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: _spiceLevels.map((level) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: GestureDetector(
                                onTap: () => setState(() => _selectedSpice = level),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: _selectedSpice == level ? AppTheme.restaurantColor : Colors.white,
                                    border: Border.all(color: _selectedSpice == level ? AppTheme.restaurantColor : Colors.grey.shade300, width: 1.5),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(level, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: _selectedSpice == level ? Colors.white : Colors.grey.shade700)),
                                ),
                              ),
                            )).toList(),
                          ),
                        ),

                        const SizedBox(height: 16),
                        _sectionTitle('Add-ons'),
                        ..._addOnOptions.map((o) {
                          final name = o['name'] as String;
                          final price = o['price'] as int;
                          return Material(
                            color: Colors.transparent,
                            child: CheckboxListTile(
                              contentPadding: EdgeInsets.zero,
                              activeColor: AppTheme.restaurantColor,
                              dense: true,
                              title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                              subtitle: Text('+${RegionService.instance.currentCountry.currencySymbol} $price', style: TextStyle(color: Colors.orange.shade600, fontSize: 12, fontWeight: FontWeight.w600)),
                              value: _addOns.contains(name),
                              onChanged: (v) => setState(() => v == true ? _addOns.add(name) : _addOns.remove(name)),
                            ),
                          );
                        }),
                        const SizedBox(height: 80),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Add to Cart bar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, -4))],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  // Qty selector
                  DecoratedBox(
                    decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300, width: 1.5), borderRadius: BorderRadius.circular(10)),
                    child: Row(
                      children: [
                        GestureDetector(onTap: () => setState(() => _qty = (_qty - 1).clamp(1, 99)),
                          child: const Padding(padding: EdgeInsets.symmetric(horizontal: 12, vertical: 12), child: Icon(Icons.remove, size: 18))),
                        SizedBox(width: 24, child: Text('$_qty', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
                        GestureDetector(onTap: () => setState(() => _qty++),
                          child: const Padding(padding: EdgeInsets.symmetric(horizontal: 12, vertical: 12), child: Icon(Icons.add, size: 18))),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: Text('${widget.itemName} added to cart!'),
                          backgroundColor: AppTheme.restaurantColor,
                          behavior: SnackBarBehavior.floating,
                        ));
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.restaurantColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: Text('Add to Cart  •  ${RegionService.instance.currentCountry.currencySymbol} $_total', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
  );

  Widget _radioTile(String value, String selected, ValueChanged<String> onChanged) {
    final isSelected = value == selected;
    return GestureDetector(
      onTap: () => onChanged(value),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.restaurantColor.withValues(alpha: 0.05) : Colors.white,
          border: Border.all(color: isSelected ? AppTheme.restaurantColor : Colors.grey.shade200, width: 1.5),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Container(
              width: 18, height: 18,
              decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: isSelected ? AppTheme.restaurantColor : Colors.grey.shade400, width: 2)),
              child: isSelected ? const Center(child: DecoratedBox(decoration: BoxDecoration(color: AppTheme.restaurantColor, shape: BoxShape.circle), child: SizedBox(width: 8, height: 8))) : null,
            ),
            const SizedBox(width: 10),
            Text(value, style: TextStyle(fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}
