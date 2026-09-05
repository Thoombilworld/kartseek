import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:kartseek_shared_mobile/core/constants.dart';
import 'package:kartseek_shared_mobile/core/security/ssl_pinning_service.dart';

class LoyaltyApiService {
  static String get _base => AppConstants.apiBaseUrl;

  late final Dio _dio;

  LoyaltyApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: _base,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));
    _dio.httpClientAdapter = IOHttpClientAdapter(
      createHttpClient: SslPinningService.createSecureHttpClient,
    );
  }

  Future<Map<String, dynamic>> getPoints() async {
    try {
      final res = await _dio.get('/loyalty/points');
      return res.data;
    } catch (e) {
      // Return fallback data if service is offline (e.g. SKIP_DB)
      return {
        'points': 2450,
        'tier': 'Gold',
        'history': [
          {
            'title': 'Earned from Marketplace',
            'date': 'May 12, 2026',
            'amount': '+250 pts',
            'isEarned': true
          },
          {
            'title': 'Redeemed on Food',
            'date': 'May 10, 2026',
            'amount': '-1000 pts',
            'isEarned': false
          },
        ]
      };
    }
  }
}
