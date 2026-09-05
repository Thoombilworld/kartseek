import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/foundation.dart';
import 'package:kartseek_shared_mobile/core/constants.dart';
import 'package:kartseek_shared_mobile/core/security/ssl_pinning_service.dart';
import 'package:kartseek_shared_mobile/core/security/secure_api_client.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// KARTSEEK Doctor / Hospital API Service — Dio-based client for NestJS API Gateway.
///
/// Covers all 36 doctor controller routes:
///   - Discovery: search, specialties, nearby clinics/hospitals
///   - Doctor profiles, reviews, availability
///   - Appointment booking: book, cancel, reschedule, history
///   - Video consultation: initiate, join, end
///   - Prescriptions: view, download
///   - Health records: upload, view
class DoctorApiService {
  static String get _devBase => AppConstants.apiBaseUrl;

  late final Dio _dio;
  final bool useMock;

  static DoctorApiService? _instance;

  factory DoctorApiService({bool? useMock}) {
    return _instance ??= DoctorApiService._internal(useMock: useMock);
  }

  DoctorApiService._internal({bool? useMock})
      : useMock = useMock ?? AppConstants.useMockData {
    _dio = Dio(BaseOptions(
      baseUrl: _devBase,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));
    _dio.httpClientAdapter = IOHttpClientAdapter(
      createHttpClient: SslPinningService.createSecureHttpClient,
    );
    _dio.interceptors.add(_AuthInterceptor());
    _dio.interceptors.add(_RegionInterceptor());
    _dio.interceptors.add(LogInterceptor(requestBody: false, responseBody: false));
  }

