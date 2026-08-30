import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';

import 'package:kartseek_customer/features/marketplace/services/marketplace_mock_data.dart';
import 'package:kartseek_customer/features/marketplace/models/product_model.dart';

/// Returns Screen — Allows user to select an order item, reason, and request a return/refund.
class ReturnsScreen extends StatefulWidget {
  final String orderId;
  const ReturnsScreen({super.key, this.orderId = 'KS-2026-78432'});

  @override
  State<ReturnsScreen> createState() => _ReturnsScreenState();
}

class _ReturnsScreenState extends State<ReturnsScreen> {
  int _selectedReason = -1;
  int _selectedItemIndex = 0;
  final _reasons = [
    'Item is defective or damaged',
    'Received wrong item',
    'Item does not match description',
    'Missing accessories or parts',
    'Changed my mind',
  ];
  bool _submitted = false;

  @override
  Widget build(BuildContext context) {
    if (_submitted) return _buildSuccess();

    // Fetch actual order data
    OrderModel? order;
    try {
      order = MarketplaceMockData.mockOrders.firstWhere((o) => o.id == widget.orderId);
    } catch (_) {
      order = null;
    }

    final items = order?.items ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: Colors.white, title: const Text('Request Return', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
      body: ListView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(16), children: [
        if (items.isNotEmpty) ...[
          const Text('Select Item to Return', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ...List.generate(items.length, (i) {
            final item = items[i];
            final selected = _selectedItemIndex == i;
            return GestureDetector(
              onTap: () => setState(() => _selectedItemIndex = i),
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: selected ? AppTheme.marketplaceColor.withValues(alpha: 0.05) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: selected ? AppTheme.marketplaceColor : const Color(0xFFE5E7EB), width: selected ? 2 : 1)
                ),
                child: Row(children: [
                  KartseekImage(
                    url: item.productImage,
                    width: 50,
                    height: 50,
                    fit: BoxFit.cover,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(item.productName, style: TextStyle(fontSize: 14, fontWeight: selected ? FontWeight.w800 : FontWeight.w600)),
                    Text('Qty: ${item.quantity}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ])),
                  Icon(selected ? Icons.check_circle : Icons.circle_outlined, color: selected ? AppTheme.marketplaceColor : Colors.grey.shade300),
                ]),
              ),
            );
          }),
        ],
        
        const SizedBox(height: 24),
        const Text('Reason for Return', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...List.generate(_reasons.length, (i) => GestureDetector(
          onTap: () => setState(() => _selectedReason = i),
          child: Container(margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: _selectedReason == i ? AppTheme.marketplaceColor : const Color(0xFFE5E7EB))),
            child: Row(children: [
              Icon(_selectedReason == i ? Icons.radio_button_checked : Icons.radio_button_off, color: _selectedReason == i ? AppTheme.marketplaceColor : Colors.grey.shade400, size: 20),
              const SizedBox(width: 12),
              Expanded(child: Text(_reasons[i], style: TextStyle(fontSize: 14, fontWeight: _selectedReason == i ? FontWeight.w600 : FontWeight.w400))),
            ])),
        )),

        const SizedBox(height: 24),
        const Text('Upload Images (Optional)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        Container(height: 80, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE5E7EB), style: BorderStyle.solid)),
          child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.add_a_photo, color: Colors.grey.shade400),
            const SizedBox(height: 4),
            Text('Add up to 3 images', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          ]))),
        
        const SizedBox(height: 24),
        const Text('Pickup Address', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE5E7EB))),
          child: Row(children: [
            const Icon(Icons.location_on_outlined, color: AppTheme.textSecondary),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(order?.address?.label ?? 'Home', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
              Text('${order?.address?.fullAddress ?? ''}\n${order?.address?.city ?? ''} — ${order?.address?.pincode ?? ''}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.4)),
            ])),
            const Text('Change', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.marketplaceColor)),
          ])),
        
        const SizedBox(height: 24),
        const Text('Refund Method', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.green.shade600)),
          child: Row(children: [
            Icon(Icons.account_balance_wallet, color: Colors.green.shade700),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Original Payment Method', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.green.shade800)),
              Text('Refund in 3-5 business days after pickup', style: TextStyle(fontSize: 12, color: Colors.green.shade700)),
            ])),
          ])),
        const SizedBox(height: 40),
      ]),
      bottomNavigationBar: Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -4))]),
        child: SizedBox(height: 52, child: ElevatedButton(
          onPressed: _selectedReason == -1 ? null : () => setState(() => _submitted = true),
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          child: const Text('Submit Return Request', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
        ))),
    );
  }

  Widget _buildSuccess() {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(child: Padding(padding: const EdgeInsets.all(32), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Container(width: 80, height: 80, decoration: const BoxDecoration(color: Color(0xFFF0FDF4), shape: BoxShape.circle), child: const Icon(Icons.check_circle, size: 50, color: Colors.green)),
        const SizedBox(height: 24),
        const Text('Return Requested', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        Text('Your return request for Order #${widget.orderId} has been successfully submitted. Our delivery partner will pick up the item within 48 hours.', textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5)),
        const SizedBox(height: 40),
        SizedBox(width: double.infinity, height: 52, child: ElevatedButton(
          onPressed: () => Navigator.pop(context),
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          child: const Text('Back to Order', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)))),
      ]))),
    );
  }
}
