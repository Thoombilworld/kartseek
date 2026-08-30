import 'package:flutter/material.dart';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Comprehensive mock data for the Pharmacy module.
/// Provides 15 categories, 12 stores, 60+ products, and utility methods for filtering.
class PharmacyMockData {
  PharmacyMockData._();

  // ── Categories (15) ──────────────────────────────────────────────────────

  static const categories = <PharmacyCategory>[
    PharmacyCategory(id: 'pc01', name: 'Medicines', emoji: '💊', productCount: 45),
    PharmacyCategory(id: 'pc02', name: 'Baby Care', emoji: '🍼', productCount: 18),
    PharmacyCategory(id: 'pc03', name: 'Personal Care', emoji: '🧴', productCount: 22),
    PharmacyCategory(id: 'pc04', name: 'Health Devices', emoji: '🩺', productCount: 14),
    PharmacyCategory(id: 'pc05', name: 'Vitamins & Supplements', emoji: '🧪', productCount: 20),
    PharmacyCategory(id: 'pc06', name: 'First Aid', emoji: '🩹', productCount: 12),
    PharmacyCategory(id: 'pc07', name: 'Skin Care', emoji: '🧖', productCount: 16),
    PharmacyCategory(id: 'pc08', name: 'Hair Care', emoji: '💇', productCount: 10),
    PharmacyCategory(id: 'pc09', name: 'Women\'s Health', emoji: '♀️', productCount: 14),
    PharmacyCategory(id: 'pc10', name: 'Diabetic Care', emoji: '🩸', productCount: 11),
    PharmacyCategory(id: 'pc11', name: 'Orthopedic Support', emoji: '🦴', productCount: 9),
    PharmacyCategory(id: 'pc12', name: 'Elderly Care', emoji: '👴', productCount: 13),
    PharmacyCategory(id: 'pc13', name: 'Wellness Products', emoji: '🧘', productCount: 15),
    PharmacyCategory(id: 'pc14', name: 'Medical Equipment', emoji: '🏥', productCount: 8),
    PharmacyCategory(id: 'pc15', name: 'Prescription Medicines', emoji: '📋', productCount: 30),
    PharmacyCategory(id: 'pc16', name: 'Mother & Baby', emoji: '🤱', productCount: 12),
    PharmacyCategory(id: 'pc17', name: 'Home Healthcare', emoji: '🏠', productCount: 10),
  ];

  // ── Stores (12) ──────────────────────────────────────────────────────────

