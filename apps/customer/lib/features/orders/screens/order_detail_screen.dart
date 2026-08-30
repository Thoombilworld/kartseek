import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';
import 'package:kartseek_customer/features/orders/services/order_api_service.dart';

/// Order Detail — Full order timeline, items, payment, and actions.
class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, this.orderId = 'KS-2026-78432'});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  bool _loading = true;
  // ignore: unused_field
  Map<String, dynamic> _orderDetails = {};
  final _apiService = OrderApiService();

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    setState(() => _loading = true);
    try {
      final details = await _apiService.getOrderDetail(widget.orderId);
      if (mounted) {
        setState(() {
          _orderDetails = details;
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
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: Colors.white, title: Text('Order #${widget.orderId}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        actions: [IconButton(icon: const Icon(Icons.help_outline, size: 22), onPressed: () => Navigator.pushNamed(context, AppRouter.support, arguments: widget.orderId))]),
      body: _loading
        ? const Center(child: CircularProgressIndicator(color: AppTheme.marketplaceColor))
        : ListView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(16), children: [
        // Status
        Container(padding: const EdgeInsets.all(18), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(width: 40, height: 40, decoration: const BoxDecoration(color: Color(0xFFF0FDF4), shape: BoxShape.circle), child: Icon(Icons.local_shipping, color: Colors.green.shade700, size: 22)),
              const SizedBox(width: 12),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Out for Delivery', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                Text('Expected by May 31, 2026', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
              ]),
            ]),
            const SizedBox(height: 20),
            _timeline('Order Placed', 'May 28, 2026 — 7:30 PM', true, true),
            _timeline('Confirmed', 'May 28, 2026 — 7:32 PM', true, true),
            _timeline('Shipped', 'May 29, 2026 — 11:00 AM', true, true),
            _timeline('Out for Delivery', 'May 31, 2026 — 9:15 AM', true, false),
            _timeline('Delivered', 'Expected by June 1', false, false),
          ])),
        const SizedBox(height: 16),

        // Items
        Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Items', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 14),
            _orderItem('iPhone 15 Pro Max', 'Apple • Black Titanium', '${RegionService.instance.currentCountry.currencySymbol} 1,34,900', 1, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=400&auto=format&fit=crop'),
            const Divider(height: 24),
            _orderItem('Sony WH-1000XM5', 'Sony • Silver', '${RegionService.instance.currentCountry.currencySymbol} 24,990', 1, 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=400&auto=format&fit=crop'),
            const Divider(height: 24),
            _orderItem('Apple Watch SE', 'Apple • Midnight', '${RegionService.instance.currentCountry.currencySymbol} 29,900', 2, 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?q=80&w=400&auto=format&fit=crop'),
          ])),
        const SizedBox(height: 16),

        // Payment
        Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
          child: Column(children: [
            const Row(children: [Text('Payment Summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700))]),
            const SizedBox(height: 12),
            _priceRow('Subtotal', '${RegionService.instance.currentCountry.currencySymbol} 2,19,690'),
            _priceRow('Delivery', 'FREE'),
            _priceRow('Discount', '-${RegionService.instance.currentCountry.currencySymbol} 2,000'),
            _priceRow('Tax (GST)', '${RegionService.instance.currentCountry.currencySymbol} 39,544'),
            const Divider(height: 24),
            Row(children: [const Text('Total Paid', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)), const Spacer(), Text('${RegionService.instance.currentCountry.currencySymbol} 2,57,234', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900))]),
            const SizedBox(height: 8),
            Row(children: [Icon(Icons.credit_card, size: 16, color: Colors.grey.shade500), const SizedBox(width: 6),
              Text('Paid via Credit Card', style: TextStyle(fontSize: 13, color: Colors.grey.shade500))]),
          ])),
        const SizedBox(height: 16),

        // Address
        Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Delivery Address', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            const Text('Home', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 4),
            Text('Apt 4B, Skyline Apartments\n${RegionService.instance.lastDetection?.city ?? RegionService.instance.currentCountry.defaultCity}\n${RegionService.instance.currentCountry.callingCode} 700 123 456', style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.5)),
          ])),
        const SizedBox(height: 16),

        // Actions
        Row(children: [
          Expanded(child: OutlinedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Items added to cart for reorder')),
              );
            }, 
            icon: const Icon(Icons.replay, size: 18), 
            label: const Text('Reorder'),
            style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))))),
          const SizedBox(width: 12),
          Expanded(child: OutlinedButton.icon(onPressed: () => Navigator.pushNamed(context, AppRouter.returns, arguments: widget.orderId), icon: const Icon(Icons.assignment_return, size: 18), label: const Text('Return'),
            style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))))),
        ]),
        const SizedBox(height: 12),
        SizedBox(width: double.infinity, child: OutlinedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Invoice downloading...')),
            );
          }, 
          icon: const Icon(Icons.receipt_long, size: 18), 
          label: const Text('Download Invoice'),
          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))))),
        const SizedBox(height: 40),
      ]),
    );
  }

  Widget _timeline(String title, String sub, bool done, bool lineDown) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Column(children: [
        Container(width: 20, height: 20, decoration: BoxDecoration(color: done ? AppTheme.marketplaceColor : const Color(0xFFE5E7EB), shape: BoxShape.circle),
          child: done ? const Icon(Icons.check, size: 12, color: Colors.white) : null),
        if (lineDown) Container(width: 2, height: 32, color: done ? AppTheme.marketplaceColor : const Color(0xFFE5E7EB)),
      ]),
      const SizedBox(width: 14),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: done ? AppTheme.textPrimary : AppTheme.textMuted)),
        Text(sub, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        SizedBox(height: lineDown ? 12 : 0),
      ]),
    ]);
  }

  Widget _orderItem(String name, String meta, String price, int qty, String img) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      KartseekImage(
        url: img,
        width: 64,
        height: 64,
        fit: BoxFit.cover,
        borderRadius: BorderRadius.circular(10),
      ),
      const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        Text(meta, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        const SizedBox(height: 4),
        Row(children: [Text(price, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)), const SizedBox(width: 8), Text('× $qty', style: TextStyle(fontSize: 13, color: Colors.grey.shade500))]),
      ])),
    ]);
  }

  Widget _priceRow(String l, String v) {
    return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(children: [
      Text(l, style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
      const Spacer(),
      Text(v, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: v == 'FREE' || v.startsWith('-') ? Colors.green.shade700 : null)),
    ]));
  }
}
