/**
 * KARTSEEK — Grocery Seller Portal Mock Data
 * Multi-country sample data for development and demo.
 */
import type {
  GroceryOrder, GroceryProduct, Campaign, PayoutRecord,
  WalletSummary, SellerAnalytics, StoreConfig, SellerProfile,
} from './types';

// ─── Mock Store Config ───────────────────────────────────────────────────────

export const MOCK_STORE: StoreConfig = {
  id: 'store-001', sellerId: 'seller-001', storeName: 'FreshMart Supermarket',
  storeSlug: 'freshmart-supermarket', storeType: 'supermarket',
  description: 'Your neighborhood supermarket offering fresh vegetables, dairy products, and daily household essentials.',
  countryCode: 'IN', city: 'Mumbai', state: 'Maharashtra',
  fullAddress: 'Ground Floor, Hiranandani Complex, Powai, Mumbai 400076',
  latitude: 19.1196, longitude: 72.9051,
  deliveryMode: 'both', deliveryRadiusKm: 10, minimumOrderValue: 199,
  preparationTimeMinutes: 15, storeStatus: 'open', rating: 4.7, totalRatings: 2840, totalOrders: 18420,
  operatingHours: [
    { day: 'Monday', open: '07:00', close: '22:00', isClosed: false },
    { day: 'Tuesday', open: '07:00', close: '22:00', isClosed: false },
    { day: 'Wednesday', open: '07:00', close: '22:00', isClosed: false },
    { day: 'Thursday', open: '07:00', close: '22:00', isClosed: false },
    { day: 'Friday', open: '07:00', close: '22:00', isClosed: false },
    { day: 'Saturday', open: '08:00', close: '23:00', isClosed: false },
    { day: 'Sunday', open: '08:00', close: '21:00', isClosed: false },
  ],
  holidays: [{ date: '2026-08-15', reason: 'Independence Day', isClosed: true }],
  branches: [
    { id: 'br-1', name: 'Powai Main', address: 'Hiranandani Complex, Powai', city: 'Mumbai', latitude: 19.1196, longitude: 72.9051, phone: '+91 22 1234 5678', isActive: true },
    { id: 'br-2', name: 'Andheri Branch', address: 'Lokhandwala Complex, Andheri West', city: 'Mumbai', latitude: 19.1368, longitude: 72.8270, phone: '+91 22 8765 4321', isActive: true },
  ],
  primaryLanguage: 'en', secondaryLanguage: 'hi',
};

// ─── Mock Orders ─────────────────────────────────────────────────────────────

