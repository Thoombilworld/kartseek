import 'dart:convert';

import 'package:kartseek_shared_mobile/core/api/api_client.dart';
import 'package:kartseek_shared_mobile/core/security/device_security_service.dart';
import 'package:kartseek_shared_mobile/core/security/secure_api_client.dart';
import 'package:kartseek_shared_mobile/features/auth/blocs/auth_state.dart';

/// A signed-in session: the profile plus the token pair that proves it.
class AuthSession {
  final UserProfile user;
  final String token;
  final String? refreshToken;

  const AuthSession({required this.user, required this.token, this.refreshToken});
}

/// Talks to the gateway's auth routes and owns where the session is kept.
///
/// Two responsibilities that used to be missing entirely:
///
///  * **Handing the token to [SecureApiClient]** — every feature's Dio
///    `_AuthInterceptor` reads `SecureApiClient().authToken` to attach the Bearer
///    header. Nothing ever wrote to it, so no mobile request was ever
///    authenticated regardless of what the login screen showed.
///  * **Persisting the session** — tokens go to the platform keychain/keystore via
///    [DeviceSecurityService], so a restart restores the session instead of
///    silently signing the customer out.
class AuthApiService {
  AuthApiService({SecureApiClient? client, DeviceSecurityService? storage})
      : _client = client ?? SecureApiClient(),
        _storage = storage ?? DeviceSecurityService();

  final SecureApiClient _client;
  final DeviceSecurityService _storage;

  // ── Session plumbing ───────────────────────────────────────────────────────

  /// Make [session] the active one: in memory for outbound requests, and on disk
  /// so it survives a restart.
  Future<void> _persist(AuthSession session) async {
    _client.setAuthToken(session.token);
    await _storage.storeToken(session.token);
    if (session.refreshToken != null) {
      await _storage.storeRefreshToken(session.refreshToken!);
    }
    await _storage.storeUserData(jsonEncode(_userToJson(session.user)));
  }

  /// Forget the session everywhere it is held.
  Future<void> clearSession() async {
    _client.clearAuthToken();
    await _storage.clearTokens();
  }

  // ── Endpoints ──────────────────────────────────────────────────────────────

  Future<AuthSession> login({required String email, required String password}) async {
    final res = await _client.post(
      ApiClient.auth.login,
      body: {'email': email.trim(), 'password': password},
    );
    final session = _sessionFrom(res);
    await _persist(session);
    return session;
  }