  static List<PharmacyStore> get stores {
    final city = RegionService.instance.lastDetection?.city ?? RegionService.instance.currentCountry.defaultCity;
    final cc = RegionService.instance.currentCountry.callingCode;
    return <PharmacyStore>[
    PharmacyStore(
      id: 'ps01', name: 'HealthPlus Pharmacy', address: '123 Main Avenue, $city',
      rating: 4.7, ratingCount: 1240, distance: '0.5 km', deliveryTime: '25 min',
      isOpen: true, categoryIds: ['pc01', 'pc02', 'pc03', 'pc05', 'pc06', 'pc15'],
      deliveryFee: 0, minOrder: 500, offerBadge: '25% OFF', verified: true,
      hours: 'Open 24/7', phone: '$cc 712 345 678',
      description: 'Your trusted 24/7 pharmacy — certified medicines, baby care, and wellness products.',
      returnPolicy: '7-day easy returns on unopened products',
    ),
    PharmacyStore(
      id: 'ps02', name: 'Apollo Pharmacy', address: '45 Central Road, $city',
      rating: 4.8, ratingCount: 2100, distance: '1.2 km', deliveryTime: '35 min',
      isOpen: true, categoryIds: ['pc01', 'pc04', 'pc05', 'pc07', 'pc09', 'pc10', 'pc15'],
      deliveryFee: 50, minOrder: 300, offerBadge: 'Free Delivery', verified: true,
      hours: '8 AM – 10 PM', phone: '$cc 722 111 222',
      description: 'Largest pharmacy chain — quality medicines & health products at best prices.',
      returnPolicy: '48-hour return on defective items',
    ),
    PharmacyStore(
      id: 'ps03', name: 'MedPlus Pharmacy', address: '78 Market Street, $city',
      rating: 4.6, ratingCount: 890, distance: '0.8 km', deliveryTime: '20 min',
      isOpen: true, categoryIds: ['pc01', 'pc02', 'pc03', 'pc06', 'pc08', 'pc13'],
      deliveryFee: 0, minOrder: 200, verified: true,
      hours: '7 AM – 11 PM', phone: '$cc 733 444 555',
      description: 'Fast and reliable pharmacy with a wide range of OTC and personal care products.',
      returnPolicy: '5-day returns',
    ),
    PharmacyStore(
      id: 'ps04', name: 'Netmeds Express', address: '15 Commerce Street, $city',
      rating: 4.4, ratingCount: 650, distance: '2.1 km', deliveryTime: '45 min',
      isOpen: false, categoryIds: ['pc01', 'pc05', 'pc07', 'pc09', 'pc13', 'pc15'],
      deliveryFee: 80, minOrder: 400, verified: true,
      hours: '10 AM – 8 PM', phone: '$cc 744 666 777',
      description: 'Online pharmacy with express delivery — vitamins, supplements, and wellness.',
    ),
    PharmacyStore(
      id: 'ps05', name: 'PharmEasy Store', address: '200 Park Road, $city',
      rating: 4.5, ratingCount: 1560, distance: '1.8 km', deliveryTime: '30 min',
      isOpen: true, categoryIds: ['pc01', 'pc02', 'pc04', 'pc10', 'pc11', 'pc12', 'pc14'],
      deliveryFee: 0, minOrder: 350, offerBadge: '15% OFF', verified: true,
      hours: '9 AM – 10 PM', phone: '$cc 755 888 999',
      description: 'Comprehensive pharmacy — diabetic care, orthopedic support, and medical equipment.',
      returnPolicy: '7-day returns on sealed products',
    ),
    PharmacyStore(
      id: 'ps06', name: 'LifeCare Pharmacy', address: '55 Highway Drive, $city',
      rating: 4.7, ratingCount: 980, distance: '2.0 km', deliveryTime: '40 min',
      isOpen: true, categoryIds: ['pc01', 'pc03', 'pc05', 'pc08', 'pc09', 'pc13'],
      deliveryFee: 60, minOrder: 250, verified: true,
      hours: '7 AM – 11 PM', phone: '$cc 766 000 111',
      description: 'Premium pharmacy with expert pharmacists — personal care and supplements.',
    ),
    PharmacyStore(
      id: 'ps07', name: 'CarePharm Plus', address: '88 South Road, $city',
      rating: 4.3, ratingCount: 420, distance: '3.2 km', deliveryTime: '50 min',
      isOpen: true, categoryIds: ['pc01', 'pc02', 'pc06', 'pc11', 'pc12', 'pc14'],
      deliveryFee: 100, minOrder: 500, offerBadge: 'New', verified: false,
      hours: '8 AM – 9 PM', phone: '$cc 777 222 333',
      description: 'Specialized in elderly care, orthopedic support, and medical equipment.',
    ),
    PharmacyStore(
      id: 'ps08', name: 'WellBeing Pharmacy', address: '12 Valley Road, $city',
      rating: 4.9, ratingCount: 2340, distance: '0.3 km', deliveryTime: '15 min',
      isOpen: true, categoryIds: ['pc01', 'pc03', 'pc05', 'pc07', 'pc08', 'pc13'],
      deliveryFee: 0, minOrder: 150, offerBadge: 'Top Rated', verified: true,
      hours: 'Open 24/7', phone: '$cc 788 444 555',
      description: 'Closest pharmacy to you — 15-minute delivery with premium wellness products.',
      returnPolicy: '10-day easy returns',
    ),
    PharmacyStore(
      id: 'ps09', name: 'BabyMed Pharmacy', address: '34 Residential Area, $city',
      rating: 4.6, ratingCount: 780, distance: '1.5 km', deliveryTime: '30 min',
      isOpen: true, categoryIds: ['pc02', 'pc03', 'pc09'],
      deliveryFee: 0, minOrder: 300, offerBadge: 'Baby Sale', verified: true,
      hours: '8 AM – 10 PM', phone: '$cc 799 666 777',
      description: 'Specialized in baby care, women\'s health, and personal care products.',
    ),
    PharmacyStore(
      id: 'ps10', name: 'DiaCare Hub', address: '67 Business District, $city',
      rating: 4.5, ratingCount: 540, distance: '2.5 km', deliveryTime: '35 min',
      isOpen: true, categoryIds: ['pc04', 'pc10', 'pc11', 'pc12', 'pc14'],
      deliveryFee: 50, minOrder: 400, verified: true,
      hours: '9 AM – 9 PM', phone: '$cc 700 888 999',
      description: 'Specialized diabetic care, glucose monitors, and orthopedic supports.',
    ),
    PharmacyStore(
      id: 'ps11', name: 'GreenLeaf Wellness', address: '90 Garden Estate, $city',
      rating: 4.4, ratingCount: 320, distance: '4.0 km', deliveryTime: '55 min',
      isOpen: true, categoryIds: ['pc05', 'pc07', 'pc08', 'pc13'],
      deliveryFee: 120, minOrder: 600, verified: true,
      hours: '10 AM – 8 PM', phone: '$cc 711 000 111',
      description: 'Organic wellness, herbal supplements, and natural skin & hair care products.',
    ),
    PharmacyStore(
      id: 'ps12', name: 'QuickMeds 24h', address: '5 CBD, $city',
      rating: 4.2, ratingCount: 290, distance: '0.7 km', deliveryTime: '18 min',
      isOpen: true, categoryIds: ['pc01', 'pc06', 'pc15'],
      deliveryFee: 0, minOrder: 100, verified: true,
      hours: 'Open 24/7', phone: '$cc 722 333 444',
      description: 'Ultra-fast delivery — essential medicines and first aid, available 24/7.',
    ),
  ];
  }