export const MOCK_ORDERS: GroceryOrder[] = [
  {
    id: 'GRO-9001', sellerId: 'seller-001', storeId: 'store-001', countryCode: 'IN',
    customerName: 'Rahul Sharma', customerPhone: '+91 98765 XXXXX', customerAddress: 'B-204, Raheja Residency, Powai',
    items: [
      { productId: 'p1', productName: 'Aashirvaad Atta 5kg', variant: '5kg', quantity: 1, unitPrice: 250, total: 250, isSubstituted: false, isOutOfStock: false },
      { productId: 'p2', productName: 'Amul Milk 1L', variant: '1L', quantity: 2, unitPrice: 68, total: 136, isSubstituted: false, isOutOfStock: false },
      { productId: 'p3', productName: 'Fresh Tomatoes', variant: '1kg', quantity: 1, unitPrice: 40, total: 40, isSubstituted: false, isOutOfStock: false },
    ],
    orderType: 'delivery', status: 'new', subtotal: 426, deliveryFee: 25, taxAmount: 0, discount: 0, total: 451,
    placedAt: new Date(Date.now() - 120000).toISOString(), slaDeadlineMinutes: 30, slaRemainingMinutes: 28,
    paymentMethod: 'UPI', paymentStatus: 'paid', invoiceNumber: 'INV-GRO-9001',
    hasSubstitution: false, isPartialFulfilment: false, createdAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'GRO-9002', sellerId: 'seller-001', storeId: 'store-001', countryCode: 'IN',
    customerName: 'Priya Desai', customerPhone: '+91 87654 XXXXX', customerAddress: 'Flat 12, Orchid Tower, Andheri',
    items: [
      { productId: 'p4', productName: 'Tata Salt 1kg', variant: '1kg', quantity: 2, unitPrice: 24, total: 48, isSubstituted: false, isOutOfStock: false },
      { productId: 'p5', productName: 'India Gate Rice 5kg', variant: '5kg', quantity: 1, unitPrice: 650, total: 650, isSubstituted: false, isOutOfStock: false },
      { productId: 'p6', productName: 'Surf Excel 1kg', variant: '1kg', quantity: 1, unitPrice: 220, total: 220, isSubstituted: false, isOutOfStock: false },
      { productId: 'p7', productName: 'Maggi Noodles', variant: '4-pack', quantity: 2, unitPrice: 56, total: 112, isSubstituted: false, isOutOfStock: false },
    ],
    orderType: 'delivery', status: 'accepted', subtotal: 1030, deliveryFee: 0, taxAmount: 0, discount: 50, total: 980,
    placedAt: new Date(Date.now() - 900000).toISOString(), acceptedAt: new Date(Date.now() - 840000).toISOString(),
    slaDeadlineMinutes: 30, slaRemainingMinutes: 15,
    deliveryPartnerName: 'Ravi K.', deliveryPartnerPhone: '+91 XXXXX XXXXX',
    paymentMethod: 'Card', paymentStatus: 'paid', invoiceNumber: 'INV-GRO-9002',
    hasSubstitution: false, isPartialFulfilment: false, createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'GRO-9003', sellerId: 'seller-001', storeId: 'store-001', countryCode: 'IN',
    customerName: 'Vikram Singh', customerPhone: '+91 76543 XXXXX',
    items: [
      { productId: 'p8', productName: 'Chicken Breast 1kg', variant: '1kg', quantity: 1, unitPrice: 350, total: 350, isSubstituted: false, isOutOfStock: false },
      { productId: 'p9', productName: 'Fresh Paneer 200g', variant: '200g', quantity: 2, unitPrice: 80, total: 160, isSubstituted: false, isOutOfStock: false },
    ],
    orderType: 'pickup', status: 'packed', subtotal: 510, deliveryFee: 0, taxAmount: 0, discount: 0, total: 510,
    placedAt: new Date(Date.now() - 1800000).toISOString(), acceptedAt: new Date(Date.now() - 1740000).toISOString(),
    packedAt: new Date(Date.now() - 600000).toISOString(), slaDeadlineMinutes: 20, slaRemainingMinutes: 0,
    paymentMethod: 'Cash', paymentStatus: 'pending', invoiceNumber: 'INV-GRO-9003',
    hasSubstitution: false, isPartialFulfilment: false, createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'GRO-9004', sellerId: 'seller-001', storeId: 'store-001', countryCode: 'IN',
    customerName: 'Sneha Patil', customerPhone: '+91 65432 XXXXX', customerAddress: 'C-Wing, Lake View, Powai',
    items: [
      { productId: 'p10', productName: 'Organic Bananas', variant: '1 dozen', quantity: 1, unitPrice: 60, total: 60, isSubstituted: true, substitutedWith: 'Regular Bananas 1 dozen', isOutOfStock: false },
      { productId: 'p11', productName: 'Greek Yogurt 400g', variant: '400g', quantity: 1, unitPrice: 120, total: 120, isSubstituted: false, isOutOfStock: true },
    ],
    orderType: 'delivery', status: 'picking', subtotal: 180, deliveryFee: 25, taxAmount: 0, discount: 0, total: 205,
    placedAt: new Date(Date.now() - 600000).toISOString(), acceptedAt: new Date(Date.now() - 540000).toISOString(),
    slaDeadlineMinutes: 30, slaRemainingMinutes: 20,
    paymentMethod: 'UPI', paymentStatus: 'paid', invoiceNumber: 'INV-GRO-9004',
    hasSubstitution: true, isPartialFulfilment: true, createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'GRO-9005', sellerId: 'seller-001', storeId: 'store-001', countryCode: 'IN',
    customerName: 'Amit Mehta', customerPhone: '+91 54321 XXXXX', customerAddress: '15, Marine Drive, Mumbai',
    items: [
      { productId: 'p12', productName: 'Basmati Rice 10kg', variant: '10kg', quantity: 1, unitPrice: 1200, total: 1200, isSubstituted: false, isOutOfStock: false },
    ],
    orderType: 'delivery', status: 'out_for_delivery', subtotal: 1200, deliveryFee: 0, taxAmount: 0, discount: 100, total: 1100,
    placedAt: new Date(Date.now() - 3600000).toISOString(), deliveryPartnerName: 'Suresh M.',
    paymentMethod: 'Card', paymentStatus: 'paid', invoiceNumber: 'INV-GRO-9005',
    hasSubstitution: false, isPartialFulfilment: false, createdAt: new Date(Date.now() - 3600000).toISOString(),
    slaDeadlineMinutes: 45, slaRemainingMinutes: 5,
  },
  {
    id: 'GRO-9006', sellerId: 'seller-001', storeId: 'store-001', countryCode: 'IN',
    customerName: 'Deepa Nair', customerPhone: '+91 43210 XXXXX', customerAddress: 'D-12, Sagar Heights, Malad',
    items: [
      { productId: 'p13', productName: 'Dettol Handwash 200ml', variant: '200ml', quantity: 3, unitPrice: 95, total: 285, isSubstituted: false, isOutOfStock: false },
    ],
    orderType: 'delivery', status: 'delivered', subtotal: 285, deliveryFee: 25, taxAmount: 0, discount: 0, total: 310,
    placedAt: new Date(Date.now() - 7200000).toISOString(), deliveredAt: new Date(Date.now() - 5400000).toISOString(),
    paymentMethod: 'UPI', paymentStatus: 'paid', invoiceNumber: 'INV-GRO-9006',
    hasSubstitution: false, isPartialFulfilment: false, createdAt: new Date(Date.now() - 7200000).toISOString(),
    slaDeadlineMinutes: 30, slaRemainingMinutes: 0,
  },
];

