import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Coupons Screen — Available coupons with copy-to-apply.
class GroceryCouponsScreen extends StatelessWidget {
  const GroceryCouponsScreen({super.key});
  static const _groceryColor = AppTheme.groceryColor;

  static List<Map<String, String>> get _coupons {
    final cs = RegionService.instance.currentCountry.currencySymbol;
    return [
      {'code': 'FRESH50', 'title': '$cs 50 off Fruits & Veg', 'desc': 'Min $cs 299 • First order', 'discount': '$cs 50', 'emoji': '🥬', 'expiry': 'Jul 10'},
      {'code': 'DAIRY20', 'title': '20% off Dairy', 'desc': 'Max $cs 100 discount', 'discount': '20%', 'emoji': '🥛', 'expiry': 'Jul 15'},
      {'code': 'FREEDEL', 'title': 'Free Delivery', 'desc': 'Orders above $cs 499', 'discount': 'FREE', 'emoji': '🚚', 'expiry': 'Jul 31'},
      {'code': 'MEAT100', 'title': '$cs 100 off Meat & Fish', 'desc': 'Min $cs 599 • Weekend only', 'discount': '$cs 100', 'emoji': '🥩', 'expiry': 'Jul 7'},
    ];
  }

  @override
  Widget build(BuildContext context) {
    final coupons = _coupons;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Coupons & Offers', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(14),
        itemCount: coupons.length,
        itemBuilder: (context, i) {
          final c = coupons[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Row(children: [
              Container(
                width: 80,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(color: _groceryColor.withValues(alpha: 0.05), borderRadius: const BorderRadius.horizontal(left: Radius.circular(14))),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(c['emoji']!, style: const TextStyle(fontSize: 24)),
                  const SizedBox(height: 4),
                  Text(c['discount']!, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: _groceryColor)),
                  const Text('OFF', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: _groceryColor)),
                ]),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(c['title']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                    Text(c['desc']!, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    const SizedBox(height: 4),
                    Text('Expires ${c['expiry']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                  ]),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: c['code']!));
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${c['code']} copied!'), duration: const Duration(seconds: 1)));
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(border: Border.all(color: _groceryColor, style: BorderStyle.solid), borderRadius: BorderRadius.circular(8)),
                    child: Column(children: [
                      Text(c['code']!, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: _groceryColor, fontFamily: 'monospace')),
                      const Text('TAP TO COPY', style: TextStyle(fontSize: 7, fontWeight: FontWeight.w700, color: _groceryColor)),
                    ]),
                  ),
                ),
              ),
            ]),
          );
        },
      ),
    );
  }
}
