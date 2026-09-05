import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:kartseek_shared_mobile/core/constants.dart';
import 'package:kartseek_shared_mobile/core/security/ssl_pinning_service.dart';

class OrderApiService {
  static String get _devBase => AppConstants.apiBaseUrl;

  late final Dio _dio;
  final bool useMock;

  OrderApiService({bool? useMock}) : useMock = useMock ?? AppConstants.useMockData {
    _dio = Dio(BaseOptions(
      baseUrl: _devBase,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));
    _dio.httpClientAdapter = IOHttpClientAdapter(
      createHttpClient: SslPinningService.createSecureHttpClient,
    );
    _dio.interceptors.add(LogInterceptor(requestBody: false, responseBody: false));
  }

  Future<String> placeOrder(Map<String, dynamic> payload) async {
    if (useMock) {
      await Future.delayed(const Duration(seconds: 2));
      return 'KS-2026-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
    }
    try {
      final res = await _dio.post('/orders/checkout', data: payload);
      return res.data['orderId'] ?? 'UNKNOWN_ORDER_ID';
    } catch (e) {
      throw Exception('Failed to place order: $e');
    }
  }

  Future<List<dynamic>> getOrderHistory() async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 500));
      return []; // fallback to mock data inside UI
    }
    try {
      final res = await _dio.get('/orders/history');
      return res.data['data'] ?? [];
    } catch (e) {
      throw Exception('Failed to fetch order history: $e');
    }
  }

  Future<Map<String, dynamic>> getOrderDetail(String orderId) async {
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 500));
      return {};
    }
    try {
      final res = await _dio.get('/orders/$orderId');
      return res.data ?? {};
    } catch (e) {
      throw Exception('Failed to fetch order details: $e');
    }
  }
}
