import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:kartseek_shared_mobile/core/constants.dart';

class RestaurantRepository {
  final Dio _dio;

  RestaurantRepository({Dio? dio}) : _dio = dio ?? Dio(BaseOptions(baseUrl: AppConstants.apiBaseUrl));

  Future<List<dynamic>> getRestaurants() async {
    try {
      final response = await _dio.get('/restaurants');
      return response.data['data'] ?? [];
    } catch (e) {
      debugPrint('Error getting restaurants: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getRestaurantById(String id) async {
    try {
      final response = await _dio.get('/restaurants/$id');
      return response.data['data'] ?? {};
    } catch (e) {
      debugPrint('Error getting restaurant $id: $e');
      rethrow;
    }
  }

  Future<List<dynamic>> getRestaurantMenu(String id) async {
    try {
      final response = await _dio.get('/restaurants/$id/menu');
      return response.data['data'] ?? [];
    } catch (e) {
      debugPrint('Error getting menu for restaurant $id: $e');
      rethrow;
    }
  }

  Future<List<dynamic>> searchRestaurants(String query) async {
    try {
      final response = await _dio.get('/restaurants/search', queryParameters: {'q': query});
      return response.data['data'] ?? [];
    } catch (e) {
      debugPrint('Error searching restaurants: $e');
      rethrow;
    }
  }

  Future<String> placeOrder(Map<String, dynamic> payload) async {
    try {
      final response = await _dio.post('/orders/checkout', data: payload);
      return response.data['orderId'] ?? '';
    } catch (e) {
      debugPrint('Error placing order: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> bookTable(Map<String, dynamic> payload) async {
    try {
      final response = await _dio.post('/restaurants/table-booking', data: payload);
      return response.data['data'] ?? {};
    } catch (e) {
      debugPrint('Error booking table: $e');
      rethrow;
    }
  }
}
