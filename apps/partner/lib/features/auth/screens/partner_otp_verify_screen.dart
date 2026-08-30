import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// OTP Verification Screen for partner login
class PartnerOtpVerifyScreen extends StatefulWidget {
  const PartnerOtpVerifyScreen({super.key});
  @override
  State<PartnerOtpVerifyScreen> createState() => _PartnerOtpVerifyScreenState();
}

class _PartnerOtpVerifyScreenState extends State<PartnerOtpVerifyScreen> {
  final List<TextEditingController> _otpCtrls = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  bool _loading = false;
  int _resendTimer = 30;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      if (_resendTimer > 0) { setState(() => _resendTimer--); return true; }
      return false;
    });
  }

  @override
  void dispose() {
    for (final c in _otpCtrls) { c.dispose(); }
    for (final f in _focusNodes) { f.dispose(); }
    super.dispose();
  }

  void _verify() {
    final otp = _otpCtrls.map((c) => c.text).join();
    if (otp.length < 6) return;
    setState(() => _loading = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _loading = false);
        Navigator.pushReplacementNamed(context, PartnerRouter.partnerDashboard);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, leading: const BackButton(color: PartnerTheme.textPrimary)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              const Text('Verify OTP', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: PartnerTheme.textPrimary)),
              const SizedBox(height: 8),
              const Text('Enter the 6-digit code sent to your phone', style: TextStyle(fontSize: 15, color: PartnerTheme.textMuted)),
              const SizedBox(height: 40),
              // OTP Fields
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(6, (i) => SizedBox(
                  width: 48, height: 56,
                  child: TextField(
                    controller: _otpCtrls[i],
                    focusNode: _focusNodes[i],
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    maxLength: 1,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                    decoration: InputDecoration(
                      counterText: '',
                      filled: true, fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.border)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.primary, width: 2)),
                    ),
                    onChanged: (v) {
                      if (v.isNotEmpty && i < 5) _focusNodes[i + 1].requestFocus();
                      if (v.isEmpty && i > 0) _focusNodes[i - 1].requestFocus();
                      if (i == 5 && v.isNotEmpty) _verify();
                    },
                  ),
                )),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity, height: 54,
                child: ElevatedButton(
                  onPressed: _loading ? null : _verify,
                  style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: _loading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                      : const Text('Verify', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: _resendTimer > 0
                    ? Text('Resend code in ${_resendTimer}s', style: const TextStyle(color: PartnerTheme.textMuted, fontSize: 14))
                    : GestureDetector(
                        onTap: () { setState(() => _resendTimer = 30); _startTimer(); },
                        child: const Text('Resend Code', style: TextStyle(color: PartnerTheme.primary, fontWeight: FontWeight.w700, fontSize: 14)),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
