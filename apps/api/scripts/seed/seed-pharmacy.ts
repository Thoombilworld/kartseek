/**
 * KARTSEEK — Pharmacy Module Seed Script
 *
 * Populates the pharmacy module with realistic Indian pharmacy data:
 *   - 6 pharmacies across Mumbai
 *   - 16 categories
 *   - 50+ medicines with real compositions
 *   - Staff, promotions, reviews, orders, prescriptions
 *
 * `regionCode` is 'IN' on every store, not the 'MUM-CBD' / 'MUM-WST' city zones
 * it used to be. The platform's unit of market scope is the ISO-2 country:
 * `users.region_code`, the JWT claim and `normaliseMarket` in `@app/common` all
 * speak ISO-2, and `normaliseMarket('MUM-CBD')` reads as 'MU' — Mauritius — so
 * an Indian admin was refused an Indian pharmacy (audit F-34). The city and
 * `zoneId` carry the sub-market detail; `regionCode` carries the market.
 *
 * The dead `countryCode` ('IND', beside a `regionCode` of 'IN') is gone with
 * the column: `DropDeadMarketColumns1786502400000` dropped it and the entity no
 * longer declares it, so every store literal here was setting a property that
 * does not exist.
 *
 * Usage:
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/seed-pharmacy.ts
 */

import { type DeepPartial } from 'typeorm';
import { PharmacyDataSource } from '../../../../modules/pharmacy/backend/data-source';

/**
 * The module's own migration-runner DataSource, reused verbatim.
 *
 * This file used to declare a second DataSource with `synchronize: true`,
 * which meant a seed script wrote DDL from entity metadata against a live
 * database — the one thing IN3 closed off in the service itself. It also
 * meant two copies of the entity list and two copies of the credential
 * resolution, free to drift.
 *
 * `PharmacyDataSource` has `synchronize: false`, so the tables have to exist
 * first:
 *
 *     cd modules/pharmacy/backend && npm run migration:run
 *
 * A seed against a database with no schema now fails saying so, instead of
 * quietly creating one that no migration describes.
 */
const ds = PharmacyDataSource;

import {
  PharmacyStore,
  PharmacyStoreStatus,
} from '../../../../modules/pharmacy/backend/src/entities/pharmacy-store.entity';
import { PharmacyCategory } from '../../../../modules/pharmacy/backend/src/entities/pharmacy-category.entity';
import {
  PharmacyItem,
  DosageForm,
} from '../../../../modules/pharmacy/backend/src/entities/pharmacy-item.entity';
import {
  PharmacyOrder,
  PharmacyOrderStatus,
  PharmacyOrderType,
  PharmacyPaymentMethod,
  PharmacyPaymentStatus,
} from '../../../../modules/pharmacy/backend/src/entities/pharmacy-order.entity';
import {
  Prescription,
  PrescriptionStatus,
} from '../../../../modules/pharmacy/backend/src/entities/prescription.entity';
import { PharmacyReview } from '../../../../modules/pharmacy/backend/src/entities/pharmacy-review.entity';
import {
  PharmacyStaff,
  PharmacyStaffRole,
} from '../../../../modules/pharmacy/backend/src/entities/pharmacy-staff.entity';
import {
  PharmacyPromotion,
  PharmacyPromoType,
} from '../../../../modules/pharmacy/backend/src/entities/pharmacy-promotion.entity';

// ═════════════════════════════════════════════════════════════════════════════
// Categories
// ═════════════════════════════════════════════════════════════════════════════

