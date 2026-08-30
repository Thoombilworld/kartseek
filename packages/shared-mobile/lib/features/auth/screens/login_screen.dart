import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/security/device_security_service.dart';
import 'package:shared_mobile/features/auth/blocs/auth_bloc.dart';
import 'package:shared_mobile/features/auth/blocs/auth_event.dart';
import 'package:shared_mobile/features/auth/blocs/auth_state.dart';

/// KARTSEEK Login Screen — Premium, production-grade authentication UI.
/// Wired to AuthBloc for real authentication lifecycle management.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _obscurePassword = true;
  bool _rememberMe = false;

  late final TabController _tabController;
  bool _otpSent = false;
  bool _biometricAvailable = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
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
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  void _handleEmailLogin() {
    if (!_formKey.currentState!.validate()) return;
    context.read<AuthBloc>().add(LoginRequested(
      phone: _emailController.text,
      password: _passwordController.text,
    ));
  }

  void _handleOtpRequest() {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your phone number'), backgroundColor: AppTheme.errorRed),
      );
      return;
    }
    context.read<AuthBloc>().add(LoginWithOtp(phone: phone));
  }

  void _handleOtpVerify() {
    final otp = _otpController.text.trim();
    if (otp.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid OTP'), backgroundColor: AppTheme.errorRed),
      );
      return;
    }
    context.read<AuthBloc>().add(VerifyOtp(
      phone: _phoneController.text.trim(),
      otp: otp,
    ));
  }

  void _handleResendOtp() {
    context.read<AuthBloc>().add(ResendOtp(phone: _phoneController.text.trim()));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('OTP resent successfully'), backgroundColor: AppTheme.primaryGreen),
    );
  }

  String get _phonePlaceholder {
    final country = RegionService.instance.currentCountry;
    return '${country.callingCode} XXXX XXXX';
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.status == AuthStatus.authenticated) {
          Navigator.pushReplacementNamed(context, AppRouter.home);
        } else if (state.status == AuthStatus.otpSent) {
          setState(() => _otpSent = true);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('OTP sent to your phone'), backgroundColor: AppTheme.primaryGreen),
          );
        } else if (state.status == AuthStatus.error) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.errorMessage ?? 'Login failed'), backgroundColor: AppTheme.errorRed),
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

                // ── Logo ───────────────────────────────────────────────
                Center(
                  child: Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryGreen,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [BoxShadow(color: AppTheme.primaryGreen.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
                    ),
                    child: const Center(
                      child: Text('K', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900)),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Center(
                  child: Text('KARTSEEK', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: AppTheme.textPrimary, letterSpacing: 1)),
                ),
                const SizedBox(height: 4),
                const Center(
                  child: Text('Welcome back! Sign in to continue.', style: TextStyle(fontSize: 15, color: AppTheme.textMuted)),
                ),
                const SizedBox(height: 24),

                // ── Region Indicator ──────────────────────────────────
                Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.primaryGreen.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          RegionService.instance.currentCountry.flag,
                          style: const TextStyle(fontSize: 16),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          RegionService.instance.currentCountry.name,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primaryGreen),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // ── Tab Bar (Email / Phone OTP) ──────────────────────
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: TabBar(
                    controller: _tabController,
                    onTap: (_) => setState(() {}),
                    indicator: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 4, offset: const Offset(0, 1))],
                    ),
                    indicatorPadding: const EdgeInsets.all(3),
                    dividerColor: Colors.transparent,
                    labelColor: AppTheme.textPrimary,
                    unselectedLabelColor: AppTheme.textMuted,
                    labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                    unselectedLabelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                    tabs: const [
                      Tab(text: 'Email & Password'),
                      Tab(text: 'Phone OTP'),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // ── Tab Content ──────────────────────────────────────
                BlocBuilder<AuthBloc, AuthState>(
                  builder: (context, state) {
                    final isLoading = state.isLoading;
                    return AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      child: _tabController.index == 0
                          ? _buildEmailForm(isLoading)
                          : _buildOtpForm(isLoading),
                    );
                  },
                ),
                const SizedBox(height: 28),

                // ── Divider ────────────────────────────────────────────
                const Row(
                  children: [
                    Expanded(child: Divider(color: AppTheme.borderLight)),
                    Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: Text('or continue with', style: TextStyle(fontSize: 12, color: AppTheme.textMuted))),
                    Expanded(child: Divider(color: AppTheme.borderLight)),
                  ],
                ),
                const SizedBox(height: 20),

                // ── Biometric Login ────────────────────────────────────
                if (_biometricAvailable) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton.icon(
                      onPressed: () => context.read<AuthBloc>().add(const BiometricLoginRequested()),
                      icon: const Icon(Icons.fingerprint, size: 24),
                      label: const Text('Sign in with Biometrics', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.primaryGreen,
                        side: const BorderSide(color: AppTheme.primaryGreen, width: 1.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ],

                // ── Social Login ───────────────────────────────────────
                //
                // REMOVED — the Google and Apple buttons were an authentication
                // bypass, not an unfinished feature. `_onGoogleLogin` and
                // `_onAppleLogin` never contacted an identity provider or the
                // gateway: they waited one second and emitted
                // `AuthStatus.authenticated` with a fixed profile and the
                // literal string 'jwt_google_token' as the bearer token. Anyone
                // who tapped either button was signed in as USR-GOOGLE-001, and
                // every client-side guard downstream accepted it — cart,
                // checkout, order history, addresses and saved payments all
                // unlocked. This screen is shared by the customer, seller and
                // partner apps, so it opened all three.
                //
                // Restore these only alongside a real `POST /auth/social/*`
                // exchange: provider SDK → id_token → gateway verifies with the
                // provider → gateway issues our own JWT. The bloc handlers are
                // gone too, so re-adding a button cannot silently re-open this.
                const SizedBox(height: 32),

                // ── Sign Up Link ───────────────────────────────────────
                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.pushNamed(context, AppRouter.signUp),
                    child: RichText(
                      text: const TextSpan(
                        text: "Don't have an account? ",
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 14),
                        children: [
                          TextSpan(text: 'Sign Up', style: TextStyle(color: AppTheme.primaryGreen, fontWeight: FontWeight.w700)),
                        ],
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

  // ── Email & Password Form ──────────────────────────────────────────────────
  Widget _buildEmailForm(bool isLoading) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Email Address', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(
              hintText: 'you@example.com',
              prefixIcon: const Icon(Icons.email_outlined, size: 20, color: AppTheme.textMuted),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primaryGreen, width: 2)),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Email is required';
              if (!v.contains('@')) return 'Enter a valid email';
              return null;
            },
          ),
          const SizedBox(height: 18),

          const Text('Password', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _handleEmailLogin(),
            decoration: InputDecoration(
              hintText: 'Enter your password',
              prefixIcon: const Icon(Icons.lock_outline, size: 20, color: AppTheme.textMuted),
              suffixIcon: IconButton(
                icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: AppTheme.textMuted),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primaryGreen, width: 2)),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Password is required';
              if (v.length < 6) return 'Password must be at least 6 characters';
              return null;
            },
          ),
          const SizedBox(height: 12),

          // Remember + Forgot
          Row(
            children: [
              SizedBox(
                width: 20, height: 20,
                child: Checkbox(
                  value: _rememberMe,
                  onChanged: (v) => setState(() => _rememberMe = v ?? false),
                  activeColor: AppTheme.primaryGreen,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                ),
              ),
              const SizedBox(width: 8),
              const Text('Remember me', style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
              const Spacer(),
              GestureDetector(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Forgot password flow — coming soon')),
                  );
                },
                child: const Text('Forgot Password?', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primaryGreen)),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Login Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: isLoading ? null : _handleEmailLogin,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryGreen,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: isLoading
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                  : const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  // ── Phone OTP Form ─────────────────────────────────────────────────────────
  Widget _buildOtpForm(bool isLoading) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Phone Number', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
        const SizedBox(height: 8),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.done,
          enabled: !_otpSent,
          decoration: InputDecoration(
            hintText: _phonePlaceholder,
            prefixIcon: const Icon(Icons.phone_outlined, size: 20, color: AppTheme.textMuted),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primaryGreen, width: 2)),
          ),
        ),
        const SizedBox(height: 16),

        if (_otpSent) ...[
          const Text('Enter OTP', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          TextFormField(
            controller: _otpController,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _handleOtpVerify(),
            decoration: InputDecoration(
              hintText: '● ● ● ● ● ●',
              counterText: '',
              prefixIcon: const Icon(Icons.pin_outlined, size: 20, color: AppTheme.textMuted),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderLight)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primaryGreen, width: 2)),
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: GestureDetector(
              onTap: _handleResendOtp,
              child: const Text('Resend OTP', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primaryGreen)),
            ),
          ),
          const SizedBox(height: 20),
        ],

        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: isLoading ? null : (_otpSent ? _handleOtpVerify : _handleOtpRequest),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryGreen,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: isLoading
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                : Text(
                    _otpSent ? 'Verify OTP' : 'Send OTP',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
          ),
        ),

        if (_otpSent) ...[
          const SizedBox(height: 12),
          Center(
            child: GestureDetector(
              onTap: () => setState(() {
                _otpSent = false;
                _otpController.clear();
              }),
              child: const Text('Change phone number', style: TextStyle(fontSize: 13, color: AppTheme.textMuted, decoration: TextDecoration.underline)),
            ),
          ),
        ],
      ],
    );
  }

  // `_socialButton` removed with the Google/Apple buttons it rendered — see the
  // note in build(). Left behind it would be an invitation to wire the bypass
  // back up.
}
