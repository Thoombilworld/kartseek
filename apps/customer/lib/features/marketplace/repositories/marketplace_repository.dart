import 'package:kartseek_customer/features/marketplace/models/product_model.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';

/// Marketplace Repository — Single source of truth for data operations.
/// Mediates between API service and providers/controllers.
class MarketplaceRepository {
  final MarketplaceApiService _api;

  MarketplaceRepository({MarketplaceApiService? api})
      : _api = api ?? MarketplaceApiService();

  // ── Home ──────────────────────────────────────────────────────────────────
  Future<MarketplaceHomeData> getMarketplaceHome() => _api.getMarketplaceHome();

  // ── Categories ────────────────────────────────────────────────────────────
  Future<List<CategoryModel>> getCategories() => _api.getCategories();
  Future<CategoryModel> getCategoryById(String id) => _api.getCategoryById(id);
  Future<SubcategoryModel> getSubcategoryById(String id) => _api.getSubcategoryById(id);

  // ── Products ──────────────────────────────────────────────────────────────
  Future<List<ProductModel>> getProducts(ProductFilter filter) => _api.getProducts(filter: filter);
  Future<ProductModel> getProductById(String id) => _api.getProductById(id);

  // ── Brands ────────────────────────────────────────────────────────────────
  Future<BrandModel> getBrandById(String id) => _api.getBrandById(id);
  Future<List<BrandModel>> getTopBrands() => _api.getTopBrands();

  // ── Sellers ───────────────────────────────────────────────────────────────
  Future<SellerModel> getSellerById(String id) => _api.getSellerById(id);
  Future<List<SellerModel>> getVerifiedSellers() => _api.getVerifiedSellers();

  // ── Search ────────────────────────────────────────────────────────────────
  Future<List<ProductModel>> searchMarketplace(String query, {ProductFilter? filter}) =>
      _api.searchMarketplace(query, filter: filter);

  // ── Deals ─────────────────────────────────────────────────────────────────
  Future<List<ProductModel>> getDeals() => _api.getDeals();
  Future<List<ProductModel>> getFlashDeals() => _api.getFlashDeals();
  Future<List<ProductModel>> getFeaturedProducts() => _api.getFeaturedProducts();

  // ── Cart ──────────────────────────────────────────────────────────────────
  Future<List<CartItemModel>> getCart() => _api.getCart();
  Future<void> addToCart(String productId, {int quantity = 1, String? variantId}) =>
      _api.addToCart(productId, quantity: quantity, variantId: variantId);
  Future<void> updateCartItem(String itemId, int quantity) =>
      _api.updateCartItem(itemId, quantity);
  Future<void> removeFromCart(String itemId) => _api.removeFromCart(itemId);

  // ── Wishlist ──────────────────────────────────────────────────────────────
  Future<List<ProductModel>> getWishlist() => _api.getWishlist();
  Future<void> addToWishlist(String productId) => _api.addToWishlist(productId);
  Future<void> removeFromWishlist(String productId) => _api.removeFromWishlist(productId);

  // ── Orders ────────────────────────────────────────────────────────────────
  Future<List<OrderModel>> getOrders() => _api.getOrders();
  Future<OrderModel> getOrderById(String id) => _api.getOrderById(id);
  Future<String> placeOrder(Map<String, dynamic> payload) => _api.placeOrder(payload);
  Future<void> cancelOrder(String orderId, String reason) => _api.cancelOrder(orderId, reason);

  // ── Returns ───────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> createReturnRequest(Map<String, dynamic> payload) =>
      _api.createReturnRequest(payload);

  // ── Reviews ───────────────────────────────────────────────────────────────
  Future<List<ProductReview>> getProductReviews(String productId) =>
      _api.getProductReviews(productId);
  Future<void> addProductReview(String productId, Map<String, dynamic> review) =>
      _api.addProductReview(productId, review);

  // ── Support ───────────────────────────────────────────────────────────────
  Future<void> createSupportTicket(Map<String, dynamic> payload) =>
      _api.createSupportTicket(payload);

  // ── Recently Viewed ───────────────────────────────────────────────────────
  Future<List<ProductModel>> getRecentlyViewed() => _api.getRecentlyViewed();
}
