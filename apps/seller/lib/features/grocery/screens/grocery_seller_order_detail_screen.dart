import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_event.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:shared_mobile/core/utils/currency_formatter.dart';

/// Seller Order Detail Screen
class GrocerySellerOrderDetailScreen extends StatelessWidget {
  final String? orderId;
  const GrocerySellerOrderDetailScreen({super.key, this.orderId});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<GrocerySellerBloc, GrocerySellerState>(
      builder: (ctx, state) {
        final o = state.orders.isNotEmpty ? state.orders.first : null;
        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FB),
          appBar: AppBar(backgroundColor: SellerTheme.grocery, surfaceTintColor: Colors.transparent, elevation: 0,
            leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
            title: Text('Order #${o?.orderNumber ?? orderId ?? '---'}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
            actions: [IconButton(icon: const Icon(Icons.phone, color: Colors.white, size: 20), onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Calling ${o?.customerName ?? "customer"}...'))))]),
          body: o == null
              ? const Center(child: Text('Order not found'))
              : ListView(padding: const EdgeInsets.all(16), children: [
                  // Customer
                  _card('Customer', [
                    _row(Icons.person, o.customerName),
                    _row(Icons.phone, o.customerPhone ?? 'N/A'),
                    _row(Icons.location_on, o.deliveryAddress ?? 'N/A'),
                  ]),
                  const SizedBox(height: 10),
                  // Items
                  _card('Items (${o.items.length})', o.items.map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(children: [
                      Text(item.emoji, style: const TextStyle(fontSize: 18)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(item.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                      Text('×${item.quantity}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                      const SizedBox(width: 8),
                      Text(CurrencyFormatter.format(item.totalPrice), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                    ]),
                  )).toList()),
                  const SizedBox(height: 10),
                  _card('Summary', [
                    _sumRow('Subtotal', CurrencyFormatter.format(o.subtotal)),
                    _sumRow('Delivery', CurrencyFormatter.format(o.deliveryFee)),
                    if (o.discount > 0) _sumRow('Discount', '-${CurrencyFormatter.format(o.discount)}'),
                    const Divider(),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      const Text('Total', style: TextStyle(fontWeight: FontWeight.w900)),
                      Text(CurrencyFormatter.format(o.grandTotal), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: SellerTheme.grocery)),
                    ]),
                  ]),
                  const SizedBox(height: 16),
                  if (o.status == SellerOrderStatus.preparing)
                    SizedBox(width: double.infinity, height: 50, child: ElevatedButton(
                      onPressed: () => context.read<GrocerySellerBloc>().add(MarkGroceryOrderReady(o.id)),
                      style: ElevatedButton.styleFrom(backgroundColor: SellerTheme.grocery, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
                      child: const Text('Mark as Ready', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                    )),
                ]),
        );
      },
    );
  }

  Widget _card(String title, List<Widget> children) => Container(
    padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)), const SizedBox(height: 8), ...children]),
  );
  Widget _row(IconData i, String t) => Padding(padding: const EdgeInsets.only(bottom: 4), child: Row(children: [Icon(i, size: 16, color: Colors.grey.shade400), const SizedBox(width: 8), Flexible(child: Text(t, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)))]));
  Widget _sumRow(String l, String v) => Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(l, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)), Text(v, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))]));
}