// ─── Mock Products ───────────────────────────────────────────────────────────

export const MOCK_PRODUCTS: GroceryProduct[] = [
  { id: 'GP-001', sellerId: 's1', storeId: 'st1', countryCode: 'IN', parentCategory: 'Staples', category: 'Atta & Flours', subcategory: 'Wheat Flour', name: 'Aashirvaad Whole Wheat Atta', brand: 'Aashirvaad', description: 'Premium whole wheat flour for soft rotis.', images: [], sku: 'ASH-ATTA-5K', barcode: '8901063061017', hsnCode: '1101', variants: [{ id: 'v1', weight: '5', unit: 'kg', mrp: 280, sellingPrice: 250, stockQuantity: 45, minStockAlert: 10, sku: 'ASH-ATTA-5K' }], expiryDate: '2027-03-15', manufacturingDate: '2026-03-15', batchNumber: 'BT2026Q1-001', shelfLifeDays: 365, storageType: 'ambient', allergens: ['gluten'], isHalal: false, isOrganic: false, isVegan: true, isGlutenFree: false, isImported: false, isLocal: true, status: 'active', isBestseller: true, createdAt: '2026-01-10', updatedAt: '2026-06-01' },
  { id: 'GP-002', sellerId: 's1', storeId: 'st1', countryCode: 'IN', parentCategory: 'Dairy', category: 'Milk', subcategory: 'Toned Milk', name: 'Amul Taaza Toned Milk', brand: 'Amul', description: 'Fresh toned milk 1 litre pack.', images: [], sku: 'AML-MILK-1L', hsnCode: '0401', variants: [{ id: 'v2', weight: '1', unit: 'L', mrp: 68, sellingPrice: 68, stockQuantity: 120, minStockAlert: 20, sku: 'AML-MILK-1L' }], expiryDate: '2026-06-15', manufacturingDate: '2026-06-10', batchNumber: 'BT-MLK-0610', shelfLifeDays: 5, storageType: 'chilled', allergens: ['milk'], isHalal: false, isOrganic: false, isVegan: false, isGlutenFree: true, isImported: false, isLocal: true, status: 'active', isBestseller: true, createdAt: '2026-01-10', updatedAt: '2026-06-10' },
  { id: 'GP-003', sellerId: 's1', storeId: 'st1', countryCode: 'IN', parentCategory: 'Snacks', category: 'Instant Noodles', subcategory: 'Noodles', name: 'Maggi 2-Minute Noodles', brand: 'Nestle', description: 'Classic masala flavour instant noodles.', images: [], sku: 'MGI-NDL-140', hsnCode: '1902', variants: [{ id: 'v3', weight: '140', unit: 'g', mrp: 30, sellingPrice: 28, stockQuantity: 200, minStockAlert: 30, sku: 'MGI-NDL-140' }], expiryDate: '2027-01-01', storageType: 'ambient', allergens: ['gluten', 'soy'], isHalal: false, isOrganic: false, isVegan: false, isGlutenFree: false, isImported: false, isLocal: true, status: 'active', isBestseller: false, createdAt: '2026-01-10', updatedAt: '2026-06-01' },
  { id: 'GP-004', sellerId: 's1', storeId: 'st1', countryCode: 'IN', parentCategory: 'Staples', category: 'Rice', subcategory: 'Basmati', name: 'India Gate Basmati Rice', brand: 'India Gate', description: 'Premium aged basmati rice.', images: [], sku: 'IG-RICE-5K', hsnCode: '1006', variants: [{ id: 'v4', weight: '5', unit: 'kg', mrp: 750, sellingPrice: 650, stockQuantity: 0, minStockAlert: 5, sku: 'IG-RICE-5K' }], storageType: 'ambient', allergens: [], isHalal: false, isOrganic: false, isVegan: true, isGlutenFree: true, isImported: false, isLocal: true, status: 'active', isBestseller: false, createdAt: '2026-01-10', updatedAt: '2026-06-01' },
  { id: 'GP-005', sellerId: 's1', storeId: 'st1', countryCode: 'IN', parentCategory: 'Fresh', category: 'Fresh Meat', subcategory: 'Chicken', name: 'Farm Fresh Chicken Breast', brand: 'FreshMart', description: 'Antibiotic-free boneless chicken breast.', images: [], sku: 'FM-CHK-BRS', variants: [{ id: 'v5', weight: '1', unit: 'kg', mrp: 400, sellingPrice: 350, stockQuantity: 18, minStockAlert: 5, sku: 'FM-CHK-BRS' }], storageType: 'chilled', allergens: [], isHalal: true, isOrganic: false, isVegan: false, isGlutenFree: true, isImported: false, isLocal: true, status: 'active', isBestseller: true, createdAt: '2026-01-10', updatedAt: '2026-06-11' },
  { id: 'GP-006', sellerId: 's1', storeId: 'st1', countryCode: 'IN', parentCategory: 'Fresh', category: 'Fruits', subcategory: 'Seasonal', name: 'Organic Alphonso Mangoes', brand: 'Nature\'s Best', description: 'Premium Ratnagiri Alphonso mangoes.', images: [], sku: 'NB-MNG-DZ', variants: [{ id: 'v6', weight: '1', unit: 'dozen', mrp: 800, sellingPrice: 699, stockQuantity: 8, minStockAlert: 3, sku: 'NB-MNG-DZ' }], expiryDate: '2026-06-18', storageType: 'ambient', allergens: [], isHalal: false, isOrganic: true, isVegan: true, isGlutenFree: true, isImported: false, isLocal: true, status: 'active', isBestseller: true, createdAt: '2026-06-01', updatedAt: '2026-06-11' },
  { id: 'GP-007', sellerId: 's1', storeId: 'st1', countryCode: 'IN', parentCategory: 'Household', category: 'Cleaning', subcategory: 'Hand Wash', name: 'Dettol Liquid Handwash', brand: 'Dettol', description: 'Antibacterial liquid handwash original.', images: [], sku: 'DET-HW-200', hsnCode: '3401', variants: [{ id: 'v7', weight: '200', unit: 'ml', mrp: 110, sellingPrice: 95, stockQuantity: 85, minStockAlert: 15, sku: 'DET-HW-200' }], expiryDate: '2028-01-01', storageType: 'ambient', allergens: [], isHalal: false, isOrganic: false, isVegan: false, isGlutenFree: true, isImported: false, isLocal: true, status: 'active', isBestseller: false, createdAt: '2026-01-10', updatedAt: '2026-06-01' },
  { id: 'GP-008', sellerId: 's1', storeId: 'st1', countryCode: 'IN', parentCategory: 'Dairy', category: 'Paneer & Curd', subcategory: 'Paneer', name: 'Amul Fresh Paneer', brand: 'Amul', description: 'Fresh cottage cheese block.', images: [], sku: 'AML-PNR-200', hsnCode: '0406', variants: [{ id: 'v8', weight: '200', unit: 'g', mrp: 90, sellingPrice: 80, stockQuantity: 3, minStockAlert: 10, sku: 'AML-PNR-200' }], expiryDate: '2026-06-14', storageType: 'chilled', allergens: ['milk'], isHalal: false, isOrganic: false, isVegan: false, isGlutenFree: true, isImported: false, isLocal: true, status: 'active', isBestseller: false, createdAt: '2026-01-10', updatedAt: '2026-06-10' },
];