const CATEGORIES = [
  {
    name: 'Pain Relief',
    slug: 'pain-relief',
    emoji: '💊',
    requiresPrescription: false,
    sortOrder: 1,
  },
  {
    name: 'Antibiotics',
    slug: 'antibiotics',
    emoji: '🧪',
    requiresPrescription: true,
    sortOrder: 2,
  },
  {
    name: 'Vitamins & Supplements',
    slug: 'vitamins-supplements',
    emoji: '🧬',
    requiresPrescription: false,
    sortOrder: 3,
  },
  { name: 'Baby Care', slug: 'baby-care', emoji: '🍼', requiresPrescription: false, sortOrder: 4 },
  {
    name: 'Personal Care',
    slug: 'personal-care',
    emoji: '🧴',
    requiresPrescription: false,
    sortOrder: 5,
  },
  { name: 'Skin Care', slug: 'skin-care', emoji: '🧖', requiresPrescription: false, sortOrder: 6 },
  {
    name: 'Diabetic Care',
    slug: 'diabetic-care',
    emoji: '🩸',
    requiresPrescription: true,
    sortOrder: 7,
  },
  { name: 'Heart & BP', slug: 'heart-bp', emoji: '❤️', requiresPrescription: true, sortOrder: 8 },
  {
    name: 'Respiratory',
    slug: 'respiratory',
    emoji: '🫁',
    requiresPrescription: false,
    sortOrder: 9,
  },
  {
    name: 'Digestive Health',
    slug: 'digestive-health',
    emoji: '🍏',
    requiresPrescription: false,
    sortOrder: 10,
  },
  { name: 'First Aid', slug: 'first-aid', emoji: '🩹', requiresPrescription: false, sortOrder: 11 },
  {
    name: "Women's Health",
    slug: 'womens-health',
    emoji: '♀️',
    requiresPrescription: false,
    sortOrder: 12,
  },
  {
    name: 'Eye & Ear Care',
    slug: 'eye-ear-care',
    emoji: '👁️',
    requiresPrescription: false,
    sortOrder: 13,
  },
  {
    name: 'Health Devices',
    slug: 'health-devices',
    emoji: '🩺',
    requiresPrescription: false,
    sortOrder: 14,
  },
  {
    name: 'Ayurvedic & Herbal',
    slug: 'ayurvedic-herbal',
    emoji: '🌿',
    requiresPrescription: false,
    sortOrder: 15,
  },
  {
    name: 'Prescription Drugs',
    slug: 'prescription-drugs',
    emoji: '📋',
    requiresPrescription: true,
    sortOrder: 16,
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// Stores
// ═════════════════════════════════════════════════════════════════════════════

const STORES: Array<Partial<PharmacyStore> & { slug: string }> = [
  {
    name: 'HealthPlus Pharmacy',
    slug: 'healthplus-pharmacy',
    description:
      "Mumbai's most trusted 24-hour pharmacy chain. Fast delivery, genuine medicines, licensed pharmacists on duty.",
    ownerId: 'user-pharm-001',
    address: 'MG Road, Mumbai Central',
    city: 'Mumbai',
    state: 'Mumbai County',
    pincode: '00100',
    latitude: 19.076,
    longitude: 72.8777,
    regionCode: 'IN',
    phone: '+91-700-111-001',
    email: 'cbd@healthplus.co.in',
    is24hr: true,
    deliveryRadius: 8,
    drugLicenseNumber: 'DL-20B-KEN-10001',
    pharmacistName: 'Dr. Amina Ochieng',
    pharmacistRegNumber: 'PPB-KEN-2019-4501',
    canDispenseScheduleH: true,
    rating: 4.8,
    ratingCount: 342,
    totalOrders: 5820,
    commissionRate: 10,
    taxRate: 18,
    deliveryFee: 0,
    minOrderAmount: 300,
    status: PharmacyStoreStatus.APPROVED,
  },
  {
    name: 'MedPlus Chemist',
    slug: 'medplus-chemist',
    description:
      'Your neighbourhood chemist with affordable generics, baby care essentials, and free health consultations.',
    ownerId: 'user-pharm-002',
    address: 'FC Road, Mumbai',
    city: 'Mumbai',
    state: 'Mumbai County',
    pincode: '00100',
    latitude: 19.0544,
    longitude: 72.8403,
    regionCode: 'IN',
    phone: '+91-700-111-002',
    email: 'info@medpluschemist.co.in',
    is24hr: false,
    deliveryRadius: 5,
    drugLicenseNumber: 'DL-20B-KEN-10002',
    pharmacistName: 'Dr. Peter Mwangi',
    pharmacistRegNumber: 'PPB-KEN-2020-5102',
    canDispenseScheduleH: true,
    rating: 4.5,
    ratingCount: 198,
    totalOrders: 3240,
    commissionRate: 12,
    taxRate: 18,
    deliveryFee: 50,
    minOrderAmount: 200,
    status: PharmacyStoreStatus.APPROVED,
  },
  {
    name: 'Andheri West Pharmacy',
    slug: 'Andheri West-pharmacy',
    description:
      'Premium pharmacy serving Andheri West with imported medicines, cosmeceuticals, and wellness products.',
    ownerId: 'user-pharm-003',
    address: 'SV Road, Andheri West',
    city: 'Mumbai',
    state: 'Mumbai County',
    pincode: '400053',
    latitude: 19.1176,
    longitude: 72.8271,
    regionCode: 'IN',
    phone: '+91-700-111-003',
    email: 'Andheri West@rxMumbai.co.in',
    is24hr: false,
    deliveryRadius: 6,
    drugLicenseNumber: 'DL-20B-KEN-10003',
    pharmacistName: 'Dr. Sarah Njeri',
    pharmacistRegNumber: 'PPB-KEN-2018-3890',
    canDispenseScheduleH: true,
    rating: 4.7,
    ratingCount: 156,
    totalOrders: 2890,
    commissionRate: 10,
    taxRate: 18,
    deliveryFee: 0,
    minOrderAmount: 500,
    status: PharmacyStoreStatus.APPROVED,
  },
  {
    name: 'Dawa Pharmacy Juhu',
    slug: 'dawa-pharmacy-Juhu',
    description:
      "Family pharmacy in Juhu with pediatric medicines, diabetic care, and home delivery across Lang'ata.",
    ownerId: 'user-pharm-004',
    address: 'Bandra West Road, Juhu',
    city: 'Mumbai',
    state: 'Mumbai County',
    pincode: '400049',
    latitude: 19.1075,
    longitude: 72.8263,
    regionCode: 'IN',
    phone: '+91-700-111-004',
    email: 'Juhu@dawapharmacy.co.in',
    is24hr: false,
    deliveryRadius: 7,
    drugLicenseNumber: 'DL-20B-KEN-10004',
    pharmacistName: 'Dr. Rahul Sharma',
    pharmacistRegNumber: 'PPB-KEN-2021-6234',
    canDispenseScheduleH: false,
    rating: 4.6,
    ratingCount: 102,
    totalOrders: 1820,
    commissionRate: 12,
    taxRate: 18,
    deliveryFee: 100,
    minOrderAmount: 400,
    status: PharmacyStoreStatus.APPROVED,
  },
  {
    name: 'QuickMeds Express',
    slug: 'quickmeds-express',
    description:
      'Fastest pharmacy delivery in Mumbai — average 18 minutes. 24/7 service for emergencies.',
    ownerId: 'user-pharm-005',
    address: 'SB Road, Mumbai Central',
    city: 'Mumbai',
    state: 'Mumbai County',
    pincode: '00100',
    latitude: 19.0178,
    longitude: 72.8478,
    regionCode: 'IN',
    phone: '+91-700-111-005',
    email: 'support@quickmeds.co.in',
    is24hr: true,
    deliveryRadius: 10,
    drugLicenseNumber: 'DL-20B-KEN-10005',
    pharmacistName: 'Dr. Faith Wanjiku',
    pharmacistRegNumber: 'PPB-KEN-2022-7890',
    canDispenseScheduleH: true,
    rating: 4.4,
    ratingCount: 289,
    totalOrders: 7200,
    commissionRate: 8,
    taxRate: 18,
    deliveryFee: 0,
    minOrderAmount: 150,
    status: PharmacyStoreStatus.APPROVED,
  },
  {
    name: 'NatureCare Wellness',
    slug: 'naturecare-wellness',
    description:
      'Holistic health pharmacy specializing in Ayurvedic, herbal remedies, and organic wellness products.',
    ownerId: 'user-pharm-006',
    address: 'Powai Mall, James Gichuru Rd',
    city: 'Mumbai',
    state: 'Mumbai County',
    pincode: '400076',
    latitude: 19.1197,
    longitude: 72.9051,
    regionCode: 'IN',
    phone: '+91-700-111-006',
    email: 'hello@naturecarewellness.co.in',
    is24hr: false,
    deliveryRadius: 5,
    drugLicenseNumber: 'DL-20B-KEN-10006',
    pharmacistName: 'Dr. Grace Akinyi',
    pharmacistRegNumber: 'PPB-KEN-2020-5500',
    canDispenseScheduleH: false,
    rating: 4.9,
    ratingCount: 87,
    totalOrders: 1350,
    commissionRate: 15,
    taxRate: 18,
    deliveryFee: 80,
    minOrderAmount: 350,
    status: PharmacyStoreStatus.APPROVED,
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// Medicines (per-store — 8-10 each)
// ═════════════════════════════════════════════════════════════════════════════

const MEDICINES = [
  // ── Pain Relief ─────────────────────────────────────────────────────────────
  {
    name: 'Panadol Extra',
    genericName: 'Paracetamol',
    composition: 'Paracetamol 500mg + Caffeine 65mg',
    manufacturer: 'GSK',
    categorySlug: 'pain-relief',
    dosageForm: DosageForm.TABLET,
    strength: '500mg',
    packSize: 'Strip of 10',
    price: 120,
    mrp: 150,
    requiresPrescription: false,
    stockLevel: 500,
  },
  {
    name: 'Ibuprofen 400mg',
    genericName: 'Ibuprofen',
    composition: 'Ibuprofen 400mg',
    manufacturer: 'Cosmos Pharma',
    categorySlug: 'pain-relief',
    dosageForm: DosageForm.TABLET,
    strength: '400mg',
    packSize: 'Strip of 10',
    price: 80,
    mrp: 100,
    requiresPrescription: false,
    stockLevel: 350,
  },
  {
    name: 'Diclofenac Gel',
    genericName: 'Diclofenac',
    composition: 'Diclofenac Diethylamine 1.16% w/w',
    manufacturer: 'Novartis',
    categorySlug: 'pain-relief',
    dosageForm: DosageForm.GEL,
    strength: '30g',
    packSize: 'Tube of 30g',
    price: 250,
    mrp: 300,
    requiresPrescription: false,
    stockLevel: 120,
  },
  // ── Antibiotics ─────────────────────────────────────────────────────────────
  {
    name: 'Amoxicillin 500mg',
    genericName: 'Amoxicillin',
    composition: 'Amoxicillin Trihydrate 500mg',
    manufacturer: 'Dawa Ltd',
    categorySlug: 'antibiotics',
    dosageForm: DosageForm.CAPSULE,
    strength: '500mg',
    packSize: 'Strip of 10',
    price: 320,
    mrp: 400,
    requiresPrescription: true,
    isScheduleHDrug: true,
    stockLevel: 200,
  },
  {
    name: 'Azithromycin 500mg',
    genericName: 'Azithromycin',
    composition: 'Azithromycin Dihydrate 500mg',
    manufacturer: 'Cipla',
    categorySlug: 'antibiotics',
    dosageForm: DosageForm.TABLET,
    strength: '500mg',
    packSize: 'Strip of 3',
    price: 480,
    mrp: 550,
    requiresPrescription: true,
    isScheduleHDrug: true,
    stockLevel: 150,
  },
  {
    name: 'Metronidazole 400mg',
    genericName: 'Metronidazole',
    composition: 'Metronidazole 400mg',
    manufacturer: 'Universal Corporation',
    categorySlug: 'antibiotics',
    dosageForm: DosageForm.TABLET,
    strength: '400mg',
    packSize: 'Strip of 10',
    price: 150,
    mrp: 180,
    requiresPrescription: true,
    stockLevel: 280,
  },
  // ── Vitamins ────────────────────────────────────────────────────────────────
  {
    name: 'Vitamin C 1000mg',
    genericName: 'Ascorbic Acid',
    composition: 'Ascorbic Acid 1000mg + Zinc 10mg',
    manufacturer: 'Bayer',
    categorySlug: 'vitamins-supplements',
    dosageForm: DosageForm.TABLET,
    strength: '1000mg',
    packSize: 'Bottle of 30',
    price: 650,
    mrp: 800,
    requiresPrescription: false,
    stockLevel: 400,
  },
  {
    name: 'Multivitamin Gold',
    genericName: 'Multivitamin',
    composition: 'Vitamins A, B Complex, C, D3, E, Zinc, Iron',
    manufacturer: "Nature's Bounty",
    categorySlug: 'vitamins-supplements',
    dosageForm: DosageForm.CAPSULE,
    strength: 'Multi',
    packSize: 'Bottle of 60',
    price: 1200,
    mrp: 1500,
    requiresPrescription: false,
    stockLevel: 180,
  },
  {
    name: 'Calcium + Vitamin D3',
    genericName: 'Calcium Carbonate',
    composition: 'Calcium 500mg + Vitamin D3 250 IU',
    manufacturer: 'Shelys Pharmaceuticals',
    categorySlug: 'vitamins-supplements',
    dosageForm: DosageForm.TABLET,
    strength: '500mg',
    packSize: 'Bottle of 30',
    price: 450,
    mrp: 520,
    requiresPrescription: false,
    stockLevel: 220,
  },
  // ── Baby Care ───────────────────────────────────────────────────────────────
  {
    name: 'Gripe Water',
    genericName: 'Dill Oil',
    composition: 'Dill Oil, Sodium Bicarbonate',
    manufacturer: "Woodward's",
    categorySlug: 'baby-care',
    dosageForm: DosageForm.SYRUP,
    strength: '150ml',
    packSize: 'Bottle of 150ml',
    price: 180,
    mrp: 220,
    requiresPrescription: false,
    stockLevel: 300,
  },
  {
    name: 'Paediatric Paracetamol',
    genericName: 'Paracetamol',
    composition: 'Paracetamol 120mg/5ml',
    manufacturer: 'GSK',
    categorySlug: 'baby-care',
    dosageForm: DosageForm.SYRUP,
    strength: '60ml',
    packSize: 'Bottle of 60ml',
    price: 150,
    mrp: 180,
    requiresPrescription: false,
    stockLevel: 250,
  },
  // ── Diabetic Care ───────────────────────────────────────────────────────────
  {
    name: 'Metformin 500mg',
    genericName: 'Metformin',
    composition: 'Metformin Hydrochloride 500mg',
    manufacturer: 'Dawa Ltd',
    categorySlug: 'diabetic-care',
    dosageForm: DosageForm.TABLET,
    strength: '500mg',
    packSize: 'Strip of 10',
    price: 90,
    mrp: 120,
    requiresPrescription: true,
    stockLevel: 400,
  },
  {
    name: 'Glibenclamide 5mg',
    genericName: 'Glibenclamide',
    composition: 'Glibenclamide 5mg',
    manufacturer: 'Universal Corporation',
    categorySlug: 'diabetic-care',
    dosageForm: DosageForm.TABLET,
    strength: '5mg',
    packSize: 'Strip of 10',
    price: 70,
    mrp: 90,
    requiresPrescription: true,
    stockLevel: 180,
  },
  {
    name: 'Insulin Syringe 1ml',
    genericName: 'Syringe',
    composition: 'Disposable Insulin Syringe',
    manufacturer: 'BD',
    categorySlug: 'diabetic-care',
    dosageForm: DosageForm.OTHER,
    strength: '1ml',
    packSize: 'Pack of 10',
    price: 350,
    mrp: 400,
    requiresPrescription: false,
    stockLevel: 500,
  },
  // ── Heart & BP ──────────────────────────────────────────────────────────────
  {
    name: 'Amlodipine 5mg',
    genericName: 'Amlodipine',
    composition: 'Amlodipine Besylate 5mg',
    manufacturer: 'Pfizer',
    categorySlug: 'heart-bp',
    dosageForm: DosageForm.TABLET,
    strength: '5mg',
    packSize: 'Strip of 10',
    price: 180,
    mrp: 220,
    requiresPrescription: true,
    stockLevel: 300,
  },
  {
    name: 'Atenolol 50mg',
    genericName: 'Atenolol',
    composition: 'Atenolol 50mg',
    manufacturer: 'AstraZeneca',
    categorySlug: 'heart-bp',
    dosageForm: DosageForm.TABLET,
    strength: '50mg',
    packSize: 'Strip of 14',
    price: 200,
    mrp: 250,
    requiresPrescription: true,
    stockLevel: 250,
  },
  // ── Respiratory ─────────────────────────────────────────────────────────────
  {
    name: 'Salbutamol Inhaler',
    genericName: 'Salbutamol',
    composition: 'Salbutamol 100mcg/dose',
    manufacturer: 'Cipla',
    categorySlug: 'respiratory',
    dosageForm: DosageForm.INHALER,
    strength: '100mcg',
    packSize: '200 doses',
    price: 450,
    mrp: 550,
    requiresPrescription: false,
    stockLevel: 80,
  },
  {
    name: 'Cetirizine 10mg',
    genericName: 'Cetirizine',
    composition: 'Cetirizine Dihydrochloride 10mg',
    manufacturer: 'Cosmos Pharma',
    categorySlug: 'respiratory',
    dosageForm: DosageForm.TABLET,
    strength: '10mg',
    packSize: 'Strip of 10',
    price: 60,
    mrp: 80,
    requiresPrescription: false,
    stockLevel: 600,
  },
  // ── Digestive ───────────────────────────────────────────────────────────────
  {
    name: 'Omeprazole 20mg',
    genericName: 'Omeprazole',
    composition: 'Omeprazole 20mg',
    manufacturer: 'Dawa Ltd',
    categorySlug: 'digestive-health',
    dosageForm: DosageForm.CAPSULE,
    strength: '20mg',
    packSize: 'Strip of 14',
    price: 180,
    mrp: 220,
    requiresPrescription: false,
    stockLevel: 350,
  },
  {
    name: 'ORS Sachets',
    genericName: 'ORS',
    composition: 'Sodium Chloride, Potassium Chloride, Glucose',
    manufacturer: 'WHO Standard',
    categorySlug: 'digestive-health',
    dosageForm: DosageForm.POWDER,
    strength: '20.5g',
    packSize: 'Pack of 10',
    price: 100,
    mrp: 120,
    requiresPrescription: false,
    stockLevel: 800,
  },
  // ── First Aid ───────────────────────────────────────────────────────────────
  {
    name: 'Betadine Solution',
    genericName: 'Povidone-Iodine',
    composition: 'Povidone-Iodine 10% w/v',
    manufacturer: 'Win-Medicare',
    categorySlug: 'first-aid',
    dosageForm: DosageForm.OTHER,
    strength: '100ml',
    packSize: 'Bottle of 100ml',
    price: 280,
    mrp: 350,
    requiresPrescription: false,
    stockLevel: 150,
  },
  {
    name: 'Band-Aid Flexible Fabric',
    genericName: 'Adhesive Bandage',
    composition: 'Fabric adhesive bandage',
    manufacturer: 'Johnson & Johnson',
    categorySlug: 'first-aid',
    dosageForm: DosageForm.OTHER,
    strength: 'Assorted',
    packSize: 'Box of 30',
    price: 220,
    mrp: 280,
    requiresPrescription: false,
    stockLevel: 200,
  },
  // ── Skin Care ───────────────────────────────────────────────────────────────
  {
    name: 'Sunscreen SPF 50',
    genericName: 'Sunscreen',
    composition: 'Titanium Dioxide, Zinc Oxide',
    manufacturer: 'Neutrogena',
    categorySlug: 'skin-care',
    dosageForm: DosageForm.CREAM,
    strength: 'SPF50',
    packSize: 'Tube of 50ml',
    price: 850,
    mrp: 1000,
    requiresPrescription: false,
    stockLevel: 90,
  },
  {
    name: 'Clotrimazole Cream',
    genericName: 'Clotrimazole',
    composition: 'Clotrimazole 1% w/w',
    manufacturer: 'Bayer',
    categorySlug: 'skin-care',
    dosageForm: DosageForm.CREAM,
    strength: '1%',
    packSize: 'Tube of 20g',
    price: 120,
    mrp: 150,
    requiresPrescription: false,
    stockLevel: 200,
  },
  // ── Eye & Ear Care ──────────────────────────────────────────────────────────
  {
    name: 'Gentamicin Eye Drops',
    genericName: 'Gentamicin',
    composition: 'Gentamicin Sulphate 0.3% w/v',
    manufacturer: 'Allergan',
    categorySlug: 'eye-ear-care',
    dosageForm: DosageForm.DROPS,
    strength: '10ml',
    packSize: 'Bottle of 10ml',
    price: 180,
    mrp: 220,
    requiresPrescription: true,
    stockLevel: 130,
  },
  // ── Herbal ──────────────────────────────────────────────────────────────────
  {
    name: 'Ashwagandha Capsules',
    genericName: 'Ashwagandha',
    composition: 'Withania Somnifera Extract 500mg',
    manufacturer: 'Himalaya',
    categorySlug: 'ayurvedic-herbal',
    dosageForm: DosageForm.CAPSULE,
    strength: '500mg',
    packSize: 'Bottle of 60',
    price: 550,
    mrp: 700,
    requiresPrescription: false,
    stockLevel: 150,
  },
  {
    name: 'Tulsi Drops',
    genericName: 'Holy Basil',
    composition: 'Ocimum Sanctum Extract',
    manufacturer: 'Organic India',
    categorySlug: 'ayurvedic-herbal',
    dosageForm: DosageForm.DROPS,
    strength: '30ml',
    packSize: 'Bottle of 30ml',
    price: 280,
    mrp: 350,
    requiresPrescription: false,
    stockLevel: 100,
  },
];

const REVIEW_COMMENTS = [
  'Great pharmacy, very fast delivery! 🚀',
  'Medicines were genuine and well-packed.',
  'The pharmacist was very helpful with my questions.',
  'Affordable prices and 24hr service is a lifesaver.',
  'Smooth ordering experience through the app.',
];

// ═════════════════════════════════════════════════════════════════════════════

async function seed() {
  console.log('💊 Connecting to database...');
  await ds.initialize();
  console.log('✅ Connected.\n');

  const storeRepo = ds.getRepository(PharmacyStore);
  const catRepo = ds.getRepository(PharmacyCategory);
  const itemRepo = ds.getRepository(PharmacyItem);
  const orderRepo = ds.getRepository(PharmacyOrder);
  const prescRepo = ds.getRepository(Prescription);
  const reviewRepo = ds.getRepository(PharmacyReview);
  const staffRepo = ds.getRepository(PharmacyStaff);
  const promoRepo = ds.getRepository(PharmacyPromotion);

  let totalStores = 0,
    totalCats = 0,
    totalItems = 0,
    totalOrders = 0;
  let totalPrescs = 0,
    totalReviews = 0,
    totalStaff = 0,
    totalPromos = 0;

  // ── Categories ────────────────────────────────────────────────────────────
  console.log('📂 Seeding categories...');
  const catMap: Record<string, string> = {};
  for (const c of CATEGORIES) {
    let cat = await catRepo.findOneBy({ slug: c.slug });
    if (!cat) {
      cat = catRepo.create({ ...c, isActive: true } as DeepPartial<PharmacyCategory>);
      cat = await catRepo.save(cat);
    }
    catMap[c.slug] = cat.id;
    totalCats++;
  }
  console.log(`   ✅ ${totalCats} categories\n`);

  // ── Stores ────────────────────────────────────────────────────────────────
  for (const data of STORES) {
    console.log(`🏥 ${data.name}`);
    let store = await storeRepo.findOneBy({ slug: data.slug });
    if (!store) {
      store = storeRepo.create({
        ...(data as DeepPartial<PharmacyStore>),
        openingHours: {
          mon: { open: '08:00', close: '22:00' },
          tue: { open: '08:00', close: '22:00' },
          wed: { open: '08:00', close: '22:00' },
          thu: { open: '08:00', close: '22:00' },
          fri: { open: '08:00', close: '22:00' },
          sat: { open: '09:00', close: '21:00' },
          sun: { open: '10:00', close: '18:00' },
        },
        isOnline: true,
        isTemporarilyClosed: false,
        deliveryEnabled: true,
        pickupEnabled: true,
      } as DeepPartial<PharmacyStore>);
      store = await storeRepo.save(store);
      console.log(`   ✅ Created (id: ${store.id})`);
    } else {
      console.log(`   ⏭️  Exists (id: ${store.id})`);
    }
    totalStores++;

    // ── Medicines ──────────────────────────────────────────────────────────
    for (const med of MEDICINES) {
      const exists = await itemRepo.findOneBy({ storeId: store.id, name: med.name });
      if (!exists) {
        const item = itemRepo.create({
          ...(med as DeepPartial<PharmacyItem>),
          storeId: store.id,
          slug: med.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          categoryId: catMap[med.categorySlug] ?? null,
          isAvailable: true,
          reorderLevel: 10,
          maxQuantityPerOrder: 10,
          tags: med.requiresPrescription ? ['Rx'] : ['OTC'],
        } as DeepPartial<PharmacyItem>);
        await itemRepo.save(item);
        totalItems++;
      }
    }
    console.log(`   💊 ${MEDICINES.length} medicines`);

    // ── Staff (3 per store) ───────────────────────────────────────────────
    const STAFF_TEMPLATES = [
      {
        name: `Pharmacist - ${store.name}`,
        role: PharmacyStaffRole.PHARMACIST,
        phone: `+91-7${String(totalStores).padStart(2, '0')}-001`,
      },
      {
        name: `Manager - ${store.name}`,
        role: PharmacyStaffRole.MANAGER,
        phone: `+91-7${String(totalStores).padStart(2, '0')}-002`,
      },
      {
        name: `Cashier - ${store.name}`,
        role: PharmacyStaffRole.CASHIER,
        phone: `+91-7${String(totalStores).padStart(2, '0')}-003`,
      },
    ];
    for (const s of STAFF_TEMPLATES) {
      const ex = await staffRepo.findOneBy({ storeId: store.id, role: s.role });
      if (!ex) {
        await staffRepo.save(
          staffRepo.create({
            ...s,
            storeId: store.id,
            isActive: true,
          } as DeepPartial<PharmacyStaff>),
        );
        totalStaff++;
      }
    }
    console.log(`   👥 3 staff`);

    // ── Promotions (2 per store) ──────────────────────────────────────────
    const PROMOS = [
      {
        title: 'First Order 20% OFF',
        code: `FIRST20-${store.slug.toUpperCase().slice(0, 6)}`,
        type: PharmacyPromoType.PERCENTAGE,
        value: 20,
        minOrderAmount: 200,
        maxDiscountAmount: 500,
        maxUses: 0,
        usesPerCustomer: 1,
      },
      {
        title: 'Free Delivery Weekend',
        code: `FREEDEL-${store.slug.toUpperCase().slice(0, 6)}`,
        type: PharmacyPromoType.FREE_DELIVERY,
        value: 0,
        minOrderAmount: 300,
        maxUses: 0,
        usesPerCustomer: 3,
      },
    ];
    for (const p of PROMOS) {
      const ex = await promoRepo.findOneBy({ code: p.code });
      if (!ex) {
        await promoRepo.save(
          promoRepo.create({
            ...p,
            storeId: store.id,
            isActive: true,
            startsAt: new Date(),
            expiresAt: new Date(Date.now() + 90 * 86400000),
          } as DeepPartial<PharmacyPromotion>),
        );
        totalPromos++;
      }
    }
    console.log(`   🎫 2 promotions`);

    // ── Reviews (5 per store) ─────────────────────────────────────────────
    for (let r = 0; r < 5; r++) {
      const ex = await reviewRepo.count({ where: { storeId: store.id } });
      if (ex < 5) {
        await reviewRepo.save(
          reviewRepo.create({
            storeId: store.id,
            customerId: `cust-${r + 1}`,
            customerName: [
              'John Odhiambo',
              'Mary Wanjiru',
              'David Meenakshi',
              'Grace Atieno',
              'Kevin Kibet',
            ][r],
            rating: [5, 4, 5, 4, 5][r],
            comment: REVIEW_COMMENTS[r],
          } as DeepPartial<PharmacyReview>),
        );
        totalReviews++;
      }
    }
    console.log(`   ⭐ 5 reviews`);

    // ── Orders (3 per store) ──────────────────────────────────────────────
    const ORDER_STATUSES = [
      PharmacyOrderStatus.COMPLETED,
      PharmacyOrderStatus.DELIVERED,
      PharmacyOrderStatus.PREPARING,
    ];
    for (let o = 0; o < 3; o++) {
      const orderNum = `PHM-${store.slug.slice(0, 4).toUpperCase()}-${1000 + o}`;
      const ex = await orderRepo.findOneBy({ orderNumber: orderNum });
      if (!ex) {
        await orderRepo.save(
          orderRepo.create({
            orderNumber: orderNum,
            storeId: store.id,
            customerId: `cust-order-${o + 1}`,
            orderType: PharmacyOrderType.DELIVERY,
            items: [
              {
                itemId: 'demo',
                name: MEDICINES[o].name,
                quantity: 2,
                price: MEDICINES[o].price,
                requiresPrescription: false,
                dosageForm: MEDICINES[o].dosageForm,
              },
            ],
            requiresPrescription: false,
            containsScheduleHDrugs: false,
            coldChainRequired: false,
            itemTotal: MEDICINES[o].price * 2,
            deliveryFee: 50,
            packagingFee: 0,
            platformFee: 15,
            taxAmount: Math.round(MEDICINES[o].price * 2 * 0.16),
            discount: 0,
            grandTotal:
              MEDICINES[o].price * 2 + 50 + 15 + Math.round(MEDICINES[o].price * 2 * 0.16),
            paymentMethod: PharmacyPaymentMethod.ONLINE,
            paymentStatus: PharmacyPaymentStatus.PAID,
            deliveryAddress: {
              line1: 'MG Road',
              city: 'Mumbai',
              pincode: '00100',
              lat: -1.287,
              lng: 36.82,
            },
            status: ORDER_STATUSES[o],
          } as DeepPartial<PharmacyOrder>),
        );
        totalOrders++;
      }
    }
    console.log(`   📦 3 orders`);

    // ── Prescriptions (2 per store) ───────────────────────────────────────
    for (let p = 0; p < 2; p++) {
      const ex = await prescRepo.count({ where: { storeId: store.id } });
      if (ex < 2) {
        await prescRepo.save(
          prescRepo.create({
            customerId: `cust-rx-${p + 1}`,
            storeId: store.id,
            patientName: ['Alice Mwende', 'Robert Njoroge'][p],
            patientAge: [34, 56][p],
            fileUrl: `https://cdn.kartseek.com/prescriptions/rx-${store.slug}-${p + 1}.jpg`,
            extractedMedicines:
              p === 0 ? ['Amoxicillin 500mg', 'Metformin 500mg'] : ['Amlodipine 5mg'],
            containsScheduleHDrugs: p === 0,
            status:
              p === 0
                ? PrescriptionStatus.VERIFIED_APPROVED
                : PrescriptionStatus.PENDING_VERIFICATION,
            verifiedByAdminId: p === 0 ? 'admin-1' : undefined,
            verifiedAt: p === 0 ? new Date() : undefined,
          } as DeepPartial<Prescription>),
        );
        totalPrescs++;
      }
    }
    console.log(`   📋 2 prescriptions`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('💊 Pharmacy Seed Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Categories:    ${totalCats}`);
  console.log(`   Stores:        ${totalStores}`);
  console.log(`   Medicines:     ${totalItems}`);
  console.log(`   Staff:         ${totalStaff}`);
  console.log(`   Promotions:    ${totalPromos}`);
  console.log(`   Reviews:       ${totalReviews}`);
  console.log(`   Orders:        ${totalOrders}`);
  console.log(`   Prescriptions: ${totalPrescs}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 Pharmacy seeding complete!\n');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
