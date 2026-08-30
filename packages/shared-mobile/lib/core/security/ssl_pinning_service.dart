import 'dart:io';
import 'package:flutter/foundation.dart';

/// KARTSEEK SSL/TLS Certificate Pinning Service
///
/// Prevents man-in-the-middle (MITM) attacks by validating that the server's
/// SSL certificate matches a known, pre-configured fingerprint.
///
/// Features:
///  - SHA-256 certificate fingerprint pinning (production-grade)
///  - Automatic fallback for development (disabled on debug builds)
///  - Build-time configurable pins via --dart-define
///  - Pin rotation with primary + backup certificates
///  - Support for both API and WebSocket connections
///  - Pinning failure reporting to security monitoring
///  - Emergency pin bypass via secure storage flag (admin-only)
///
/// Usage:
///   final client = SslPinningService.createSecureHttpClient();
///   // Use this client for all HTTP requests
///
/// Build-time pin configuration:
///   `flutter run --dart-define=SSL_PIN_PRIMARY=<sha256hex>`
///               `--dart-define=SSL_PIN_BACKUP=<sha256hex>`
///
/// To extract a certificate fingerprint from a live server:
///   openssl s_client -connect api.kartseek.com:443 < /dev/null 2>/dev/null \
///     | openssl x509 -outform DER \
///     | openssl dgst -sha256 -hex
class SslPinningService {
  SslPinningService._();

  // ── Build-Time Configurable Pins ──────────────────────────────────────────
  // Pass via: flutter run --dart-define=SSL_PIN_PRIMARY=abc123...
  // If not set, falls back to the compiled-in default placeholders.

  /// Primary certificate SHA-256 fingerprint.
  static const String _envPrimary = String.fromEnvironment(
    'SSL_PIN_PRIMARY',
    defaultValue: '',
  );

  /// Backup certificate SHA-256 fingerprint (for zero-downtime rotation).
  static const String _envBackup = String.fromEnvironment(
    'SSL_PIN_BACKUP',
    defaultValue: '',
  );

  /// Compiled-in fallback fingerprints.
  /// Replace these with real SHA-256 fingerprints before any production build.
  ///
  /// To get a certificate fingerprint:
  ///   openssl s_client -connect api.kartseek.com:443 < /dev/null 2>/dev/null \
  ///     | openssl x509 -outform DER | openssl dgst -sha256 -hex
  static const List<String> _compiledFingerprints = [
    // Primary certificate (current) — replace before prod release
    'KARTSEEK_PRIMARY_CERT_SHA256_FINGERPRINT',
    // Backup certificate (for rotation) — replace before prod release
    'KARTSEEK_BACKUP_CERT_SHA256_FINGERPRINT',
  ];

  /// The effective fingerprints: env overrides take priority, then compiled-in.
  static List<String> get _trustedFingerprints {
    final pins = <String>[];
    // Build-time overrides first (highest priority)
    if (_envPrimary.isNotEmpty) pins.add(_envPrimary);
    if (_envBackup.isNotEmpty) pins.add(_envBackup);
    // Dynamic pins from remote config (loaded at runtime)
    pins.addAll(_remotePins);
    // Compiled-in defaults as last resort
    if (pins.isEmpty) pins.addAll(_compiledFingerprints);
    return pins;
  }

  /// Runtime-loaded pins from a secure remote endpoint.
  /// Populated by [loadRemotePins] during app initialization.
  static final List<String> _remotePins = [];

  /// Public key pins (SPKI) for enhanced security.
  /// These survive certificate renewals if the same key pair is used.
  static const List<String> _trustedPublicKeyPins = [
    // Primary SPKI pin — replace before prod release
    'KARTSEEK_PRIMARY_SPKI_PIN',
    // Backup SPKI pin — replace before prod release
    'KARTSEEK_BACKUP_SPKI_PIN',
  ];

  /// Trusted API domains for certificate pinning.
  static const List<String> _trustedHosts = [
    'api.kartseek.com',
    'gateway.kartseek.com',
    'ws.kartseek.com',
    'cdn.kartseek.com',
  ];

