/**
 * KARTSEEK Grocery Seller Portal — Type Definitions
 *
 * Country-aware, tenant-aware types for seller onboarding,
 * products, orders, payouts, campaigns, and compliance.
 */

// ─── Country & Region ────────────────────────────────────────────────────────

// Onboarding types live in `lib/seller/types.ts` — they describe real markets
// and real compliance requirements, not fixtures. Imported so the rest of this
// file can use them, and re-exported so the grocery portal's existing imports
// keep resolving to the same types.
import type { SellerCountryCode, BusinessType, DocumentType } from '@/lib/seller/types';

export type { SellerCountryCode, BusinessType, DocumentType };

export type StoreDeliveryMode = 'delivery' | 'pickup' | 'both';
export type StoreStatus = 'open' | 'closed' | 'vacation' | 'temporary_closure';

export type DocumentStatus = 'pending' | 'uploaded' | 'verified' | 'rejected' | 'expired';

export interface ComplianceDocument {
  id: string;
  type: DocumentType;
  label: string;
  description: string;
  status: DocumentStatus;
  fileUrl?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  expiryDate?: string;
  rejectionReason?: string;
  required: boolean;
  countryCode: SellerCountryCode;
}

// ─── Seller Profile ──────────────────────────────────────────────────────────

export interface SellerProfile {
  id: string;
  countryCode: SellerCountryCode;
  businessType: BusinessType;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerId?: string;

  // Business details
  businessName: string;
  businessRegistrationNumber?: string;
  tradeLicenceNumber?: string;

  // Country-specific tax
  gstNumber?: string;        // India
  fssaiNumber?: string;      // India
  vatTrn?: string;           // UAE/GCC/UK
  commercialRegistration?: string; // Qatar
  salesTaxId?: string;       // USA
  fdaFacilityId?: string;    // USA
  foodBusinessRegistration?: string; // UK

  // Bank details
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  ifscCode?: string;         // India
  sortCode?: string;         // UK
  routingNumber?: string;    // USA
  ibanNumber?: string;       // GCC

  // Status
  onboardingStatus: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  onboardingStep: number;
  complianceScore: number;
  documents: ComplianceDocument[];

  createdAt: string;
  updatedAt: string;
}

// ─── Store Configuration ─────────────────────────────────────────────────────

export interface StoreHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface StoreBranch {
  id: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  emirate?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  phone: string;
  isActive: boolean;
}

export interface HolidaySchedule {
  date: string;
  reason: string;
  isClosed: boolean;
}

export interface StoreConfig {
  id: string;
  sellerId: string;
  storeName: string;
  storeSlug: string;
  logoUrl?: string;
  coverImageUrl?: string;
  storeType: BusinessType;
  description: string;

  // Location
  countryCode: SellerCountryCode;
  city: string;
  state?: string;
  emirate?: string;
  fullAddress: string;
  latitude: number;
  longitude: number;

  // Operations
  deliveryMode: StoreDeliveryMode;
  deliveryRadiusKm: number;
  minimumOrderValue: number;
  preparationTimeMinutes: number;
  operatingHours: StoreHours[];
  holidays: HolidaySchedule[];
  storeStatus: StoreStatus;
  vacationStartDate?: string;
  vacationEndDate?: string;

  // Branches
  branches: StoreBranch[];

  // Language
  primaryLanguage: string;
  secondaryLanguage?: string;

  // Ratings
  rating: number;
  totalRatings: number;
  totalOrders: number;
}

// ─── Product & Inventory ─────────────────────────────────────────────────────

export type ProductStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'active' | 'inactive' | 'expired';
export type StorageType = 'ambient' | 'chilled' | 'frozen' | 'cold_chain';
export type FreshnessGrade = 'A+' | 'A' | 'B' | 'C';

export interface ProductVariant {
  id: string;
  weight: string;
  unit: string;
  mrp: number;
  sellingPrice: number;
  offerPrice?: number;
  stockQuantity: number;
  minStockAlert: number;
  barcode?: string;
  sku: string;
}

export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
}

export interface GroceryProduct {
  id: string;
  sellerId: string;
  storeId: string;
  countryCode: SellerCountryCode;

  // Categorization
  parentCategory: string;
  category: string;
  subcategory: string;

  // Basic info
  name: string;
  nameArabic?: string;
  brand: string;
  description: string;
  descriptionArabic?: string;
  images: string[];

  // Identifiers
  sku: string;
  barcode?: string;
  hsnCode?: string;     // India
  sacCode?: string;     // India

  // Pricing & variants
  variants: ProductVariant[];

  // Compliance
  expiryDate?: string;
  manufacturingDate?: string;
  batchNumber?: string;
  shelfLifeDays?: number;
  storageType: StorageType;

  // Nutrition & allergen
  nutritionInfo?: NutritionInfo;
  allergens: string[];

