import 'package:kartseek_shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Mock data service — provides realistic product data until backend is live.
/// This is the kartseek_shared_mobile canonical copy used by RecommendationEngine.
class MarketplaceMockData {
  static const _img = 'https://images.unsplash.com/photo-';

  static List<CategoryModel> get categories => const [
    CategoryModel(id: 'c1', name: 'Mobiles & Tablets', iconEmoji: '📱', productCount: 8450, subcategories: [
      SubcategoryModel(id: 'sc1', name: 'Smartphones', parentId: 'c1', productCount: 5200),
      SubcategoryModel(id: 'sc1b', name: 'Tablets', parentId: 'c1', productCount: 1800),
    ]),
    CategoryModel(id: 'c2', name: 'Electronics', iconEmoji: '🔌', productCount: 12450, subcategories: [
      SubcategoryModel(id: 'sc2', name: 'Headphones', parentId: 'c2', productCount: 3200),
      SubcategoryModel(id: 'sc6', name: 'Smartwatches', parentId: 'c2', productCount: 1800),
    ]),
    CategoryModel(id: 'c3', name: 'Computers & Laptops', iconEmoji: '💻', productCount: 6200),
    CategoryModel(id: 'c4', name: 'Fashion', iconEmoji: '👕', productCount: 34200, subcategories: [
      SubcategoryModel(id: 'sc4', name: 'Shoes', parentId: 'c4', productCount: 8700),
      SubcategoryModel(id: 'sc8', name: 'Clothing', parentId: 'c4', productCount: 15000),
    ]),
    CategoryModel(id: 'c9', name: 'Beauty & Personal Care', iconEmoji: '💄', productCount: 15600),
    CategoryModel(id: 'c10', name: 'Home & Kitchen', iconEmoji: '🏠', productCount: 8700),
    CategoryModel(id: 'c13', name: 'Toys & Baby Products', iconEmoji: '🧸', productCount: 4500),
    CategoryModel(id: 'c14', name: 'Sports & Fitness', iconEmoji: '🏋️', productCount: 6300),
    CategoryModel(id: 'c15', name: 'Books & Stationery', iconEmoji: '📚', productCount: 22100),
    CategoryModel(id: 'c20', name: 'Watches', iconEmoji: '⌚', productCount: 4100),
  ];

