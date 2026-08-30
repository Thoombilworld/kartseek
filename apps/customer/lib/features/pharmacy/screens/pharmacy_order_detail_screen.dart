import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_mock_data.dart';

/// Order detail — items, status timeline, prescription info, reorder.
class PharmacyOrderDetailScreen extends StatefulWidget {
  final String orderId;
  const PharmacyOrderDetailScreen({super.key, required this.orderId});
  @override State<PharmacyOrderDetailScreen> createState() => _PharmacyOrderDetailScreenState();
}

class _PharmacyOrderDetailScreenState extends State<PharmacyOrderDetailScreen> {
  @override
  void initState() {
    super.initState();
    context.read<PharmacyBloc>().add(LoadPharmacyOrderDetail(widget.orderId));
  }

  @override
  Widget build(BuildContext context) {
    final cs = RegionService.instance.currentCountry.currencySymbol;
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Order Details', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: BlocBuilder<PharmacyBloc, PharmacyState>(
        builder: (context, state) {
          final order = state.orderDetail ?? PharmacyMockData.orders.first;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Order header
              _headerCard(order, cs),
              const SizedBox(height: 12),
              // Status timeline
              _timelineCard(order),
              const SizedBox(height: 12),
              // Items
              _itemsCard(order, cs),
              const SizedBox(height: 12),
              // Price summary
              _priceCard(order, cs),
              const SizedBox(height: 12),
              // Prescription
              if (order.requiresPrescription) _prescriptionCard(order),
              const SizedBox(height: 20),
              // Actions
              if (order.isActive)
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.map_outlined, size: 18),
                    label: const Text('Track Order'),
                    onPressed: () => Navigator.pushNamed(context, '/pharmacy/tracking', arguments: order.orderNumber),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                )
              else
                SizedBox(
                  width: double.infinity, height: 48,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.replay, size: 18),
                    label: const Text('Reorder'),
                    onPressed: () {
                      context.read<PharmacyBloc>().add(ReorderPharmacyOrder(order.id));
                      Navigator.pushNamed(context, '/pharmacy/cart');
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.pharmacyColor,
                      side: const BorderSide(color: AppTheme.pharmacyColor),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _headerCard(PharmacyOrder order, String cs) {
    final statusColors = <String, Color>{
      'PENDING': Colors.amber, 'CONFIRMED': Colors.blue, 'PREPARING': Colors.purple,
      'OUT_FOR_DELIVERY': Colors.indigo, 'DELIVERED': Colors.green, 'CANCELLED': Colors.red,
    };
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(order.storeName ?? 'Pharmacy', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: (statusColors[order.status] ?? Colors.grey).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  order.status.replaceAll('_', ' '),
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: statusColors[order.status] ?? Colors.grey.shade700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Order #${order.orderNumber}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          const SizedBox(height: 4),
          Text('${order.items.length} items • $cs ${order.grandTotal.toStringAsFixed(0)}', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
        ],
      ),
    );
  }

  Widget _timelineCard(PharmacyOrder order) {
    final steps = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    final currentIdx = steps.indexOf(order.status).clamp(0, steps.length - 1);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Order Status', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          ...List.generate(steps.length, (i) {
            final done = i <= currentIdx;
            final isLast = i == steps.length - 1;
            final labels = ['Order Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 24, height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: done ? Colors.green : Colors.grey.shade200,
                      ),
                      child: done ? const Icon(Icons.check, color: Colors.white, size: 14) : null,
                    ),
                    if (!isLast) Container(width: 2, height: 32, color: done ? Colors.green.shade200 : Colors.grey.shade200),
                  ],
                ),
                const SizedBox(width: 12),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(labels[i], style: TextStyle(
                    fontSize: 13, fontWeight: done ? FontWeight.w600 : FontWeight.w400,
                    color: done ? Colors.black87 : Colors.grey.shade400,
                  )),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _itemsCard(PharmacyOrder order, String cs) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Items', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ...order.items.map((item) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: Colors.cyan.shade50, borderRadius: BorderRadius.circular(8)),
                  child: Center(child: Text(item.requiresPrescription ? '💊' : '🧴', style: const TextStyle(fontSize: 18))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(child: Text(item.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis)),
                          if (item.requiresPrescription) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(3)),
                              child: Text('Rx', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.red.shade700)),
                            ),
                          ],
                        ],
                      ),
                      Text('Qty: ${item.quantity}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    ],
                  ),
                ),
                Text('$cs ${(item.price * item.quantity).toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _priceCard(PharmacyOrder order, String cs) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
      child: Column(
        children: [
          _priceRow('Item Total', '$cs ${order.itemTotal.toStringAsFixed(0)}'),
          const SizedBox(height: 8),
          _priceRow('Delivery Fee', order.deliveryFee == 0 ? 'FREE' : '$cs ${order.deliveryFee.toStringAsFixed(0)}', isGreen: order.deliveryFee == 0),
          if (order.discount > 0) ...[
            const SizedBox(height: 8),
            _priceRow('Discount', '-$cs ${order.discount.toStringAsFixed(0)}', isGreen: true),
          ],
          const Divider(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Grand Total', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
              Text('$cs ${order.grandTotal.toStringAsFixed(0)}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.payment, size: 14, color: Colors.grey.shade400),
              const SizedBox(width: 6),
              Text('${order.paymentMethod} • ${order.paymentStatus}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _priceRow(String label, String value, {bool isGreen = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isGreen ? Colors.green.shade700 : Colors.black87)),
      ],
    );
  }

  Widget _prescriptionCard(PharmacyOrder order) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.amber.shade50, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.medical_information, color: Colors.amber.shade700, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Prescription Required', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.amber.shade900)),
                const SizedBox(height: 4),
                Text('This order contains medicines that need a valid prescription. Verification is in progress.',
                  style: TextStyle(fontSize: 12, color: Colors.amber.shade800, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
