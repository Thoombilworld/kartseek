import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Cancel Order Screen — lets the user cancel a pending order.
class CancelOrderScreen extends StatefulWidget {
  final String orderId;
  const CancelOrderScreen({super.key, this.orderId = 'KS-2026-78432'});
  @override
  State<CancelOrderScreen> createState() => _CancelOrderScreenState();
}

class _CancelOrderScreenState extends State<CancelOrderScreen> {
  String? _selectedReason;
  final _otherController = TextEditingController();
  bool _isSubmitting = false;

  final _reasons = [
    'Changed my mind',
    'Found a better price elsewhere',
    'Ordered by mistake',
    'Delivery taking too long',
    'Want to change address',
    'Want to change payment method',
    'Other',
  ];

  Future<void> _submitCancel() async {
    if (_selectedReason == null) return;
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) {
      setState(() => _isSubmitting = false);
      showDialog(context: context, builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(children: [Icon(Icons.check_circle, color: AppTheme.successGreen), SizedBox(width: 8), Text('Order Cancelled')]),
        content: Text('Order ${widget.orderId} has been cancelled. Your refund will be processed within 5-7 business days.'),
        actions: [TextButton(onPressed: () { Navigator.of(context).pop(); Navigator.of(context).pop(); }, child: const Text('OK'))],
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(title: const Text('Cancel Order')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFFECACA))),
            child: Row(children: [
              const Icon(Icons.warning_amber_rounded, color: AppTheme.errorRed, size: 24),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Cancel Order ${widget.orderId}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 2),
                const Text('This action cannot be undone.', style: AppTheme.caption),
              ])),
            ]),
          ),
          const SizedBox(height: 24),
          const Text('Why are you cancelling?', style: AppTheme.headingSM),
          const SizedBox(height: 12),
          ..._reasons.map((r) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: GestureDetector(
              onTap: () => setState(() => _selectedReason = r),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _selectedReason == r ? AppTheme.errorRed : AppTheme.borderLight),
                ),
                child: Row(children: [
                  Icon(_selectedReason == r ? Icons.radio_button_checked : Icons.radio_button_unchecked, color: _selectedReason == r ? AppTheme.errorRed : AppTheme.textMuted, size: 20),
                  const SizedBox(width: 12),
                  Text(r, style: TextStyle(fontSize: 14, color: AppTheme.textPrimary, fontWeight: _selectedReason == r ? FontWeight.w600 : FontWeight.w400)),
                ]),
              ),
            ),
          )),
          if (_selectedReason == 'Other') ...[
            const SizedBox(height: 8),
            TextField(controller: _otherController, maxLines: 3, decoration: const InputDecoration(hintText: 'Please specify your reason...', border: OutlineInputBorder())),
          ],
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: _selectedReason != null && !_isSubmitting ? _submitCancel : null,
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed, minimumSize: const Size.fromHeight(52)),
            child: _isSubmitting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Confirm Cancellation', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ),
      ),
    );
  }
}
