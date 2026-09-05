import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

/// Grocery Cart Screen — Items grouped by store with quantity controls.
class GroceryCartScreen extends StatefulWidget {
  const GroceryCartScreen({super.key});

  @override
  State<GroceryCartScreen> createState() => _GroceryCartScreenState();
}

class _GroceryCartScreenState extends State<GroceryCartScreen> {
  static const _groceryColor = AppTheme.groceryColor;
  final _promoController = TextEditingController();
  bool _promoApplied = false;

  final _cartItems = <Map<String, dynamic>>[
    {'id': '1', 'name': 'Organic Bananas (1 Dozen)', 'store': 'FreshMart', 'price': 120, 'qty': 2, 'image': '🍌', 'unit': 'dozen'},
    {'id': '2', 'name': 'Full Cream Milk 1L', 'store': 'FreshMart', 'price': 65, 'qty': 3, 'image': '🥛', 'unit': 'pack'},
    {'id': '3', 'name': 'Whole Wheat Bread', 'store': 'FreshMart', 'price': 45, 'qty': 1, 'image': '🍞', 'unit': 'loaf'},
    {'id': '4', 'name': 'Fresh Chicken Breast 500g', 'store': 'Green Basket', 'price': 280, 'qty': 1, 'image': '🍗', 'unit': 'pack'},
    {'id': '5', 'name': 'Basmati Rice 5kg', 'store': 'Green Basket', 'price': 450, 'qty': 1, 'image': '🍚', 'unit': 'bag'},
  ];

  double get _subtotal => _cartItems.fold(0, (sum, i) => sum + (i['price'] as int) * (i['qty'] as int));
  double get _deliveryFee => _subtotal > 500 ? 0 : 49;
  double get _discount => _promoApplied ? _subtotal * 0.1 : 0;
  double get _total => _subtotal + _deliveryFee - _discount;

  void _updateQty(int index, int delta) {
    setState(() {
      final newQty = (_cartItems[index]['qty'] as int) + delta;
      if (newQty <= 0) { _cartItems.removeAt(index); } else { _cartItems[index]['qty'] = newQty; }
    });
  }

  @override
  void dispose() { _promoController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    final stores = _cartItems.map((e) => e['store'] as String).toSet().toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, surfaceTintColor: Colors.transparent,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: Text('Cart (${_cartItems.length})', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 18)),
        centerTitle: true,
      ),
      body: _cartItems.isEmpty
        ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Text('🛒', style: TextStyle(fontSize: 60)),
            const SizedBox(height: 16),
            const Text('Your cart is empty', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text('Add items from grocery stores', style: TextStyle(color: Color(0xFF64748B))),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(backgroundColor: _groceryColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('Browse Stores'),
            ),
          ]))
        : Column(children: [
          Expanded(child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Grouped by store
              ...stores.map((store) {
                final storeItems = _cartItems.where((i) => i['store'] == store).toList();
                return Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
                  child: Column(children: [
                    Container(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
                      decoration: BoxDecoration(color: _groceryColor.withValues(alpha: 0.05), borderRadius: const BorderRadius.vertical(top: Radius.circular(16))),
                      child: Row(children: [
                        const Icon(Icons.store, size: 16, color: _groceryColor),
                        const SizedBox(width: 8),
                        Text(store, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        const Spacer(),
                        Text('${storeItems.length} items', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                      ]),
                    ),
                    ...storeItems.map((item) {
                      final idx = _cartItems.indexOf(item);
                      return Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(children: [
                          Container(
                            width: 48, height: 48,
                            decoration: BoxDecoration(color: _groceryColor.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                            child: Center(child: Text(item['image'] as String, style: const TextStyle(fontSize: 24))),
                          ),
                          const SizedBox(width: 12),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(item['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                            Text('$currency ${item['price']} / ${item['unit']}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                          ])),
                          Container(
                            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)),
                            child: Row(mainAxisSize: MainAxisSize.min, children: [
                              IconButton(icon: Icon(item['qty'] == 1 ? Icons.delete_outline : Icons.remove, size: 16, color: item['qty'] == 1 ? const Color(0xFFEF4444) : _groceryColor), onPressed: () => _updateQty(idx, -1), constraints: const BoxConstraints(minWidth: 32, minHeight: 32)),
                              Text('${item['qty']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                              IconButton(icon: const Icon(Icons.add, size: 16, color: _groceryColor), onPressed: () => _updateQty(idx, 1), constraints: const BoxConstraints(minWidth: 32, minHeight: 32)),
                            ]),
                          ),
                          const SizedBox(width: 8),
                          Text('$currency ${(item['price'] as int) * (item['qty'] as int)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
                        ]),
                      );
                    }),
                  ]),
                );
              }),

              // Promo
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
                child: Row(children: [
                  Expanded(child: TextField(
                    controller: _promoController,
                    decoration: InputDecoration(hintText: 'Promo code', hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13), border: InputBorder.none, prefixIcon: const Icon(Icons.local_offer, size: 18, color: _groceryColor)),
                  )),
                  GestureDetector(
                    onTap: () => setState(() => _promoApplied = _promoController.text.isNotEmpty),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(color: _groceryColor, borderRadius: BorderRadius.circular(10)),
                      child: const Text('Apply', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
                    ),
                  ),
                ]),
              ),

              const SizedBox(height: 14),

              // Summary
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                child: Column(children: [
                  _row('Subtotal', '$currency ${_subtotal.toStringAsFixed(0)}'),
                  _row('Delivery Fee', _deliveryFee == 0 ? 'FREE' : '$currency ${_deliveryFee.toStringAsFixed(0)}', highlight: _deliveryFee == 0),
                  if (_promoApplied) _row('Discount', '-$currency ${_discount.toStringAsFixed(0)}', highlight: true),
                  const Divider(height: 20),
                  Row(children: [
                    const Text('Total', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                    const Spacer(),
                    Text('$currency ${_total.toStringAsFixed(0)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                  ]),
                  if (_subtotal < 500) Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text('Add $currency ${(500 - _subtotal).toStringAsFixed(0)} more for free delivery!', style: const TextStyle(fontSize: 11, color: _groceryColor, fontWeight: FontWeight.w600)),
                  ),
                ]),
              ),
            ],
          )),

          // Bottom
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, -2))]),
            child: SafeArea(child: ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, CustomerRouter.groceryCheckout, arguments: {'total': _total, 'items': _cartItems}),
              style: ElevatedButton.styleFrom(backgroundColor: _groceryColor, foregroundColor: Colors.white, minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              child: Text('Checkout • $currency ${_total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            )),
          ),
        ]),
    );
  }

  Widget _row(String label, String value, {bool highlight = false}) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Row(children: [
      Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
      const Spacer(),
      Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: highlight ? const Color(0xFF10B981) : const Color(0xFF0F172A))),
    ]),
  );
}