// ─── Mock Campaigns ──────────────────────────────────────────────────────────

export const MOCK_CAMPAIGNS: Campaign[] = [
  { id: 'CMP-001', sellerId: 's1', type: 'store_wide_discount', name: 'Monsoon Sale', description: '15% off on all groceries', status: 'active', discountPercent: 15, maxDiscountCap: 200, minOrderValue: 499, startDate: '2026-06-01', endDate: '2026-06-30', impressions: 12400, clicks: 3200, conversions: 480, revenue: 96000, spend: 14400, createdAt: '2026-05-28' },
  { id: 'CMP-002', sellerId: 's1', type: 'free_delivery', name: 'Free Delivery Week', description: 'Free delivery on orders above ₹299', status: 'active', freeDeliveryThreshold: 299, startDate: '2026-06-10', endDate: '2026-06-17', impressions: 8200, clicks: 2100, conversions: 340, revenue: 68000, spend: 8500, createdAt: '2026-06-08' },
  { id: 'CMP-003', sellerId: 's1', type: 'bogo', name: 'Buy 1 Get 1 Maggi', description: 'Buy 1 Get 1 Free on Maggi Noodles', status: 'pending_approval', targetProducts: ['GP-003'], startDate: '2026-06-15', endDate: '2026-06-22', impressions: 0, clicks: 0, conversions: 0, revenue: 0, spend: 0, createdAt: '2026-06-11' },
  { id: 'CMP-004', sellerId: 's1', type: 'category_discount', name: 'Fresh Fruits Fest', description: '20% off on all fresh fruits', status: 'draft', discountPercent: 20, targetCategories: ['Fruits'], startDate: '2026-06-20', endDate: '2026-06-27', impressions: 0, clicks: 0, conversions: 0, revenue: 0, spend: 0, createdAt: '2026-06-11' },
];

