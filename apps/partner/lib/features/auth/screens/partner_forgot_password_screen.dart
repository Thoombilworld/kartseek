import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// Forgot Password Screen
class PartnerForgotPasswordScreen extends StatelessWidget {
  const PartnerForgotPasswordScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, leading: const BackButton(color: PartnerTheme.textPrimary)),
      body: Padding(padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SizedBox(height: 24),
          const Text('Forgot Password', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          const Text('Enter your phone number and we\'ll send a reset code', style: TextStyle(fontSize: 15, color: PartnerTheme.textMuted)),
          const SizedBox(height: 32),
          TextFormField(keyboardType: TextInputType.phone,
            decoration: InputDecoration(hintText: 'Phone Number', prefixIcon: const Icon(Icons.phone_outlined, size: 20, color: PartnerTheme.textMuted),
              filled: true, fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.border)))),
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, height: 54, child: ElevatedButton(
            onPressed: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Reset code sent to your phone'))); Navigator.pop(context); },
            style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: const Text('Send Reset Code', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)))),
        ])),
    );
  }
}
