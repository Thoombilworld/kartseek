import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Return Request Screen — Multi-step return/exchange flow with reason selection and pickup scheduling.
class ReturnRequestScreen extends StatefulWidget {
  final String orderId;
  const ReturnRequestScreen({super.key, this.orderId = 'ORD-12345'});
  @override
  State<ReturnRequestScreen> createState() => _ReturnRequestScreenState();
}

class _ReturnRequestScreenState extends State<ReturnRequestScreen> {
  int _step = 0;
  String? _reason;
  String _type = 'return';
  String? _pickupDate;
  final _descController = TextEditingController();

  final _reasons = [
    'Product is defective',
    'Wrong item received',
    'Item not as described',
    'Better price elsewhere',
    'No longer needed',
    'Missing parts or accessories'
  ];

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('Return Request',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: Column(children: [
        // Progress
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Row(
              children: List.generate(
                  4,
                  (i) => Expanded(
                          child: Row(children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: i <= _step
                                ? AppTheme.marketplaceColor
                                : AppTheme.surfaceMuted,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                              child: i < _step
                                  ? const Icon(Icons.check,
                                      size: 16, color: Colors.white)
                                  : Text('${i + 1}',
                                      style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: i == _step
                                              ? Colors.white
                                              : AppTheme.textMuted))),
                        ),
                        if (i < 3)
                          Expanded(
                              child: Container(
                                  height: 2,
                                  color: i < _step
                                      ? AppTheme.marketplaceColor
                                      : AppTheme.borderLight)),
                      ])))),
        ),
        Container(
          color: Colors.white,
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: ['Type', 'Reason', 'Pickup', 'Confirm']
                  .map((l) => Text(l,
                      style: const TextStyle(
                          fontSize: 10, color: AppTheme.textMuted)))
                  .toList()),
        ),
        Expanded(
            child: SingleChildScrollView(
                padding: const EdgeInsets.all(16), child: _buildStep())),
      ]),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppTheme.borderLight))),
        child: SafeArea(
            child: Row(children: [
          if (_step > 0)
            Expanded(
                child: OutlinedButton(
              onPressed: () => setState(() => _step--),
              style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14))),
              child: const Text('Back',
                  style: TextStyle(fontWeight: FontWeight.w600)),
            )),
          if (_step > 0) const SizedBox(width: 12),
          Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: _canProceed()
                    ? () {
                        if (_step < 3) {
                          setState(() => _step++);
                        } else {
                          Navigator.pop(context);
                        }
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.marketplaceColor,
                    disabledBackgroundColor: AppTheme.borderLight,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14))),
                child: Text(_step == 3 ? 'Submit Request' : 'Continue',
                    style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        color: Colors.white)),
              )),
        ])),
      ),
    );
  }

  bool _canProceed() {
    if (_step == 1) return _reason != null;
    if (_step == 2) return _pickupDate != null;
    return true;
  }

  Widget _buildStep() {
    switch (_step) {
      case 0:
        return _stepType();
      case 1:
        return _stepReason();
      case 2:
        return _stepPickup();
      case 3:
        return _stepConfirm();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _stepType() =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('What would you like to do?',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 16),
        ...['return', 'exchange'].map((t) => GestureDetector(
              onTap: () => setState(() => _type = t),
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: _type == t
                          ? AppTheme.marketplaceColor
                          : AppTheme.borderLight,
                      width: _type == t ? 2 : 1),
                ),
                child: Row(children: [
                  Icon(
                      t == 'return'
                          ? Icons.assignment_return
                          : Icons.swap_horiz,
                      color: AppTheme.marketplaceColor,
                      size: 28),
                  const SizedBox(width: 16),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(t == 'return' ? 'Return & Refund' : 'Exchange',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 16)),
                        const SizedBox(height: 2),
                        Text(
                            t == 'return'
                                ? 'Get full refund to original payment'
                                : 'Replace with same or different product',
                            style: const TextStyle(
                                color: AppTheme.textSecondary, fontSize: 13)),
                      ])),
                  if (_type == t)
                    const Icon(Icons.check_circle, color: AppTheme.marketplaceColor),
                ]),
              ),
            )),
      ]);

  Widget _stepReason() =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Why are you returning?',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 16),
        ..._reasons.map((r) => GestureDetector(
              onTap: () => setState(() => _reason = r),
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: _reason == r
                          ? AppTheme.marketplaceColor
                          : AppTheme.borderLight),
                ),
                child: Row(children: [
                  Icon(
                      _reason == r
                          ? Icons.radio_button_checked
                          : Icons.radio_button_off,
                      color: _reason == r
                          ? AppTheme.marketplaceColor
                          : AppTheme.textMuted,
                      size: 20),
                  const SizedBox(width: 12),
                  Text(r, style: const TextStyle(fontSize: 14)),
                ]),
              ),
            )),
        const SizedBox(height: 12),
        const Text('Additional details (optional)',
            style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: AppTheme.textSecondary)),
        const SizedBox(height: 8),
        TextField(
            controller: _descController,
            maxLines: 3,
            decoration: InputDecoration(
                hintText: 'Describe the issue...',
                hintStyle: const TextStyle(color: AppTheme.textMuted),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.borderLight)),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.marketplaceColor)),
                filled: true,
                fillColor: Colors.white)),
      ]);

  Widget _stepPickup() =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Schedule Pickup',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 16),
        ...['Tomorrow, Jul 3', 'Jul 4 (Fri)', 'Jul 5 (Sat)', 'Jul 7 (Mon)']
            .map((d) => GestureDetector(
                  onTap: () => setState(() => _pickupDate = d),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: _pickupDate == d
                              ? AppTheme.marketplaceColor
                              : AppTheme.borderLight),
                    ),
                    child: Row(children: [
                      Icon(Icons.calendar_today,
                          color: _pickupDate == d
                              ? AppTheme.marketplaceColor
                              : AppTheme.textMuted,
                          size: 20),
                      const SizedBox(width: 12),
                      Text(d,
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: _pickupDate == d
                                  ? FontWeight.w600
                                  : FontWeight.w400)),
                      const Spacer(),
                      if (_pickupDate == d)
                        const Icon(Icons.check_circle,
                            color: AppTheme.marketplaceColor, size: 20),
                    ]),
                  ),
                )),
      ]);

  Widget _stepConfirm() => Column(children: [
        Container(
          padding: const EdgeInsets.all(32),
          width: double.infinity,
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.borderLight)),
          child: Column(children: [
            const Icon(Icons.check_circle, color: AppTheme.successGreen, size: 56),
            const SizedBox(height: 12),
            const Text('Review Your Request',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
            const SizedBox(height: 16),
            _confirmRow('Order', widget.orderId),
            _confirmRow(
                'Type', _type == 'return' ? 'Return & Refund' : 'Exchange'),
            _confirmRow('Reason', _reason ?? '-'),
            _confirmRow('Pickup', _pickupDate ?? '-'),
            const Divider(height: 24),
            const Text(
                'Refund will be processed within 5-7 business days after pickup.',
                style: TextStyle(
                    color: AppTheme.textSecondary, fontSize: 12, height: 1.4),
                textAlign: TextAlign.center),
          ]),
        ),
      ]);

  Widget _confirmRow(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child:
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(label,
              style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
          Text(value,
              style:
                  const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ]),
      );
}
