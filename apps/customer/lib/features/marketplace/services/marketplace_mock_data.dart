import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/features/marketplace/models/product_model.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// Mock data service — provides realistic product data until backend is live.
class MarketplaceMockData {
  static const _img = 'https://images.unsplash.com/photo-';

  // ── Categories with subcategories ─────────────────────────────────────
  static List<CategoryModel> get categories => const [
    CategoryModel(id: 'c1', name: 'Mobiles & Tablets', iconEmoji: '📱', productCount: 8450, subcategories: [
      SubcategoryModel(id: 'sc1', name: 'Smartphones', parentId: 'c1', productCount: 5200),
      SubcategoryModel(id: 'sc1b', name: 'Tablets', parentId: 'c1', productCount: 1800),
      SubcategoryModel(id: 'sc1c', name: 'Phone Cases', parentId: 'c1', productCount: 1450),
    ]),
    CategoryModel(id: 'c2', name: 'Electronics', iconEmoji: '🔌', productCount: 12450, subcategories: [
      SubcategoryModel(id: 'sc2', name: 'Headphones', parentId: 'c2', productCount: 3200),
      SubcategoryModel(id: 'sc6', name: 'Smartwatches', parentId: 'c2', productCount: 1800),
      SubcategoryModel(id: 'sc7', name: 'Televisions', parentId: 'c2', productCount: 2100),
      SubcategoryModel(id: 'sc2b', name: 'Cameras', parentId: 'c2', productCount: 900),
    ]),
    CategoryModel(id: 'c3', name: 'Computers & Laptops', iconEmoji: '💻', productCount: 6200, subcategories: [
      SubcategoryModel(id: 'sc3', name: 'Laptops', parentId: 'c3', productCount: 3100),
      SubcategoryModel(id: 'sc3b', name: 'Desktops', parentId: 'c3', productCount: 1200),
      SubcategoryModel(id: 'sc3c', name: 'Monitors', parentId: 'c3', productCount: 1900),
    ]),
    CategoryModel(id: 'c4', name: 'Fashion', iconEmoji: '👕', productCount: 34200, subcategories: [
      SubcategoryModel(id: 'sc4', name: 'Shoes', parentId: 'c4', productCount: 8700),
      SubcategoryModel(id: 'sc8', name: 'Clothing', parentId: 'c4', productCount: 15000),
      SubcategoryModel(id: 'sc4b', name: 'Accessories', parentId: 'c4', productCount: 5500),
    ]),
    CategoryModel(id: 'c5', name: "Men's Clothing", iconEmoji: '👔', productCount: 12300),
    CategoryModel(id: 'c6', name: "Women's Clothing", iconEmoji: '👗', productCount: 15800),
    CategoryModel(id: 'c7', name: "Kids' Clothing", iconEmoji: '🧒', productCount: 6100),
    CategoryModel(id: 'c8', name: 'Footwear', iconEmoji: '👟', productCount: 8900),
    CategoryModel(id: 'c9', name: 'Beauty & Personal Care', iconEmoji: '💄', productCount: 15600),
    CategoryModel(id: 'c10', name: 'Home & Kitchen', iconEmoji: '🏠', productCount: 8700, subcategories: [
      SubcategoryModel(id: 'sc5', name: 'Vacuum Cleaners', parentId: 'c10', productCount: 800),
      SubcategoryModel(id: 'sc10b', name: 'Cookware', parentId: 'c10', productCount: 2200),
    ]),
    CategoryModel(id: 'c11', name: 'Furniture', iconEmoji: '🪑', productCount: 4200),
    CategoryModel(id: 'c12', name: 'Appliances', iconEmoji: '🧊', productCount: 3800),
    CategoryModel(id: 'c13', name: 'Toys & Baby Products', iconEmoji: '🧸', productCount: 4500),
    CategoryModel(id: 'c14', name: 'Sports & Fitness', iconEmoji: '🏋️', productCount: 6300),
    CategoryModel(id: 'c15', name: 'Books & Stationery', iconEmoji: '📚', productCount: 22100),
    CategoryModel(id: 'c16', name: 'Automotive Accessories', iconEmoji: '🚗', productCount: 3200),
    CategoryModel(id: 'c17', name: 'Tools & Hardware', iconEmoji: '🔧', productCount: 2800),
    CategoryModel(id: 'c18', name: 'Health & Wellness', iconEmoji: '💊', productCount: 5400),
    CategoryModel(id: 'c19', name: 'Bags & Luggage', iconEmoji: '🧳', productCount: 3600),
    CategoryModel(id: 'c20', name: 'Watches', iconEmoji: '⌚', productCount: 4100),
    CategoryModel(id: 'c21', name: 'Jewellery & Accessories', iconEmoji: '💍', productCount: 7200),
  ];

  static CategoryModel getCategoryById(String id) =>
    categories.firstWhere((c) => c.id == id, orElse: () => categories.first);

  static SubcategoryModel getSubcategoryById(String id) {
    for (final cat in categories) {
      for (final sub in cat.subcategories) {
        if (sub.id == id) return sub;
      }
    }
    return const SubcategoryModel(id: 'sc1', name: 'Smartphones', parentId: 'c1');
  }

