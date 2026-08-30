import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_mobile/core/constants.dart';

/// Pharmacy API repository — all calls to the `/pharmacy` gateway endpoints.
class PharmacyRepository {
  final Dio _dio;

  PharmacyRepository({Dio? dio})
      : _dio = dio ?? Dio(BaseOptions(baseUrl: AppConstants.apiBaseUrl));

  // ── Home ───────────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getPharmacyHome() async {
    try {
      final response = await _dio.get('/pharmacy/home');
      return response.data['data'] ?? {};
    } catch (e) { debugPrint('Error getting pharmacy home: $e'); rethrow; }
  }

  // ── Stores ─────────────────────────────────────────────────────────────────
  Future<List<dynamic>> getPharmacies({String? search, bool? is24hr, int page = 1, int limit = 20}) async {
    try {
      final response = await _dio.get('/pharmacy/stores', queryParameters: {
        if (search != null) 'search': search,
        if (is24hr != null) 'is24hr': is24hr,
        'page': page, 'limit': limit,
      });
      return response.data['data'] ?? [];
    } catch (e) { debugPrint('Error getting pharmacies: $e'); rethrow; }
  }

  Future<Map<String, dynamic>> getPharmacyById(String id) async {
    try {
      final response = await _dio.get('/pharmacy/stores/$id');
      return response.data['data'] ?? {};
    } catch (e) { debugPrint('Error getting pharmacy $id: $e'); rethrow; }
  }

  Future<Map<String, dynamic>> getPharmacyBySlug(String slug) async {
    try {
      final response = await _dio.get('/pharmacy/stores/slug/$slug');
      return response.data['data'] ?? {};
    } catch (e) { debugPrint('Error getting pharmacy by slug: $e'); rethrow; }
  }

  Future<List<dynamic>> getNearbyPharmacies({required double lat, required double lng, double? radius}) async {
    try {
      final response = await _dio.get('/pharmacy/stores', queryParameters: {
        'lat': lat, 'lng': lng, if (radius != null) 'radius': radius,
      });
      return response.data['data'] ?? [];
    } catch (e) { debugPrint('Error getting nearby pharmacies: $e'); rethrow; }
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  Future<List<dynamic>> getCategories() async {
    try {
      final response = await _dio.get('/pharmacy/categories');
      return response.data['data'] ?? [];
    } catch (e) { debugPrint('Error getting categories: $e'); rethrow; }
  }

  Future<Map<String, dynamic>> getCategoryById(String id) async {
    try {
      final response = await _dio.get('/pharmacy/categories/$id');
      return response.data['data'] ?? {};
    } catch (e) { debugPrint('Error getting category: $e'); rethrow; }
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  Future<List<dynamic>> searchMedicines(String query, {int page = 1, int limit = 20}) async {
    try {
      final response = await _dio.get('/pharmacy/search', queryParameters: {
        'q': query, 'page': page, 'limit': limit,
      });
      return response.data['data'] ?? [];
    } catch (e) { debugPrint('Error searching medicines: $e'); rethrow; }
  }

  // ── Barcode / Product Scan ────────────────────────────────────────────────
  /// Look up products by barcode, EAN-13, UPC-A, GTIN, or SKU code.
  Future<Map<String, dynamic>> lookupBarcode(String code) async {
    try {
      final response = await _dio.get('/pharmacy/scan/barcode/$code');
      return response.data ?? {};
    } catch (e) { debugPrint('Error looking up barcode: $e'); rethrow; }
  }

  // ── Medicines ──────────────────────────────────────────────────────────────
  Future<List<dynamic>> getStoreMedicines(String storeId, {String? categoryId, String? search, int page = 1}) async {
    try {
      final response = await _dio.get('/pharmacy/stores/$storeId/medicines', queryParameters: {
        if (categoryId != null) 'category': categoryId,
        if (search != null) 'search': search,
        'page': page,
      });
      return response.data['data'] ?? [];
    } catch (e) { debugPrint('Error getting store medicines: $e'); rethrow; }
  }

  Future<Map<String, dynamic>> getMedicineById(String storeId, String medicineId) async {
    try {
      final response = await _dio.get('/pharmacy/stores/$storeId/medicines/$medicineId');
      return response.data['data'] ?? {};
    } catch (e) { debugPrint('Error getting medicine: $e'); rethrow; }
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────
  Future<String> uploadPrescription(String filePath, {Map<String, dynamic>? metadata}) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: 'prescription.jpg'),
        if (metadata != null) ...metadata,
      });
      final response = await _dio.post('/pharmacy/prescriptions/upload', data: formData);
      return response.data['data']['url'] ?? '';
    } catch (e) { debugPrint('Error uploading prescription: $e'); rethrow; }
  }

  Future<List<dynamic>> getMyPrescriptions(String customerId) async {
    try {
      final response = await _dio.get('/pharmacy/prescriptions/my', queryParameters: {'customerId': customerId});
      return response.data['data'] ?? [];
    } catch (e) { debugPrint('Error getting prescriptions: $e'); rethrow; }
  }

  // ── Orders ─────────────────────────────────────────────────────────────────
  Future<String> placeOrder(Map<String, dynamic> payload) async {
    try {
      final response = await _dio.post('/pharmacy/orders', data: payload);
      return response.data['data']['orderId'] ?? '';
    } catch (e) { debugPrint('Error placing pharmacy order: $e'); rethrow; }
  }

  Future<List<dynamic>> getOrders({String? customerId, int page = 1, int limit = 20}) async {
    try {
      final response = await _dio.get('/pharmacy/my-orders', queryParameters: {
        if (customerId != null) 'customerId': customerId,
        'page': page, 'limit': limit,
      });
      return response.data['data'] ?? [];
    } catch (e) { debugPrint('Error getting pharmacy orders: $e'); rethrow; }
  }

  Future<Map<String, dynamic>> getOrderById(String orderId) async {
    try {
      final response = await _dio.get('/pharmacy/orders/$orderId');
      return response.data['data'] ?? {};
    } catch (e) { debugPrint('Error getting order detail: $e'); rethrow; }
  }

  // ── Reviews ────────────────────────────────────────────────────────────────
  Future<List<dynamic>> getStoreReviews(String storeId, {int page = 1, int limit = 20}) async {
    try {
      final response = await _dio.get('/pharmacy/stores/$storeId/reviews', queryParameters: {
        'page': page, 'limit': limit,
      });
      return response.data['data'] ?? [];
    } catch (e) { debugPrint('Error getting reviews: $e'); rethrow; }
  }

  Future<void> submitReview(String storeId, {required int rating, required String comment, required String customerId}) async {
    try {
      await _dio.post('/pharmacy/stores/$storeId/review', data: {
        'rating': rating, 'comment': comment, 'customerId': customerId,
      });
    } catch (e) { debugPrint('Error submitting review: $e'); rethrow; }
  }

  // ── Promotions / Offers ────────────────────────────────────────────────────
  Future<List<dynamic>> getStorePromotions(String storeId) async {
    try {
      final response = await _dio.get('/pharmacy/stores/$storeId/promotions');
      return response.data['data'] ?? [];
    } catch (e) { debugPrint('Error getting promotions: $e'); rethrow; }
  }
}