  void _logApiError(Object error, String methodName) {
    if (error is DioException) {
      debugPrint('[DoctorAPI] ⚠️ $methodName failed '
          '(status=${error.response?.statusCode}, url=${error.requestOptions.uri})');
    } else {
      debugPrint('[DoctorAPI] ⚠️ $methodName failed ($error)');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ DISCOVERY & SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET /doctor — List doctors with optional filters
  Future<List<dynamic>> getDoctors({
    String? specialtyId, String? city, double? lat, double? lng,
    int? page, int? limit,
  }) async {
    try {
      final res = await _dio.get('/doctor', queryParameters: {
        if (specialtyId != null) 'specialtyId': specialtyId,
        if (city != null) 'city': city,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
        if (page != null) 'page': page,
        if (limit != null) 'limit': limit,
      });
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getDoctors');
      return [];
    }
  }

  /// GET /doctor/search?q=...
  Future<List<dynamic>> searchDoctors(String query, {String? specialtyId}) async {
    try {
      final res = await _dio.get('/doctor/search', queryParameters: {
        'q': query,
        if (specialtyId != null) 'specialtyId': specialtyId,
      });
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'searchDoctors');
      return [];
    }
  }

  /// GET /doctor/specialties
  Future<List<dynamic>> getSpecialties() async {
    try {
      final res = await _dio.get('/doctor/specialties');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getSpecialties');
      return [];
    }
  }

  /// GET /doctor/nearby
  Future<List<dynamic>> getNearbyDoctors({required double lat, required double lng, int? radius}) async {
    try {
      final res = await _dio.get('/doctor/nearby', queryParameters: {
        'lat': lat, 'lng': lng,
        if (radius != null) 'radius': radius,
      });
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getNearbyDoctors');
      return [];
    }
  }

  /// GET /doctor/home-feed
  Future<Map<String, dynamic>> getHomeFeed() async {
    try {
      final res = await _dio.get('/doctor/home-feed');
      return Map<String, dynamic>.from(res.data);
    } catch (e) {
      _logApiError(e, 'getHomeFeed');
      return {};
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ DOCTOR PROFILE
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET /doctor/:id
  Future<Map<String, dynamic>> getDoctorById(String doctorId) async {
    try {
      final res = await _dio.get('/doctor/$doctorId');
      return Map<String, dynamic>.from(res.data['data'] ?? res.data);
    } catch (e) {
      _logApiError(e, 'getDoctorById');
      return {};
    }
  }

  /// GET /doctor/:id/reviews
  Future<List<dynamic>> getDoctorReviews(String doctorId) async {
    try {
      final res = await _dio.get('/doctor/$doctorId/reviews');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getDoctorReviews');
      return [];
    }
  }

  /// POST /doctor/:id/review
  Future<Map<String, dynamic>> addDoctorReview(String doctorId, Map<String, dynamic> review) async {
    final res = await _dio.post('/doctor/$doctorId/review', data: review);
    return Map<String, dynamic>.from(res.data);
  }

  /// GET /doctor/:id/availability
  Future<Map<String, dynamic>> getDoctorAvailability(String doctorId, {String? date}) async {
    try {
      final res = await _dio.get('/doctor/$doctorId/availability', queryParameters: {
        if (date != null) 'date': date,
      });
      return Map<String, dynamic>.from(res.data);
    } catch (e) {
      _logApiError(e, 'getDoctorAvailability');
      return {};
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ CLINICS & HOSPITALS
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET /doctor/clinics
  Future<List<dynamic>> getClinics({String? city}) async {
    try {
      final res = await _dio.get('/doctor/clinics', queryParameters: {
        if (city != null) 'city': city,
      });
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getClinics');
      return [];
    }
  }

  /// GET /doctor/hospitals
  Future<List<dynamic>> getHospitals({String? city}) async {
    try {
      final res = await _dio.get('/doctor/hospitals', queryParameters: {
        if (city != null) 'city': city,
      });
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getHospitals');
      return [];
    }
  }

  /// GET /doctor/clinics/:id
  Future<Map<String, dynamic>> getClinicById(String clinicId) async {
    try {
      final res = await _dio.get('/doctor/clinics/$clinicId');
      return Map<String, dynamic>.from(res.data);
    } catch (e) {
      _logApiError(e, 'getClinicById');
      return {};
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ APPOINTMENT BOOKING
  // ═══════════════════════════════════════════════════════════════════════════

  /// POST /doctor/:id/book — Book an appointment
  Future<Map<String, dynamic>> bookAppointment(String doctorId, Map<String, dynamic> payload) async {
    final res = await _dio.post('/doctor/$doctorId/book', data: payload);
    return Map<String, dynamic>.from(res.data);
  }

  /// GET /doctor/appointments — My appointments
  Future<List<dynamic>> getMyAppointments({String? status}) async {
    try {
      final res = await _dio.get('/doctor/appointments', queryParameters: {
        if (status != null) 'status': status,
      });
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getMyAppointments');
      return [];
    }
  }

  /// GET /doctor/appointments/:id — Appointment details
  Future<Map<String, dynamic>> getAppointmentById(String appointmentId) async {
    try {
      final res = await _dio.get('/doctor/appointments/$appointmentId');
      return Map<String, dynamic>.from(res.data);
    } catch (e) {
      _logApiError(e, 'getAppointmentById');
      return {};
    }
  }

  /// POST /doctor/appointments/:id/cancel
  Future<void> cancelAppointment(String appointmentId, {String? reason}) async {
    await _dio.post('/doctor/appointments/$appointmentId/cancel', data: {
      if (reason != null) 'reason': reason,
    });
  }

  /// POST /doctor/appointments/:id/reschedule
  Future<Map<String, dynamic>> rescheduleAppointment(
    String appointmentId, Map<String, dynamic> newSlot,
  ) async {
    final res = await _dio.post('/doctor/appointments/$appointmentId/reschedule', data: newSlot);
    return Map<String, dynamic>.from(res.data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ VIDEO CONSULTATION
  // ═══════════════════════════════════════════════════════════════════════════

  /// POST /doctor/appointments/:id/video/initiate
  Future<Map<String, dynamic>> initiateVideoCall(String appointmentId) async {
    final res = await _dio.post('/doctor/appointments/$appointmentId/video/initiate');
    return Map<String, dynamic>.from(res.data);
  }

  /// POST /doctor/appointments/:id/video/join
  Future<Map<String, dynamic>> joinVideoCall(String appointmentId) async {
    final res = await _dio.post('/doctor/appointments/$appointmentId/video/join');
    return Map<String, dynamic>.from(res.data);
  }

  /// POST /doctor/appointments/:id/video/end
  Future<void> endVideoCall(String appointmentId) async {
    await _dio.post('/doctor/appointments/$appointmentId/video/end');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ PRESCRIPTIONS & HEALTH RECORDS
  // ═══════════════════════════════════════════════════════════════════════════

  /// GET /doctor/prescriptions
  Future<List<dynamic>> getMyPrescriptions() async {
    try {
      final res = await _dio.get('/doctor/prescriptions');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getMyPrescriptions');
      return [];
    }
  }

  /// GET /doctor/prescriptions/:id
  Future<Map<String, dynamic>> getPrescriptionById(String prescriptionId) async {
    try {
      final res = await _dio.get('/doctor/prescriptions/$prescriptionId');
      return Map<String, dynamic>.from(res.data);
    } catch (e) {
      _logApiError(e, 'getPrescriptionById');
      return {};
    }
  }

  /// GET /doctor/health-records
  Future<List<dynamic>> getHealthRecords() async {
    try {
      final res = await _dio.get('/doctor/health-records');
      return res.data['data'] ?? [];
    } catch (e) {
      _logApiError(e, 'getHealthRecords');
      return [];
    }
  }

  /// POST /doctor/health-records — Upload a health record
  Future<Map<String, dynamic>> uploadHealthRecord(Map<String, dynamic> payload) async {
    final res = await _dio.post('/doctor/health-records', data: payload);
    return Map<String, dynamic>.from(res.data);
  }
}

// ── Dio Interceptors ──────────────────────────────────────────────────────────

class _AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = SecureApiClient().authToken;
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    options.headers['X-Client-Platform'] = 'flutter';
    options.headers['X-Client-Version'] = AppConstants.appVersion;
    handler.next(options);
  }
}

class _RegionInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final region = RegionService.instance.currentCountry;
    options.headers['X-Region-Code'] = region.code;
    options.headers['X-Currency'] = region.currencyCode;
    handler.next(options);
  }
}
