import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Refund request — order selection, reason, evidence upload.
class PharmacyRefundScreen extends StatefulWidget {
  final String? orderId;
  const PharmacyRefundScreen({super.key, this.orderId});
  @override State<PharmacyRefundScreen> createState() => _PharmacyRefundScreenState();
}

class _PharmacyRefundScreenState extends State<PharmacyRefundScreen> {
  String? _reason;
  final _detailsCtrl = TextEditingController();
  final _reasons = [
    'Received wrong medicine',
    'Medicine expired or damaged',
    'Missing items in order',
    'Quality issue',
    'Order not received',
    'Other',
  ];

  @override
  void dispose() { _detailsCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Request Refund', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Order
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
            child: Row(
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(color: Colors.cyan.shade50, shape: BoxShape.circle),
                  child: const Icon(Icons.receipt_long, color: Colors.cyan, size: 22),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Order #${widget.orderId ?? "PH-2026-001"}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    Text('Delivered on 05 Jul, 2026', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Reason
          Text('Select Reason', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.grey.shade700)),
          const SizedBox(height: 10),
          ...(_reasons.map((r) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: GestureDetector(
              onTap: () => setState(() => _reason = r),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: _reason == r ? AppTheme.pharmacyColor.withValues(alpha: 0.06) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _reason == r ? AppTheme.pharmacyColor : Colors.grey.shade200, width: _reason == r ? 2 : 1),
                ),
                child: Row(
                  children: [
                    Icon(_reason == r ? Icons.radio_button_checked : Icons.radio_button_off,
                      color: _reason == r ? AppTheme.pharmacyColor : Colors.grey.shade400, size: 20),
                    const SizedBox(width: 12),
                    Text(r, style: TextStyle(fontSize: 14, fontWeight: _reason == r ? FontWeight.w600 : FontWeight.w400)),
                  ],
                ),
              ),
            ),
          ))),
          const SizedBox(height: 16),
          // Details
          Text('Additional Details', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.grey.shade700)),
          const SizedBox(height: 10),
          TextField(
            controller: _detailsCtrl,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'Describe the issue in detail (optional)',
              hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
              filled: true, fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.pharmacyColor, width: 2)),
            ),
          ),
          const SizedBox(height: 16),
          // Photo evidence
          Text('Upload Evidence (Optional)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.grey.shade700)),
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () {},
            child: Container(
              height: 100,
              decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200, style: BorderStyle.solid),
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.add_photo_alternate_outlined, size: 32, color: Colors.grey.shade400),
                    const SizedBox(height: 4),
                    Text('Tap to upload photos', style: TextStyle(fontSize: 12, color: Colors.grey.shade400)),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          // Policy note
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue.shade700, size: 18),
                const SizedBox(width: 10),
                Expanded(child: Text('Refund will be processed to your original payment method within 5-7 business days.',
                  style: TextStyle(fontSize: 12, color: Colors.blue.shade800, height: 1.4))),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Submit
          SizedBox(
            width: double.infinity, height: 52,
            child: ElevatedButton(
              onPressed: _reason != null ? () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Refund request submitted successfully.')));
              } : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red, foregroundColor: Colors.white,
                disabledBackgroundColor: Colors.grey.shade300,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
              child: const Text('Submit Refund Request'),
            ),
          ),
        ],
      ),
    );
  }
}
