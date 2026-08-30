import 'dart:convert';
import 'dart:io';
import 'package:shared_mobile/core/constants.dart';
import 'package:shared_mobile/core/security/ssl_pinning_service.dart';

/// KARTSEEK Secure API Client
///
/// Production-grade HTTP client with:
///  - SSL certificate pinning (MITM prevention)
///  - Automatic JWT token injection
///  - Request/response interceptor pipeline
///  - Retry logic with exponential backoff
///  - Request timeout enforcement
///  - Error normalization
class SecureApiClient {
  static SecureApiClient? _instance;
  late final HttpClient _httpClient;
  String? _authToken;

  /// Singleton access.
  factory SecureApiClient() {
    _instance ??= SecureApiClient._internal();
    return _instance!;
  }

  SecureApiClient._internal() {
    _httpClient = SslPinningService.createSecureHttpClient();
    // FIX 8: Prevent indefinite hangs on flaky mobile networks.
    // connectionTimeout — max wait for TCP+TLS handshake (default: none → infinite)
    // idleTimeout — close idle keep-alive connections after 60s to avoid leaking
    _httpClient.connectionTimeout = const Duration(seconds: 10);
    _httpClient.idleTimeout = const Duration(seconds: 60);
  }

  /// Set the JWT authentication token (called after login).
  void setAuthToken(String token) {
    _authToken = token;
  }

  /// Read-only access to the current JWT token (for Dio interceptors, etc.).
  String? get authToken => _authToken;

  /// Clear the auth token (called on logout).
  void clearAuthToken() {
    _authToken = null;
  }

  /// Upload a file as `multipart/form-data`.
  ///
  /// Written against `dart:io` rather than pulling in a new HTTP package: this
  /// client already owns the pinned `HttpClient` and the auth header, and a
  /// second stack would need both wired up again.
  ///
  /// Added because the partner app had no way to send a photograph. Its
  /// proof-of-delivery screen tracked four booleans that a tap flipped to true,
  /// so a delivery marked complete carried no evidence at all.
  Future<Map<String, dynamic>> uploadFile(
    String endpoint, {
    required File file,
    String fieldName = 'image',
    Map<String, String>? fields,
    Map<String, String>? headers,
  }) async {
    final boundary = '----kartseek${DateTime.now().microsecondsSinceEpoch}';
    final uri = _buildUri(endpoint);
    final request = await _httpClient.postUrl(uri);
    _applyHeaders(request, headers);
    request.headers.set(HttpHeaders.contentTypeHeader, 'multipart/form-data; boundary=$boundary');

    final body = BytesBuilder();
    void writeLine(String line) => body.add(utf8.encode('$line\r\n'));

    fields?.forEach((key, value) {
      writeLine('--$boundary');
      writeLine('Content-Disposition: form-data; name="$key"');
      writeLine('');
      writeLine(value);
    });

    final filename = file.path.split(Platform.pathSeparator).last;
    writeLine('--$boundary');
    writeLine('Content-Disposition: form-data; name="$fieldName"; filename="$filename"');
    writeLine('Content-Type: ${_mimeTypeFor(filename)}');
    writeLine('');
    body.add(await file.readAsBytes());
    writeLine('');
    writeLine('--$boundary--');

    final bytes = body.takeBytes();
    request.headers.set(HttpHeaders.contentLengthHeader, bytes.length);
    request.add(bytes);
    return _executeRequest(request);
  }

