import 'package:kartseek_customer/features/grocery/models/grocery_model.dart';
import 'package:kartseek_customer/features/grocery/services/grocery_api_service.dart';

/// GroceryRepository — Clean architecture repository pattern 
/// that abstracts the underlying Grocery API service.
class GroceryRepository {
  final GroceryApiService _apiService;

  GroceryRepository({GroceryApiService? apiService})
      : _apiService = apiService ?? GroceryApiService();

  // ── Stores ──────────────────────────────────────────────────────────────

  Future<List<GroceryStoreModel>> getNearbyStores({double? lat, double? lng}) async {
    return _apiService.getStores(lat: lat, lng: lng);
  }

  Future<GroceryStoreModel> getStoreById(String id) async {
    return _apiService.getStoreById(id);
  }

  // ── Categories ──────────────────────────────────────────────────────────

  /// Loads admin-configured global categories (not store-scoped).
  /// Used by the home screen quick-category grid.
  Future<List<GroceryCategoryModel>> getGlobalCategories() async {
    return _apiService.getGlobalCategories();
  }

  Future<List<GroceryCategoryModel>> getStoreCategories(String storeId) async {
    return _apiService.getCategories(storeId);
  }

  // ── Products ────────────────────────────────────────────────────────────

  Future<List<GroceryProductModel>> getStoreProducts(String storeId, {String? categoryId}) async {
    return _apiService.getProducts(storeId, categoryId: categoryId);
  }

  Future<List<GroceryProductModel>> searchProducts(String query) async {
    return _apiService.searchProducts(query);
  }

  // ── Orders ──────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> createOrder({
    required String customerId,
    required String storeId,
    required List<Map<String, dynamic>> items,
    required Map<String, dynamic> deliveryAddress,
    required String paymentMethod,
    String? scheduledAt,
  }) async {
    return _apiService.createOrder(
      customerId: customerId,
      storeId: storeId,
      items: items,
      deliveryAddress: deliveryAddress,
      paymentMethod: paymentMethod,
      scheduledAt: scheduledAt,
    );
  }

  Future<Map<String, dynamic>> getOrderById(String orderId) async {
    return _apiService.getOrderById(orderId);
  }

  Future<List<Map<String, dynamic>>> getOrderHistory(String customerId, {int page = 1, int limit = 20}) async {
    return _apiService.getOrderHistory(customerId, page: page, limit: limit);
  }

  Future<Map<String, dynamic>> trackOrder(String orderId) async {
    return _apiService.trackOrder(orderId);
  }

  Future<Map<String, dynamic>> updateOrderStatus(String orderId, String status, {String? reason}) async {
    return _apiService.updateOrderStatus(orderId, status, reason: reason);
  }

  // ── Flash Deals ─────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getStoreFlashDeals(String storeId) async {
    return _apiService.getStoreFlashDeals(storeId);
  }

  Future<Map<String, dynamic>> getFlashDeals({String? storeId, String? status, int page = 1, int limit = 20}) async {
    return _apiService.getFlashDeals(storeId: storeId, status: status, page: page, limit: limit);
  }

  // ── Reviews ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> submitReview(
    String storeId,
    String productId, {
    required String customerId,
    String? customerName,
    required int rating,
    String? comment,
  }) async {
    return _apiService.submitReview(storeId, productId, customerId: customerId, customerName: customerName, rating: rating, comment: comment);
  }

  Future<Map<String, dynamic>> getProductReviews(String storeId, String productId, {int page = 1, int limit = 20}) async {
    return _apiService.getProductReviews(storeId, productId, page: page, limit: limit);
  }

  // ── Wishlist ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> addToWishlist({required String customerId, required String productId, required String storeId}) async {
    return _apiService.addToWishlist(customerId: customerId, productId: productId, storeId: storeId);
  }

  Future<Map<String, dynamic>> removeFromWishlist(String customerId, String productId) async {
    return _apiService.removeFromWishlist(customerId, productId);
  }

  Future<Map<String, dynamic>> getWishlist(String customerId, {int page = 1, int limit = 30}) async {
    return _apiService.getWishlist(customerId, page: page, limit: limit);
  }

  // ── Reorder ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> reorderFromHistory(String orderId, String customerId) async {
    return _apiService.reorderFromHistory(orderId, customerId);
  }
}
