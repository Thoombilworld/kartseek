import 'package:flutter/material.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Grocery Order Tracking Screen — Live delivery timeline.
class GroceryOrderTrackingScreen extends StatelessWidget {
  final String orderId;
  const GroceryOrderTrackingScreen({super.key, required this.orderId});

  static const _groceryColor = AppTheme.groceryColor;

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;

    const steps = [
      {'title': 'Order Placed', 'time': '2:15 PM', 'done': true, 'icon': Icons.receipt_long},
      {'title': 'Order Confirmed', 'time': '2:16 PM', 'done': true, 'icon': Icons.check_circle},
      {'title': 'Being Packed', 'time': '2:25 PM', 'done': true, 'icon': Icons.inventory_2},
      {'title': 'Out for Delivery', 'time': '2:40 PM', 'done': true, 'icon': Icons.delivery_dining, 'active': true},
      {'title': 'Delivered', 'time': 'ETA 3:05 PM', 'done': false, 'icon': Icons.home},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, surfaceTintColor: Colors.transparent,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: Text('Order #$orderId', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 18)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // ── ETA Banner ──
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: const Color(0xFF10B981).withValues(alpha: 0.3), blurRadius: 16)],
            ),
            child: Column(children: [
              const Text('🚴', style: TextStyle(fontSize: 40)),
              const SizedBox(height: 8),
              const Text('Arriving in ~25 mins', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white)),
              Text('Your order is on its way!', style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.8))),
            ]),
          ),

          const SizedBox(height: 20),

          // ── Timeline ──
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Order Status', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
              const SizedBox(height: 16),
              ...List.generate(steps.length, (i) {
                final step = steps[i];
                final done = step['done'] as bool;
                final isActive = step['active'] == true;
                final isLast = i == steps.length - 1;
                final color = done ? _groceryColor : const Color(0xFFE2E8F0);

                return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Column(children: [
                    Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(
                        color: done ? _groceryColor : const Color(0xFFF1F5F9),
                        shape: BoxShape.circle,
                        border: isActive ? Border.all(color: _groceryColor, width: 2) : null,
                        boxShadow: isActive ? [BoxShadow(color: _groceryColor.withValues(alpha: 0.3), blurRadius: 8)] : null,
                      ),
                      child: Icon(step['icon'] as IconData, size: 16, color: done ? Colors.white : const Color(0xFFCBD5E1)),
                    ),
                    if (!isLast) Container(width: 2, height: 36, color: color),
                  ]),
                  const SizedBox(width: 14),
                  Expanded(child: Padding(
                    padding: const EdgeInsets.only(top: 6, bottom: 16),
                    child: Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(step['title'] as String, style: TextStyle(fontSize: 14, fontWeight: isActive ? FontWeight.w900 : FontWeight.w700, color: done ? const Color(0xFF0F172A) : const Color(0xFF94A3B8))),
                        if (isActive) ...[
                          const SizedBox(height: 2),
                          const Text('Your groceries are being delivered', style: TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.w600)),
                        ],
                      ])),
                      Text(step['time'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: done ? const Color(0xFF64748B) : const Color(0xFFCBD5E1))),
                    ]),
                  )),
                ]);
              }),
            ]),
          ),

          const SizedBox(height: 14),

          // ── Delivery Partner ──
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
            child: Row(children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(color: _groceryColor.withValues(alpha: 0.1), shape: BoxShape.circle),
                child: const Center(child: Text('DM', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: _groceryColor))),
              ),
              const SizedBox(width: 12),
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Daniel Mwangi', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                Row(children: [
                  Icon(Icons.star, size: 12, color: Color(0xFFF59E0B)),
                  Text(' 4.9  •  Delivery Partner', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                ]),
              ])),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: _groceryColor.withValues(alpha: 0.1), shape: BoxShape.circle),
                child: const Icon(Icons.phone, color: _groceryColor, size: 18),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: const BoxDecoration(color: Color(0xFFEDE9FE), shape: BoxShape.circle),
                child: const Icon(Icons.chat, color: Color(0xFF6D28D9), size: 18),
              ),
            ]),
          ),

          const SizedBox(height: 14),

          // ── Order Summary ──
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Order Items', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
              const SizedBox(height: 12),
              ...[
                {'name': 'Organic Bananas (2)', 'price': 240, 'emoji': '🍌'},
                {'name': 'Full Cream Milk 1L (3)', 'price': 195, 'emoji': '🥛'},
                {'name': 'Whole Wheat Bread', 'price': 45, 'emoji': '🍞'},
              ].map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(children: [
                  Text(item['emoji'] as String, style: const TextStyle(fontSize: 18)),
                  const SizedBox(width: 10),
                  Expanded(child: Text(item['name'] as String, style: const TextStyle(fontSize: 13, color: Color(0xFF475569)))),
                  Text('$currency ${item['price']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                ]),
              )),
              const Divider(),
              Row(children: [
                const Text('Total', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
                const Spacer(),
                Text('$currency 480', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
              ]),
            ]),
          ),

          const SizedBox(height: 16),

          // ── Action Buttons ──
          Row(children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('Items added to cart for reorder'),
                    behavior: SnackBarBehavior.floating,
                  ));
                },
                icon: const Icon(Icons.shopping_cart_outlined, size: 18),
                label: const Text('Reorder', style: TextStyle(fontWeight: FontWeight.w700)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _groceryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => Navigator.pushNamed(context, CustomerRouter.groceryHelp),
                icon: const Icon(Icons.support_agent, size: 18),
                label: const Text('Need Help', style: TextStyle(fontWeight: FontWeight.w700)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF475569),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ]),

          const SizedBox(height: 30),
        ]),
      ),
    );
  }
}