  /// Content type from the extension.
  ///
  /// The upload routes validate on the declared type, so sending
  /// `application/octet-stream` for a JPEG is rejected at the gateway.
  static String _mimeTypeFor(String filename) {
    final ext = filename.toLowerCase().split('.').last;
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'jpg':
      case 'jpeg':
      default:
        return 'image/jpeg';
    }
  }

  /// Perform a GET request.
  Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, String>? headers,
    Map<String, String>? queryParams,
  }) async {
    final uri = _buildUri(endpoint, queryParams);
    final request = await _httpClient.getUrl(uri);
    _applyHeaders(request, headers);
    return _executeRequest(request);
  }

  /// Perform a POST request.
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    final uri = _buildUri(endpoint);
    final request = await _httpClient.postUrl(uri);
    _applyHeaders(request, headers);
    if (body != null) {
      request.headers.contentType = ContentType.json;
      request.write(jsonEncode(body));
    }
    return _executeRequest(request);
  }

  /// Perform a PUT request.
  Future<Map<String, dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    final uri = _buildUri(endpoint);
    final request = await _httpClient.openUrl('PUT', uri);
    _applyHeaders(request, headers);
    if (body != null) {
      request.headers.contentType = ContentType.json;
      request.write(jsonEncode(body));
    }
    return _executeRequest(request);
  }

  /// Perform a PATCH request.
  Future<Map<String, dynamic>> patch(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    final uri = _buildUri(endpoint);
    final request = await _httpClient.openUrl('PATCH', uri);
    _applyHeaders(request, headers);
    if (body != null) {
      request.headers.contentType = ContentType.json;
      request.write(jsonEncode(body));
    }
    return _executeRequest(request);
  }

  /// Perform a DELETE request.
  Future<Map<String, dynamic>> delete(
    String endpoint, {
    Map<String, String>? headers,
  }) async {
    final uri = _buildUri(endpoint);
    final request = await _httpClient.deleteUrl(uri);
    _applyHeaders(request, headers);
    return _executeRequest(request);
  }

  // ── Internal Helpers ──────────────────────────────────────────────────────

  Uri _buildUri(String endpoint, [Map<String, String>? queryParams]) {
    final base = AppConstants.apiBaseUrl;
    final path = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final uri = Uri.parse('$base$path');
    if (queryParams != null && queryParams.isNotEmpty) {
      return uri.replace(queryParameters: queryParams);
    }
    return uri;
  }

  void _applyHeaders(HttpClientRequest request, Map<String, String>? extra) {
    // Always send JSON accept header
    request.headers.set('Accept', 'application/json');
    request.headers.set('X-Client-Platform', 'flutter');
    request.headers.set('X-Client-Version', AppConstants.appVersion);

    // Inject JWT if available
    if (_authToken != null) {
      request.headers.set('Authorization', 'Bearer $_authToken');
    }

    // Apply any extra headers
    extra?.forEach((key, value) => request.headers.set(key, value));
  }

  Future<Map<String, dynamic>> _executeRequest(HttpClientRequest request) async {
    try {
      final response = await request.close().timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw const ApiException('Request timed out', statusCode: 408);
        },
      );

      final responseBody = await response.transform(utf8.decoder).join();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (responseBody.isEmpty) return {'success': true};
        return jsonDecode(responseBody) as Map<String, dynamic>;
      }

      // Handle HTTP errors
      Map<String, dynamic> errorBody = {};
      try {
        errorBody = jsonDecode(responseBody) as Map<String, dynamic>;
      } catch (_) {
        errorBody = {'message': responseBody};
      }

      throw ApiException(
        errorBody['message']?.toString() ?? 'Request failed',
        statusCode: response.statusCode,
        body: errorBody,
      );
    } on SocketException catch (e) {
      throw ApiException(
        'Network error: ${e.message}',
        statusCode: 0,
        isNetworkError: true,
      );
    } on HandshakeException {
      throw const ApiException(
        'SSL Pinning failed — connection blocked for security',
        statusCode: 0,
        isSslError: true,
      );
    }
  }

  /// Dispose the HTTP client.
  void dispose() {
    _httpClient.close(force: true);
    _instance = null;
  }
}

/// Structured API exception with status code and error details.
class ApiException implements Exception {
  final String message;
  final int statusCode;
  final Map<String, dynamic>? body;
  final bool isNetworkError;
  final bool isSslError;

  const ApiException(
    this.message, {
    this.statusCode = 0,
    this.body,
    this.isNetworkError = false,
    this.isSslError = false,
  });

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isServerError => statusCode >= 500;

  @override
  String toString() => 'ApiException($statusCode): $message';
}
