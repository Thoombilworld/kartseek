import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/security/device_security_service.dart';
import 'package:shared_mobile/core/security/secure_api_client.dart';
import 'package:shared_mobile/features/auth/services/auth_api_service.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_event.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/models/country_config.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

/// KARTSEEK Seller Login Screen
///
/// 3-step flow:
///   Step 0 — Country selection (Qatar pre-selected)
///   Step 1 — Sign In / Register tabs
///   Step 2 — Auto-navigates to the role's module dashboard
class SellerLoginScreen extends StatefulWidget {
  const SellerLoginScreen({super.key});

  @override
  State<SellerLoginScreen> createState() => _SellerLoginScreenState();
}

class _SellerLoginScreenState extends State<SellerLoginScreen>
    with TickerProviderStateMixin {
  late final TabController _tabController;
  late final AnimationController _stepController;
  late final Animation<double> _stepFade;

  /// Shared with the customer app: it calls the gateway, hands the token to
  /// SecureApiClient so every feature's interceptor can authenticate, and stores
  /// the session in the platform keychain.
  final AuthApiService _authApi = AuthApiService();

  // Step 0 — country
  int _step = 0;
  CountryConfig _selectedCountry = CountryConfig.qatar;

  // Login fields
  final _loginFormKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loginObscure = true;
  bool _loginLoading = false;

  // Register fields
  final _regFormKey = GlobalKey<FormState>();
  final _regNameCtrl = TextEditingController();
  final _regEmailCtrl = TextEditingController();
  final _regPhoneCtrl = TextEditingController();
  final _regPasswordCtrl = TextEditingController();
  final _storeNameCtrl = TextEditingController();
  bool _regObscure = true;
  bool _regLoading = false;
  SellerRole _selectedRole = SellerRole.marketplaceSeller;
  bool _biometricAvailable = false;

  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _stepController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _stepFade = CurvedAnimation(parent: _stepController, curve: Curves.easeIn);
    _stepController.forward();
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

  Future<void> _handleBiometricLogin() async {
    final security = DeviceSecurityService();
    final authenticated = await security.authenticateWithBiometrics(
      reason: 'Verify your identity to sign in to KARTSEEK Seller',
    );
    if (!authenticated) return;
    final token = await security.getToken();
    if (token == null || token.isEmpty) return;
    if (mounted) {
      context.read<SellerBloc>().add(SellerAuthenticated(
            sellerId: 'seller_biometric',
            role: SellerRole.marketplaceSeller,
            countryCode: _selectedCountry.code,
          ));
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _stepController.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _regNameCtrl.dispose();
    _regEmailCtrl.dispose();
    _regPhoneCtrl.dispose();
    _regPasswordCtrl.dispose();
    _storeNameCtrl.dispose();
    super.dispose();
  }

  // ── Country selection ──────────────────────────────────────────────────────

  void _onCountrySelected(CountryConfig country) {
    setState(() => _selectedCountry = country);
    context.read<SellerBloc>().add(SellerCountryChanged(country.code));
  }

  void _proceedFromCountry() {
    setState(() => _step = 1);
    _stepController.reset();
    _stepController.forward();
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  /// Sign in against the gateway.
  ///
  /// This used to wait 900ms and then decide which business the seller ran by
  /// substring-matching their email address — `contains('pharmacy')` made you a
  /// pharmacist, anything unrecognised made you a marketplace seller. No password
  /// was checked, nothing reached the backend, and no token was stored, so every
  /// subsequent API call went out unauthenticated.
  ///
  /// The portal now comes from the account's signed `sellerType` claim, and the
  /// token is handed to SecureApiClient and the keychain by AuthApiService.
  Future<void> _handleLogin() async {
    if (!_loginFormKey.currentState!.validate()) return;
    setState(() {
      _loginLoading = true;
      _errorMsg = null;
    });

    try {
      final session = await _authApi.login(
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
      );
      final user = session.user;

      // Refuse anything that is not an approved seller of a known portal, rather
      // than signing them in and letting a screen fail later.
      if (user.role.toLowerCase() != 'seller') {
        _failLogin('This is not a seller account. Use the KARTSEEK customer app instead.');
        return;
      }
      final role = SellerRole.fromSellerType(user.sellerType);
      if (role == null) {
        _failLogin('This seller account is not assigned to a portal yet. Please contact support.');
        return;
      }
      if (!user.isApproved) {
        _failLogin('Your seller registration is still being reviewed. You will be notified once it is approved.');
        return;
      }

      if (mounted) {
        context.read<SellerBloc>().add(SellerAuthenticated(
              sellerId: user.id,
              role: role,
              countryCode: _selectedCountry.code,
            ));
      }
      if (mounted) setState(() => _loginLoading = false);
    } on ApiException catch (e) {
      // The gateway's wording carries the remaining attempts and lockout detail.
      _failLogin(e.isNetworkError
          ? 'No connection. Check your network and try again.'
          : (e.message.isNotEmpty ? e.message : 'Sign-in failed. Please try again.'));
    } catch (_) {
      _failLogin('Sign-in failed. Please try again.');
    }
  }

  /// Leave the form usable and say why, without a half-established session.
  void _failLogin(String message) {
    if (!mounted) return;
    setState(() {
      _loginLoading = false;
      _errorMsg = message;
    });
  }

  // ── Register ──────────────────────────────────────────────────────────────

  Future<void> _handleRegister() async {
    if (!_regFormKey.currentState!.validate()) return;
    setState(() {
      _regLoading = true;
      _errorMsg = null;
    });
    await Future.delayed(const Duration(milliseconds: 1100));
    if (mounted) {
      context.read<SellerBloc>().add(SellerAuthenticated(
            sellerId: 'seller_${DateTime.now().millisecondsSinceEpoch}',
            role: _selectedRole,
            countryCode: _selectedCountry.code,
          ));
    }
    setState(() => _regLoading = false);
  }


  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return BlocListener<SellerBloc, SellerState>(
      listener: (context, state) {
        if (state.isAuthenticated) {
          final route = state.profile?.role.initialRoute ?? SellerRouter.hub;
          Navigator.pushReplacementNamed(context, route);
        }
      },
      child: Scaffold(
        backgroundColor: SellerTheme.surface,
        body: AnnotatedRegion<SystemUiOverlayStyle>(
          value: SystemUiOverlayStyle.light,
          child: Column(
            children: [
              _buildHeader(),
              if (_step == 1) _buildTabBar(),
              Expanded(
                child: FadeTransition(
                  opacity: _stepFade,
                  child: _step == 0
                      ? _buildCountryStep()
                      : TabBarView(
                          controller: _tabController,
                          children: [_buildLoginTab(), _buildRegisterTab()],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Header ────────────────────────────────────────────────────────────────

  Widget _buildHeader() {
    return Container(
      decoration: const BoxDecoration(gradient: SellerTheme.primaryGradient),
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 20,
        left: 24,
        right: 24,
        bottom: 24,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(child: Text('🛒', style: TextStyle(fontSize: 24))),
              ),
              const SizedBox(width: 12),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('KARTSEEK',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                          letterSpacing: 1.5)),
                  Text('Seller Portal',
                      style: TextStyle(color: Colors.white70, fontSize: 12)),
                ],
              ),
              const Spacer(),
              // Country chip
              if (_step > 0)
                GestureDetector(
                  onTap: () {
                    setState(() => _step = 0);
                    _stepController.reset();
                    _stepController.forward();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        Text(_selectedCountry.flag, style: const TextStyle(fontSize: 14)),
                        const SizedBox(width: 4),
                        Text(_selectedCountry.code,
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12)),
                        const SizedBox(width: 2),
                        const Icon(Icons.keyboard_arrow_down, color: Colors.white70, size: 14),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            _step == 0 ? 'Select your region' : 'Welcome Back!',
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold, fontSize: 26),
          ),
          const SizedBox(height: 4),
          Text(
            _step == 0
                ? 'KARTSEEK operates in 10+ countries. Choose yours.'
                : 'Sign in to ${_selectedCountry.name} seller portal',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
          // Step indicator
          const SizedBox(height: 14),
          _buildStepIndicator(),
        ],
      ),
    );
  }

  Widget _buildStepIndicator() {
    return Row(
      children: List.generate(2, (i) {
        final isActive = i == _step;
        final isDone = i < _step;
        return Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: isActive ? 24 : 8,
              height: 8,
              decoration: BoxDecoration(
                color: isDone || isActive ? Colors.white : Colors.white30,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            if (i < 1) const SizedBox(width: 6),
          ],
        );
      }),
    );
  }

  // ── Step 0 — Country Picker ───────────────────────────────────────────────

  Widget _buildCountryStep() {
    return Column(
      children: [
        const SizedBox(height: 16),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 2.0,
            ),
            itemCount: CountryConfig.all.length,
            itemBuilder: (context, index) {
              final country = CountryConfig.all[index];
              final isSelected = country.code == _selectedCountry.code;
              return GestureDetector(
                onTap: () => _onCountrySelected(country),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? SellerTheme.primary.withValues(alpha: 0.08)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? SellerTheme.primary : SellerTheme.border,
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: isSelected
                        ? [BoxShadow(color: SellerTheme.primary.withValues(alpha: 0.12), blurRadius: 8)]
                        : [],
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(
                    children: [
                      Text(country.flag, style: const TextStyle(fontSize: 22)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              country.name,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: isSelected ? SellerTheme.primary : SellerTheme.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              country.currencyCode,
                              style: const TextStyle(
                                color: SellerTheme.textMuted,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (isSelected)
                        const Icon(Icons.check_circle, color: SellerTheme.primary, size: 16),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _proceedFromCountry,
              style: ElevatedButton.styleFrom(
                backgroundColor: SellerTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Continue in ${_selectedCountry.name}',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 8),
                  Text(_selectedCountry.flag, style: const TextStyle(fontSize: 15)),
                  const SizedBox(width: 4),
                  const Icon(Icons.arrow_forward, size: 16),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ── Tab Bar ───────────────────────────────────────────────────────────────

  Widget _buildTabBar() {
    return Container(
      color: Colors.white,
      child: TabBar(
        controller: _tabController,
        labelColor: SellerTheme.primary,
        unselectedLabelColor: SellerTheme.textSecondary,
        indicatorColor: SellerTheme.primary,
        indicatorWeight: 3,
        labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        tabs: const [Tab(text: 'Sign In'), Tab(text: 'Register')],
      ),
    );
  }

  // ── Login Tab ─────────────────────────────────────────────────────────────

  Widget _buildLoginTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _loginFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 8),
            // Country context reminder
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: SellerTheme.primary.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: SellerTheme.primary.withValues(alpha: 0.15)),
              ),
              child: Row(
                children: [
                  Text(_selectedCountry.flag, style: const TextStyle(fontSize: 18)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${_selectedCountry.name} Seller Portal · ${_selectedCountry.currencyCode}',
                      style: const TextStyle(color: SellerTheme.primary, fontWeight: FontWeight.w600, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            if (_errorMsg != null) _errorBanner(_errorMsg!),
            _field(
              controller: _emailCtrl,
              label: 'Email / Phone',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your email' : null,
            ),
            const SizedBox(height: 16),
            _field(
              controller: _passwordCtrl,
              label: 'Password',
              icon: Icons.lock_outline,
              obscure: _loginObscure,
              suffixIcon: IconButton(
                icon: Icon(_loginObscure ? Icons.visibility_off : Icons.visibility,
                    color: SellerTheme.textMuted),
                onPressed: () => setState(() => _loginObscure = !_loginObscure),
              ),
              validator: (v) => (v == null || v.length < 4) ? 'Enter your password' : null,
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {},
                child: const Text('Forgot Password?',
                    style: TextStyle(color: SellerTheme.primary, fontSize: 13)),
              ),
            ),
            const SizedBox(height: 4),
            _primaryButton(label: 'Sign In', loading: _loginLoading, onPressed: _handleLogin),
            if (_biometricAvailable) ...[
              const SizedBox(height: 16),
              SizedBox(
                height: 52,
                child: OutlinedButton.icon(
                  onPressed: _handleBiometricLogin,
                  icon: const Icon(Icons.fingerprint, size: 24),
                  label: const Text('Sign in with Biometrics', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: SellerTheme.primary,
                    side: const BorderSide(color: SellerTheme.primary, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],
            // The "sign in as demo seller" grid was removed: it dispatched
            // SellerAuthenticated for any role with no credentials at all, so
            // anyone holding the app could open any seller's portal.
          ],
        ),
      ),
    );
  }

  // ── Register Tab ──────────────────────────────────────────────────────────

  Widget _buildRegisterTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _regFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 8),
            if (_errorMsg != null) _errorBanner(_errorMsg!),
            _field(
                controller: _regNameCtrl,
                label: 'Full Name',
                icon: Icons.person_outline,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your name' : null),
            const SizedBox(height: 14),
            _field(
                controller: _storeNameCtrl,
                label: 'Business / Store Name',
                icon: Icons.store_outlined,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter store name' : null),
            const SizedBox(height: 14),
            _field(
                controller: _regEmailCtrl,
                label: 'Email',
                icon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Enter email';
                  if (!v.contains('@')) return 'Enter valid email';
                  return null;
                }),
            const SizedBox(height: 14),
            // Phone with country code prefix
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 0),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: SellerTheme.border),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_selectedCountry.flag} ${_selectedCountry.callingCode}',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _field(
                      controller: _regPhoneCtrl,
                      label: 'Phone Number',
                      icon: Icons.phone_outlined,
                      keyboardType: TextInputType.phone,
                      validator: (v) =>
                          (v == null || v.trim().length < 6) ? 'Enter phone number' : null),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _field(
                controller: _regPasswordCtrl,
                label: 'Password',
                icon: Icons.lock_outline,
                obscure: _regObscure,
                suffixIcon: IconButton(
                  icon: Icon(_regObscure ? Icons.visibility_off : Icons.visibility,
                      color: SellerTheme.textMuted),
                  onPressed: () => setState(() => _regObscure = !_regObscure),
                ),
                validator: (v) => (v == null || v.length < 6) ? 'Min 6 characters' : null),
            const SizedBox(height: 18),
            const Text('Business Type',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: SellerTheme.textPrimary)),
            const SizedBox(height: 10),
            _buildRoleSelector(),
            const SizedBox(height: 24),
            _primaryButton(label: 'Create Seller Account', loading: _regLoading, onPressed: _handleRegister),
            const SizedBox(height: 16),
            const Text(
              "By registering, you agree to KARTSEEK's Seller Terms of Service and Privacy Policy.",
              style: TextStyle(color: SellerTheme.textMuted, fontSize: 11),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleSelector() {
    final enabledRoles = SellerRole.values.where((role) =>
        _selectedCountry.isModuleEnabled(role.value.split('_').first)).toList();
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: enabledRoles.map((role) {
        final selected = _selectedRole == role;
        final color = SellerTheme.moduleColor(role.value);
        return GestureDetector(
          onTap: () => setState(() => _selectedRole = role),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: selected ? color : color.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: selected ? color : color.withValues(alpha: 0.3),
                  width: selected ? 2 : 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(role.emoji, style: const TextStyle(fontSize: 16)),
                const SizedBox(width: 6),
                Text(role.displayName,
                    style: TextStyle(
                      color: selected ? Colors.white : color,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    )),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  // ── Shared widgets ────────────────────────────────────────────────────────

  Widget _field({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscure = false,
    Widget? suffixIcon,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscure,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: SellerTheme.textMuted, size: 20),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: SellerTheme.border)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: SellerTheme.border)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: SellerTheme.primary, width: 1.5)),
        errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: SellerTheme.errorRed)),
      ),
    );
  }

  Widget _primaryButton({
    required String label,
    required bool loading,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      height: 52,
      child: ElevatedButton(
        onPressed: loading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: SellerTheme.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          elevation: 0,
        ),
        child: loading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : Text(label,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _errorBanner(String msg) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: SellerTheme.errorRed.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: SellerTheme.errorRed.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: SellerTheme.errorRed, size: 18),
          const SizedBox(width: 8),
          Expanded(
              child: Text(msg,
                  style: const TextStyle(color: SellerTheme.errorRed, fontSize: 13))),
        ],
      ),
    );
  }

}