  // ── Products (60+) ────────────────────────────────────────────────────────

  static const products = <PharmacyProduct>[
    // ── Medicines (pc01) ──
    PharmacyProduct(id: 'pm01', name: 'Paracetamol 500mg', brand: 'Dolo', price: 25, mrp: 32, pack: 'Strip of 15', storeId: 'ps01', categoryId: 'pc01', discount: 22),
    PharmacyProduct(id: 'pm02', name: 'Cetirizine 10mg', brand: 'Zyrtec', price: 45, mrp: 55, pack: 'Strip of 10', storeId: 'ps01', categoryId: 'pc01', discount: 18),
    PharmacyProduct(id: 'pm03', name: 'Ibuprofen 400mg', brand: 'Brufen', price: 35, mrp: 42, pack: 'Strip of 10', storeId: 'ps02', categoryId: 'pc01', discount: 17),
    PharmacyProduct(id: 'pm04', name: 'Antacid Gel', brand: 'Digene', price: 85, mrp: 100, pack: '200ml', storeId: 'ps03', categoryId: 'pc01', discount: 15),
    PharmacyProduct(id: 'pm05', name: 'Cough Syrup', brand: 'Benadryl', price: 65, mrp: 80, pack: '100ml', storeId: 'ps08', categoryId: 'pc01', discount: 19),

    // ── Baby Care (pc02) ──
    PharmacyProduct(id: 'pm06', name: 'Baby Diaper Pants (L)', brand: 'Pampers', price: 450, mrp: 550, pack: 'Pack of 30', storeId: 'ps09', categoryId: 'pc02', discount: 18),
    PharmacyProduct(id: 'pm07', name: 'Baby Lotion', brand: 'Johnson\'s', price: 180, mrp: 220, pack: '200ml', storeId: 'ps09', categoryId: 'pc02', discount: 18),
    PharmacyProduct(id: 'pm08', name: 'Gripe Water', brand: 'Woodward\'s', price: 95, mrp: 120, pack: '130ml', storeId: 'ps01', categoryId: 'pc02', discount: 21),
    PharmacyProduct(id: 'pm09', name: 'Baby Shampoo', brand: 'Himalaya', price: 130, mrp: 160, pack: '200ml', storeId: 'ps03', categoryId: 'pc02', discount: 19),

    // ── Personal Care (pc03) ──
    PharmacyProduct(id: 'pm10', name: 'Hand Sanitizer', brand: 'Dettol', price: 75, mrp: 90, pack: '200ml', storeId: 'ps01', categoryId: 'pc03', discount: 17),
    PharmacyProduct(id: 'pm11', name: 'Oral Care Kit', brand: 'Colgate', price: 210, mrp: 250, pack: 'Kit', storeId: 'ps06', categoryId: 'pc03', discount: 16),
    PharmacyProduct(id: 'pm12', name: 'Body Wash', brand: 'Dove', price: 195, mrp: 240, pack: '250ml', storeId: 'ps08', categoryId: 'pc03', discount: 19),
    PharmacyProduct(id: 'pm13', name: 'Face Wash', brand: 'Cetaphil', price: 320, mrp: 380, pack: '125ml', storeId: 'ps03', categoryId: 'pc03', discount: 16),

    // ── Health Devices (pc04) ──
    PharmacyProduct(id: 'pm14', name: 'Digital Thermometer', brand: 'Omron', price: 350, mrp: 450, pack: '1 Unit', storeId: 'ps02', categoryId: 'pc04', discount: 22),
    PharmacyProduct(id: 'pm15', name: 'BP Monitor', brand: 'Omron', price: 1800, mrp: 2200, pack: '1 Unit', storeId: 'ps05', categoryId: 'pc04', discount: 18),
    PharmacyProduct(id: 'pm16', name: 'Pulse Oximeter', brand: 'Dr. Trust', price: 950, mrp: 1200, pack: '1 Unit', storeId: 'ps10', categoryId: 'pc04', discount: 21),
    PharmacyProduct(id: 'pm17', name: 'Nebulizer', brand: 'Philips', price: 2400, mrp: 3000, pack: '1 Unit', storeId: 'ps10', categoryId: 'pc04', discount: 20),

    // ── Vitamins & Supplements (pc05) ──
    PharmacyProduct(id: 'pm18', name: 'Vitamin C 1000mg', brand: 'Celin', price: 65, mrp: 80, pack: 'Tube of 10', storeId: 'ps01', categoryId: 'pc05', discount: 19),
    PharmacyProduct(id: 'pm19', name: 'Multivitamin', brand: 'Centrum', price: 480, mrp: 580, pack: 'Jar of 30', storeId: 'ps02', categoryId: 'pc05', discount: 17),
    PharmacyProduct(id: 'pm20', name: 'Omega 3 Fish Oil', brand: 'HealthVit', price: 350, mrp: 420, pack: '60 Softgels', storeId: 'ps06', categoryId: 'pc05', discount: 17),
    PharmacyProduct(id: 'pm21', name: 'Calcium + D3', brand: 'Shelcal', price: 220, mrp: 280, pack: 'Strip of 15', storeId: 'ps08', categoryId: 'pc05', discount: 21),
    PharmacyProduct(id: 'pm22', name: 'Iron Supplement', brand: 'Livogen', price: 145, mrp: 180, pack: 'Strip of 10', storeId: 'ps11', categoryId: 'pc05', discount: 19),

    // ── First Aid (pc06) ──
    PharmacyProduct(id: 'pm23', name: 'Bandage Roll', brand: 'Hansaplast', price: 55, mrp: 70, pack: '4m x 8cm', storeId: 'ps01', categoryId: 'pc06', discount: 21),
    PharmacyProduct(id: 'pm24', name: 'Antiseptic Cream', brand: 'Betadine', price: 85, mrp: 100, pack: '15g Tube', storeId: 'ps03', categoryId: 'pc06', discount: 15),
    PharmacyProduct(id: 'pm25', name: 'First Aid Kit', brand: 'Johnson & Johnson', price: 550, mrp: 680, pack: 'Complete Kit', storeId: 'ps12', categoryId: 'pc06', discount: 19),
    PharmacyProduct(id: 'pm26', name: 'Cotton Pads', brand: 'Softouch', price: 40, mrp: 50, pack: 'Pack of 50', storeId: 'ps07', categoryId: 'pc06', discount: 20),

    // ── Skin Care (pc07) ──
    PharmacyProduct(id: 'pm27', name: 'Moisturizer SPF 30', brand: 'Lacto Calamine', price: 175, mrp: 210, pack: '60ml', storeId: 'ps02', categoryId: 'pc07', discount: 17),
    PharmacyProduct(id: 'pm28', name: 'Sunscreen SPF 50', brand: 'La Shield', price: 380, mrp: 450, pack: '50g', storeId: 'ps06', categoryId: 'pc07', discount: 16),
    PharmacyProduct(id: 'pm29', name: 'Aloe Vera Gel', brand: 'Patanjali', price: 85, mrp: 100, pack: '150ml', storeId: 'ps08', categoryId: 'pc07', discount: 15),
    PharmacyProduct(id: 'pm30', name: 'Anti-Acne Cream', brand: 'Benzac', price: 220, mrp: 260, pack: '20g', storeId: 'ps11', categoryId: 'pc07', discount: 15),

    // ── Hair Care (pc08) ──
    PharmacyProduct(id: 'pm31', name: 'Anti-Dandruff Shampoo', brand: 'Head & Shoulders', price: 195, mrp: 240, pack: '340ml', storeId: 'ps03', categoryId: 'pc08', discount: 19),
    PharmacyProduct(id: 'pm32', name: 'Hair Oil', brand: 'Indulekha', price: 380, mrp: 450, pack: '100ml', storeId: 'ps06', categoryId: 'pc08', discount: 16),
    PharmacyProduct(id: 'pm33', name: 'Biotin Tablets', brand: 'OZiva', price: 450, mrp: 550, pack: '60 Tabs', storeId: 'ps11', categoryId: 'pc08', discount: 18),

    // ── Women's Health (pc09) ──
    PharmacyProduct(id: 'pm34', name: 'Iron + Folic Acid', brand: 'Feosol', price: 165, mrp: 200, pack: 'Strip of 30', storeId: 'ps02', categoryId: 'pc09', discount: 18),
    PharmacyProduct(id: 'pm35', name: 'Prenatal Vitamins', brand: 'Elevit', price: 520, mrp: 650, pack: '30 Tabs', storeId: 'ps09', categoryId: 'pc09', discount: 20),
    PharmacyProduct(id: 'pm36', name: 'Menstrual Cup', brand: 'Sirona', price: 350, mrp: 450, pack: '1 Unit', storeId: 'ps06', categoryId: 'pc09', discount: 22),
    PharmacyProduct(id: 'pm37', name: 'Hot Water Bottle', brand: 'Dr. Morepen', price: 250, mrp: 320, pack: '1 Unit', storeId: 'ps04', categoryId: 'pc09', discount: 22),

    // ── Diabetic Care (pc10) ──
    PharmacyProduct(id: 'pm38', name: 'Glucometer Kit', brand: 'Accu-Chek', price: 900, mrp: 1100, pack: '1 Kit', storeId: 'ps10', categoryId: 'pc10', discount: 18),
    PharmacyProduct(id: 'pm39', name: 'Test Strips (50)', brand: 'OneTouch', price: 750, mrp: 900, pack: 'Pack of 50', storeId: 'ps10', categoryId: 'pc10', discount: 17),
    PharmacyProduct(id: 'pm40', name: 'Sugar Free Sweetener', brand: 'Sugar Free', price: 120, mrp: 150, pack: '100 Pellets', storeId: 'ps05', categoryId: 'pc10', discount: 20),
    PharmacyProduct(id: 'pm41', name: 'Diabetic Socks', brand: 'Dyna', price: 280, mrp: 350, pack: '1 Pair', storeId: 'ps02', categoryId: 'pc10', discount: 20),

    // ── Orthopedic Support (pc11) ──
    PharmacyProduct(id: 'pm42', name: 'Knee Cap Support', brand: 'Tynor', price: 420, mrp: 520, pack: '1 Pair', storeId: 'ps05', categoryId: 'pc11', discount: 19),
    PharmacyProduct(id: 'pm43', name: 'Back Support Belt', brand: 'Flamingo', price: 650, mrp: 800, pack: '1 Unit', storeId: 'ps07', categoryId: 'pc11', discount: 19),
    PharmacyProduct(id: 'pm44', name: 'Wrist Splint', brand: 'Tynor', price: 350, mrp: 430, pack: '1 Unit', storeId: 'ps10', categoryId: 'pc11', discount: 19),

    // ── Elderly Care (pc12) ──
    PharmacyProduct(id: 'pm45', name: 'Adult Diapers (L)', brand: 'Friends', price: 380, mrp: 450, pack: 'Pack of 10', storeId: 'ps07', categoryId: 'pc12', discount: 16),
    PharmacyProduct(id: 'pm46', name: 'Walking Stick', brand: 'Pedder', price: 550, mrp: 700, pack: 'Adjustable', storeId: 'ps05', categoryId: 'pc12', discount: 21),
    PharmacyProduct(id: 'pm47', name: 'Denture Adhesive', brand: 'Fixodent', price: 280, mrp: 340, pack: '40g', storeId: 'ps07', categoryId: 'pc12', discount: 18),
    PharmacyProduct(id: 'pm48', name: 'Pill Organizer', brand: 'MedPlus', price: 120, mrp: 150, pack: '7-day', storeId: 'ps10', categoryId: 'pc12', discount: 20),

    // ── Wellness Products (pc13) ──
    PharmacyProduct(id: 'pm49', name: 'Protein Powder', brand: 'Ensure', price: 720, mrp: 850, pack: '400g', storeId: 'ps06', categoryId: 'pc13', discount: 15),
    PharmacyProduct(id: 'pm50', name: 'Immunity Booster', brand: 'Chyawanprash', price: 280, mrp: 350, pack: '500g', storeId: 'ps08', categoryId: 'pc13', discount: 20),
    PharmacyProduct(id: 'pm51', name: 'Tulsi Drops', brand: 'Organic India', price: 180, mrp: 220, pack: '30ml', storeId: 'ps11', categoryId: 'pc13', discount: 18),
    PharmacyProduct(id: 'pm52', name: 'Ashwagandha Capsules', brand: 'Himalaya', price: 220, mrp: 280, pack: '60 Caps', storeId: 'ps04', categoryId: 'pc13', discount: 21),

    // ── Medical Equipment (pc14) ──
    PharmacyProduct(id: 'pm53', name: 'Wheelchair', brand: 'Karma', price: 8500, mrp: 10000, pack: '1 Unit', storeId: 'ps10', categoryId: 'pc14', discount: 15),
    PharmacyProduct(id: 'pm54', name: 'Cervical Pillow', brand: 'Flamingo', price: 650, mrp: 800, pack: '1 Unit', storeId: 'ps07', categoryId: 'pc14', discount: 19),
    PharmacyProduct(id: 'pm55', name: 'Vaporizer', brand: 'Dr. Morepen', price: 480, mrp: 600, pack: '1 Unit', storeId: 'ps05', categoryId: 'pc14', discount: 20),

    // ── Prescription Medicines (pc15) ──
    PharmacyProduct(id: 'pm56', name: 'Amoxicillin 250mg', brand: 'Amoxil', price: 85, mrp: 110, pack: 'Strip of 10', needsRx: true, storeId: 'ps01', categoryId: 'pc15', discount: 23),
    PharmacyProduct(id: 'pm57', name: 'Metformin 500mg', brand: 'Glycomet', price: 32, mrp: 45, pack: 'Strip of 20', needsRx: true, storeId: 'ps02', categoryId: 'pc15', discount: 29),
    PharmacyProduct(id: 'pm58', name: 'Atorvastatin 10mg', brand: 'Lipitor', price: 120, mrp: 150, pack: 'Strip of 10', needsRx: true, storeId: 'ps04', categoryId: 'pc15', discount: 20),
    PharmacyProduct(id: 'pm59', name: 'Amlodipine 5mg', brand: 'Norvasc', price: 55, mrp: 70, pack: 'Strip of 10', needsRx: true, storeId: 'ps12', categoryId: 'pc15', discount: 21),
    PharmacyProduct(id: 'pm60', name: 'Metoprolol 50mg', brand: 'Betaloc', price: 68, mrp: 85, pack: 'Strip of 14', needsRx: true, storeId: 'ps01', categoryId: 'pc15', discount: 20),
    PharmacyProduct(id: 'pm61', name: 'Losartan 50mg', brand: 'Cozaar', price: 95, mrp: 120, pack: 'Strip of 10', needsRx: true, inStock: false, storeId: 'ps02', categoryId: 'pc15', discount: 21),
  ];

