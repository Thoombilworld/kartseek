import 'package:flutter/material.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Restaurant Cart Screen — review items before checkout.
class RestaurantCartScreen extends StatefulWidget {
  const RestaurantCartScreen({super.key});

  @override
  State<RestaurantCartScreen> createState() => _RestaurantCartScreenState();
}

class _RestaurantCartScreenState extends State<RestaurantCartScreen> {
  final Map<String, int> _cart = {
    'Chicken Biryani': 2,
    'Paneer Butter Masala': 1,
    'Butter Naan': 4,
    'Gulab Jamun': 2,
  };

  static const _prices = {
    'Chicken Biryani': 299,
    'Paneer Butter Masala': 249,
    'Butter Naan': 49,
    'Gulab Jamun': 79,
  };

  int get _subtotal => _cart.entries.fold(0, (s, e) => s + (_prices[e.key] ?? 0) * e.value);
  int get _deliveryFee => 40;
  int get _tax => (_subtotal * 0.05).round();
  int get _total => _subtotal + _deliveryFee + _tax;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Your Cart', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
            Text('The Grand Biryani House', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Cart Items
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      children: _cart.entries.map((entry) {
                        final name = entry.key;
                        final qty = entry.value;
                        final price = _prices[name] ?? 0;
                        return Column(
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              child: Row(
                                children: [
                                  // Veg indicator
                                  Container(
                                    width: 14, height: 14,
                                    decoration: BoxDecoration(
                                      border: Border.all(color: Colors.green, width: 2),
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                    child: Center(
                                      child: Container(width: 6, height: 6, decoration: BoxDecoration(color: Colors.green, borderRadius: BorderRadius.circular(2))),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                        Text('${RegionService.instance.currentCountry.currencySymbol} $price each', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                  // Qty stepper
                                  DecoratedBox(
                                    decoration: BoxDecoration(
                                      color: AppTheme.restaurantColor,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      children: [
                                        GestureDetector(
                                          onTap: () => setState(() {
                                            if (qty <= 1) { _cart.remove(name); } else { _cart[name] = qty - 1; }
                                          }),
                                          child: const Padding(padding: EdgeInsets.all(8), child: Icon(Icons.remove, size: 16, color: Colors.white)),
                                        ),
                                        Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 8),
                                          child: Text('$qty', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
                                        ),
                                        GestureDetector(
                                          onTap: () => setState(() => _cart[name] = qty + 1),
                                          child: const Padding(padding: EdgeInsets.all(8), child: Icon(Icons.add, size: 16, color: Colors.white)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text('${RegionService.instance.currentCountry.currencySymbol} ${price * qty}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                                ],
                              ),
                            ),
                            if (entry.key != _cart.keys.last)
                              Divider(color: Colors.grey.shade100, height: 1),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Special Instructions
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Icon(Icons.note_alt_outlined, size: 18, color: Colors.orange.shade600),
                          const SizedBox(width: 8),
                          const Text('Special Instructions', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        ]),
                        const SizedBox(height: 12),
                        DecoratedBox(
                          decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey.shade200)),
                          child: const TextField(
                            maxLines: 2,
                            decoration: InputDecoration(
                              hintText: 'Add a note for the restaurant...',
                              hintStyle: TextStyle(fontSize: 13, color: Colors.black38),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.all(12),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Bill Details
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Bill Details', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                        const SizedBox(height: 12),
                        _billRow('Item Total', '${RegionService.instance.currentCountry.currencySymbol} $_subtotal'),
                        _billRow('Delivery Fee', '${RegionService.instance.currentCountry.currencySymbol} $_deliveryFee'),
                        _billRow('GST & Taxes', '${RegionService.instance.currentCountry.currencySymbol} $_tax'),
                        Divider(color: Colors.grey.shade200, height: 20),
                        _billRow('To Pay', '${RegionService.instance.currentCountry.currencySymbol} $_total', bold: true, color: Colors.black),
                      ],
                    ),
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),

          // Checkout Button
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -5))],
            ),
            child: SafeArea(
              child: ElevatedButton(
                onPressed: () => Navigator.pushNamed(context, AppRouter.restaurantCheckout),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.restaurantColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                  minimumSize: const Size(double.infinity, 56),
                ),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('${_cart.values.fold(0, (s, v) => s + v)} items  •  ${RegionService.instance.currentCountry.currencySymbol} $_total', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      const SizedBox(width: 8),
                      const Text('Proceed to Checkout →', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _billRow(String label, String value, {bool bold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 14, color: Colors.grey.shade600, fontWeight: bold ? FontWeight.w800 : FontWeight.w500)),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: bold ? FontWeight.w900 : FontWeight.w600, color: color ?? Colors.grey.shade800)),
        ],
      ),
    );
  }
}