  static List<ProductModel> get allProducts => [
    ProductModel(id: 'p1', name: 'iPhone 15 Pro Max', brand: 'Apple', sellerId: 's1', sellerName: 'Apple India Store', sellerVerified: true, price: 134900, mrp: 159900, discount: 16, rating: 4.8, reviewCount: 12540, ratingCount: 18200, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones',
      images: ['${_img}1695048133142-1a20484d2569?q=80&w=800&auto=format&fit=crop'],
      offers: [ProductOffer(title: 'Bank Offer', description: '10% off on HDFC Credit Cards, up to ${RegionService.instance.currentCountry.currencySymbol} 3,000', code: 'HDFC10')]),
    const ProductModel(id: 'p2', name: 'Sony WH-1000XM5', brand: 'Sony', sellerId: 's2', sellerName: 'Sony Official', sellerVerified: true, price: 24990, mrp: 34990, discount: 29, rating: 4.7, reviewCount: 8230, ratingCount: 11400, categoryId: 'c2', categoryName: 'Electronics', subcategoryId: 'sc2', subcategoryName: 'Headphones',
      images: ['${_img}1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p3', name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', sellerId: 's3', sellerName: 'Samsung Store', sellerVerified: true, price: 129999, mrp: 139999, discount: 7, rating: 4.6, reviewCount: 6710, ratingCount: 9800, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones',
      images: ['${_img}1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p4', name: 'MacBook Air M3', brand: 'Apple', sellerId: 's1', sellerName: 'Apple India Store', sellerVerified: true, price: 114900, mrp: 124900, discount: 8, rating: 4.9, reviewCount: 3420, ratingCount: 5100, categoryId: 'c3', categoryName: 'Computers & Laptops', subcategoryId: 'sc3', subcategoryName: 'Laptops',
      images: ['${_img}1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p5', name: 'Nike Air Max 270', brand: 'Nike', sellerId: 's4', sellerName: 'Nike Official', sellerVerified: true, price: 11995, mrp: 14095, discount: 15, rating: 4.6, reviewCount: 7200, ratingCount: 10500, categoryId: 'c4', categoryName: 'Fashion', subcategoryId: 'sc4', subcategoryName: 'Shoes',
      images: ['${_img}1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p6', name: 'Dyson V15 Detect', brand: 'Dyson', sellerId: 's5', sellerName: 'Dyson India', sellerVerified: true, price: 52900, mrp: 55900, discount: 5, rating: 4.8, reviewCount: 2100, ratingCount: 3200, categoryId: 'c10', categoryName: 'Home & Kitchen',
      images: ['${_img}1558317374-067fb5f30001?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p7', name: 'Apple Watch SE (2nd Gen)', brand: 'Apple', sellerId: 's1', sellerName: 'Apple India Store', sellerVerified: true, price: 29900, mrp: 32900, discount: 9, rating: 4.7, reviewCount: 5400, ratingCount: 7800, categoryId: 'c2', categoryName: 'Electronics', subcategoryId: 'sc6', subcategoryName: 'Smartwatches',
      images: ['${_img}1434493789847-2f02dc6ca35d?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p8', name: 'OnePlus 12', brand: 'OnePlus', sellerId: 's6', sellerName: 'OnePlus Store', sellerVerified: true, price: 64999, mrp: 69999, discount: 7, rating: 4.5, reviewCount: 6100, ratingCount: 8900, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones',
      images: ['${_img}1706691459493-27c95e1e5504?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p9', name: 'Google Pixel 8 Pro', brand: 'Google', sellerId: 's7', sellerName: 'Google Store', sellerVerified: true, price: 84999, mrp: 94999, discount: 11, rating: 4.7, reviewCount: 4300, ratingCount: 6200, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones',
      images: ['${_img}1696446701796-da61225697cc?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p10', name: 'Adidas Ultraboost 23', brand: 'Adidas', sellerId: 's8', sellerName: 'Adidas Official', sellerVerified: true, price: 16999, mrp: 19999, discount: 15, rating: 4.5, reviewCount: 3400, ratingCount: 5100, categoryId: 'c4', categoryName: 'Fashion', subcategoryId: 'sc4', subcategoryName: 'Shoes',
      images: ['${_img}1608231387042-66d1773070a5?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p11', name: 'Samsung 65" Crystal 4K TV', brand: 'Samsung', sellerId: 's3', sellerName: 'Samsung Store', sellerVerified: true, price: 54990, mrp: 74990, discount: 27, rating: 4.4, reviewCount: 2800, ratingCount: 4100, categoryId: 'c2', categoryName: 'Electronics'),
    const ProductModel(id: 'p12', name: "Levi's 501 Original Jeans", brand: "Levi's", sellerId: 's9', sellerName: "Levi's Store", sellerVerified: true, price: 2799, mrp: 3999, discount: 30, rating: 4.3, reviewCount: 9800, ratingCount: 14200, categoryId: 'c4', categoryName: 'Fashion', subcategoryId: 'sc8', subcategoryName: 'Clothing'),
    const ProductModel(id: 'p13', name: 'Rolex Oyster Perpetual', brand: 'Rolex', sellerId: 's10', sellerName: 'LuxWatch Hub', sellerVerified: true, price: 485000, mrp: 520000, discount: 7, rating: 4.9, reviewCount: 1200, ratingCount: 1800, categoryId: 'c20', categoryName: 'Watches'),
    const ProductModel(id: 'p14', name: 'Casio G-Shock GA-2100', brand: 'Casio', sellerId: 's10', sellerName: 'LuxWatch Hub', sellerVerified: true, price: 9995, mrp: 12995, discount: 23, rating: 4.6, reviewCount: 5400, ratingCount: 7800, categoryId: 'c20', categoryName: 'Watches'),
    const ProductModel(id: 'p16', name: 'MAC Retro Matte Lipstick', brand: 'MAC', sellerId: 's11', sellerName: 'Beauty Central', sellerVerified: true, price: 1750, mrp: 2100, discount: 17, rating: 4.5, reviewCount: 8900, ratingCount: 12400, categoryId: 'c9', categoryName: 'Beauty & Personal Care'),
    const ProductModel(id: 'p19', name: 'LEGO City Fire Station', brand: 'LEGO', sellerId: 's12', sellerName: 'Toy World', sellerVerified: true, price: 4999, mrp: 5999, discount: 17, rating: 4.8, reviewCount: 3200, ratingCount: 4500, categoryId: 'c13', categoryName: 'Toys & Baby Products'),
    const ProductModel(id: 'p33', name: 'Yonex Astrox 88D Badminton Racket', brand: 'Yonex', sellerId: 's21', sellerName: 'Sports Arena', sellerVerified: true, price: 8490, mrp: 10990, discount: 23, rating: 4.7, reviewCount: 1800, ratingCount: 2600, categoryId: 'c14', categoryName: 'Sports & Fitness'),
    const ProductModel(id: 'p35', name: 'Atomic Habits by James Clear', brand: 'Penguin', sellerId: 's22', sellerName: 'BookStore India', sellerVerified: true, price: 399, mrp: 699, discount: 43, rating: 4.8, reviewCount: 24500, ratingCount: 32000, categoryId: 'c15', categoryName: 'Books & Stationery'),
  ];

  static ProductModel getProductById(String id) =>
    allProducts.firstWhere((p) => p.id == id, orElse: () => allProducts.first);

  static List<ProductModel> getProductsByCategory(String catId) =>
    allProducts.where((p) => p.categoryId == catId).toList();

  static List<ProductModel> searchProducts(String query) =>
    allProducts.where((p) => p.name.toLowerCase().contains(query.toLowerCase()) || p.brand.toLowerCase().contains(query.toLowerCase())).toList();

  static List<BrandModel> get brands => const [
    BrandModel(id: 'b1', name: 'Apple', productCount: 342, rating: 4.8, verified: true),
    BrandModel(id: 'b2', name: 'Samsung', productCount: 567, rating: 4.6, verified: true),
    BrandModel(id: 'b3', name: 'Nike', productCount: 890, rating: 4.5, verified: true),
    BrandModel(id: 'b4', name: 'Sony', productCount: 234, rating: 4.7, verified: true),
    BrandModel(id: 'b5', name: 'Adidas', productCount: 678, rating: 4.4, verified: true),
    BrandModel(id: 'b6', name: 'Dyson', productCount: 89, rating: 4.8, verified: true),
  ];

  static List<SellerModel> get sellers => const [
    SellerModel(id: 's1', name: 'Apple India Store', rating: 4.9, productCount: 342, verified: true),
    SellerModel(id: 's2', name: 'Sony Official', rating: 4.8, productCount: 234, verified: true),
    SellerModel(id: 's3', name: 'Samsung Store', rating: 4.7, productCount: 567, verified: true),
  ];

  static List<String> get popularSearches => [
    'iPhone 15', 'Samsung Galaxy', 'Nike shoes', 'MacBook', 'Headphones',
  ];
}