  // ── Banners ───────────────────────────────────────────────────────────────

  static const banners = <PharmacyBanner>[
    PharmacyBanner(
      title: 'Flat 25% OFF', subtitle: 'On all OTC medicines this week',
      gradientColors: [Color(0xFF0E7490), Color(0xFF06B6D4)], code: 'PHARMA25',
    ),
    PharmacyBanner(
      title: 'Free Delivery', subtitle: 'Orders above ₹499',
      gradientColors: [Color(0xFF6D28D9), Color(0xFF8B5CF6)], code: 'AUTO-APPLIED',
    ),
    PharmacyBanner(
      title: 'Baby Care Sale', subtitle: 'Up to 30% off on Baby Products',
      gradientColors: [Color(0xFFDB2777), Color(0xFFF472B6)], code: 'BABYCARE',
    ),
  ];

  // ── Home Data ─────────────────────────────────────────────────────────────

  static PharmacyHomeData get homeData {
    final sorted = List<PharmacyStore>.from(stores);
    return PharmacyHomeData(
      categories: categories,
      allStores: stores,
      nearbyStores: sorted.where((s) => s.isOpen).toList()
        ..sort((a, b) => double.parse(a.distance.replaceAll(' km', ''))
            .compareTo(double.parse(b.distance.replaceAll(' km', '')))),
      topRatedStores: sorted.where((s) => s.rating >= 4.5).toList()
        ..sort((a, b) => b.rating.compareTo(a.rating)),
      fastDeliveryStores: sorted.where((s) => s.isOpen).toList()
        ..sort((a, b) => int.parse(a.deliveryTime.replaceAll(' min', ''))
            .compareTo(int.parse(b.deliveryTime.replaceAll(' min', '')))),
      featuredStores: sorted.where((s) => s.verified && s.isOpen).take(6).toList(),
      popularProducts: products.where((p) => !p.needsRx && p.inStock).take(10).toList(),
      banners: banners,
    );
  }

