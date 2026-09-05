import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Restaurant Order History Screen — past orders with re-order capability.
class RestaurantOrderHistoryScreen extends StatefulWidget {
  const RestaurantOrderHistoryScreen({super.key});

  @override
  State<RestaurantOrderHistoryScreen> createState() => _RestaurantOrderHistoryScreenState();
}

class _RestaurantOrderHistoryScreenState extends State<RestaurantOrderHistoryScreen> {
  List<Map<String, dynamic>> get _orders => [
    {
      'id': 'RO-9981',
      'restaurant': 'Biryani House',
      'type': 'Delivery',
      'status': 'Delivered',
      'items': ['2x Chicken Biryani', '1x Raita', '2x Butter Naan'],
      'total': '${RegionService.instance.currentCountry.currencySymbol} 847',
      'date': 'Today, 1:42 PM',
      'rating': 5,
      'color': 0xFFEA580C,
    },
    {
      'id': 'RO-9912',
      'restaurant': 'Sushi Kingdom',
      'type': 'Takeaway',
      'status': 'Picked Up',
      'items': ['3x Dragon Roll', '1x Miso Soup'],
      'total': '${RegionService.instance.currentCountry.currencySymbol} 1,120',
      'date': 'Yesterday, 7:30 PM',
      'rating': 4,
      'color': 0xFF7C3AED,
    },
    {
      'id': 'RO-9854',
      'restaurant': 'Pizza Palace',
      'type': 'Dine-in',
      'status': 'Completed',
      'items': ['1x Margherita (Large)', '2x Pepsi', '1x Garlic Bread'],
      'total': '${RegionService.instance.currentCountry.currencySymbol} 780',
      'date': '29 May, 8:15 PM',
      'rating': 0,
      'color': 0xFF059669,
    },
    {
      'id': 'RO-9800',
      'restaurant': 'Biryani House',
      'type': 'Table Booking',
      'status': 'Completed',
      'items': ['Table for 4 @ 7:00 PM', 'Pre-order: Family Biryani'],
      'total': '${RegionService.instance.currentCountry.currencySymbol} 1,599',
      'date': '28 May, 7:00 PM',
      'rating': 5,
      'color': 0xFFE11D48,
    },
    {
      'id': 'RO-9741',
      'restaurant': 'China Garden',
      'type': 'Delivery',
      'status': 'Cancelled',
      'items': ['1x Fried Rice', '2x Spring Roll'],
      'total': '${RegionService.instance.currentCountry.currencySymbol} 380',
      'date': '27 May, 2:00 PM',
      'rating': 0,
      'color': 0xFF64748B,
    },
  ];

  String _activeFilter = 'All';
  final _filters = ['All', 'Delivery', 'Takeaway', 'Dine-in', 'Table Booking'];

  List<Map<String, dynamic>> get _filtered => _orders
      .cast<Map<String, dynamic>>()
      .where((o) => _activeFilter == 'All' || o['type'] == _activeFilter)
      .toList();

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
        title: const Text('Order History', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
      ),
      body: Column(
        children: [
          // Filter Chips
          Container(
            height: 52,
            color: Colors.white,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              itemCount: _filters.length,
              itemBuilder: (_, i) {
                final f = _filters[i];
                final active = _activeFilter == f;
                return GestureDetector(
                  onTap: () => setState(() => _activeFilter = f),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: active ? AppTheme.restaurantColor : Colors.white,
                      border: Border.all(color: active ? AppTheme.restaurantColor : Colors.grey.shade300, width: 1.5),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(f, style: TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 12,
                      color: active ? Colors.white : Colors.grey.shade700,
                    )),
                  ),
                );
              },
            ),
          ),
          Divider(color: Colors.grey.shade200, height: 1),

          // Orders List
          Expanded(
            child: _filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.receipt_long, size: 64, color: Colors.grey.shade300),
                        const SizedBox(height: 12),
                        Text('No orders found', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: Colors.grey.shade500)),
                        const SizedBox(height: 4),
                        Text('Try a different filter', style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filtered.length,
                    itemBuilder: (_, i) => _OrderCard(order: _filtered[i]),
                  ),
          ),
        ],
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Map<String, dynamic> order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final status = order['status'] as String;
    final isDelivered = status == 'Delivered' || status == 'Completed' || status == 'Picked Up';
    final isCancelled = status == 'Cancelled';
    final rating = order['rating'] as int;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: Color(order['color'] as int).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                  child: Text(order['type'] as String, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(order['color'] as int))),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isCancelled ? Colors.red.shade50 : isDelivered ? Colors.green.shade50 : Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                    color: isCancelled ? Colors.red.shade600 : isDelivered ? Colors.green.shade700 : Colors.amber.shade700)),
                ),
                const Spacer(),
                Text(order['date'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade400, fontWeight: FontWeight.w500)),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(order['restaurant'] as String, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    Text(order['total'] as String, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  ],
                ),
                const SizedBox(height: 6),
                Text((order['items'] as List<String>).join(' • '), style: TextStyle(color: Colors.grey.shade500, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),

                // Star rating (if rated)
                if (rating > 0) ...[
                  const SizedBox(height: 8),
                  Row(children: [
                    ...List.generate(5, (i) => Icon(i < rating ? Icons.star : Icons.star_border, size: 14, color: Colors.amber.shade500)),
                    const SizedBox(width: 6),
                    Text('You rated this order', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  ]),
                ],
              ],
            ),
          ),

          if (!isCancelled)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.pushNamed(context, AppRouter.restaurantDetail, arguments: order['restaurant']),
                      icon: const Icon(Icons.refresh, size: 14),
                      label: const Text('Reorder', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppTheme.restaurantColor),
                        foregroundColor: AppTheme.restaurantColor,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Loading bill for order ${order['id']}\u2026'), backgroundColor: AppTheme.restaurantColor, behavior: SnackBarBehavior.floating)); },
                      icon: const Icon(Icons.receipt_outlined, size: 14),
                      label: const Text('View Bill', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.grey.shade300),
                        foregroundColor: Colors.grey.shade600,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
