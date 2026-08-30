import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Trip OTP Verification Screen — Driver enters customer's OTP
class TripOtpScreen extends StatefulWidget {
  const TripOtpScreen({super.key});
  @override
  State<TripOtpScreen> createState() => _TripOtpScreenState();
}

class _TripOtpScreenState extends State<TripOtpScreen> {
  final List<TextEditingController> _ctrls = List.generate(4, (_) => TextEditingController());
  final List<FocusNode> _nodes = List.generate(4, (_) => FocusNode());
  bool _loading = false;

  @override
  void dispose() { for (final c in _ctrls) { c.dispose(); } for (final f in _nodes) { f.dispose(); } super.dispose(); }

  void _verify() {
    final otp = _ctrls.map((c) => c.text).join();
    if (otp.length < 4) return;
    setState(() => _loading = true);
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() => _loading = false);
        Navigator.pushReplacementNamed(context, PartnerRouter.partnerActiveTrip);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Verify OTP'), leading: const BackButton(color: PartnerTheme.textPrimary)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const SizedBox(height: 40),
              Container(width: 80, height: 80, decoration: const BoxDecoration(color: PartnerTheme.primaryLight, shape: BoxShape.circle), child: const Icon(Icons.pin, size: 36, color: PartnerTheme.primary)),
              const SizedBox(height: 24),
              const Text('Enter Ride OTP', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text('Ask the customer for their 4-digit OTP', style: TextStyle(fontSize: 14, color: PartnerTheme.textMuted)),
              const SizedBox(height: 40),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(4, (i) => Container(
                  width: 60, height: 68, margin: const EdgeInsets.symmetric(horizontal: 6),
                  child: TextField(
                    controller: _ctrls[i], focusNode: _nodes[i],
                    keyboardType: TextInputType.number, textAlign: TextAlign.center, maxLength: 1,
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
                    decoration: InputDecoration(
                      counterText: '', filled: true, fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: PartnerTheme.border, width: 2)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: PartnerTheme.primary, width: 2)),
                    ),
                    onChanged: (v) {
                      if (v.isNotEmpty && i < 3) _nodes[i + 1].requestFocus();
                      if (v.isEmpty && i > 0) _nodes[i - 1].requestFocus();
                      if (i == 3 && v.isNotEmpty) _verify();
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
                      : const Text('Verify & Start Trip', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