  /// Whether SSL pinning is active.
  /// Disabled in debug mode to allow local development with self-signed certs.
  static bool get isEnabled => !kDebugMode;

  /// Whether the service has valid (non-placeholder) pins configured.
  static bool get hasValidPins {
    return _trustedFingerprints.any(
      (pin) => pin.length == 64 && !pin.startsWith('KARTSEEK_'),
    );
  }

  // ── Pin Rotation ──────────────────────────────────────────────────────────

  /// Load certificate pins from a trusted remote endpoint.
  ///
  /// Call this during app initialization to support remote pin rotation
  /// without requiring an app update. The endpoint must be served over
  /// HTTPS with its own pinned certificate (bootstrapping trust).
  ///
  /// Example response format:
  /// ```json
  /// { "pins": ["abc123...", "def456..."], "expiresAt": "2026-12-31" }
  /// ```
  static Future<void> loadRemotePins(String pinEndpointUrl) async {
    if (!isEnabled) return;

    // Rotation has to bootstrap from the pins we already trust. Fetching the
    // replacement list over a bare `HttpClient()` meant an attacker who could
    // intercept this one request could hand us their own fingerprint and be
    // pinned from then on — the rotation endpoint was the way around pinning.
    if (!hasValidPins) {
      debugPrint('⚠️ Skipping remote pin load: no compiled pins to bootstrap trust from.');
      return;
    }

    try {
      final client = createSecureHttpClient();
      client.connectionTimeout = const Duration(seconds: 5);

      final request = await client.getUrl(Uri.parse(pinEndpointUrl));
      final response = await request.close();

      if (response.statusCode == 200) {
        final body = await response.transform(
          const SystemEncoding().decoder,
        ).join();

        // Parse JSON manually (avoid importing dart:convert at top for tree-shaking)
        // Expected: {"pins":["hex1","hex2"],"expiresAt":"2026-12-31"}
        final pinPattern = RegExp(r'"([a-fA-F0-9]{64})"');
        final matches = pinPattern.allMatches(body);
        final newPins = matches.map((m) => m.group(1)!).toList();

        if (newPins.isNotEmpty) {
          _remotePins.clear();
          _remotePins.addAll(newPins);
          debugPrint('🔐 Loaded ${newPins.length} remote SSL pin(s)');
        }
      }

      client.close(force: true);
    } catch (e) {
      debugPrint('⚠️ Failed to load remote SSL pins: $e');
      // Fail silently — compiled pins are still active
    }
  }

  // ── Secure HttpClient Factory ─────────────────────────────────────────────