  // Tags
  isHalal: boolean;
  isOrganic: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isImported: boolean;
  isLocal: boolean;

  // Status
  status: ProductStatus;
  approvalNote?: string;
  isBestseller: boolean;

  createdAt: string;
  updatedAt: string;
}

// ─── Fresh Product Extension ─────────────────────────────────────────────────

export type FreshCategory = 'fresh_meat' | 'fresh_fish' | 'fruits' | 'vegetables' | 'dairy' | 'bakery' | 'frozen';
export type CutType = 'whole' | 'curry_cut' | 'steaks' | 'fillets' | 'boneless' | 'bone_in' | 'minced' | 'sliced';
export type CleaningOption = 'uncleaned' | 'cleaned' | 'cleaned_and_cut' | 'marinated';
export type PackingType = 'loose' | 'vacuum_packed' | 'tray_packed' | 'ice_packed' | 'crate';

export interface FreshProductFields {
  freshCategory: FreshCategory;
  freshnessGrade: FreshnessGrade;
  cutTypes: CutType[];
  cleaningOptions: CleaningOption[];
  packingType: PackingType;
  dailyAvailability: boolean;
  marketPriceToday?: number;
  coldChainRequired: boolean;
  todaysFreshStock: boolean;
  weightBasedSelling: boolean;
  sellerDailyPriceUpdate: boolean;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'picking'
  | 'packed'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export type OrderType = 'delivery' | 'pickup';

export interface OrderItem {
  productId: string;
  productName: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isSubstituted: boolean;
  substitutedWith?: string;
  isOutOfStock: boolean;
}

export interface GroceryOrder {
  id: string;
  sellerId: string;
  storeId: string;
  countryCode: SellerCountryCode;

  // Customer
  customerName: string;
  customerPhone: string;
  customerAddress?: string;

  // Order details
  items: OrderItem[];
  orderType: OrderType;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  discount: number;
  total: number;

  // SLA
  placedAt: string;
  acceptedAt?: string;
  packedAt?: string;
  deliveredAt?: string;
  slaDeadlineMinutes: number;
  slaRemainingMinutes: number;

  // Delivery
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;

  // Operations
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'partial_refund';
  invoiceNumber: string;
  notes?: string;
  hasSubstitution: boolean;
  isPartialFulfilment: boolean;

  createdAt: string;
}

// ─── Promotions & Campaigns ──────────────────────────────────────────────────

export type CampaignType =
  | 'product_discount'
  | 'category_discount'
  | 'store_wide_discount'
  | 'free_delivery'
  | 'combo_offer'
  | 'bogo'
  | 'festival_campaign'
  | 'brand_banner'
  | 'sponsored_product'
  | 'sponsored_store';

export type CampaignStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused' | 'expired' | 'rejected';

export interface Campaign {
  id: string;
  sellerId: string;
  type: CampaignType;
  name: string;
  description: string;
  status: CampaignStatus;

  // Scope
  targetProducts?: string[];
  targetCategories?: string[];
  discountPercent?: number;
  discountAmount?: number;
  minOrderValue?: number;
  maxDiscountCap?: number;
  freeDeliveryThreshold?: number;

  // Duration
  startDate: string;
  endDate: string;

  // Performance
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;

  // Approval
  adminNote?: string;
  approvedAt?: string;
  approvedBy?: string;

  createdAt: string;
}

// ─── Payouts ─────────────────────────────────────────────────────────────────

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PayoutPeriod = 'daily' | 'weekly' | 'monthly';

export interface PayoutRecord {
  id: string;
  sellerId: string;
  countryCode: SellerCountryCode;

  period: PayoutPeriod;
  periodLabel: string;

  grossAmount: number;
  commissionDeduction: number;
  commissionPercent: number;
  deliveryFeeShare: number;
  refundAdjustment: number;
  taxDeduction: number;
  netPayout: number;

  status: PayoutStatus;
  paidAt?: string;
  transactionRef?: string;

  currency: string;
  createdAt: string;
}

export interface WalletSummary {
  balance: number;
  pendingPayout: number;
  totalEarned: number;
  totalPaidOut: number;
  currency: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface SellerAnalytics {
  // Today
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  returnedOrders: number;

  // Performance
  avgRating: number;
  totalRatings: number;
  deliverySlaPercent: number;
  stockHealthScore: number;
  sellerHealthScore: number;

  // Products
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  nearExpiryProducts: number;
  expiredProducts: number;
  bestSellingProducts: { name: string; sold: number; revenue: number }[];

  // Revenue
  weeklyRevenue: { day: string; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  categoryWiseSales: { category: string; revenue: number; orders: number }[];
  branchWiseRevenue: { branch: string; revenue: number; orders: number }[];

  // Campaign
  activeCampaigns: number;
  campaignRevenue: number;
  campaignROI: number;
}
