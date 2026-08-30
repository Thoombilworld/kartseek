import 'package:equatable/equatable.dart';

/// Base event for all authentication BLoC events.
abstract class AuthEvent extends Equatable {
  const AuthEvent();
  @override
  List<Object?> get props => [];
}

// ── Login ────────────────────────────────────────────────────────────────────
class LoginRequested extends AuthEvent {
  final String phone;
  final String password;
  const LoginRequested({required this.phone, required this.password});
  @override
  List<Object?> get props => [phone, password];
}

class LoginWithOtp extends AuthEvent {
  final String phone;
  const LoginWithOtp({required this.phone});
  @override
  List<Object?> get props => [phone];
}

class VerifyOtp extends AuthEvent {
  final String phone;
  final String otp;
  const VerifyOtp({required this.phone, required this.otp});
  @override
  List<Object?> get props => [phone, otp];
}

class ResendOtp extends AuthEvent {
  final String phone;
  const ResendOtp({required this.phone});
  @override
  List<Object?> get props => [phone];
}

// ── Registration ─────────────────────────────────────────────────────────────
class RegisterRequested extends AuthEvent {
  final String name;
  final String email;
  final String phone;
  final String password;
  const RegisterRequested({
    required this.name,
    required this.email,
    required this.phone,
    required this.password,
  });
  @override
  List<Object?> get props => [name, email, phone, password];
}

// `GoogleLoginRequested` and `AppleLoginRequested` were removed with their
// handlers — see the note in auth_bloc.dart. Nothing can dispatch the bypass.
class BiometricLoginRequested extends AuthEvent {
  const BiometricLoginRequested();
}

// ── Session ──────────────────────────────────────────────────────────────────
class CheckAuthStatus extends AuthEvent {
  const CheckAuthStatus();
}

class LogoutRequested extends AuthEvent {
  const LogoutRequested();
}

class TokenRefreshRequested extends AuthEvent {
  const TokenRefreshRequested();
}

// ── Password ─────────────────────────────────────────────────────────────────
class ForgotPasswordRequested extends AuthEvent {
  final String email;
  const ForgotPasswordRequested({required this.email});
  @override
  List<Object?> get props => [email];
}

class ResetPasswordRequested extends AuthEvent {
  final String token;
  final String newPassword;
  const ResetPasswordRequested({required this.token, required this.newPassword});
  @override
  List<Object?> get props => [token, newPassword];
}

// ── Profile ──────────────────────────────────────────────────────────────────
class UpdateProfile extends AuthEvent {
  final Map<String, dynamic> data;
  const UpdateProfile(this.data);
  @override
  List<Object?> get props => [data];
}

// ── GDPR Consent ─────────────────────────────────────────────────────────────
class UpdateConsent extends AuthEvent {
  final String consentType;
  final bool granted;
  const UpdateConsent({required this.consentType, required this.granted});
  @override
  List<Object?> get props => [consentType, granted];
}

class RequestDataExport extends AuthEvent {
  const RequestDataExport();
}

class RequestAccountDeletion extends AuthEvent {
  final String? reason;
  const RequestAccountDeletion({this.reason});
  @override
  List<Object?> get props => [reason];
}