  Future<AuthSession> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    final res = await _client.post(ApiClient.auth.register, body: {
      'name': name.trim(),
      'email': email.trim(),
      'password': password,
      if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
    });
    final session = _sessionFrom(res);
    await _persist(session);
    return session;
  }

  /// Ask the gateway to text a one-time code. Rate limited per number, so a 429
  /// here means the customer has asked too often rather than that anything broke.
  Future<void> sendOtp(String phone) =>
      _client.post(ApiClient.auth.otpSend, body: {'phone': phone.trim()});

  Future<AuthSession> verifyOtp({required String phone, required String otp}) async {
    final res = await _client.post(
      ApiClient.auth.otpVerify,
      body: {'phone': phone, 'otp': otp},
    );
    final session = _sessionFrom(res);
    await _persist(session);
    return session;
  }

  /// Exchange the stored refresh token for a fresh pair.
  Future<AuthSession?> refresh() async {
    final stored = await _storage.getRefreshToken();
    if (stored == null || stored.isEmpty) return null;

    final res = await _client.post(ApiClient.auth.refresh, body: {'refreshToken': stored});
    final token = res['accessToken']?.toString();
    if (token == null) return null;

    // /auth/refresh returns tokens only, so keep the profile already in hand.
    final user = await restoreUser() ??
        const UserProfile(id: '', name: '', email: '', phone: '');
    final session = AuthSession(
      user: user,
      token: token,
      refreshToken: res['refreshToken']?.toString(),
    );
    await _persist(session);
    return session;
  }

  /// Restore a session saved on a previous run, confirming it is still good.
  ///
  /// The token is verified against `/auth/profile` rather than trusted on sight:
  /// it may have expired, or been revoked by a logout on another device.
  Future<AuthSession?> restoreSession() async {
    final token = await _storage.getToken();
    if (token == null || token.isEmpty) return null;

    _client.setAuthToken(token);
    try {
      final res = await _client.get(ApiClient.auth.profile);
      final cached = await restoreUser();
      final user = UserProfile(
        id: res['id']?.toString() ?? cached?.id ?? '',
        name: cached?.name ?? _nameFromEmail(res['email']?.toString()),
        email: res['email']?.toString() ?? cached?.email ?? '',
        phone: res['phone']?.toString() ?? cached?.phone ?? '',
        role: res['role']?.toString() ?? cached?.role ?? 'customer',
        sellerType: res['sellerType']?.toString() ?? cached?.sellerType,
        status: res['status']?.toString() ?? cached?.status ?? 'active',
        isVerified: cached?.isVerified ?? false,
      );
      final session = AuthSession(
        user: user,
        token: token,
        refreshToken: await _storage.getRefreshToken(),
      );
      await _persist(session);
      return session;
    } on ApiException catch (e) {
      // Expired or revoked — try the refresh token before giving up, so a
      // returning customer is not signed out merely because an hour passed.
      if (e.statusCode == 401) {
        try {
          return await refresh();
        } catch (_) {
          await clearSession();
          return null;
        }
      }
      // A network blip must not destroy a valid session; keep it and report
      // nothing restored for now.
      if (e.isNetworkError) return null;
      await clearSession();
      return null;
    }
  }

  /// End the session on the gateway, then locally.
  ///
  /// The server call is best-effort: if it fails the customer must still end up
  /// signed out on this device.
  Future<void> logout() async {
    try {
      await _client.post(ApiClient.auth.logout);
    } catch (_) {
      // ignored — local sign-out proceeds regardless
    }
    await clearSession();
  }

  Future<void> forgotPassword(String email) =>
      _client.post(ApiClient.auth.forgotPassword, body: {'email': email.trim()});

  Future<void> resetPassword({required String token, required String newPassword}) =>
      _client.post(ApiClient.auth.resetPassword,
          body: {'token': token, 'newPassword': newPassword});

  // ── Mapping ────────────────────────────────────────────────────────────────

  /// Read the cached profile written at sign-in.
  Future<UserProfile?> restoreUser() async {
    final raw = await _storage.getUserData();
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return UserProfile(
        id: map['id']?.toString() ?? '',
        name: map['name']?.toString() ?? '',
        email: map['email']?.toString() ?? '',
        phone: map['phone']?.toString() ?? '',
        avatar: map['avatar']?.toString(),
        role: map['role']?.toString() ?? 'customer',
        sellerType: map['sellerType']?.toString(),
        status: map['status']?.toString() ?? 'active',
        isVerified: map['isVerified'] == true,
      );
    } catch (_) {
      return null;
    }
  }

  Map<String, dynamic> _userToJson(UserProfile u) => {
        'id': u.id,
        'name': u.name,
        'email': u.email,
        'phone': u.phone,
        'avatar': u.avatar,
        'role': u.role,
        'sellerType': u.sellerType,
        'status': u.status,
        'isVerified': u.isVerified,
      };

  /// Login and register answer `{ success, user, accessToken, refreshToken }`.
  AuthSession _sessionFrom(Map<String, dynamic> res) {
    final token = res['accessToken']?.toString();
    if (token == null || token.isEmpty) {
      throw const ApiException('Sign-in did not return a token', statusCode: 500);
    }
    final u = (res['user'] as Map<String, dynamic>?) ?? const {};
    final email = u['email']?.toString() ?? '';
    return AuthSession(
      user: UserProfile(
        id: u['id']?.toString() ?? '',
        name: u['name']?.toString().trim().isNotEmpty == true
            ? u['name'].toString().trim()
            : _nameFromEmail(email),
        email: email,
        phone: u['phone']?.toString() ?? '',
        avatar: u['avatar']?.toString(),
        role: u['role']?.toString() ?? 'customer',
        // Both come from the gateway and are never guessed here: they decide
        // which seller portal opens and whether it is open at all.
        sellerType: u['sellerType']?.toString(),
        status: u['status']?.toString() ?? 'active',
        isVerified: u['isVerified'] == true,
      ),
      token: token,
      refreshToken: res['refreshToken']?.toString(),
    );
  }

  String _nameFromEmail(String? email) {
    if (email == null || !email.contains('@')) return 'Customer';
    return email.split('@').first;
  }
}
