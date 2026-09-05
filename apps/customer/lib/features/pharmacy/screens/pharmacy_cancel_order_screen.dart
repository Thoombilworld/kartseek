import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Cancel pharmacy order screen — confirmation with reason selection.
class PharmacyCancelOrderScreen extends StatefulWidget {
  final String orderId;
  const PharmacyCancelOrderScreen({super.key, this.orderId = 'PH-2026-1234'});
  @override
  State<PharmacyCancelOrderScreen> createState() =>
      _PharmacyCancelOrderScreenState();
}

class _PharmacyCancelOrderScreenState extends State<PharmacyCancelOrderScreen> {
  String? _reason;
  bool _cancelling = false;

  final _reasons = [
    ('Changed my mind', Icons.sentiment_neutral_rounded),
    ('Found cheaper elsewhere', Icons.price_change_outlined),
    ('Delivery too late', Icons.timer_off_rounded),
    ('Ordered wrong medicine', Icons.medication_outlined),
    ('Need to modify order', Icons.edit_note_rounded),
    ('Other reason', Icons.help_outline_rounded),
  ];

  Future<void> _cancel() async {
    if (_reason == null) return;
    setState(() => _cancelling = true);
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) Navigator.pop(context, 'cancelled');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        leading: IconButton(
            icon: const Icon(Icons.close, color: Colors.black87),
            onPressed: () => Navigator.pop(context)),
        title: const Text('Cancel Order',
            style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Colors.black87)),
      ),
      body: Column(children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Warning card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.warning_amber_rounded,
                          color: Colors.amber.shade700, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Are you sure?',
                                  style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15,
                                      color: Colors.amber.shade900)),
                              const SizedBox(height: 4),
                              Text(
                                  'If medicines are already packed, cancellation fees may apply. Refund will be processed within 3-5 business days.',
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.amber.shade800,
                                      height: 1.5)),
                            ]),
                      ),
                    ]),
              ),
              const SizedBox(height: 24),

              // Order summary
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200)),
                child: Row(children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                        color: AppTheme.pharmacyColor.withValues(alpha: 0.1),
                        shape: BoxShape.circle),
                    child: const Icon(Icons.receipt_long,
                        color: AppTheme.pharmacyColor, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Order #${widget.orderId}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14)),
                        Text('3 items • ₹456.00',
                            style: TextStyle(
                                fontSize: 12, color: Colors.grey.shade500)),
                      ]),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(6)),
                    child: Text('Processing',
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.blue.shade700)),
                  ),
                ]),
              ),
              const SizedBox(height: 24),

              // Reason selection
              const Text('Select a reason',
                  style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: Colors.black87)),
              const SizedBox(height: 12),
              ...List.generate(_reasons.length, (i) {
                final (label, icon) = _reasons[i];
                final selected = _reason == label;
                return GestureDetector(
                  onTap: () => setState(() => _reason = label),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppTheme.pharmacyColor.withValues(alpha: 0.06)
                          : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color: selected
                              ? AppTheme.pharmacyColor
                              : Colors.grey.shade200,
                          width: selected ? 1.5 : 1),
                    ),
                    child: Row(children: [
                      Icon(icon,
                          size: 22,
                          color: selected
                              ? AppTheme.pharmacyColor
                              : Colors.grey.shade400),
                      const SizedBox(width: 14),
                      Expanded(
                          child: Text(label,
                              style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: selected
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                  color: selected
                                      ? AppTheme.pharmacyColor
                                      : Colors.black87))),
                      if (selected)
                        const Icon(Icons.check_circle,
                            color: AppTheme.pharmacyColor, size: 22),
                    ]),
                  ),
                );
              }),
            ],
          ),
        ),

        // Bottom buttons
        Container(
          padding: EdgeInsets.fromLTRB(
              16, 12, 16, 12 + MediaQuery.of(context).padding.bottom),
          decoration: BoxDecoration(color: Colors.white, boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, -2))
          ]),
          child: Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: BorderSide(color: Colors.grey.shade300),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Keep Order',
                    style: TextStyle(
                        fontWeight: FontWeight.w700, color: Colors.black87)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: _reason == null || _cancelling ? null : _cancel,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade600,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: _cancelling
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('Cancel Order',
                        style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}
