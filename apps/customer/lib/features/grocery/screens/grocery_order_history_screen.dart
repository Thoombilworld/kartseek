import 'package:flutter/material.dart';
import 'package:kartseek_customer/routing/customer_router.dart';

import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Order History Screen — Active & Past orders.
class GroceryOrderHistoryScreen extends StatefulWidget {
  const GroceryOrderHistoryScreen({super.key});
  @override
  State<GroceryOrderHistoryScreen> createState() => _GroceryOrderHistoryScreenState();
}

class _GroceryOrderHistoryScreenState extends State<GroceryOrderHistoryScreen> with SingleTickerProviderStateMixin {
  static const _groceryColor = AppTheme.groceryColor;
  late TabController _tabController;

  static const _activeOrders = [
    {'id': 'GRC-2847', 'store': 'FreshMart', 'items': 4, 'total': 550, 'status': 'Out for Delivery', 'statusColor': 0xFF4CAF50, 'time': 'ETA 15 min', 'emoji': '🛵'},
    {'id': 'GRC-2846', 'store': 'Green Basket', 'items': 2, 'total': 180, 'status': 'Packing', 'statusColor': 0xFFFF9800, 'time': '10 min ago', 'emoji': '📦'},
  ];

  static const _pastOrders = [
    {'id': 'GRC-2845', 'store': 'D-Mart', 'items': 6, 'total': 1250, 'status': 'Delivered', 'statusColor': 0xFF4CAF50, 'time': 'Yesterday', 'emoji': '✅'},
    {'id': 'GRC-2840', 'store': 'FreshMart', 'items': 3, 'total': 390, 'status': 'Delivered', 'statusColor': 0xFF4CAF50, 'time': '3 days ago', 'emoji': '✅'},
    {'id': 'GRC-2835', 'store': 'Fresh N Easy', 'items': 5, 'total': 820, 'status': 'Cancelled', 'statusColor': 0xFFF44336, 'time': '1 week ago', 'emoji': '❌'},
  ];

  @override
  void initState() { super.initState(); _tabController = TabController(length: 2, vsync: this); }
  @override
  void dispose() { _tabController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _groceryColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('My Orders', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white54,
          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
          tabs: [
            Tab(text: 'Active (${_activeOrders.length})'),
            Tab(text: 'Past (${_pastOrders.length})'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOrderList(_activeOrders, currency, isActive: true),
          _buildOrderList(_pastOrders, currency, isActive: false),
        ],
      ),
    );
  }

  Widget _buildOrderList(List<Map<String, dynamic>> orders, String currency, {required bool isActive}) {
    if (orders.isEmpty) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(isActive ? '🛒' : '📦', style: const TextStyle(fontSize: 48)),
        const SizedBox(height: 8),
        Text(isActive ? 'No active orders' : 'No past orders', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
      ]));
    }

    return RefreshIndicator(
      color: _groceryColor,
      onRefresh: () async => await Future.delayed(const Duration(seconds: 1)),
      child: ListView.builder(
        padding: const EdgeInsets.all(14),
        itemCount: orders.length,
        itemBuilder: (context, i) {
          final o = orders[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Text(o['emoji'] as String, style: const TextStyle(fontSize: 24)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(o['store'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                          Text('Order #${o['id']} • ${o['items']} items', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                        ],
                      ),
                    ),
                    Text('$currency${o['total']}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Color(o['statusColor'] as int).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(o['status'] as String, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(o['statusColor'] as int))),
                    ),
                    const SizedBox(width: 8),
                    Text(o['time'] as String, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
                    const Spacer(),
                    if (isActive)
                      TextButton(onPressed: () => Navigator.pushNamed(context, CustomerRouter.groceryOrderTracking, arguments: o['id']), child: const Text('Track', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _groceryColor)))
                    else
                      TextButton(onPressed: () => Navigator.pushNamed(context, CustomerRouter.groceryCart), child: const Text('Reorder', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _groceryColor))),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
