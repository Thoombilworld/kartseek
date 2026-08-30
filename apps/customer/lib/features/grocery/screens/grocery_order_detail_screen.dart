import 'package:flutter/material.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Order Detail Screen — Full order breakdown.
class GroceryOrderDetailScreen extends StatelessWidget {
  final String? orderId;
  const GroceryOrderDetailScreen({super.key, this.orderId});

  static const _groceryColor = AppTheme.groceryColor;

  static const _items = [
    {'name': 'Fresh Bananas (1 dozen)', 'qty': 2, 'price': 49, 'emoji': '🍌'},
    {'name': 'Amul Butter 500g', 'qty': 1, 'price': 275, 'emoji': '🧈'},
    {'name': 'Organic Tomatoes 1kg', 'qty': 1, 'price': 65, 'emoji': '🍅'},
    {'name': 'Tata Salt 1kg', 'qty': 2, 'price': 28, 'emoji': '🧂'},
  ];

  static const _steps = [
    {'label': 'Order Placed', 'time': '10:32 AM', 'done': true},
    {'label': 'Packing', 'time': '10:38 AM', 'done': true},
    {'label': 'Out for Delivery', 'time': '10:52 AM', 'done': true},
    {'label': 'Delivered', 'time': '11:08 AM', 'done': false},
  ];

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    final id = orderId ?? 'GRC-2847';

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: Text('Order #$id', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          TextButton(onPressed: () => Navigator.pushNamed(context, CustomerRouter.groceryOrderTracking, arguments: orderId), child: const Text('Invoice', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w700))),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Status timeline
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Order Status', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                ..._steps.asMap().entries.map((e) {
                  final step = e.value;
                  final isDone = step['done'] as bool;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Container(
                          width: 28, height: 28,
                          decoration: BoxDecoration(
                            color: isDone ? _groceryColor : Colors.grey.shade200,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(isDone ? Icons.check : Icons.circle, color: Colors.white, size: 14),
                        ),
                        const SizedBox(width: 10),
                        Expanded(child: Text(step['label'] as String, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: isDone ? Colors.grey.shade800 : Colors.grey.shade400))),
                        Text(step['time'] as String, style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontFeatures: const [FontFeature.tabularFigures()])),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Items
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Items', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                    Text('${_items.length} items', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  ],
                ),
                const SizedBox(height: 10),
                ..._items.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Text(item['emoji'] as String, style: const TextStyle(fontSize: 20)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item['name'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                            Text('Qty: ${item['qty']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                          ],
                        ),
                      ),
                      Text('$currency${(item['price'] as int) * (item['qty'] as int)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                    ],
                  ),
                )),
                const Divider(),
                _summaryRow('Subtotal', '$currency${539}'),
                _summaryRow('Delivery Fee', '$currency${29}'),
                _summaryRow('Discount', '-$currency${45}', isGreen: true),
                _summaryRow('Tax', '$currency${27}'),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
                    Text('${currency}550', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: _groceryColor)),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Delivery info
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Delivery Info', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                _infoRow(Icons.store, 'FreshMart Supermarket'),
                _infoRow(Icons.location_on, '45/2, 100 Feet Road, Bengaluru'),
                _infoRow(Icons.payment, 'Paid via KARTSEEK Wallet'),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, CustomerRouter.groceryOrderHistory),
                  icon: const Icon(Icons.replay, size: 16),
                  label: const Text('Reorder', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: _groceryColor),
                    foregroundColor: _groceryColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, CustomerRouter.groceryHelp),
                  icon: const Icon(Icons.help_outline, size: 16),
                  label: const Text('Need Help?', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: Colors.grey.shade300),
                    foregroundColor: Colors.grey.shade700,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, {bool isGreen = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isGreen ? Colors.green : Colors.grey.shade700)),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Icon(icon, size: 16, color: Colors.grey.shade400),
        const SizedBox(width: 8),
        Text(text, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
      ]),
    );
  }
}
