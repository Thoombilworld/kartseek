import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/services/partner_delivery_api.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Collect payment at the door and close out the delivery.
///
/// Every figure on this screen used to be a string literal — "2,450" to
/// collect, "150" delivery fee, "120" earnings, "30" commission — with the
/// region's currency symbol pasted in front of rupee amounts, so a rider in
/// Doha was told to collect "QAR 2,450" for every order. Both buttons then did
/// exactly the same thing: `Navigator.pushReplacementNamed(...Completed)`. No
/// settlement, no ledger entry, no completion signal — and since commission is
/// charged at delivery, that event could never fire.
///
/// The amounts now come from the assignment, and each button records what
/// actually happened before completing.
class DeliveryPaymentScreen extends StatefulWidget {
  const DeliveryPaymentScreen({super.key});

  @override
  State<DeliveryPaymentScreen> createState() => _DeliveryPaymentScreenState();
}

class _DeliveryPaymentScreenState extends State<DeliveryPaymentScreen> {
  final _api = PartnerDeliveryApi();

  bool _submitting = false;
  String? _error;

  Map<String, dynamic>? get _args =>
      ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;

  double _amount(String key) => (_args?[key] as num?)?.toDouble() ?? 0;

  Future<void> _complete({required bool cashCollected}) async {
    final assignmentId = _args?['assignmentId']?.toString();
    if (assignmentId == null || assignmentId.isEmpty) {
      setState(() => _error =
          'This delivery is missing its assignment reference. Reopen it from your task list.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await _api.recordPayment(
        assignmentId: assignmentId,
        cashCollected: cashCollected,
        amount: _amount('codAmount'),
      );
      if (!mounted) return;
      Navigator.pushReplacementNamed(
        context,
        PartnerRouter.partnerDeliveryCompleted,
        arguments: _args,
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error =
            "We couldn't record this payment. Check your connection and try again — don't hand the order over until it saves.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final symbol = RegionService.instance.currentCountry.currencySymbol;
    final cod = _amount('codAmount');
    final isCod = cod > 0;
    String money(double v) => '$symbol ${v.toStringAsFixed(0)}';

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(isCod ? 'Collect Payment' : 'Complete Delivery'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                  color: PartnerTheme.deliveryColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle),
              child: const Icon(Icons.local_shipping,
                  size: 40, color: PartnerTheme.deliveryColor),
            ),
            const SizedBox(height: 16),
            const Text('Delivery Verified!',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(
              isCod ? 'Collect the amount below from the customer' : 'This order is already paid',
              style: const TextStyle(fontSize: 14, color: PartnerTheme.textMuted),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: PartnerTheme.cardDecoration(),
              child: Column(children: [
                _row('Order Amount', money(_amount('orderAmount'))),
                _row('Delivery Fee', money(_amount('deliveryFee'))),
                const Divider(height: 24),
                if (isCod) _row('Cash to Collect', money(cod), isBold: true),
                if (!isCod) _row('Paid Online', money(_amount('orderAmount')), isBold: true),
                const SizedBox(height: 8),
                _row('Your Earnings', money(_amount('earnings')), isEarning: true),
                _row('Commission', '- ${money(_amount('commission'))}', isDeduction: true),
              ]),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                  color: isCod ? const Color(0xFFFFF7ED) : const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: isCod ? const Color(0xFFFED7AA) : const Color(0xFFBBF7D0))),
              child: Row(children: [
                Icon(isCod ? Icons.payments : Icons.verified,
                    color: isCod ? PartnerTheme.warningAmber : PartnerTheme.onlineGreen, size: 22),
                const SizedBox(width: 10),
                const Text('Payment: ',
                    style: TextStyle(fontSize: 14, color: PartnerTheme.textSecondary)),
                Text(isCod ? 'CASH ON DELIVERY' : 'PREPAID',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: isCod ? PartnerTheme.warningAmber : PartnerTheme.onlineGreen)),
              ]),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(children: [
                  const Icon(Icons.error_outline, size: 18, color: Color(0xFFB4241C)),
                  const SizedBox(width: 8),
                  Expanded(
                      child: Text(_error!,
                          style: const TextStyle(fontSize: 12, color: Color(0xFFB4241C)))),
                ]),
              ),
            ],
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                onPressed: _submitting ? null : () => _complete(cashCollected: isCod),
                style: ElevatedButton.styleFrom(
                    backgroundColor: PartnerTheme.onlineGreen,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                child: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(isCod ? 'Cash Collected — ${money(cod)}' : 'Complete Delivery',
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
            ),
            // Offered only on a COD order — on a prepaid one it was a second
            // button that recorded the same nothing as the first.
            if (isCod) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: _submitting ? null : () => _complete(cashCollected: false),
                child: const Text('Customer paid online instead',
                    style: TextStyle(
                        color: PartnerTheme.deliveryColor, fontWeight: FontWeight.w600)),
              ),
            ],
          ]),
        ),
      ),
    );
  }

  Widget _row(String label, String value,
      {bool isBold = false, bool isEarning = false, bool isDeduction = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label,
            style: TextStyle(
                fontSize: isBold ? 15 : 14,
                fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
                color: PartnerTheme.textSecondary)),
        Text(value,
            style: TextStyle(
                fontSize: isBold ? 20 : 15,
                fontWeight: isBold ? FontWeight.w900 : FontWeight.w700,
                color: isEarning
                    ? PartnerTheme.onlineGreen
                    : isDeduction
                        ? PartnerTheme.warningAmber
                        : PartnerTheme.textPrimary)),
      ]),
    );
  }
}