  // ── Products ──────────────────────────────────────────────────────────
  static List<ProductModel> get allProducts => [
    ProductModel(id: 'p1', name: 'iPhone 15 Pro Max', brand: 'Apple', sellerId: 's1', sellerName: 'Apple India Store', sellerVerified: true, price: 134900, mrp: 159900, discount: 16, rating: 4.8, reviewCount: 12540, ratingCount: 18200, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones',
      images: ['${_img}1695048133142-1a20484d2569?q=80&w=800&auto=format&fit=crop', '${_img}1512054502232-10a0a035d672?q=80&w=800&auto=format&fit=crop', '${_img}1592750475338-74b7b21085ab?q=80&w=800&auto=format&fit=crop'],
      description: 'iPhone 15 Pro Max features a 6.7-inch Super Retina XDR display, A17 Pro chip, 48MP camera system, and all-day battery life.',
      highlights: ['A17 Pro Bionic chip', '48MP Main Camera', '6.7" Super Retina XDR', 'Titanium Design', 'USB-C', 'Action Button'],
      specifications: const [ProductSpec(label: 'Display', value: '6.7" Super Retina XDR OLED'), ProductSpec(label: 'Processor', value: 'A17 Pro Bionic'), ProductSpec(label: 'RAM', value: '8 GB'), ProductSpec(label: 'Storage', value: '256 GB'), ProductSpec(label: 'Camera', value: '48 MP + 12 MP + 12 MP'), ProductSpec(label: 'Battery', value: '4,422 mAh')],
      offers: [ProductOffer(title: 'Bank Offer', description: '10% off on HDFC Credit Cards, up to ${RegionService.instance.currentCountry.currencySymbol} 3,000', code: 'HDFC10'), ProductOffer(title: 'Exchange Offer', description: 'Up to ${RegionService.instance.currentCountry.currencySymbol} 20,000 off on exchange'), ProductOffer(title: 'No Cost EMI', description: 'Starting ${RegionService.instance.currentCountry.currencySymbol} 11,242/month')]),
    const ProductModel(id: 'p2', name: 'Sony WH-1000XM5', brand: 'Sony', sellerId: 's2', sellerName: 'Sony Official', sellerVerified: true, price: 24990, mrp: 34990, discount: 29, rating: 4.7, reviewCount: 8230, ratingCount: 11400, categoryId: 'c2', categoryName: 'Electronics', subcategoryId: 'sc2', subcategoryName: 'Headphones',
      images: ['${_img}1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop', '${_img}1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop'],
      description: 'Industry-leading noise cancellation with Auto NC Optimizer and 30 hours of battery life.',
      specifications: [ProductSpec(label: 'Type', value: 'Over-Ear Wireless'), ProductSpec(label: 'Driver', value: '30mm'), ProductSpec(label: 'ANC', value: 'Yes'), ProductSpec(label: 'Battery', value: '30 hours')]),
    const ProductModel(id: 'p3', name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', sellerId: 's3', sellerName: 'Samsung Store', sellerVerified: true, price: 129999, mrp: 139999, discount: 7, rating: 4.6, reviewCount: 6710, ratingCount: 9800, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones',
      images: ['${_img}1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p4', name: 'MacBook Air M3', brand: 'Apple', sellerId: 's1', sellerName: 'Apple India Store', sellerVerified: true, price: 114900, mrp: 124900, discount: 8, rating: 4.9, reviewCount: 3420, ratingCount: 5100, categoryId: 'c3', categoryName: 'Computers & Laptops', subcategoryId: 'sc3', subcategoryName: 'Laptops',
      images: ['${_img}1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p5', name: 'Nike Air Max 270', brand: 'Nike', sellerId: 's4', sellerName: 'Nike Official', sellerVerified: true, price: 11995, mrp: 14095, discount: 15, rating: 4.6, reviewCount: 7200, ratingCount: 10500, categoryId: 'c4', categoryName: 'Fashion', subcategoryId: 'sc4', subcategoryName: 'Shoes',
      images: ['${_img}1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p6', name: 'Dyson V15 Detect', brand: 'Dyson', sellerId: 's5', sellerName: 'Dyson India', sellerVerified: true, price: 52900, mrp: 55900, discount: 5, rating: 4.8, reviewCount: 2100, ratingCount: 3200, categoryId: 'c10', categoryName: 'Home & Kitchen', subcategoryId: 'sc5', subcategoryName: 'Vacuum Cleaners',
      images: ['${_img}1558317374-067fb5f30001?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p7', name: 'Apple Watch SE (2nd Gen)', brand: 'Apple', sellerId: 's1', sellerName: 'Apple India Store', sellerVerified: true, price: 29900, mrp: 32900, discount: 9, rating: 4.7, reviewCount: 5400, ratingCount: 7800, categoryId: 'c2', categoryName: 'Electronics', subcategoryId: 'sc6', subcategoryName: 'Smartwatches',
      images: ['${_img}1434493789847-2f02dc6ca35d?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p8', name: 'OnePlus 12', brand: 'OnePlus', sellerId: 's6', sellerName: 'OnePlus Store', sellerVerified: true, price: 64999, mrp: 69999, discount: 7, rating: 4.5, reviewCount: 6100, ratingCount: 8900, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones',
      images: ['${_img}1706691459493-27c95e1e5504?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p9', name: 'Google Pixel 8 Pro', brand: 'Google', sellerId: 's7', sellerName: 'Google Store', sellerVerified: true, price: 84999, mrp: 94999, discount: 11, rating: 4.7, reviewCount: 4300, ratingCount: 6200, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones',
      images: ['${_img}1696446701796-da61225697cc?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p10', name: 'Adidas Ultraboost 23', brand: 'Adidas', sellerId: 's8', sellerName: 'Adidas Official', sellerVerified: true, price: 16999, mrp: 19999, discount: 15, rating: 4.5, reviewCount: 3400, ratingCount: 5100, categoryId: 'c4', categoryName: 'Fashion', subcategoryId: 'sc4', subcategoryName: 'Shoes',
      images: ['${_img}1608231387042-66d1773070a5?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p11', name: 'Samsung 65" Crystal 4K TV', brand: 'Samsung', sellerId: 's3', sellerName: 'Samsung Store', sellerVerified: true, price: 54990, mrp: 74990, discount: 27, rating: 4.4, reviewCount: 2800, ratingCount: 4100, categoryId: 'c2', categoryName: 'Electronics', subcategoryId: 'sc7', subcategoryName: 'Televisions',
      images: ['${_img}1593359677879-a4bb92f829d1?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p12', name: "Levi's 501 Original Jeans", brand: "Levi's", sellerId: 's9', sellerName: "Levi's Store", sellerVerified: true, price: 2799, mrp: 3999, discount: 30, rating: 4.3, reviewCount: 9800, ratingCount: 14200, categoryId: 'c4', categoryName: 'Fashion', subcategoryId: 'sc8', subcategoryName: 'Clothing',
      images: ['${_img}1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop']),
    // ── Watches ──
    const ProductModel(id: 'p13', name: 'Rolex Oyster Perpetual', brand: 'Rolex', sellerId: 's10', sellerName: 'LuxWatch Hub', sellerVerified: true, price: 485000, mrp: 520000, discount: 7, rating: 4.9, reviewCount: 1200, ratingCount: 1800, categoryId: 'c20', categoryName: 'Watches', subcategoryId: 'sc20a', subcategoryName: 'Luxury Watches', images: ['${_img}1523170335258-f5ed11844a49?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p14', name: 'Casio G-Shock GA-2100', brand: 'Casio', sellerId: 's10', sellerName: 'LuxWatch Hub', sellerVerified: true, price: 9995, mrp: 12995, discount: 23, rating: 4.6, reviewCount: 5400, ratingCount: 7800, categoryId: 'c20', categoryName: 'Watches', subcategoryId: 'sc20b', subcategoryName: 'Sport Watches', images: ['${_img}1524805444758-089113d48a6d?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p15', name: 'Titan Raga Women Watch', brand: 'Titan', sellerId: 's10', sellerName: 'LuxWatch Hub', sellerVerified: true, price: 4995, mrp: 6495, discount: 23, rating: 4.4, reviewCount: 3200, ratingCount: 4800, categoryId: 'c20', categoryName: 'Watches', images: ['${_img}1612817159949-195b6eb9e31a?q=80&w=800&auto=format&fit=crop']),
    // ── Beauty ──
    const ProductModel(id: 'p16', name: 'MAC Retro Matte Lipstick', brand: 'MAC', sellerId: 's11', sellerName: 'Beauty Central', sellerVerified: true, price: 1750, mrp: 2100, discount: 17, rating: 4.5, reviewCount: 8900, ratingCount: 12400, categoryId: 'c9', categoryName: 'Beauty & Personal Care', images: ['${_img}1586495777744-4413f21062fa?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p17', name: 'Maybelline Fit Me Foundation', brand: 'Maybelline', sellerId: 's11', sellerName: 'Beauty Central', sellerVerified: true, price: 499, mrp: 699, discount: 29, rating: 4.3, reviewCount: 15200, ratingCount: 21000, categoryId: 'c9', categoryName: 'Beauty & Personal Care', images: ['${_img}1596462502278-27bfdc403348?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p18', name: 'Lakme Absolute Skin Serum', brand: 'Lakme', sellerId: 's11', sellerName: 'Beauty Central', sellerVerified: true, price: 899, mrp: 1299, discount: 31, rating: 4.6, reviewCount: 6700, ratingCount: 9200, categoryId: 'c9', categoryName: 'Beauty & Personal Care', images: ['${_img}1556228578-8c89e6adf883?q=80&w=800&auto=format&fit=crop']),
    // ── Kids ──
    const ProductModel(id: 'p19', name: 'LEGO City Fire Station', brand: 'LEGO', sellerId: 's12', sellerName: 'Toy World', sellerVerified: true, price: 4999, mrp: 5999, discount: 17, rating: 4.8, reviewCount: 3200, ratingCount: 4500, categoryId: 'c13', categoryName: 'Toys & Baby Products', images: ['${_img}1587654780014-fac4d11c3e8e?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p20', name: 'Hot Wheels Track Builder Set', brand: 'Hot Wheels', sellerId: 's12', sellerName: 'Toy World', sellerVerified: true, price: 1999, mrp: 2999, discount: 33, rating: 4.5, reviewCount: 4100, ratingCount: 5800, categoryId: 'c13', categoryName: 'Toys & Baby Products', images: ['${_img}1596461404969-9ae56f130f0e?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p21', name: 'Barbie Dreamhouse Playset', brand: 'Barbie', sellerId: 's12', sellerName: 'Toy World', sellerVerified: true, price: 7499, mrp: 9999, discount: 25, rating: 4.7, reviewCount: 2800, ratingCount: 3900, categoryId: 'c13', categoryName: 'Toys & Baby Products', images: ['${_img}1566576912321-d58ddd7a6088?q=80&w=800&auto=format&fit=crop']),
    // ── Home Appliances ──
    const ProductModel(id: 'p22', name: 'LG 8 Kg Front Load Washer', brand: 'LG', sellerId: 's13', sellerName: 'Appliance Hub', sellerVerified: true, price: 32990, mrp: 42990, discount: 23, rating: 4.5, reviewCount: 3800, ratingCount: 5200, categoryId: 'c12', categoryName: 'Appliances', images: ['${_img}1626806787461-102c1bfaaea1?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p23', name: 'Philips Air Fryer HD9270', brand: 'Philips', sellerId: 's13', sellerName: 'Appliance Hub', sellerVerified: true, price: 7999, mrp: 10995, discount: 27, rating: 4.6, reviewCount: 5400, ratingCount: 7200, categoryId: 'c12', categoryName: 'Appliances', images: ['${_img}1648479519003-2229e4f2fde7?q=80&w=800&auto=format&fit=crop']),
    // ── More Mobiles (Xiaomi, Realme, Oppo, Vivo) ──
    const ProductModel(id: 'p24', name: 'Xiaomi 14 Ultra', brand: 'Xiaomi', sellerId: 's14', sellerName: 'Mi Store', sellerVerified: true, price: 69999, mrp: 79999, discount: 13, rating: 4.5, reviewCount: 4200, ratingCount: 6100, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones', images: ['${_img}1598327105666-5b89351aff97?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p25', name: 'Realme GT 5 Pro', brand: 'Realme', sellerId: 's15', sellerName: 'Realme Official', sellerVerified: true, price: 35999, mrp: 39999, discount: 10, rating: 4.4, reviewCount: 3100, ratingCount: 4500, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones', images: ['${_img}1511707171634-5f897ff02aa6?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p26', name: 'Oppo Find X7 Ultra', brand: 'Oppo', sellerId: 's16', sellerName: 'Oppo Store', sellerVerified: true, price: 59999, mrp: 64999, discount: 8, rating: 4.5, reviewCount: 2800, ratingCount: 4000, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones', images: ['${_img}1592899677977-b568ff26d85a?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p27', name: 'Vivo X100 Pro', brand: 'Vivo', sellerId: 's17', sellerName: 'Vivo Official', sellerVerified: true, price: 51999, mrp: 59999, discount: 13, rating: 4.4, reviewCount: 2400, ratingCount: 3500, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones', images: ['${_img}1585060544812-6b45742d762f?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p28', name: 'Redmi Note 13 Pro', brand: 'Xiaomi', sellerId: 's14', sellerName: 'Mi Store', sellerVerified: true, price: 18999, mrp: 21999, discount: 14, rating: 4.3, reviewCount: 8900, ratingCount: 12100, categoryId: 'c1', categoryName: 'Mobiles & Tablets', subcategoryId: 'sc1', subcategoryName: 'Smartphones', images: ['${_img}1574944985070-8f3ebc6b79d2?q=80&w=800&auto=format&fit=crop']),
    // ── Fashion extras ──
    const ProductModel(id: 'p29', name: 'Zara Floral Maxi Dress', brand: 'Zara', sellerId: 's18', sellerName: 'Zara India', sellerVerified: true, price: 3990, mrp: 5490, discount: 27, rating: 4.4, reviewCount: 4200, ratingCount: 5800, categoryId: 'c4', categoryName: 'Fashion', subcategoryId: 'sc8', subcategoryName: 'Clothing', images: ['${_img}1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p30', name: 'H&M Slim Fit Shirt', brand: 'H&M', sellerId: 's19', sellerName: 'H&M Official', sellerVerified: true, price: 1299, mrp: 1799, discount: 28, rating: 4.2, reviewCount: 6100, ratingCount: 8400, categoryId: 'c4', categoryName: 'Fashion', subcategoryId: 'sc8', subcategoryName: 'Clothing', images: ['${_img}1602810318383-e386cc2a3f80?q=80&w=800&auto=format&fit=crop']),
    // ── Furniture ──
    const ProductModel(id: 'p31', name: 'IKEA MALM Bed Frame', brand: 'IKEA', sellerId: 's20', sellerName: 'IKEA India', sellerVerified: true, price: 18990, mrp: 24990, discount: 24, rating: 4.5, reviewCount: 2100, ratingCount: 3000, categoryId: 'c11', categoryName: 'Furniture', images: ['${_img}1555041469-a586c61ea9bc?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p32', name: 'Nilkamal Executive Office Chair', brand: 'Nilkamal', sellerId: 's20', sellerName: 'IKEA India', sellerVerified: true, price: 8999, mrp: 12999, discount: 31, rating: 4.3, reviewCount: 3400, ratingCount: 4800, categoryId: 'c11', categoryName: 'Furniture', images: ['${_img}1506439773649-6e0eb8cfb237?q=80&w=800&auto=format&fit=crop']),
    // ── Sports ──
    const ProductModel(id: 'p33', name: 'Yonex Astrox 88D Badminton Racket', brand: 'Yonex', sellerId: 's21', sellerName: 'Sports Arena', sellerVerified: true, price: 8490, mrp: 10990, discount: 23, rating: 4.7, reviewCount: 1800, ratingCount: 2600, categoryId: 'c14', categoryName: 'Sports & Fitness', images: ['${_img}1554068865-24cecd4e34b8?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p34', name: 'Fitbit Charge 6', brand: 'Fitbit', sellerId: 's21', sellerName: 'Sports Arena', sellerVerified: true, price: 14999, mrp: 17999, discount: 17, rating: 4.4, reviewCount: 3200, ratingCount: 4500, categoryId: 'c14', categoryName: 'Sports & Fitness', images: ['${_img}1575311373937-040b8e1fd5b6?q=80&w=800&auto=format&fit=crop']),
    // ── Books ──
    const ProductModel(id: 'p35', name: 'Atomic Habits by James Clear', brand: 'Penguin', sellerId: 's22', sellerName: 'BookStore India', sellerVerified: true, price: 399, mrp: 699, discount: 43, rating: 4.8, reviewCount: 24500, ratingCount: 32000, categoryId: 'c15', categoryName: 'Books & Stationery', images: ['${_img}1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop']),
    // ── Bags ──
    const ProductModel(id: 'p36', name: 'American Tourister Urbane Backpack', brand: 'American Tourister', sellerId: 's23', sellerName: 'Bag World', sellerVerified: true, price: 2499, mrp: 3999, discount: 38, rating: 4.3, reviewCount: 5600, ratingCount: 7800, categoryId: 'c19', categoryName: 'Bags & Luggage', images: ['${_img}1553062407-98d4b2b6b832?q=80&w=800&auto=format&fit=crop']),
    // ── Kitchen ──
    const ProductModel(id: 'p37', name: 'Prestige Omega Deluxe Cookware Set', brand: 'Prestige', sellerId: 's24', sellerName: 'Kitchen Essentials', sellerVerified: true, price: 3499, mrp: 4999, discount: 30, rating: 4.5, reviewCount: 4200, ratingCount: 5900, categoryId: 'c10', categoryName: 'Home & Kitchen', subcategoryId: 'sc10b', subcategoryName: 'Cookware', images: ['${_img}1556909114-f6e7ad7d3136?q=80&w=800&auto=format&fit=crop']),
    // ── Footwear ──
    const ProductModel(id: 'p38', name: 'Puma RS-X Sneakers', brand: 'Puma', sellerId: 's25', sellerName: 'Puma Store', sellerVerified: true, price: 7999, mrp: 9999, discount: 20, rating: 4.4, reviewCount: 3800, ratingCount: 5200, categoryId: 'c8', categoryName: 'Footwear', images: ['${_img}1600185365926-3a2ce3228680?q=80&w=800&auto=format&fit=crop']),
    const ProductModel(id: 'p39', name: 'Woodland Outdoor Boots', brand: 'Woodland', sellerId: 's25', sellerName: 'Puma Store', sellerVerified: true, price: 4995, mrp: 6995, discount: 29, rating: 4.3, reviewCount: 5100, ratingCount: 7000, categoryId: 'c8', categoryName: 'Footwear', images: ['${_img}1520639888713-7851133b1ed0?q=80&w=800&auto=format&fit=crop']),
    // ── Computer & Accessories ──
    const ProductModel(id: 'p40', name: 'Dell UltraSharp 27" 4K Monitor', brand: 'Dell', sellerId: 's26', sellerName: 'Dell Store', sellerVerified: true, price: 42990, mrp: 52990, discount: 19, rating: 4.7, reviewCount: 2100, ratingCount: 3000, categoryId: 'c3', categoryName: 'Computers & Laptops', subcategoryId: 'sc3c', subcategoryName: 'Monitors', images: ['${_img}1527443224154-c4a3942d3acf?q=80&w=800&auto=format&fit=crop']),
  ];

  static ProductModel getProductById(String id) =>
    allProducts.firstWhere((p) => p.id == id, orElse: () => allProducts.first);

  static ProductModel getProductByName(String name) =>
    allProducts.firstWhere((p) => p.name.toLowerCase().contains(name.toLowerCase()), orElse: () => allProducts.first);

  static List<ProductModel> getProductsByCategory(String catId) =>
    allProducts.where((p) => p.categoryId == catId).toList();

  static List<ProductModel> getProductsByBrand(String brand) =>
    allProducts.where((p) => p.brand.toLowerCase() == brand.toLowerCase()).toList();

  static List<ProductModel> getProductsBySubcategory(String subId) =>
    allProducts.where((p) => p.subcategoryId == subId).toList();

  static List<ProductModel> getBudgetProducts(String catId, {double maxPrice = 20000}) =>
    allProducts.where((p) => p.categoryId == catId && p.price <= maxPrice).toList();

  static List<ProductModel> getPremiumProducts(String catId, {double minPrice = 50000}) =>
    allProducts.where((p) => p.categoryId == catId && p.price >= minPrice).toList();

  static List<ProductModel> getBestSellersByCategory(String catId) =>
    getProductsByCategory(catId)..sort((a, b) => b.reviewCount.compareTo(a.reviewCount));

  static List<ProductModel> getNewArrivalsByCategory(String catId) =>
    getProductsByCategory(catId).reversed.toList();

  static List<ProductModel> searchProducts(String query) =>
    allProducts.where((p) => p.name.toLowerCase().contains(query.toLowerCase()) || p.brand.toLowerCase().contains(query.toLowerCase()) || p.categoryName.toLowerCase().contains(query.toLowerCase())).toList();

  // ── Reviews ───────────────────────────────────────────────────────────
  static List<ProductReview> get sampleReviews => const [
    ProductReview(id: 'r1', userName: 'Rajesh K.', rating: 5, comment: 'Amazing product! Exceeded my expectations. The quality is outstanding and delivery was super fast.', date: '2 days ago'),
    ProductReview(id: 'r2', userName: 'Priya M.', rating: 4, comment: 'Great performance and build quality. Slightly heavy but worth the investment.', date: '1 week ago'),
    ProductReview(id: 'r3', userName: 'David O.', rating: 5, comment: 'Best purchase I have made this year. The battery life is incredible and the camera quality is superb.', date: '2 weeks ago'),
    ProductReview(id: 'r4', userName: 'Sarah L.', rating: 4, comment: 'Very good value for money. Customer service was helpful when I had questions.', date: '3 weeks ago'),
  ];

  // ── Brands ────────────────────────────────────────────────────────────
  static List<BrandModel> get brands => const [
    BrandModel(id: 'b1', name: 'Apple', productCount: 342, rating: 4.8, verified: true, description: 'Premium technology and innovation'),
    BrandModel(id: 'b2', name: 'Samsung', productCount: 567, rating: 4.6, verified: true, description: 'Electronics and mobile leader'),
    BrandModel(id: 'b3', name: 'Nike', productCount: 890, rating: 4.5, verified: true, description: 'Athletic footwear and apparel'),
    BrandModel(id: 'b4', name: 'Sony', productCount: 234, rating: 4.7, verified: true, description: 'Audio, gaming, and entertainment'),
    BrandModel(id: 'b5', name: 'Adidas', productCount: 678, rating: 4.4, verified: true, description: 'Sports performance and lifestyle'),
    BrandModel(id: 'b6', name: 'Dyson', productCount: 89, rating: 4.8, verified: true, description: 'Innovative home technology'),
    BrandModel(id: 'b7', name: 'OnePlus', productCount: 156, rating: 4.5, verified: true, description: 'Never Settle — flagship smartphones'),
    BrandModel(id: 'b8', name: 'Google', productCount: 98, rating: 4.6, verified: true, description: 'Pixel phones and smart home'),
    BrandModel(id: 'b9', name: 'Xiaomi', productCount: 245, rating: 4.4, verified: true, description: 'Innovation for everyone'),
    BrandModel(id: 'b10', name: 'Realme', productCount: 120, rating: 4.3, verified: true, description: 'Dare to leap'),
    BrandModel(id: 'b11', name: 'Oppo', productCount: 110, rating: 4.4, verified: true, description: 'Inspiration ahead'),
    BrandModel(id: 'b12', name: 'Vivo', productCount: 130, rating: 4.3, verified: true, description: 'Camera and music'),
    BrandModel(id: 'b13', name: 'Rolex', productCount: 45, rating: 4.9, verified: true, description: 'Luxury timepieces'),
    BrandModel(id: 'b14', name: 'Casio', productCount: 210, rating: 4.5, verified: true, description: 'Creative watch technology'),
    BrandModel(id: 'b15', name: 'MAC', productCount: 180, rating: 4.6, verified: true, description: 'Professional makeup artistry'),
    BrandModel(id: 'b16', name: 'LEGO', productCount: 340, rating: 4.8, verified: true, description: 'Inspiring builders of tomorrow'),
    BrandModel(id: 'b17', name: 'Puma', productCount: 560, rating: 4.4, verified: true, description: 'Forever faster'),
    BrandModel(id: 'b18', name: 'IKEA', productCount: 890, rating: 4.5, verified: true, description: 'Affordable home furnishing'),
  ];

  /// Get brands relevant to a category
  static List<BrandModel> getBrandsForCategory(String catId) {
    final Map<String, List<String>> categoryBrands = {
      'c1': ['Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi', 'Realme', 'Oppo', 'Vivo'],
      'c2': ['Samsung', 'Sony', 'Apple', 'Google'],
      'c3': ['Apple', 'Dell'],
      'c4': ['Nike', 'Adidas', 'Puma'],
      'c8': ['Nike', 'Adidas', 'Puma'],
      'c9': ['MAC'],
      'c13': ['LEGO'],
      'c20': ['Rolex', 'Casio'],
      'c11': ['IKEA'],
    };
    final names = categoryBrands[catId] ?? [];
    return brands.where((b) => names.contains(b.name)).toList();
  }

  static BrandModel getBrandById(String id) =>
    brands.firstWhere((b) => b.id == id, orElse: () => brands.first);

  static BrandModel getBrandByName(String name) =>
    brands.firstWhere((b) => b.name.toLowerCase() == name.toLowerCase(), orElse: () => brands.first);

  // ── Sellers ───────────────────────────────────────────────────────────
  static List<SellerModel> get sellers => const [
    SellerModel(id: 's1', name: 'Apple India Store', rating: 4.9, productCount: 342, verified: true, since: '2020', location: 'Mumbai, India', followerCount: 125000),
    SellerModel(id: 's2', name: 'Sony Official', rating: 4.8, productCount: 234, verified: true, since: '2019', location: 'Delhi, India', followerCount: 89000),
    SellerModel(id: 's3', name: 'Samsung Store', rating: 4.7, productCount: 567, verified: true, since: '2018', location: 'Bangalore, India', followerCount: 156000),
    SellerModel(id: 's4', name: 'Nike Official', rating: 4.6, productCount: 890, verified: true, since: '2019', location: 'Mumbai, India', followerCount: 234000),
    SellerModel(id: 's5', name: 'Dyson India', rating: 4.8, productCount: 89, verified: true, since: '2021', location: 'Delhi, India', followerCount: 45000),
    SellerModel(id: 's6', name: 'OnePlus Store', rating: 4.5, productCount: 156, verified: true, since: '2020', location: 'Hyderabad, India', followerCount: 98000),
  ];

  static SellerModel getSellerById(String id) =>
    sellers.firstWhere((s) => s.id == id, orElse: () => sellers.first);

  static SellerModel getSellerByName(String name) =>
    sellers.firstWhere((s) => s.name.toLowerCase().contains(name.toLowerCase()), orElse: () => sellers.first);

  // ── Cart ──────────────────────────────────────────────────────────────
  static List<CartItemModel> get mockCart => [
    CartItemModel(id: 'ci1', productId: 'p1', product: getProductById('p1'), variantLabel: 'Black Titanium'),
    CartItemModel(id: 'ci2', productId: 'p2', product: getProductById('p2'), variantLabel: 'Silver'),
    CartItemModel(id: 'ci3', productId: 'p7', product: getProductById('p7'), variantLabel: 'Midnight', quantity: 2),
  ];

  // ── Orders ────────────────────────────────────────────────────────────
  static List<OrderModel> get mockOrders {
    final city = RegionService.instance.lastDetection?.city ?? RegionService.instance.currentCountry.defaultCity;
    final cc = RegionService.instance.currentCountry.callingCode;
    final addr = AddressModel(id: 'a1', label: 'Home', fullAddress: 'Apt 4B, Skyline Apartments', city: city, state: city, pincode: '00100', phone: '$cc 700 123 456', isDefault: true);
    return [
      OrderModel(id: 'KS-2026-78432', status: 'Out for Delivery', paymentStatus: 'Paid', paymentMethod: 'Credit Card', date: 'May 28, 2026', total: 257234, subtotal: 219690, discount: 2000, tax: 39544,
        items: const [
          OrderItemModel(productId: 'p1', productName: 'iPhone 15 Pro Max', productImage: '${_img}1695048133142-1a20484d2569?q=80&w=400&auto=format&fit=crop', sellerName: 'Apple India Store', status: 'Out for Delivery', price: 134900, quantity: 1, variant: 'Black Titanium'),
          OrderItemModel(productId: 'p2', productName: 'Sony WH-1000XM5', productImage: '${_img}1618366712010-f4ae9c647dcb?q=80&w=400&auto=format&fit=crop', sellerName: 'Sony Official', status: 'Out for Delivery', price: 24990, quantity: 1, variant: 'Silver'),
        ],
        address: addr),
      OrderModel(id: 'KS-2026-65210', status: 'Delivered', paymentStatus: 'Paid', paymentMethod: 'UPI', date: 'May 20, 2026', total: 11995,
        items: const [
          OrderItemModel(productId: 'p5', productName: 'Nike Air Max 270', productImage: '${_img}1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop', sellerName: 'Nike Official', status: 'Delivered', price: 11995, quantity: 1),
        ],
        address: addr),
    ];
  }

  static MarketplaceHomeData get homeData => MarketplaceHomeData(
    banners: const [
      PromotionModel(id: 'promo1', title: 'MEGA SALE\nUp to 70% Off', subtitle: 'Electronics, Fashion & More', gradientColors: [Color(0xFF7C3AED), Color(0xFFA855F7)]),
      PromotionModel(id: 'promo2', title: 'NEW ARRIVALS\niPhone 16 Series', subtitle: 'Pre-order now • Free delivery', gradientColors: [AppTheme.textPrimary, AppTheme.textSecondary]),
      PromotionModel(id: 'promo3', title: 'FASHION FEST\nBuy 2 Get 1 Free', subtitle: 'Top brands • Limited time', gradientColors: [Color(0xFFDB2777), Color(0xFFF472B6)]),
    ],
    categories: categories.take(10).toList(),
    dealOfDay: allProducts.where((p) => p.discount >= 10).toList(),
    flashDeals: allProducts.where((p) => p.discount >= 15).toList(),
    trending: allProducts.take(6).toList(),
    bestSellers: [getProductById('p5'), getProductById('p6'), getProductById('p7')],
    newArrivals: allProducts.reversed.take(6).toList(),
    recommended: allProducts.where((p) => p.rating >= 4.5).toList(),
    featuredProducts: allProducts.where((p) => p.rating >= 4.5).take(8).toList(),
    topBrands: brands.take(8).toList(),
    featuredBrands: brands,
    verifiedSellers: sellers,
    recentlyViewed: allProducts.take(4).toList(),

    // ── NEW — 5 missing sections for web parity ──────────────────────────
    trustBadges: const [
      TrustBadge(id: 'tb-1', icon: 'Truck', title: 'Free Delivery', subtitle: 'On orders above ₹499', colorHex: '#2563EB'),
      TrustBadge(id: 'tb-2', icon: 'ShieldCheck', title: 'Secure Payments', subtitle: 'SSL encrypted checkout', colorHex: '#059669'),
      TrustBadge(id: 'tb-3', icon: 'RotateCcw', title: 'Easy Returns', subtitle: '7-day return policy', colorHex: '#EA580C'),
      TrustBadge(id: 'tb-4', icon: 'Headphones', title: '24/7 Support', subtitle: 'Chat, email & phone', colorHex: '#7C3AED'),
      TrustBadge(id: 'tb-5', icon: 'BadgeCheck', title: 'Genuine Products', subtitle: '100% authentic items', colorHex: '#E11D48'),
    ],
    campaignBanners: const [
      CampaignBanner(id: 'cb-1', tag: '🔥 HOT CAMPAIGN', headline: 'Electronics Mega Sale', subheadline: 'Up to 50% off on TVs, laptops & more', cta: 'Explore Deals', ctaHref: '/marketplace/category/electronics', gradient: 'from-emerald-600 to-teal-600'),
      CampaignBanner(id: 'cb-2', tag: '👗 FASHION WEEK', headline: 'Style Your Way', subheadline: 'Top brands from ₹299', cta: 'Shop Fashion', ctaHref: '/marketplace/category/fashion', gradient: 'from-indigo-600 to-purple-600'),
      CampaignBanner(id: 'cb-3', tag: '🏠 HOME FEST', headline: 'Transform Your Space', subheadline: 'Furniture & decor from ₹999', cta: 'Shop Home', ctaHref: '/marketplace/category/home', gradient: 'from-orange-500 via-amber-500 to-yellow-400'),
    ],
    countryBanners: const [
      CountryBanner(id: 'ctb-1', country: 'India', flag: '🇮🇳', headline: 'Shop India\'s Best', subtitle: 'Free delivery on ₹499+', href: '/marketplace?country=IN'),
      CountryBanner(id: 'ctb-2', country: 'UAE', flag: '🇦🇪', headline: 'UAE Exclusive Deals', subtitle: 'Same-day delivery in Dubai', href: '/marketplace?country=AE'),
      CountryBanner(id: 'ctb-3', country: 'Saudi Arabia', flag: '🇸🇦', headline: 'Best Prices in KSA', subtitle: 'Cash on delivery available', href: '/marketplace?country=SA'),
      CountryBanner(id: 'ctb-4', country: 'Qatar', flag: '🇶🇦', headline: 'Qatar Premium Picks', subtitle: 'Express delivery available', href: '/marketplace?country=QA'),
      CountryBanner(id: 'ctb-5', country: 'United Kingdom', flag: '🇬🇧', headline: 'Shop UK Favourites', subtitle: 'Free returns within 30 days', href: '/marketplace?country=GB'),
      CountryBanner(id: 'ctb-6', country: 'Kenya', flag: '🇰🇪', headline: 'Made for Kenya', subtitle: 'M-Pesa checkout supported', href: '/marketplace?country=KE'),
    ],
    brandPromos: {
      'electronics': const [
        BrandPromo(id: 'bp-e1', name: 'Apple', tagline: 'Think Different', discount: 'Up to 25% Off', gradientColors: [AppTheme.textPrimary, Color(0xFF475569)]),
        BrandPromo(id: 'bp-e2', name: 'Samsung', tagline: 'Galaxy of Innovation', discount: 'Up to 35% Off', gradientColors: [Color(0xFF1E3A5F), Color(0xFF2563EB)]),
        BrandPromo(id: 'bp-e3', name: 'Sony', tagline: 'Be Moved', discount: 'Up to 30% Off', gradientColors: [Color(0xFF78350F), Color(0xFFD97706)]),
        BrandPromo(id: 'bp-e4', name: 'OnePlus', tagline: 'Never Settle', discount: 'Up to 20% Off', gradientColors: [Color(0xFF7F1D1D), Color(0xFFDC2626)]),
      ],
      'fashion': const [
        BrandPromo(id: 'bp-f1', name: 'Nike', tagline: 'Just Do It', discount: 'Up to 40% Off', gradientColors: [Color(0xFFEA580C), AppTheme.warningAmber]),
        BrandPromo(id: 'bp-f2', name: 'Adidas', tagline: 'Impossible Is Nothing', discount: 'Up to 35% Off', gradientColors: [AppTheme.textPrimary, Color(0xFF475569)]),
        BrandPromo(id: 'bp-f3', name: 'Zara', tagline: 'Love Your Curves', discount: 'Up to 50% Off', gradientColors: [Color(0xFF9F1239), Color(0xFFEC4899)]),
        BrandPromo(id: 'bp-f4', name: 'H&M', tagline: 'Fashion & Quality', discount: 'Up to 60% Off', gradientColors: [Color(0xFF065F46), Color(0xFF14B8A6)]),
      ],
      'home': const [
        BrandPromo(id: 'bp-h1', name: 'IKEA', tagline: 'Make More of Your Home', discount: 'Up to 30% Off', gradientColors: [Color(0xFF1D4ED8), AppTheme.warningAmber]),
        BrandPromo(id: 'bp-h2', name: 'Dyson', tagline: 'Engineered Better', discount: 'Up to 20% Off', gradientColors: [Color(0xFF4C1D95), Color(0xFF7C3AED)]),
        BrandPromo(id: 'bp-h3', name: 'Philips', tagline: 'Innovation for You', discount: 'Up to 25% Off', gradientColors: [Color(0xFF155E75), Color(0xFF2563EB)]),
        BrandPromo(id: 'bp-h4', name: 'Bosch', tagline: 'Invented for Life', discount: 'Up to 35% Off', gradientColors: [AppTheme.textSecondary, AppTheme.textSecondary]),
      ],
      'beauty': const [
        BrandPromo(id: 'bp-b1', name: 'L\'Oréal', tagline: 'Because You\'re Worth It', discount: 'Up to 30% Off', gradientColors: [Color(0xFFBE185D), Color(0xFFF43F5E)]),
        BrandPromo(id: 'bp-b2', name: 'MAC', tagline: 'All Ages, All Races', discount: 'Up to 25% Off', gradientColors: [AppTheme.textPrimary, Color(0xFF4B5563)]),
        BrandPromo(id: 'bp-b3', name: 'Maybelline', tagline: 'Maybe It\'s Maybelline', discount: 'Up to 40% Off', gradientColors: [Color(0xFFA21CAF), Color(0xFFEC4899)]),
        BrandPromo(id: 'bp-b4', name: 'Nivea', tagline: 'Touch of Care', discount: 'Up to 35% Off', gradientColors: [Color(0xFF1E40AF), AppTheme.marketplaceColor]),
      ],
      'sports': const [
        BrandPromo(id: 'bp-s1', name: 'Puma', tagline: 'Forever Faster', discount: 'Up to 45% Off', gradientColors: [Color(0xFF166534), Color(0xFF059669)]),
        BrandPromo(id: 'bp-s2', name: 'Under Armour', tagline: 'Protect This House', discount: 'Up to 30% Off', gradientColors: [Color(0xFFB91C1C), Color(0xFFF97316)]),
        BrandPromo(id: 'bp-s3', name: 'Reebok', tagline: 'Be More Human', discount: 'Up to 40% Off', gradientColors: [Color(0xFF1D4ED8), Color(0xFF0EA5E9)]),
        BrandPromo(id: 'bp-s4', name: 'Decathlon', tagline: 'Sport for All', discount: 'Up to 50% Off', gradientColors: [Color(0xFF0E7490), Color(0xFF14B8A6)]),
      ],
    },
    faq: const [
      FAQItem(question: 'How do I return a product?', answer: 'You can initiate a return within 7 days of delivery from your order history. Go to Orders → Select Order → Request Return.'),
      FAQItem(question: 'Is Cash on Delivery available?', answer: 'Cash on Delivery is available for most products under ₹50,000. COD availability depends on your location and the seller.'),
      FAQItem(question: 'How long does delivery take?', answer: 'Standard delivery takes 3-7 business days. Express delivery (1-2 days) is available for select products and locations.'),
      FAQItem(question: 'Are all products genuine?', answer: 'All products on KARTSEEK are from verified sellers. We have a strict seller verification process and a 100% authenticity guarantee.'),
      FAQItem(question: 'How do refunds work?', answer: 'Refunds are processed within 5-7 business days after the return is received and inspected. Refund is credited to your original payment method.'),
    ],
  );

  // ── Popular Searches ──────────────────────────────────────────────────
  static List<String> get popularSearches => [
    'iPhone 15', 'Samsung Galaxy', 'Nike shoes', 'MacBook', 'Headphones',
    'Smart TV', 'Jeans', 'Smartwatch', 'Laptop', 'Sneakers',
  ];
}
