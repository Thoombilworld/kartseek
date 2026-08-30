import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/routing/partner_router.dart';
import 'package:shared_mobile/core/security/secure_api_client.dart';

/// Delivery OTP Verification Screen
///
/// The customer receives a 4-digit OTP when their order is dispatched.
/// The delivery partner must collect this OTP at the doorstep and verify it
/// via `POST /marketplace/delivery-assignments/:id/verify-otp` before
/// proceeding to the photo proof step.
class DeliveryOtpScreen extends StatefulWidget {
  const DeliveryOtpScreen({super.key});
  @override
  State<DeliveryOtpScreen> createState() => _DeliveryOtpScreenState();
}

class _DeliveryOtpScreenState extends State<DeliveryOtpScreen> {
  final List<TextEditingController> _ctrls = List.generate(4, (_) => TextEditingController());
  final List<FocusNode> _nodes = List.generate(4, (_) => FocusNode());
  final SecureApiClient _api = SecureApiClient();
  bool _loading = false;
  String? _error;
  int _attempts = 0;
  static const int _maxAttempts = 3;

  @override
  void dispose() {
    for (final c in _ctrls) { c.dispose(); }
    for (final f in _nodes) { f.dispose(); }
    super.dispose();
  }

  Future<void> _verify() async {
    final otp = _ctrls.map((c) => c.text).join();
    if (otp.length < 4) {
      setState(() => _error = 'Please enter the full 4-digit code');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      // Get the active delivery assignment ID from route arguments or state
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      final assignmentId = args?['assignmentId'] ?? args?['id'] ?? '';

      if (assignmentId.isEmpty) {
        // Fallback: try to get from the delivery bloc/state
        setState(() {
          _loading = false;
          _error = 'Missing delivery assignment ID. Please go back and retry.';
        });
        return;
      }

      final response = await _api.post(
        '/marketplace/delivery-assignments/$assignmentId/verify-otp',
        body: {'otp': otp},
      );

      if (!mounted) return;

      final verified = response['verified'] == true;

      if (verified) {
        // OTP verified — proceed to photo proof step
        Navigator.pushReplacementNamed(
          context,
          PartnerRouter.partnerDeliveryPhotoProof,
          arguments: args, // Pass through the assignment context
        );
      } else {
        _attempts++;
        final reason = response['reason'] ?? 'Invalid OTP';
        setState(() {
          _loading = false;
          _error = _attempts >= _maxAttempts
              ? 'Maximum attempts exceeded. Please contact support.'
              : '$reason. ${_maxAttempts - _attempts} attempt(s) remaining.';
        });

        // Clear the OTP fields for retry
        for (final c in _ctrls) { c.clear(); }
        if (_nodes.isNotEmpty) _nodes[0].requestFocus();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Verification failed. Check your connection and try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final attemptsExceeded = _attempts >= _maxAttempts;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Verify Delivery'),
        leading: const BackButton(color: PartnerTheme.textPrimary),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(children: [
            const SizedBox(height: 40),
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: PartnerTheme.deliveryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.pin, size: 36, color: PartnerTheme.deliveryColor),
            ),
            const SizedBox(height: 24),
            const Text('Enter Delivery OTP',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text('Ask the customer for their 4-digit code',
                style: TextStyle(fontSize: 14, color: PartnerTheme.textMuted)),
            const SizedBox(height: 40),

            // OTP input fields
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (i) => Container(
                width: 60, height: 68,
                margin: const EdgeInsets.symmetric(horizontal: 6),
                child: TextField(
                  controller: _ctrls[i],
                  focusNode: _nodes[i],
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 1,
                  enabled: !attemptsExceeded,
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
                  decoration: InputDecoration(
                    counterText: '',
                    filled: true,
                    fillColor: attemptsExceeded ? const Color(0xFFFEE2E2) : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(
                        color: _error != null ? Colors.red.shade400 : PartnerTheme.border,
                        width: 2,
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: PartnerTheme.deliveryColor, width: 2),
                    ),
                    errorBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.red.shade400, width: 2),
                    ),
                  ),
                  onChanged: (v) {
                    setState(() => _error = null); // Clear error on new input
                    if (v.isNotEmpty && i < 3) _nodes[i + 1].requestFocus();
                    if (v.isEmpty && i > 0) _nodes[i - 1].requestFocus();
                    if (i == 3 && v.isNotEmpty) _verify();
                  },
                ),
              )),
            ),

            // Error message
            if (_error != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(children: [
                  Icon(Icons.error_outline, color: Colors.red.shade600, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(_error!,
                        style: TextStyle(color: Colors.red.shade700, fontSize: 13, fontWeight: FontWeight.w500)),
                  ),
                ]),
              ),
            ],

            const SizedBox(height: 32),

            // Verify button
            SizedBox(
              width: double.infinity, height: 54,
              child: ElevatedButton(
                onPressed: (_loading || attemptsExceeded) ? null : _verify,
                style: ElevatedButton.styleFrom(
                  backgroundColor: PartnerTheme.deliveryColor,
                  disabledBackgroundColor: Colors.grey.shade300,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _loading
                    ? const SizedBox(
                        width: 22, height: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                    : Text(
                        attemptsExceeded ? 'Contact Support' : 'Verify & Deliver',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
              ),
            ),

            // Contact support link (visible after max attempts)
            if (attemptsExceeded) ...[
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: () {
                  // Navigate to support or call
                  Navigator.pushNamed(context, PartnerRouter.partnerSupport);
                },
                icon: const Icon(Icons.support_agent, size: 18),
                label: const Text('Contact Support'),
                style: TextButton.styleFrom(foregroundColor: PartnerTheme.deliveryColor),
              ),
            ],
          ]),
        ),
      ),
    );
  }
}