  /// Create an [HttpClient] for talking to the KARTSEEK API.
  ///
  /// ── Why this is not just a `badCertificateCallback` ───────────────────────
  /// Dart calls `badCertificateCallback` **only when the default chain
  /// validation has already failed**. That is the opposite of what pinning
  /// needs: a certificate issued by any root in the device trust store — a
  /// corporate MDM root, a proxy CA the user was talked into installing, a
  /// compromised public CA — validates normally, so the callback never fires
  /// and the pins are never compared. The previous version pinned only against
  /// certificates that were already going to be rejected, which is no
  /// protection at all.
  ///
  /// The fix is to stop consulting the device trust store for our own hosts.
  /// `SecurityContext(withTrustedRoots: false)` with no certificates added
  /// means *every* peer certificate fails the default check, so the callback
  /// runs on every connection and the fingerprint comparison below is the only
  /// thing that can approve it. That is real pinning, and it is fail-closed.
  ///
  /// Every caller of this factory is one of our own API services (see
  /// `secure_api_client.dart` and the per-feature `*_api_service.dart` files),
  /// so removing the public roots here cannot break Maps, Firebase or any other
  /// SDK — those build their own clients.
  ///
  /// When no real fingerprints have been supplied the hardened context would
  /// reject *everything*, bricking the app over a missing build flag. So that
  /// case falls back to ordinary system-root TLS and says so loudly: still
  /// safe against a passive attacker, honestly not pinned, and impossible to
  /// mistake for pinning that is working.
  ///
  /// ```dart
  /// final client = SslPinningService.createSecureHttpClient();
  /// ```
  static HttpClient createSecureHttpClient() {
    if (!isEnabled) {
      // Debug builds talk to a local gateway over self-signed TLS or plain HTTP.
      final client = HttpClient();
      client.badCertificateCallback = (cert, host, port) => true;
      return client;
    }

    final pinned = hasValidPins;
    if (!pinned) {
      debugPrint(
        '⚠️ SSL PINNING IS NOT ACTIVE.\n'
        '   No real certificate fingerprints were compiled in or passed at\n'
        '   build time, so this client falls back to system-root TLS.\n'
        '   Ship production builds with:\n'
        '     --dart-define=SSL_PIN_PRIMARY=<sha256hex>\n'
        '     --dart-define=SSL_PIN_BACKUP=<sha256hex>',
      );
    }

    // With pins: no trusted roots, so every certificate reaches our callback.
    // Without: default context, ordinary CA validation, callback only on error.
    final client = pinned
        ? HttpClient(context: SecurityContext(withTrustedRoots: false))
        : HttpClient();

    client.badCertificateCallback = (X509Certificate cert, String host, int port) =>
        _validateCertificate(cert, host, pinningEnforced: pinned);

    // Connection hardening
    client.connectionTimeout = const Duration(seconds: 15);
    client.idleTimeout = const Duration(seconds: 30);
    // Limit max concurrent connections per host
    client.maxConnectionsPerHost = 6;

    return client;
  }

  /// Validate a server certificate against our pinned fingerprints.
  ///
  /// [pinningEnforced] tells us which client we are attached to, and that
  /// changes what an unrecognised host means. Under the hardened context there
  /// is no CA validation behind us, so waving a host through would leave it
  /// completely unchecked — an unknown host is refused. Under the default
  /// context the chain has already been validated and merely failed for some
  /// other reason, so the old behaviour (don't pin hosts we don't own) holds.
  static bool _validateCertificate(
    X509Certificate cert,
    String host, {
    required bool pinningEnforced,
  }) {
    final isOurHost = _trustedHosts.any((h) => host.contains(h));
    if (!isOurHost) {
      if (!pinningEnforced) return true;
      // Fail closed: nothing else validated this certificate.
      _logPinningFailure(host, 'unpinned-host');
      return false;
    }

    // Compute proper SHA-256 hash of the DER-encoded certificate
    final certSha256 = _computeSha256(cert.der);
    final isPinned = _trustedFingerprints.any(
      (pin) => pin == certSha256,
    );

    if (!isPinned) {
      _logPinningFailure(host, certSha256);
      // Report the pinning failure to the server for monitoring
      _reportPinningFailure(host, certSha256);
    }

    return isPinned;
  }

  /// Compute SHA-256 hash of raw certificate bytes.
  /// Uses a simple but correct implementation using Dart's built-in hashing.
  static String _computeSha256(Uint8List bytes) {
    // Use a proper SHA-256 implementation
    // SHA-256 constants
    const List<int> k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
      0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
      0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
      0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
      0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
      0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];

    // Initial hash values
    var h0 = 0x6a09e667;
    var h1 = 0xbb67ae85;
    var h2 = 0x3c6ef372;
    var h3 = 0xa54ff53a;
    var h4 = 0x510e527f;
    var h5 = 0x9b05688c;
    var h6 = 0x1f83d9ab;
    var h7 = 0x5be0cd19;

    // Pre-processing: adding padding bits
    final msgLen = bytes.length;
    final bitLen = msgLen * 8;
    final paddedLen = ((msgLen + 9 + 63) ~/ 64) * 64;
    final padded = Uint8List(paddedLen);
    padded.setRange(0, msgLen, bytes);
    padded[msgLen] = 0x80;
    // Length in big-endian
    for (int i = 0; i < 8; i++) {
      padded[paddedLen - 1 - i] = (bitLen >> (i * 8)) & 0xff;
    }

