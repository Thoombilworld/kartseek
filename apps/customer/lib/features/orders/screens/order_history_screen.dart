import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_customer/features/orders/services/order_api_service.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_mock_data.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';

/// Order History Screen — list of all customer orders.
class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});
  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  bool _loading = true;
  List<dynamic> _orders = [];
  final _apiService = OrderApiService();

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() => _loading = true);
    try {
      final orders = await _apiService.getOrderHistory();
      if (mounted) {
        setState(() {
          _orders = orders;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Fallback to mock data for mapping purposes if backend is empty during demo
    final orders = _orders.isNotEmpty ? _orders : MarketplaceMockData.mockOrders;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: Colors.white, title: const Text('My Orders', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
      body: _loading
        ? const Center(child: CircularProgressIndicator(color: AppTheme.marketplaceColor))
        : orders.isEmpty
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.receipt_long_outlined, size: 72, color: Colors.grey.shade300),
              const SizedBox(height: 16),
              const Text('No orders yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('Your orders will appear here', style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
              const SizedBox(height: 24),
              ElevatedButton(onPressed: () => Navigator.pushNamed(context, AppRouter.marketplace),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Start Shopping', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
            ]))
          : RefreshIndicator(
              onRefresh: _fetchOrders,
              child: ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                padding: const EdgeInsets.all(16),
                itemCount: orders.length,
                itemBuilder: (_, i) {
                  final order = orders[i];
                  final statusColor = order.status == 'Delivered' ? Colors.green.shade700 : order.status == 'Cancelled' ? Colors.red.shade600 : AppTheme.marketplaceColor;
                  return GestureDetector(
                    onTap: () => Navigator.pushNamed(context, AppRouter.orderDetail, arguments: order.id),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Text('Order #${order.id}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                            child: Text(order.status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: statusColor)),
                          ),
                        ]),
                        const SizedBox(height: 4),
                        Text(order.date, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                        const Divider(height: 20),
                        ...order.items.map((item) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Row(children: [
                            KartseekImage(
                              url: item.productImage,
                              width: 48,
                              height: 48,
                              fit: BoxFit.cover,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            const SizedBox(width: 12),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(item.productName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                              Text('${item.sellerName} • Qty: ${item.quantity}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                            ])),
                            Text('${RegionService.instance.currentCountry.currencySymbol} ${_fmt(item.price.toInt())}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                          ]),
                        )),
                        const Divider(height: 16),
                        Row(children: [
                          Text('Total: ${RegionService.instance.currentCountry.currencySymbol} ${_fmt(order.total.toInt())}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
                          const Spacer(),
                          Text('${order.paymentMethod} • ${order.paymentStatus}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                        ]),
                      ]),
                    ),
                  );
                },
              ),
            ),
    );
  }

  String _fmt(int n) => n.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},');
}
