import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/security/device_security_service.dart';
import 'package:shared_mobile/core/security/secure_api_client.dart';
import 'package:shared_mobile/features/auth/blocs/auth_event.dart';
import 'package:shared_mobile/features/auth/blocs/auth_state.dart';
import 'package:shared_mobile/features/auth/services/auth_api_service.dart';

/// AuthBloc — Manages authentication lifecycle across the entire app.
///
/// Handles login, registration, OTP verification, session persistence,
/// token refresh, and GDPR consent operations.
///
/// Usage:
///   `context.read<AuthBloc>().add(LoginRequested(phone: '...', password: '...'));`
///   `BlocBuilder<AuthBloc, AuthState>(builder: (ctx, state) { … });`
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({AuthApiService? api})
      : _api = api ?? AuthApiService(),
        super(AuthState.initial()) {
    // Login
    on<LoginRequested>(_onLogin);
    on<LoginWithOtp>(_onLoginWithOtp);
    on<VerifyOtp>(_onVerifyOtp);
    on<ResendOtp>(_onResendOtp);

    // Registration
    on<RegisterRequested>(_onRegister);

    on<BiometricLoginRequested>(_onBiometricLogin);

    // Session
    on<CheckAuthStatus>(_onCheckAuth);
    on<LogoutRequested>(_onLogout);
    on<TokenRefreshRequested>(_onTokenRefresh);

    // Password
    on<ForgotPasswordRequested>(_onForgotPassword);
    on<ResetPasswordRequested>(_onResetPassword);

    // Profile
    on<UpdateProfile>(_onUpdateProfile);

    // GDPR
    on<UpdateConsent>(_onUpdateConsent);
    on<RequestDataExport>(_onRequestDataExport);
    on<RequestAccountDeletion>(_onRequestAccountDeletion);
  }

  final AuthApiService _api;

  /// Turn a failed call into something worth showing the customer.
  ///
  /// The gateway's own wording is preferred: it carries the remaining sign-in
  /// attempts before lockout, and how long a lockout has left to run.
  String _describe(Object err, String fallback) {
    if (err is ApiException) {
      if (err.isNetworkError) return 'No connection. Check your network and try again.';
      if (err.isSslError) return 'Secure connection failed. Please try again.';
      if (err.statusCode >= 500) return 'Something went wrong on our side. Please try again.';
      return err.message.isNotEmpty ? err.message : fallback;
    }
    return fallback;
  }

  AuthState _authenticated(AuthSession session) => AuthState(
        status: AuthStatus.authenticated,
        user: session.user,
        token: session.token,
        refreshToken: session.refreshToken,
      );

  // ── Login ──────────────────────────────────────────────────────────────────

  Future<void> _onLogin(LoginRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      // `phone` on the event is the identifier field — the gateway authenticates
      // on email, so whatever the screen collected is passed through as such.
      final session = await _api.login(email: event.phone, password: event.password);
      emit(_authenticated(session));
    } catch (err) {
      emit(state.copyWith(
        status: AuthStatus.error,
        errorMessage: _describe(err, 'Sign-in failed. Please try again.'),
      ));
    }
  }

  /// Request a code, then move to the code-entry step.
  ///
  /// Only advances once the gateway has accepted the request, so a rejected number
  /// or a rate limit is shown on the number screen rather than stranding the
  /// customer on a code screen for a code that was never sent.
  Future<void> _onLoginWithOtp(
      LoginWithOtp event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      await _api.sendOtp(event.phone);
      emit(state.copyWith(status: AuthStatus.otpSent, otpPhone: event.phone));
    } catch (err) {
      emit(state.copyWith(
        status: AuthStatus.error,
        errorMessage: _describe(err, 'Could not send the verification code.'),
      ));
    }
  }

  Future<void> _onVerifyOtp(VerifyOtp event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      final session = await _api.verifyOtp(phone: event.phone, otp: event.otp);
      emit(_authenticated(session));
    } catch (err) {
      emit(state.copyWith(
        status: AuthStatus.error,
        errorMessage: _describe(err, 'Invalid or expired code.'),
      ));
    }
  }

  /// Resend is the same request again — the gateway's per-number rate limit is
  /// what stops it being abused, so there is no separate route.
  Future<void> _onResendOtp(ResendOtp event, Emitter<AuthState> emit) async {
    try {
      await _api.sendOtp(event.phone);
    } catch (err) {
      emit(state.copyWith(
        status: AuthStatus.error,
        errorMessage: _describe(err, 'Could not resend the code.'),
      ));
    }
  }

  // ── Registration ───────────────────────────────────────────────────────────

  Future<void> _onRegister(
      RegisterRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.registering));
    try {
      // Register returns the same token pair as login, so the customer is signed
      // in on completion without a second round trip.
      final session = await _api.register(
        name: event.name,
        email: event.email,
        password: event.password,
        phone: event.phone,
      );
      emit(_authenticated(session));
    } catch (err) {
      emit(state.copyWith(
        status: AuthStatus.error,
        errorMessage: err is ApiException && err.statusCode == 409
            ? 'An account with this email already exists. Try signing in instead.'
            : _describe(err, 'Sign-up failed. Please try again.'),
      ));
    }
  }

  // ── Social Login ───────────────────────────────────────────────────────────
  //
  // `_onGoogleLogin` and `_onAppleLogin` are gone, along with their events and
  // the buttons that dispatched them. They were not stubs — they emitted
  // `AuthStatus.authenticated` with a hardcoded profile and a literal
  // 'jwt_google_token' after a one-second delay, so tapping either button signed
  // the user in with no credential check at all. This bloc is shared by the
  // customer, seller and partner apps.
  //
  // A real implementation belongs here, not a placeholder: the provider SDK
  // returns an id_token, `AuthApiService` posts it to `/auth/social/{provider}`,
  // the gateway verifies it against the provider and issues our own session —
  // then this emits `_authenticated(session)` like every other path below.

  // ── Biometric Login ────────────────────────────────────────────────────────

  Future<void> _onBiometricLogin(
      BiometricLoginRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      final security = DeviceSecurityService();

      // Check if biometrics are available
      final available = await security.isBiometricAvailable();
      if (!available) {
        emit(state.copyWith(
            status: AuthStatus.error,
            errorMessage: 'Biometric authentication not available'));
        return;
      }

      // Authenticate with biometrics
      final authenticated = await security.authenticateWithBiometrics(
        reason: 'Verify your identity to sign in to KARTSEEK',
      );
      if (!authenticated) {
        emit(state.copyWith(
            status: AuthStatus.error,
            errorMessage: 'Biometric authentication failed'));
        return;
      }

      // Restore the stored session and confirm it is still valid with the
      // gateway. Until sign-in started writing to secure storage this could
      // never succeed — it read a token nothing had saved.
      final session = await _api.restoreSession();
      if (session == null) {
        emit(state.copyWith(
            status: AuthStatus.error,
            errorMessage: 'Your session has expired. Please sign in again.'));
        return;
      }

      emit(_authenticated(session));
      debugPrint('🔐 Biometric login successful — session restored');
    } catch (err) {
      emit(state.copyWith(
          status: AuthStatus.error,
          errorMessage: 'Biometric error: ${err.toString()}'));
    }
  }

  // ── Session ────────────────────────────────────────────────────────────────

  /// Restore a session saved on a previous run.
  ///
  /// This used to emit `unauthenticated` unconditionally, so every launch began
  /// signed out no matter what had been stored — the app had no session
  /// persistence at all.
  Future<void> _onCheckAuth(
      CheckAuthStatus event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      final session = await _api.restoreSession();
      emit(session == null
          ? state.copyWith(status: AuthStatus.unauthenticated)
          : _authenticated(session));
    } catch (_) {
      emit(state.copyWith(status: AuthStatus.unauthenticated));
    }
  }

  Future<void> _onLogout(LogoutRequested event, Emitter<AuthState> emit) async {
    // Ends the session on the gateway — which blacklists the token, so every
    // module rejects it immediately — then clears the keychain and memory.
    await _api.logout();
    emit(AuthState.initial().copyWith(status: AuthStatus.unauthenticated));
  }

  Future<void> _onTokenRefresh(
      TokenRefreshRequested event, Emitter<AuthState> emit) async {
    try {
      final session = await _api.refresh();
      if (session == null) {
        await _api.clearSession();
        emit(AuthState.initial().copyWith(status: AuthStatus.unauthenticated));
        return;
      }
      emit(_authenticated(session));
    } catch (_) {
      // Refresh failed → the session is gone; do not leave a dead token behind.
      await _api.clearSession();
      emit(AuthState.initial().copyWith(status: AuthStatus.unauthenticated));
    }
  }

  // ── Password ───────────────────────────────────────────────────────────────

  Future<void> _onForgotPassword(
      ForgotPasswordRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      // The gateway answers 200 whether or not the address exists, to avoid
      // confirming which emails are registered. NOTE: the handler behind it is
      // still a stub that sends nothing — see the audit's P0 list.
      await _api.forgotPassword(event.email);
      emit(state.copyWith(status: AuthStatus.initial));
    } catch (err) {
      emit(state.copyWith(
        status: AuthStatus.error,
        errorMessage: _describe(err, 'Could not send the reset link.'),
      ));
    }
  }

  Future<void> _onResetPassword(
      ResetPasswordRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      await _api.resetPassword(token: event.token, newPassword: event.newPassword);
      // The gateway revokes every existing session on reset, so this device
      // must go back to signed-out and log in with the new password.
      await _api.clearSession();
      emit(AuthState.initial().copyWith(status: AuthStatus.unauthenticated));
    } catch (err) {
      emit(state.copyWith(
        status: AuthStatus.error,
        errorMessage: _describe(err, 'Could not reset the password.'),
      ));
    }
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  Future<void> _onUpdateProfile(
      UpdateProfile event, Emitter<AuthState> emit) async {
    if (state.user == null) return;
    try {
      // [API] PUT /users/:id/profile — wire with SecureApiClient
      await Future.delayed(const Duration(milliseconds: 300));
      emit(state.copyWith(
        user: state.user!.copyWith(
          name: event.data['name'] as String? ?? state.user!.name,
          email: event.data['email'] as String? ?? state.user!.email,
          phone: event.data['phone'] as String? ?? state.user!.phone,
          avatar: event.data['avatar'] as String? ?? state.user!.avatar,
        ),
      ));
    } catch (err) {
      emit(state.copyWith(
          status: AuthStatus.error, errorMessage: err.toString()));
    }
  }

  // ── GDPR ───────────────────────────────────────────────────────────────────

  Future<void> _onUpdateConsent(
      UpdateConsent event, Emitter<AuthState> emit) async {
    if (state.user == null) return;
    try {
      // [API] POST /gdpr/consent/:userId/grant|revoke
      final updatedConsents = Map<String, bool>.from(state.user!.consents);
      updatedConsents[event.consentType] = event.granted;
      emit(state.copyWith(
        user: state.user!.copyWith(consents: updatedConsents),
      ));
    } catch (err) {
      emit(state.copyWith(
          status: AuthStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onRequestDataExport(
      RequestDataExport event, Emitter<AuthState> emit) async {
    try {
      // [API] POST /gdpr/export/:userId — triggers data export
      await Future.delayed(const Duration(milliseconds: 300));
    } catch (err) {
      debugPrint('Data export request failed: $err');
    }
  }

  Future<void> _onRequestAccountDeletion(
      RequestAccountDeletion event, Emitter<AuthState> emit) async {
    try {
      // [API] POST /gdpr/erasure/:userId — triggers account deletion
      await Future.delayed(const Duration(milliseconds: 300));
      emit(AuthState.initial().copyWith(status: AuthStatus.unauthenticated));
    } catch (err) {
      emit(state.copyWith(
          status: AuthStatus.error, errorMessage: err.toString()));
    }
  }
}