  // ── Utility Methods ───────────────────────────────────────────────────────

  /// Get all stores that serve a given category.
  static List<PharmacyStore> getStoresByCategory(String categoryId) {
    return stores.where((s) => s.categoryIds.contains(categoryId)).toList();
  }

  /// Get all products for a given store.
  static List<PharmacyProduct> getProductsByStore(String storeId) {
    return products.where((p) => p.storeId == storeId).toList();
  }

  /// Get all products for a given category.
  static List<PharmacyProduct> getProductsByCategory(String categoryId) {
    return products.where((p) => p.categoryId == categoryId).toList();
  }

  /// Get products for a given store and category.
  static List<PharmacyProduct> getProductsByStoreAndCategory(String storeId, String categoryId) {
    return products.where((p) => p.storeId == storeId && p.categoryId == categoryId).toList();
  }

  /// Get a store by name.
  static PharmacyStore getStoreByName(String name) {
    return stores.firstWhere(
      (s) => s.name.toLowerCase() == name.toLowerCase(),
      orElse: () => stores.first,
    );
  }

  /// Get a product by name.
  static PharmacyProduct getProductByName(String name) {
    return products.firstWhere(
      (p) => p.name.toLowerCase() == name.toLowerCase(),
      orElse: () => products.first,
    );
  }

