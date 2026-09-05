import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/security/device_security_service.dart';
import 'package:kartseek_shared_mobile/features/auth/blocs/auth_bloc.dart';
import 'package:kartseek_shared_mobile/features/auth/blocs/auth_event.dart';
import 'package:kartseek_shared_mobile/features/auth/blocs/auth_state.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// KARTSEEK Partner Login — Phone + Password auth for drivers & delivery boys.
///
/// Uses the shared [AuthBloc] for authentication. On success, navigates to
/// the partner dashboard. On error, shows a SnackBar with the error message.
class PartnerLoginScreen extends StatefulWidget {
  const PartnerLoginScreen({super.key});
  @override
  State<PartnerLoginScreen> createState() => _PartnerLoginScreenState();
}

class _PartnerLoginScreenState extends State<PartnerLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;
  bool _biometricAvailable = false;

  @override
  void initState() {
    super.initState();
    _checkBiometric();
  }

  Future<void> _checkBiometric() async {
    final security = DeviceSecurityService();
    final available = await security.isBiometricAvailable();
    final hasToken = (await security.getToken()) != null;
    if (mounted) {
      setState(() => _biometricAvailable = available && hasToken);
    }
  }

  @override
  void dispose() { _phoneCtrl.dispose(); _passwordCtrl.dispose(); super.dispose(); }

  void _login() {
    if (!_formKey.currentState!.validate()) return;
    context.read<AuthBloc>().add(
      LoginRequested(phone: _phoneCtrl.text.trim(), password: _passwordCtrl.text),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.status == AuthStatus.authenticated) {
          Navigator.pushReplacementNamed(context, PartnerRouter.partnerDashboard);
        } else if (state.status == AuthStatus.error) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage ?? 'Login failed. Please try again.'),
              backgroundColor: PartnerTheme.offlineRed,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 48),
                // Logo
                Center(
                  child: Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(
                      gradient: PartnerTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [BoxShadow(color: PartnerTheme.primary.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
                    ),
                    child: const Center(child: Text('K', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900))),
                  ),
                ),
                const SizedBox(height: 24),
                const Center(child: Text('KARTSEEK Partner', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: PartnerTheme.textPrimary, letterSpacing: 0.5))),
                const SizedBox(height: 4),
                const Center(child: Text('Sign in to start earning', style: TextStyle(fontSize: 15, color: PartnerTheme.textMuted))),
                const SizedBox(height: 40),
                // Form
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Phone Number', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: PartnerTheme.textSecondary)),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _phoneCtrl,
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.next,
                        decoration: _inputDecor('Enter phone number', Icons.phone_outlined),
                        validator: (v) => (v == null || v.length < 10) ? 'Enter valid phone number' : null,
                      ),
                      const SizedBox(height: 18),
                      const Text('Password', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: PartnerTheme.textSecondary)),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _passwordCtrl,
                        obscureText: _obscure,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _login(),
                        decoration: _inputDecor('Enter password', Icons.lock_outline).copyWith(
                          suffixIcon: IconButton(
                            icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: PartnerTheme.textMuted),
                            onPressed: () => setState(() => _obscure = !_obscure),
                          ),
                        ),
                        validator: (v) => (v == null || v.length < 6) ? 'Min 6 characters' : null,
                      ),
                      const SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerRight,
                        child: GestureDetector(
                          onTap: () => Navigator.pushNamed(context, PartnerRouter.partnerForgotPassword),
                          child: const Text('Forgot Password?', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PartnerTheme.primary)),
                        ),
                      ),
                      const SizedBox(height: 24),
                      // Login Button — uses AuthBloc loading state
                      BlocBuilder<AuthBloc, AuthState>(
                        builder: (context, authState) {
                          final isLoading = authState.isLoading;
                          return SizedBox(
                            width: double.infinity, height: 54,
                            child: ElevatedButton(
                              onPressed: isLoading ? null : _login,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: PartnerTheme.primary,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                elevation: 0,
                              ),
                              child: isLoading
                                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                                  : const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 16),
                      // OTP Login
                      SizedBox(
                        width: double.infinity, height: 54,
                        child: OutlinedButton(
                          onPressed: () => Navigator.pushNamed(context, PartnerRouter.partnerOtpVerify),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: PartnerTheme.primary, width: 2),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: const Text('Login with OTP', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: PartnerTheme.primary)),
                        ),
                      ),
                      // Biometric Login
                      if (_biometricAvailable) ...[
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity, height: 54,
                          child: OutlinedButton.icon(
                            onPressed: () => context.read<AuthBloc>().add(const BiometricLoginRequested()),
                            icon: const Icon(Icons.fingerprint, size: 24),
                            label: const Text('Sign in with Biometrics', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: PartnerTheme.primary,
                              side: const BorderSide(color: PartnerTheme.primary, width: 1.5),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                // Register Link
                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.pushNamed(context, PartnerRouter.partnerRegister),
                    child: RichText(
                      text: const TextSpan(
                        text: "Don't have an account? ",
                        style: TextStyle(color: PartnerTheme.textMuted, fontSize: 14),
                        children: [TextSpan(text: 'Register', style: TextStyle(color: PartnerTheme.primary, fontWeight: FontWeight.w700))],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecor(String hint, IconData icon) => InputDecoration(
    hintText: hint,
    prefixIcon: Icon(icon, size: 20, color: PartnerTheme.textMuted),
    filled: true, fillColor: const Color(0xFFF8FAFC),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.border)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.border)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: PartnerTheme.primary, width: 2)),
  );
}

