import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

import 'package:kartseek_customer/features/marketplace/services/marketplace_mock_data.dart';
import 'package:kartseek_customer/features/marketplace/models/product_model.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Support Screen — Customer support and issue ticketing.
class SupportScreen extends StatefulWidget {
  final String? orderId;
  const SupportScreen({super.key, this.orderId});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final _msgCtrl = TextEditingController();
  String _category = 'Order Issue';
  final _categories = ['Order Issue', 'Payment/Refund', 'Delivery Delay', 'Account Help', 'Other'];
  bool _submitted = false;

  @override
  void dispose() { _msgCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    if (_submitted) return _buildSuccess();

    OrderModel? order;
    if (widget.orderId != null) {
      try {
        order = MarketplaceMockData.mockOrders.firstWhere((o) => o.id == widget.orderId);
      } catch (_) {}
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(backgroundColor: Colors.white, title: const Text('Customer Support', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
      body: ListView(physics: const BouncingScrollPhysics(), padding: const EdgeInsets.all(16), children: [
        if (widget.orderId != null) ...[
          const Text('Related Order', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE5E7EB))),
            child: Row(children: [
              const Icon(Icons.receipt_long, color: AppTheme.marketplaceColor),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Order #${widget.orderId}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                if (order != null) Text('${order.items.length} items • ${RegionService.instance.currentCountry.currencySymbol} ${order.total.toInt()}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.4)),
              ])),
            ])),
          const SizedBox(height: 24),
        ],

        const Text('Issue Category', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE5E7EB))),
          child: DropdownButtonHideUnderline(child: DropdownButton<String>(
            value: _category, isExpanded: true,
            icon: const Icon(Icons.keyboard_arrow_down),
            items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 14)))).toList(),
            onChanged: (v) { if (v != null) setState(() => _category = v); },
          ))),

        const SizedBox(height: 24),
        const Text('Describe your issue', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE5E7EB))),
          child: TextField(controller: _msgCtrl, maxLines: 5, decoration: const InputDecoration(border: InputBorder.none, hintText: 'Please provide as much detail as possible so we can help you faster...', hintStyle: TextStyle(fontSize: 14, color: Colors.black38)), style: const TextStyle(fontSize: 14))),
        
        const SizedBox(height: 24),
        const Text('Attachments (Optional)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Container(height: 60, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE5E7EB))),
          child: Center(child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.attach_file, color: Colors.grey.shade500, size: 20),
            const SizedBox(width: 8),
            Text('Upload Screenshot', style: TextStyle(fontSize: 14, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
          ]))),
        const SizedBox(height: 40),
      ]),
      bottomNavigationBar: Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -4))]),
        child: SizedBox(height: 52, child: ElevatedButton(
          onPressed: () => setState(() => _submitted = true),
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          child: const Text('Submit Ticket', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
        ))),
    );
  }

  Widget _buildSuccess() {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(child: Padding(padding: const EdgeInsets.all(32), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Container(width: 80, height: 80, decoration: BoxDecoration(color: AppTheme.marketplaceColor.withValues(alpha: 0.1), shape: BoxShape.circle), child: const Icon(Icons.support_agent, size: 40, color: AppTheme.marketplaceColor)),
        const SizedBox(height: 24),
        const Text('Ticket Created', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        Text('We have received your support request. A customer service agent will contact you within 24 hours.', textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5)),
        const SizedBox(height: 40),
        SizedBox(width: double.infinity, height: 52, child: ElevatedButton(
          onPressed: () => Navigator.pop(context),
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.marketplaceColor, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          child: const Text('Done', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)))),
      ]))),
    );
  }
}