// ─── Mock Payouts ────────────────────────────────────────────────────────────

export const MOCK_PAYOUTS: PayoutRecord[] = [
  { id: 'PAY-001', sellerId: 's1', countryCode: 'IN', period: 'weekly', periodLabel: 'Jun 3–9, 2026', grossAmount: 142000, commissionDeduction: 14200, commissionPercent: 10, deliveryFeeShare: 4200, refundAdjustment: 1800, taxDeduction: 2556, netPayout: 119244, status: 'completed', paidAt: '2026-06-11', transactionRef: 'NEFT-2026061101', currency: '₹', createdAt: '2026-06-10' },
  { id: 'PAY-002', sellerId: 's1', countryCode: 'IN', period: 'weekly', periodLabel: 'Jun 10–12, 2026', grossAmount: 68000, commissionDeduction: 6800, commissionPercent: 10, deliveryFeeShare: 2100, refundAdjustment: 0, taxDeduction: 1224, netPayout: 57876, status: 'pending', currency: '₹', createdAt: '2026-06-12' },
];

export const MOCK_WALLET: WalletSummary = {
  balance: 57876, pendingPayout: 57876, totalEarned: 842000, totalPaidOut: 784124, currency: '₹',
};

// ─── Mock Analytics ──────────────────────────────────────────────────────────

