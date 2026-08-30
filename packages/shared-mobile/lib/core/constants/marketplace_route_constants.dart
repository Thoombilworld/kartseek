/// KARTSEEK Marketplace Route Constants
/// Version 1.0 — Phase 1 Foundation
///
/// Use these constants for all marketplace navigation in Flutter.
/// Centralised here to prevent broken routes and simplify future changes.
///
/// Usage:
///   Navigator.pushNamed(context, MarketplaceRoutes.home);
///   Navigator.pushNamed(context, MarketplaceRoutes.product, arguments: productId);
library;



class MarketplaceRoutes {
  MarketplaceRoutes._();

  // ── Core Marketplace ──────────────────────────────────────────────────────
  static const String home = '/marketplace';
  static const String categories = '/marketplace/categories';
  static const String category = '/marketplace/category';
  static const String subcategory = '/marketplace/subcategory';
  static const String product = '/marketplace/product';
  static const String search = '/marketplace/search';
  static const String listing = '/marketplace/listing';
  static const String brand = '/marketplace/brand';
  static const String seller = '/marketplace/seller';

  // ── Deals & Featured ──────────────────────────────────────────────────────
  static const String deals = '/marketplace/deals';
  static const String flashDeals = '/marketplace/flash-deals';
  static const String featured = '/marketplace/featured';
  static const String recentlyViewed = '/marketplace/recently-viewed';
  static const String topBrands = '/marketplace/top-brands';
  static const String verifiedSellers = '/marketplace/verified-sellers';

  // ── Cart & Checkout ───────────────────────────────────────────────────────
  static const String cart = '/marketplace/cart';
  static const String checkout = '/marketplace/checkout';
  static const String checkoutSuccess = '/marketplace/checkout/success';
  static const String checkoutFailed = '/marketplace/checkout/failed';

  // ── Wishlist ──────────────────────────────────────────────────────────────
  static const String wishlist = '/marketplace/wishlist';

  // ── Orders ────────────────────────────────────────────────────────────────
  static const String orders = '/marketplace/orders';
  static const String orderDetail = '/marketplace/order';

  // ── Returns & Support ─────────────────────────────────────────────────────
  static const String returns = '/returns';
  static const String support = '/support';

  // ── Helpers ───────────────────────────────────────────────────────────────
  static Map<String, dynamic> categoryArgs(String id, String name) =>
      {'id': id, 'name': name};

  static Map<String, dynamic> subcategoryArgs(String id, String name) =>
      {'id': id, 'name': name};

  static Map<String, dynamic> listingArgs({
    String? title,
    String? categoryId,
    String? subcategoryId,
    String? brandId,
    String? sellerId,
  }) =>
      {
        if (title != null) 'title': title,
        if (categoryId != null) 'categoryId': categoryId,
        if (subcategoryId != null) 'subcategoryId': subcategoryId,
        if (brandId != null) 'brandId': brandId,
        if (sellerId != null) 'sellerId': sellerId,
      };
}