  /// All products across all stores.
  static List<PharmacyProduct> get allProducts => products;

  // ── Mock Prescriptions ─────────────────────────────────────────────────────

  static List<PharmacyPrescription> get prescriptions => [
    PharmacyPrescription(
      id: 'rx-001', customerId: 'user-1', storeId: 'ps01',
      patientName: 'John Doe', patientAge: 34,
      fileUrl: 'https://example.com/rx/001.jpg',
      status: 'VERIFIED_APPROVED',
      extractedMedicines: ['Augmentin 625 Duo', 'Dolo 650mg'],
      pharmacistNotes: 'Verified by Dr. Sarah, Apollo Pharmacy',
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
      verifiedAt: DateTime.now().subtract(const Duration(days: 4)),
    ),
    PharmacyPrescription(
      id: 'rx-002', customerId: 'user-1', storeId: 'ps02',
      patientName: 'John Doe', patientAge: 34,
      fileUrl: 'https://example.com/rx/002.jpg',
      status: 'PENDING_VERIFICATION',
      extractedMedicines: ['Metformin 500mg', 'Glimepiride 2mg'],
      createdAt: DateTime.now().subtract(const Duration(hours: 6)),
    ),
    PharmacyPrescription(
      id: 'rx-003', customerId: 'user-1', storeId: 'ps03',
      patientName: 'Jane Doe', patientAge: 28,
      fileUrl: 'https://example.com/rx/003.jpg',
      status: 'VERIFIED_REJECTED',
      extractedMedicines: ['Unknown'],
      rejectionReason: 'Image is blurry. Please re-upload a clearer copy.',
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      verifiedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

  // ── Mock Orders ────────────────────────────────────────────────────────────

  static List<PharmacyOrder> get orders {
    return [
      PharmacyOrder(
        id: 'po-001', orderNumber: 'PH-20260101-001',
        status: 'DELIVERED', storeId: 'ps01', storeName: 'HealthPlus Pharmacy',
        items: [
          const PharmacyOrderItem(itemId: 'med-01', name: 'Crocin Advance 500mg', quantity: 2, price: 45),
          const PharmacyOrderItem(itemId: 'med-03', name: 'Augmentin 625 Duo', quantity: 1, price: 320, requiresPrescription: true),
        ],
        itemTotal: 410, deliveryFee: 0, discount: 50, grandTotal: 360,
        paymentMethod: 'M-Pesa', paymentStatus: 'PAID', requiresPrescription: true,
        prescriptionId: 'rx-001', estimatedDelivery: '25 min',
        createdAt: DateTime.now().subtract(const Duration(days: 7)),
        deliveredAt: DateTime.now().subtract(const Duration(days: 7, hours: -1)),
      ),
      PharmacyOrder(
        id: 'po-002', orderNumber: 'PH-20260102-002',
        status: 'OUT_FOR_DELIVERY', storeId: 'ps02', storeName: 'Apollo Pharmacy',
        items: [
          const PharmacyOrderItem(itemId: 'med-05', name: 'Vitamin D3 60K IU', quantity: 4, price: 120),
          const PharmacyOrderItem(itemId: 'med-08', name: 'Cetirizine 10mg', quantity: 1, price: 30),
        ],
        itemTotal: 510, deliveryFee: 25, discount: 0, grandTotal: 535,
        paymentMethod: 'Card', paymentStatus: 'PAID',
        estimatedDelivery: '15 min',
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      PharmacyOrder(
        id: 'po-003', orderNumber: 'PH-20260103-003',
        status: 'PENDING', storeId: 'ps03', storeName: 'MedPlus Pharmacy',
        items: [
          const PharmacyOrderItem(itemId: 'med-10', name: 'Metformin 500mg', quantity: 2, price: 85, requiresPrescription: true),
        ],
        itemTotal: 170, deliveryFee: 0, discount: 25, grandTotal: 145,
        paymentMethod: 'COD', paymentStatus: 'PENDING', requiresPrescription: true,
        prescriptionId: 'rx-002',
        createdAt: DateTime.now().subtract(const Duration(minutes: 30)),
      ),
    ];
  }

  // ── Mock Reviews ───────────────────────────────────────────────────────────

  static List<PharmacyReview> get reviews => [
    PharmacyReview(id: 'rev-01', storeId: 'ps01', customerId: 'u1', customerName: 'Priya S.', rating: 5, comment: 'Fastest delivery in the area. Medicines always genuine.', createdAt: DateTime.now().subtract(const Duration(days: 3))),
    PharmacyReview(id: 'rev-02', storeId: 'ps01', customerId: 'u2', customerName: 'Amit G.', rating: 4, comment: 'Good pharmacy, but sometimes out of stock on rare medicines.', createdAt: DateTime.now().subtract(const Duration(days: 10))),
    PharmacyReview(id: 'rev-03', storeId: 'ps02', customerId: 'u3', customerName: 'Sarah K.', rating: 5, comment: 'Excellent prescription verification process. Very professional.', reply: 'Thank you Sarah! We take Rx verification very seriously.', createdAt: DateTime.now().subtract(const Duration(days: 5))),
    PharmacyReview(id: 'rev-04', storeId: 'ps01', customerId: 'u4', customerName: 'Rohit M.', rating: 3, comment: 'Delivery was a bit late but the pharmacist was helpful.', createdAt: DateTime.now().subtract(const Duration(days: 15))),
  ];

  // ── Mock Offers ────────────────────────────────────────────────────────────

  static List<PharmacyOffer> get offers => [
    PharmacyOffer(id: 'of-01', title: 'Flat 25% OFF on First Order', code: 'PHARMA25', type: 'PERCENTAGE', value: 25, minOrderAmount: 299, maxDiscountAmount: 200, expiresAt: DateTime.now().add(const Duration(days: 30))),
    PharmacyOffer(id: 'of-02', title: 'Free Delivery on Orders Above 500', code: 'FREEDEL', type: 'FREE_DELIVERY', value: 0, minOrderAmount: 500, expiresAt: DateTime.now().add(const Duration(days: 60))),
    PharmacyOffer(id: 'of-03', title: '₹100 OFF on Prescription Orders', code: 'RX100', type: 'FLAT', value: 100, minOrderAmount: 399, storeId: 'ps02', storeName: 'Apollo Pharmacy', expiresAt: DateTime.now().add(const Duration(days: 15))),
    PharmacyOffer(id: 'of-04', title: '15% OFF on Vitamins & Supplements', code: 'VIT15', type: 'PERCENTAGE', value: 15, minOrderAmount: 199, maxDiscountAmount: 150, expiresAt: DateTime.now().add(const Duration(days: 45))),
    PharmacyOffer(id: 'of-05', title: 'Buy 2 Get 1 Free on Baby Care', code: 'BABY21', type: 'BUY_GET', value: 0, minOrderAmount: 0, expiresAt: DateTime.now().add(const Duration(days: 20))),
  ];

  // ── Mock Brands ────────────────────────────────────────────────────────────

  static List<PharmacyBrand> get brands => const [
    PharmacyBrand(name: 'Abbott', productCount: 34),
    PharmacyBrand(name: 'Bayer', productCount: 22),
    PharmacyBrand(name: 'Cipla', productCount: 48),
    PharmacyBrand(name: 'Dr. Reddy\'s', productCount: 31),
    PharmacyBrand(name: 'GlaxoSmithKline', productCount: 26),
    PharmacyBrand(name: 'Himalaya', productCount: 18),
    PharmacyBrand(name: 'Ipca', productCount: 15),
    PharmacyBrand(name: 'Johnson & Johnson', productCount: 12),
    PharmacyBrand(name: 'Lupin', productCount: 20),
    PharmacyBrand(name: 'Mankind', productCount: 25),
    PharmacyBrand(name: 'Nestle', productCount: 8),
    PharmacyBrand(name: 'Pfizer', productCount: 19),
    PharmacyBrand(name: 'Ranbaxy', productCount: 17),
    PharmacyBrand(name: 'Sun Pharma', productCount: 38),
    PharmacyBrand(name: 'Torrent', productCount: 14),
    PharmacyBrand(name: 'USV', productCount: 11),
    PharmacyBrand(name: 'Wockhardt', productCount: 9),
    PharmacyBrand(name: 'Zydus', productCount: 16),
  ];

  // ── Mock Delivery Slots ────────────────────────────────────────────────────

  static List<DeliverySlot> get deliverySlots => const [
    DeliverySlot(id: 'slot-express', label: 'Express', timeRange: '30–45 min', isExpress: true, extraFee: 49),
    DeliverySlot(id: 'slot-morning', label: 'Morning', timeRange: '8:00 AM – 11:00 AM'),
    DeliverySlot(id: 'slot-afternoon', label: 'Afternoon', timeRange: '12:00 PM – 3:00 PM'),
    DeliverySlot(id: 'slot-evening', label: 'Evening', timeRange: '4:00 PM – 7:00 PM'),
    DeliverySlot(id: 'slot-night', label: 'Night', timeRange: '8:00 PM – 10:00 PM'),
    DeliverySlot(id: 'slot-next-morning', label: 'Next Day Morning', timeRange: 'Tomorrow 8:00 AM – 11:00 AM'),
  ];
}