export const MOCK_ANALYTICS: SellerAnalytics = {
  todayOrders: 47, todayRevenue: 28400, pendingOrders: 3, activeOrders: 8,
  cancelledOrders: 2, returnedOrders: 1,
  avgRating: 4.7, totalRatings: 2840, deliverySlaPercent: 94, stockHealthScore: 82, sellerHealthScore: 91,
  totalProducts: 248, activeProducts: 232, lowStockProducts: 12, nearExpiryProducts: 5, expiredProducts: 1,
  bestSellingProducts: [
    { name: 'Aashirvaad Atta 5kg', sold: 82, revenue: 20500 },
    { name: 'Amul Milk 1L', sold: 156, revenue: 10608 },
    { name: 'Farm Fresh Chicken', sold: 64, revenue: 22400 },
    { name: 'Organic Mangoes', sold: 28, revenue: 19572 },
    { name: 'Tata Salt 1kg', sold: 210, revenue: 5040 },
  ],
  weeklyRevenue: [
    { day: 'Mon', revenue: 32400 }, { day: 'Tue', revenue: 28100 }, { day: 'Wed', revenue: 35600 },
    { day: 'Thu', revenue: 29800 }, { day: 'Fri', revenue: 41200 }, { day: 'Sat', revenue: 52100 },
    { day: 'Sun', revenue: 38400 },
  ],
  monthlyRevenue: [
    { month: 'Jan', revenue: 680000 }, { month: 'Feb', revenue: 720000 }, { month: 'Mar', revenue: 810000 },
    { month: 'Apr', revenue: 760000 }, { month: 'May', revenue: 890000 }, { month: 'Jun', revenue: 420000 },
  ],
  categoryWiseSales: [
    { category: 'Staples', revenue: 142000, orders: 420 }, { category: 'Dairy', revenue: 86000, orders: 680 },
    { category: 'Fresh Meat', revenue: 78000, orders: 220 }, { category: 'Fruits & Vegetables', revenue: 64000, orders: 380 },
    { category: 'Snacks', revenue: 42000, orders: 520 }, { category: 'Household', revenue: 38000, orders: 280 },
  ],
  branchWiseRevenue: [
    { branch: 'Powai Main', revenue: 520000, orders: 1240 },
    { branch: 'Andheri Branch', revenue: 380000, orders: 920 },
  ],
  activeCampaigns: 2, campaignRevenue: 164000, campaignROI: 6.14,
};
