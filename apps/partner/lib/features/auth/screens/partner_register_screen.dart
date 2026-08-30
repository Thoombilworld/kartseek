import 'package:flutter/material.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Partner Registration Screen
class PartnerRegisterScreen extends StatefulWidget {
  const PartnerRegisterScreen({super.key});
  @override
  State<PartnerRegisterScreen> createState() => _PartnerRegisterScreenState();
}

class _PartnerRegisterScreenState extends State<PartnerRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  String _selectedRole = 'taxi_driver';
  bool _obscure = true;
  bool _loading = false;
  bool _agreed = false;

  @override
  void dispose() { _nameCtrl.dispose(); _phoneCtrl.dispose(); _emailCtrl.dispose(); _passCtrl.dispose(); super.dispose(); }

  void _register() {
    if (!_formKey.currentState!.validate() || !_agreed) return;
    setState(() => _loading = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _loading = false);
        Navigator.pushReplacementNamed(context, PartnerRouter.partnerOtpVerify);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, leading: const BackButton(color: PartnerTheme.textPrimary)),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Register', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: PartnerTheme.textPrimary)),
                const SizedBox(height: 4),
                const Text('Create your partner account', style: TextStyle(fontSize: 15, color: PartnerTheme.textMuted)),
                const SizedBox(height: 32),
                _label('Full Name'),
                const SizedBox(height: 8),
                TextFormField(controller: _nameCtrl, decoration: _decor('Enter full name', Icons.person_outline),
                  validator: (v) => (v == null || v.isEmpty) ? 'Required' : null),
                const SizedBox(height: 18),
                _label('Phone Number'),
                const SizedBox(height: 8),
                TextFormField(controller: _phoneCtrl, keyboardType: TextInputType.phone, decoration: _decor('+254...', Icons.phone_outlined),
                  validator: (v) => (v == null || v.length < 10) ? 'Enter valid phone' : null),
                const SizedBox(height: 18),
                _label('Email Address'),
                const SizedBox(height: 8),
                TextFormField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress, decoration: _decor('you@email.com', Icons.email_outlined),
                  validator: (v) => (v == null || !v.contains('@')) ? 'Enter valid email' : null),
                const SizedBox(height: 18),
                _label('Password'),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _passCtrl, obscureText: _obscure,
                  decoration: _decor('Min 6 characters', Icons.lock_outline).copyWith(
                    suffixIcon: IconButton(icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: PartnerTheme.textMuted), onPressed: () => setState(() => _obscure = !_obscure)),
                  ),
                  validator: (v) => (v == null || v.length < 6) ? 'Min 6 characters' : null,
                ),
                const SizedBox(height: 18),
                _label('Register As'),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _roleChip('🚗 Taxi Driver', 'taxi_driver'),
                    const SizedBox(width: 12),
                    _roleChip('📦 Delivery Boy', 'delivery_boy'),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    SizedBox(width: 20, height: 20, child: Checkbox(value: _agreed, onChanged: (v) => setState(() => _agreed = v ?? false), activeColor: PartnerTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)))),
                    const SizedBox(width: 8),
                    const Expanded(child: Text('I agree to the Terms of Service & Privacy Policy', style: TextStyle(fontSize: 13, color: PartnerTheme.textSecondary))),
                  ],
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity, height: 54,
                  child: ElevatedButton(
                    onPressed: (_loading || !_agreed) ? null : _register,
                    style: ElevatedButton.styleFrom(backgroundColor: PartnerTheme.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                    child: _loading
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                        : const Text('Create Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                ),
                const SizedBox(height: 24),
                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: RichText(text: const TextSpan(
                      text: 'Already have an account? ', style: TextStyle(color: PartnerTheme.textMuted, fontSize: 14),
                      children: [TextSpan(text: 'Sign In', style: TextStyle(color: PartnerTheme.primary, fontWeight: FontWeight.w700))],
                    )),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String t) => Text(t, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: PartnerTheme.textSecondary));

  Widget _roleChip(String label, String value) {
    final selected = _selectedRole == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedRole = value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: selected ? PartnerTheme.primaryLight : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: selected ? PartnerTheme.primary : PartnerTheme.border, width: selected ? 2 : 1),
          ),
          child: Center(child: Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: selected ? PartnerTheme.primary : PartnerTheme.textSecondary))),
        ),
      ),
    );
  }

  InputDecoration _decor(String hint, IconData icon) => InputDecoration(
    hintText: hint, prefixIcon: Icon(icon, size: 20, color: PartnerTheme.textMuted),
    filled: true, fillColor: const Color(0xFFF8FAFC),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.border)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.border)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.primary, width: 2)),
  );
}