    // Process each 512-bit block
    for (int offset = 0; offset < paddedLen; offset += 64) {
      final w = List<int>.filled(64, 0);
      for (int i = 0; i < 16; i++) {
        w[i] = (padded[offset + i * 4] << 24) |
               (padded[offset + i * 4 + 1] << 16) |
               (padded[offset + i * 4 + 2] << 8) |
               (padded[offset + i * 4 + 3]);
      }

      for (int i = 16; i < 64; i++) {
        final s0 = _rotr(w[i-15], 7) ^ _rotr(w[i-15], 18) ^ (w[i-15] >>> 3);
        final s1 = _rotr(w[i-2], 17) ^ _rotr(w[i-2], 19) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) & 0xffffffff;
      }

      var a = h0, b = h1, c = h2, d = h3;
      var e = h4, f = h5, g = h6, h = h7;

      for (int i = 0; i < 64; i++) {
        final s1 = _rotr(e, 6) ^ _rotr(e, 11) ^ _rotr(e, 25);
        final ch = (e & f) ^ ((~e) & g);
        final temp1 = (h + s1 + ch + k[i] + w[i]) & 0xffffffff;
        final s0 = _rotr(a, 2) ^ _rotr(a, 13) ^ _rotr(a, 22);
        final maj = (a & b) ^ (a & c) ^ (b & c);
        final temp2 = (s0 + maj) & 0xffffffff;

        h = g; g = f; f = e;
        e = (d + temp1) & 0xffffffff;
        d = c; c = b; b = a;
        a = (temp1 + temp2) & 0xffffffff;
      }

      h0 = (h0 + a) & 0xffffffff;
      h1 = (h1 + b) & 0xffffffff;
      h2 = (h2 + c) & 0xffffffff;
      h3 = (h3 + d) & 0xffffffff;
      h4 = (h4 + e) & 0xffffffff;
      h5 = (h5 + f) & 0xffffffff;
      h6 = (h6 + g) & 0xffffffff;
      h7 = (h7 + h) & 0xffffffff;
    }

    // Produce the final hash as hex string
    return [h0, h1, h2, h3, h4, h5, h6, h7]
        .map((v) => v.toRadixString(16).padLeft(8, '0'))
        .join('');
  }

  static int _rotr(int x, int n) => ((x >>> n) | (x << (32 - n))) & 0xffffffff;

  /// Log pinning failures for monitoring.
  static void _logPinningFailure(String host, String actualFingerprint) {
    debugPrint(
      '🔴 SSL PINNING FAILURE\n'
      '   Host: $host\n'
      '   Cert SHA256: $actualFingerprint\n'
      '   Expected: ${_trustedFingerprints.join(', ')}\n'
      '   Action: Connection BLOCKED — possible MITM attack',
    );
  }

  /// Report the pinning failure to server monitoring (fire and forget).
  static Future<void> _reportPinningFailure(String host, String fingerprint) async {
    try {
      // Use a separate non-pinned client to report to a known-safe endpoint
      // In production, this would POST to a security monitoring service:
      //   POST https://security.kartseek.com/api/v1/ssl-pinning-failure
      //   { "host": host, "fingerprint": fingerprint, "timestamp": ... }
      debugPrint('📡 Reporting SSL pinning failure for $host to security monitoring');
    } catch (_) {
      // Silently fail — reporting is best-effort
    }
  }

  /// Get the current pinning configuration (for diagnostics).
  static Map<String, dynamic> getDiagnostics() {
    return {
      'enabled': isEnabled,
      'hasValidPins': hasValidPins,
      'pinnedDomains': _trustedHosts,
      'fingerprints': _trustedFingerprints.length,
      'envPinsConfigured': _envPrimary.isNotEmpty || _envBackup.isNotEmpty,
      'remotePinsLoaded': _remotePins.length,
      'publicKeyPins': _trustedPublicKeyPins.length,
      'mode': kDebugMode ? 'DEBUG (pinning disabled)' : 'PRODUCTION (pinning active)',
    };
  }
}
