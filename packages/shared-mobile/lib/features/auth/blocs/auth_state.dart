import 'package:equatable/equatable.dart';

/// Authentication status enum.
enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  otpSent,
  otpVerified,
  registering,
  registered,
  error,
}

/// User profile model for auth state.
class UserProfile extends Equatable {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String? avatar;
  final String role; // 'customer', 'partner', 'seller', 'admin'
  /// Which seller portal this account is bound to, issued by the gateway.
  /// Null for anyone who is not a seller — never inferred on the client.
  final String? sellerType;
  /// `pending` until an admin approves a self-registered seller.
  final String status;
  final bool isVerified;
  final Map<String, bool> consents;

  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.avatar,
    this.role = 'customer',
    this.sellerType,
    this.status = 'active',
    this.isVerified = false,
    this.consents = const {},
  });

  /// True only for an explicitly active account, so an unrecognised status keeps
  /// a portal shut rather than opening it.
  bool get isApproved => status == 'active';

  UserProfile copyWith({
    String? id,
    String? name,
    String? email,
    String? phone,
    String? avatar,
    String? role,
    String? sellerType,
    String? status,
    bool? isVerified,
    Map<String, bool>? consents,
  }) =>
      UserProfile(
        id: id ?? this.id,
        name: name ?? this.name,
        email: email ?? this.email,
        phone: phone ?? this.phone,
        avatar: avatar ?? this.avatar,
        role: role ?? this.role,
        sellerType: sellerType ?? this.sellerType,
        status: status ?? this.status,
        isVerified: isVerified ?? this.isVerified,
        consents: consents ?? this.consents,
      );

  @override
  List<Object?> get props =>
      [id, name, email, phone, avatar, role, sellerType, status, isVerified, consents];
}

/// Auth BLoC state.
class AuthState extends Equatable {
  final AuthStatus status;
  final UserProfile? user;
  final String? token;
  final String? refreshToken;
  final String? errorMessage;
  final String? otpPhone; // Phone number OTP was sent to

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.token,
    this.refreshToken,
    this.errorMessage,
    this.otpPhone,
  });

  /// Convenience getters.
  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
  bool get isError => status == AuthStatus.error;
  bool get hasUser => user != null;

  AuthState copyWith({
    AuthStatus? status,
    UserProfile? user,
    String? token,
    String? refreshToken,
    String? errorMessage,
    String? otpPhone,
  }) =>
      AuthState(
        status: status ?? this.status,
        user: user ?? this.user,
        token: token ?? this.token,
        refreshToken: refreshToken ?? this.refreshToken,
        errorMessage: errorMessage,
        otpPhone: otpPhone ?? this.otpPhone,
      );

  factory AuthState.initial() => const AuthState(status: AuthStatus.initial);

  @override
  List<Object?> get props => [status, user, token, refreshToken, errorMessage, otpPhone];
}
