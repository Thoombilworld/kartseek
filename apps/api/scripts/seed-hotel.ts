/**
 * Hotel Module — Database Seed Script
 *
 * Seeds the hotels, hotel_rooms, hotel_owners, hotel_reviews,
 * hotel_bookings, and hotel_seasonal_pricing tables with demo data.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register apps/api/scripts/seed-hotel.ts
 *
 * Or via npm:
 *   npm run seed:hotel
 *
 * This script is IDEMPOTENT — safe to re-run. Existing records are upserted.
 */

import { DataSource } from 'typeorm';
import { Hotel, HotelStatus, HotelType } from '../../../modules/hotel/backend/src/entities/hotel.entity';
import { HotelRoom, RoomType, RoomBedType, RoomStatus } from '../../../modules/hotel/backend/src/entities/hotel-room.entity';
import { HotelBooking, HotelBookingStatus, HotelPaymentMethod, HotelPaymentStatus } from '../../../modules/hotel/backend/src/entities/hotel-booking.entity';
import { HotelReview } from '../../../modules/hotel/backend/src/entities/hotel-review.entity';
import { HotelOwner, HotelOwnerStatus } from '../../../modules/hotel/backend/src/entities/hotel-owner.entity';
import { HotelGuest } from '../../../modules/hotel/backend/src/entities/hotel-guest.entity';
import { HotelPayout } from '../../../modules/hotel/backend/src/entities/hotel-payout.entity';
import { HotelStaff } from '../../../modules/hotel/backend/src/entities/hotel-staff.entity';
import { HotelSeasonalPricing } from '../../../modules/hotel/backend/src/entities/hotel-seasonal-pricing.entity';

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'kartseek123',
  // This vertical owns its own database now. Seeding kartseek_db would write
  // rows the service never reads, and leave the module looking empty.
  database: process.env.HOTEL_DB_NAME ?? process.env.DB_NAME ?? 'kartseek_hotel',
  // The module keeps its tables in the `hotel` schema, not `public`. Without
  // this the seed resolved `hotel_owners` against public and failed with
  // "relation does not exist" while the table sat one schema away.
  schema: 'hotel',
  entities: [Hotel, HotelRoom, HotelBooking, HotelReview, HotelOwner, HotelGuest, HotelPayout, HotelStaff, HotelSeasonalPricing],
  // The comment here used to read "creates tables if missing", which is the
  // opposite of what `false` does. The schema is created by the service on boot.
  synchronize: false,
});

// ── SEED DATA ──────────────────────────────────────────────────────────────────

const OWNERS: Partial<HotelOwner>[] = [
  {
    userId: 'owner-001', name: 'Ahmed Al Maktoum', email: 'ahmed@grandpalace.ae', phone: '+971501234567',
    businessName: 'Grand Palace Hospitality LLC', countryCode: 'AE', city: 'Dubai',
    businessAddress: 'Downtown Dubai, Business Bay',
    registrationNumber: 'TL-DXB-2022-9182', taxNumber: 'VAT-AE-3001928374',
    status: HotelOwnerStatus.VERIFIED, propertyCount: 2, avgRating: 4.8,
    bankDetails: { bankName: 'Emirates NBD', accountHolder: 'Grand Palace Hospitality LLC', accountNumber: '10120340567', iban: 'AE570260001012034056701', swift: 'EABORAEAXXX' },
  },
  {
    userId: 'owner-002', name: 'Rajesh Kapoor', email: 'rajesh@kartseekhotels.in', phone: '+919876543210',
    businessName: 'KARTSEEK Hotels Pvt. Ltd.', countryCode: 'IN', city: 'Mumbai',
    businessAddress: 'Bandra West, Mumbai 400050',
    registrationNumber: 'CIN-U55101MH2020PTC', taxNumber: 'GSTIN-27AAACK9283M1ZZ',
    status: HotelOwnerStatus.VERIFIED, propertyCount: 1, avgRating: 4.7,
    bankDetails: { bankName: 'HDFC Bank', accountHolder: 'KARTSEEK Hotels Pvt Ltd', accountNumber: '50200031245678', ifsc: 'HDFC0001234', swift: 'HDFCINBBXXX' },
  },
  {
    userId: 'owner-003', name: 'James Whitfield', email: 'james@heritagecollection.co.uk', phone: '+447912345678',
    businessName: 'Heritage Collection Hotels Ltd', countryCode: 'GB', city: 'London',
    businessAddress: '12 Mayfair Lane, London W1K 3QR',
    registrationNumber: 'UK-COH-12345678', taxNumber: 'GB-VAT-123456789',
    status: HotelOwnerStatus.VERIFIED, propertyCount: 1, avgRating: 4.9,
    bankDetails: { bankName: 'Barclays', accountHolder: 'Heritage Collection Hotels Ltd', accountNumber: '20456712', swift: 'BARCGB22', routingNumber: '20-45-67' },
  },
  {
    userId: 'owner-004', name: 'Fatima Al-Rashid', email: 'fatima@desertresorts.om', phone: '+96898765432',
    businessName: 'Desert Oasis Resorts SAOC', countryCode: 'OM', city: 'Muscat',
    businessAddress: 'Al Qurum Heights, Muscat',
    registrationNumber: 'OM-CR-98765', taxNumber: 'OM-VAT-5432109',
    status: HotelOwnerStatus.VERIFIED, propertyCount: 1, avgRating: 4.8,
    bankDetails: { bankName: 'Bank Muscat', accountHolder: 'Desert Oasis Resorts SAOC', accountNumber: '0123456789012', swift: 'BMUSOMRX' },
  },
  {
    userId: 'owner-005', name: 'Khalid Al-Thani', email: 'khalid@cityscape-doha.qa', phone: '+97455123456',
    businessName: 'Cityscape Hospitality WLL', countryCode: 'QA', city: 'Doha',
    businessAddress: 'West Bay, Doha',
    registrationNumber: 'QA-CR-54321', taxNumber: 'QA-TAX-8765432',
    status: HotelOwnerStatus.VERIFIED, propertyCount: 1, avgRating: 4.6,
    bankDetails: { bankName: 'Qatar National Bank', accountHolder: 'Cityscape Hospitality WLL', accountNumber: '0012345678901', swift: 'QNBAQAQAXXX' },
  },
  {
    userId: 'owner-006', name: 'Abdullah Al-Saud', email: 'abdullah@riyadhmodern.sa', phone: '+966501234567',
    businessName: 'Riyadh Modern Hotels Co.', countryCode: 'SA', city: 'Riyadh',
    businessAddress: 'Olaya District, Riyadh 12244',
    registrationNumber: 'SA-CR-7654321', taxNumber: 'SA-VAT-300567890100003',
    status: HotelOwnerStatus.VERIFIED, propertyCount: 1, avgRating: 4.5,
    bankDetails: { bankName: 'Al Rajhi Bank', accountHolder: 'Riyadh Modern Hotels Co', accountNumber: '2345678901234', iban: 'SA0380000000002345678901234', swift: 'RJHISARIXER' },
  },
];

const HOTELS: Partial<Hotel>[] = [
  {
    name: 'The Grand Palace Hotel', slug: 'grand-palace-dubai', ownerId: 'owner-001', ownerName: 'Grand Palace Hospitality LLC',
    description: 'Experience unparalleled luxury at The Grand Palace Hotel, nestled in the heart of Dubai. With breathtaking views of the Burj Khalifa and Dubai Fountain, our 5-star property offers world-class dining, a tranquil spa retreat, and impeccable service that defines Arabian hospitality.',
    address: 'Sheikh Mohammed bin Rashid Blvd, Downtown Dubai', city: 'Dubai', state: 'Dubai', pincode: '12345', countryCode: 'AE',
    latitude: 25.1972, longitude: 55.2744, regionCode: 'AE-DU',
    landmark: 'Adjacent to Dubai Mall', distanceFromCenter: 2.1,
    type: HotelType.HOTEL, starRating: 5,
    amenities: ['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Parking', 'Concierge', 'Room Service', 'Business Center', 'Kids Club', 'Airport Shuttle'],
    tags: ['Luxury', 'City View', 'Family-Friendly', 'Business'],
    phone: '+97142345678', email: 'reservations@grandpalace.ae', website: 'https://grandpalace.ae',
    checkInTime: '14:00', checkOutTime: '12:00', totalRooms: 320, totalFloors: 42, yearBuilt: 2015, lastRenovated: 2023,
    cancellationPolicy: { freeCancellationHours: 48, partialRefundPercentage: 50, nonRefundableDiscount: 15 },
    childrenPolicy: 'Children under 6 stay free. Extra bed available for children 6-12 at AED 150/night.',
    petsAllowed: false, smokingAllowed: false,
    rating: 4.8, reviewCount: 1240, totalBookings: 8500, occupancyRate: 82.5,
    commissionRate: 12.0, taxRate: 5.0, currency: 'AED',
    status: HotelStatus.ACTIVE, isFeatured: true, isAcceptingBookings: true,
    nearbyAttractions: [
      { name: 'Dubai Mall', distance: '350m', type: 'Shopping' },
      { name: 'Burj Khalifa', distance: '500m', type: 'Landmark' },
      { name: 'Dubai Fountain', distance: '200m', type: 'Entertainment' },
      { name: 'Dubai Opera', distance: '800m', type: 'Culture' },
    ],
  },
  {
    name: 'KARTSEEK Business Suites', slug: 'kartseek-business-doha', ownerId: 'owner-005', ownerName: 'Cityscape Hospitality WLL',
    description: 'Purpose-built for the modern business traveler, KARTSEEK Business Suites features cutting-edge meeting facilities, ultra-fast connectivity, and serene workspaces. Located in Doha\'s prestigious West Bay financial district.',
    address: 'West Bay, Al Dafna', city: 'Doha', state: 'Ad Dawhah', pincode: '00000', countryCode: 'QA',
    latitude: 25.3236, longitude: 51.5310, regionCode: 'QA-DA',
    landmark: 'Near City Center Doha', distanceFromCenter: 1.5,
    type: HotelType.BUSINESS, starRating: 4,
    amenities: ['WiFi', 'Gym', 'Restaurant', 'Meeting Room', 'Business Center', 'Parking', 'Room Service', 'Dry Cleaning', 'Airport Shuttle'],
    tags: ['Business', 'Executive', 'Modern'],
    phone: '+97444567890', email: 'stay@kartseek-suites.qa', website: 'https://kartseek-suites.qa',
    checkInTime: '15:00', checkOutTime: '12:00', totalRooms: 180, totalFloors: 28, yearBuilt: 2019,
    cancellationPolicy: { freeCancellationHours: 24, partialRefundPercentage: 40 },
    childrenPolicy: 'Children under 5 stay free with existing bedding.',
    petsAllowed: false, smokingAllowed: false,
    rating: 4.6, reviewCount: 890, totalBookings: 5200, occupancyRate: 78.0,
    commissionRate: 14.0, taxRate: 0, currency: 'QAR',
    status: HotelStatus.ACTIVE, isFeatured: false, isAcceptingBookings: true,
    nearbyAttractions: [
      { name: 'City Center Doha', distance: '400m', type: 'Shopping' },
      { name: 'Corniche', distance: '1.2km', type: 'Waterfront' },
      { name: 'Museum of Islamic Art', distance: '3km', type: 'Culture' },
    ],
  },
  {
    name: 'Seaside Family Resort', slug: 'seaside-resort-mumbai', ownerId: 'owner-002', ownerName: 'KARTSEEK Hotels Pvt. Ltd.',
    description: 'A beachfront paradise perfect for family getaways. Enjoy private beach access, water sports, a dedicated kids club, and multiple dining options featuring fresh coastal cuisine. Wake up to the sound of Arabian Sea waves.',
    address: 'Juhu Beach Road, Juhu', city: 'Mumbai', state: 'Maharashtra', pincode: '400049', countryCode: 'IN',
    latitude: 19.0987, longitude: 72.8267, regionCode: 'IN-MH',
    landmark: 'Juhu Beachfront', distanceFromCenter: 12.0,
    type: HotelType.RESORT, starRating: 5,
    amenities: ['WiFi', 'Pool', 'Beach', 'Kids Club', 'Restaurant', 'Spa', 'Water Sports', 'Parking', 'Room Service', 'Yoga Studio'],
    tags: ['Beachfront', 'Family-Friendly', 'Resort', 'Water Sports'],
    phone: '+912226789012', email: 'hello@seasideresort.in', website: 'https://seasideresort.in',
    checkInTime: '14:00', checkOutTime: '11:00', totalRooms: 200, totalFloors: 8, yearBuilt: 2012, lastRenovated: 2022,
    cancellationPolicy: { freeCancellationHours: 72, partialRefundPercentage: 60, nonRefundableDiscount: 20 },
    childrenPolicy: 'Children under 8 stay free. Kids Club available 9 AM – 6 PM.',
    petsAllowed: false, smokingAllowed: false,
    rating: 4.7, reviewCount: 2100, totalBookings: 12000, occupancyRate: 88.0,
    commissionRate: 10.0, taxRate: 18.0, currency: 'INR',
    status: HotelStatus.ACTIVE, isFeatured: true, isAcceptingBookings: true,
    nearbyAttractions: [
      { name: 'Juhu Beach', distance: '0m', type: 'Beach' },
      { name: 'ISKCON Temple', distance: '2km', type: 'Temple' },
      { name: 'PVR Juhu', distance: '1.5km', type: 'Cinema' },
    ],
  },
  {
    name: 'Heritage Boutique Hotel', slug: 'heritage-boutique-london', ownerId: 'owner-003', ownerName: 'Heritage Collection Hotels Ltd',
    description: 'A lovingly restored Georgian townhouse in the heart of Mayfair, blending 18th-century grandeur with contemporary sophistication. Each of our 45 rooms tells a unique story through bespoke furnishings and curated artwork.',
    address: '12 Mayfair Lane', city: 'London', state: 'Greater London', pincode: 'W1K 3QR', countryCode: 'GB',
    latitude: 51.5074, longitude: -0.1478, regionCode: 'GB-LND',
    landmark: 'Near Bond Street', distanceFromCenter: 0.8,
    type: HotelType.BOUTIQUE, starRating: 5,
    amenities: ['WiFi', 'Bar', 'Restaurant', 'Concierge', 'Room Service', 'Valet Parking', 'Afternoon Tea', 'Library'],
    tags: ['Boutique', 'Heritage', 'Luxury', 'Romantic'],
    phone: '+442071234567', email: 'reservations@heritageboutique.co.uk', website: 'https://heritageboutique.co.uk',
    checkInTime: '15:00', checkOutTime: '11:00', totalRooms: 45, totalFloors: 5, yearBuilt: 1812, lastRenovated: 2024,
    cancellationPolicy: { freeCancellationHours: 48, partialRefundPercentage: 50 },
    childrenPolicy: 'Children above 12 welcome. No extra bed available.',
    petsAllowed: true, smokingAllowed: false,
    rating: 4.9, reviewCount: 560, totalBookings: 3200, occupancyRate: 91.0,
    commissionRate: 8.0, taxRate: 20.0, currency: 'GBP',
    status: HotelStatus.ACTIVE, isFeatured: true, isAcceptingBookings: true,
    nearbyAttractions: [
      { name: 'Bond Street', distance: '200m', type: 'Shopping' },
      { name: 'Hyde Park', distance: '600m', type: 'Park' },
      { name: 'Buckingham Palace', distance: '1.2km', type: 'Landmark' },
      { name: 'Royal Academy of Arts', distance: '400m', type: 'Culture' },
    ],
  },
  {
    name: 'Cityscape Modern Hotel', slug: 'cityscape-modern-riyadh', ownerId: 'owner-006', ownerName: 'Riyadh Modern Hotels Co.',
    description: 'A sleek, modern hotel in the heart of Riyadh\'s Olaya District. Designed for both business and leisure travelers, featuring panoramic city views, a rooftop infinity pool, and world-class dining.',
    address: 'Olaya Street, Al Olaya District', city: 'Riyadh', state: 'Riyadh Province', pincode: '12244', countryCode: 'SA',
    latitude: 24.6877, longitude: 46.6811, regionCode: 'SA-01',
    landmark: 'Near Kingdom Tower', distanceFromCenter: 3.2,
    type: HotelType.HOTEL, starRating: 4,
    amenities: ['WiFi', 'Pool', 'Gym', 'Lounge', 'Restaurant', 'Parking', 'Room Service', 'Business Center', 'Concierge'],
    tags: ['Modern', 'City View', 'Rooftop Pool'],
    phone: '+966112345678', email: 'info@cityscapemodern.sa', website: 'https://cityscapemodern.sa',
    checkInTime: '15:00', checkOutTime: '12:00', totalRooms: 240, totalFloors: 35, yearBuilt: 2021,
    cancellationPolicy: { freeCancellationHours: 24, partialRefundPercentage: 30 },
    childrenPolicy: 'Children under 6 stay free.',
    petsAllowed: false, smokingAllowed: false,
    rating: 4.5, reviewCount: 670, totalBookings: 4800, occupancyRate: 75.0,
    commissionRate: 15.0, taxRate: 15.0, currency: 'SAR',
    status: HotelStatus.ACTIVE, isFeatured: false, isAcceptingBookings: true,
    nearbyAttractions: [
      { name: 'Kingdom Tower', distance: '1km', type: 'Landmark' },
      { name: 'Al Faisaliyah Tower', distance: '800m', type: 'Landmark' },
      { name: 'Riyadh Gallery Mall', distance: '1.5km', type: 'Shopping' },
    ],
  },
  {
    name: 'Desert Oasis Resort', slug: 'desert-oasis-muscat', ownerId: 'owner-004', ownerName: 'Desert Oasis Resorts SAOC',
    description: 'An enchanting desert retreat surrounded by golden dunes and dramatic Omani landscapes. Enjoy luxury glamping, desert safari experiences, stargazing, and authentic Bedouin-inspired hospitality.',
    address: 'Wahiba Sands Road, Bidiyah', city: 'Muscat', state: 'Ash Sharqiyah', countryCode: 'OM',
    latitude: 22.7684, longitude: 58.5410, regionCode: 'OM-SS',
    landmark: 'Wahiba Sands Desert', distanceFromCenter: 12.0,
    type: HotelType.RESORT, starRating: 5,
    amenities: ['WiFi', 'Pool', 'Spa', 'Desert Safari', 'Restaurant', 'Stargazing', 'Camel Rides', 'Archery', 'Bonfire'],
    tags: ['Desert', 'Resort', 'Adventure', 'Romantic', 'Eco-Friendly'],
    phone: '+96824567890', email: 'escape@desertoasis.om', website: 'https://desertoasis.om',
    checkInTime: '14:00', checkOutTime: '11:00', totalRooms: 60, totalFloors: 2, yearBuilt: 2018,
    cancellationPolicy: { freeCancellationHours: 72, partialRefundPercentage: 70, nonRefundableDiscount: 25 },
    childrenPolicy: 'Children under 10 stay free. Family tents available.',
    petsAllowed: false, smokingAllowed: false,
    rating: 4.8, reviewCount: 430, totalBookings: 2800, occupancyRate: 85.0,
    commissionRate: 10.0, taxRate: 5.0, currency: 'OMR',
    status: HotelStatus.ACTIVE, isFeatured: true, isAcceptingBookings: true,
    nearbyAttractions: [
      { name: 'Wahiba Sands', distance: '0m', type: 'Nature' },
      { name: 'Wadi Bani Khalid', distance: '35km', type: 'Nature' },
      { name: 'Sur City', distance: '80km', type: 'Town' },
    ],
  },
  {
    name: 'Palm Residences Apartment Hotel', slug: 'palm-residences-dubai', ownerId: 'owner-001', ownerName: 'Grand Palace Hospitality LLC',
    description: 'Spacious serviced apartments on the iconic Palm Jumeirah. Ideal for extended stays with full kitchen facilities, private beach access, and resort-style amenities.',
    address: 'The Palm Jumeirah, Crescent Road', city: 'Dubai', state: 'Dubai', countryCode: 'AE',
    latitude: 25.1124, longitude: 55.1390, regionCode: 'AE-DU',
    landmark: 'Palm Jumeirah Crescent', distanceFromCenter: 18.0,
    type: HotelType.APARTMENT, starRating: 4,
    amenities: ['WiFi', 'Pool', 'Beach', 'Gym', 'Kitchen', 'Parking', 'Laundry', 'Kids Play Area'],
    tags: ['Apartment', 'Extended Stay', 'Beach', 'Family-Friendly'],
    phone: '+97143456789', email: 'stay@palmresidences.ae',
    checkInTime: '15:00', checkOutTime: '11:00', totalRooms: 150, totalFloors: 12, yearBuilt: 2017,
    cancellationPolicy: { freeCancellationHours: 48, partialRefundPercentage: 50 },
    childrenPolicy: 'Children of all ages welcome. Crib available on request.',
    petsAllowed: true, smokingAllowed: false,
    rating: 4.4, reviewCount: 380, totalBookings: 3100, occupancyRate: 72.0,
    commissionRate: 13.0, taxRate: 5.0, currency: 'AED',
    status: HotelStatus.ACTIVE, isFeatured: false, isAcceptingBookings: true,
    nearbyAttractions: [
      { name: 'Atlantis The Palm', distance: '3km', type: 'Landmark' },
      { name: 'Nakheel Mall', distance: '2km', type: 'Shopping' },
    ],
  },
  {
    name: 'Backpackers Hub Hostel', slug: 'backpackers-hub-mumbai', ownerId: 'owner-002', ownerName: 'KARTSEEK Hotels Pvt. Ltd.',
    description: 'A vibrant, social hostel in the heart of Colaba. Dorm beds and private rooms for budget travelers. Rooftop cafe, free walking tours, and the best location to explore South Mumbai.',
    address: 'Colaba Causeway, Colaba', city: 'Mumbai', state: 'Maharashtra', pincode: '400005', countryCode: 'IN',
    latitude: 18.9220, longitude: 72.8347, regionCode: 'IN-MH',
    landmark: 'Colaba Causeway', distanceFromCenter: 0.5,
    type: HotelType.HOSTEL, starRating: 2,
    amenities: ['WiFi', 'Rooftop Cafe', 'Locker', 'Common Kitchen', 'Laundry', 'Travel Desk'],
    tags: ['Budget', 'Backpacker', 'Social', 'Central Location'],
    phone: '+912222345678', email: 'hello@backpackershub.in',
    checkInTime: '13:00', checkOutTime: '11:00', totalRooms: 30, totalFloors: 3, yearBuilt: 2020,
    cancellationPolicy: { freeCancellationHours: 24 },
    childrenPolicy: 'Guests must be 16+ for dormitory rooms. Private rooms open to all ages.',
    petsAllowed: false, smokingAllowed: false,
    rating: 4.3, reviewCount: 950, totalBookings: 6200, occupancyRate: 90.0,
    commissionRate: 18.0, taxRate: 12.0, currency: 'INR',
    status: HotelStatus.ACTIVE, isFeatured: false, isAcceptingBookings: true,
    nearbyAttractions: [
      { name: 'Gateway of India', distance: '500m', type: 'Landmark' },
      { name: 'Taj Mahal Palace', distance: '400m', type: 'Landmark' },
      { name: 'Colaba Market', distance: '0m', type: 'Shopping' },
    ],
  },
];

// ── Room generator per hotel ────────────────────────────────────────────────

function generateRooms(hotelId: string, hotelSlug: string): Partial<HotelRoom>[] {
  const roomSets: Record<string, Partial<HotelRoom>[]> = {
    'grand-palace-dubai': [
      { name: 'Grand Deluxe Room', type: RoomType.DELUXE, bedType: RoomBedType.KING, description: 'Spacious 45 sqm room with panoramic Burj Khalifa views, marble bathroom, and premium linens.', maxGuests: 3, maxAdults: 2, maxChildren: 1, area: '45 sqm', pricePerNight: 850, rackRate: 1100, currency: 'AED', extraBedCharge: 200, taxPercentage: 5, totalInventory: 80, availableCount: 62, amenities: ['WiFi', 'Mini Bar', 'Safe', 'City View', 'Rain Shower', 'Nespresso Machine'], view: 'City View', hasBalcony: true, breakfastIncluded: true, freeCancellation: true, payAtHotel: true, status: RoomStatus.ACTIVE },
      { name: 'Premier Suite', type: RoomType.SUITE, bedType: RoomBedType.KING, description: 'Luxurious 80 sqm suite with separate living area, dining space, and stunning fountain views.', maxGuests: 4, maxAdults: 3, maxChildren: 2, area: '80 sqm', pricePerNight: 1800, rackRate: 2200, currency: 'AED', extraBedCharge: 300, taxPercentage: 5, totalInventory: 30, availableCount: 22, amenities: ['WiFi', 'Mini Bar', 'Safe', 'Fountain View', 'Jacuzzi', 'Butler Service', 'Nespresso Machine', 'Bose Speaker'], view: 'Fountain View', hasBalcony: true, hasLivingRoom: true, breakfastIncluded: true, halfBoardAvailable: true, freeCancellation: true, status: RoomStatus.ACTIVE },
      { name: 'Standard Twin Room', type: RoomType.STANDARD, bedType: RoomBedType.TWIN, description: 'Comfortable 35 sqm twin room ideal for business travelers.', maxGuests: 2, maxAdults: 2, maxChildren: 0, area: '35 sqm', pricePerNight: 550, rackRate: 700, currency: 'AED', taxPercentage: 5, totalInventory: 60, availableCount: 48, amenities: ['WiFi', 'Mini Bar', 'Safe', 'Work Desk'], view: 'Garden View', breakfastIncluded: false, freeCancellation: true, payAtHotel: true, status: RoomStatus.ACTIVE },
      { name: 'Presidential Suite', type: RoomType.PRESIDENTIAL_SUITE, bedType: RoomBedType.KING, description: 'The crown jewel — 200 sqm of ultimate luxury with private terrace, personal butler, and panoramic views.', maxGuests: 4, maxAdults: 2, maxChildren: 2, area: '200 sqm', pricePerNight: 8500, rackRate: 10000, currency: 'AED', extraBedCharge: 500, taxPercentage: 5, totalInventory: 2, availableCount: 1, amenities: ['WiFi', 'Mini Bar', 'Safe', 'Private Terrace', 'Jacuzzi', 'Butler Service', 'Grand Piano', 'Private Dining'], view: 'Panoramic', hasBalcony: true, hasLivingRoom: true, hasKitchenette: true, breakfastIncluded: true, fullBoardAvailable: true, allInclusiveAvailable: true, freeCancellation: false, nonRefundableRate: true, status: RoomStatus.ACTIVE },
    ],
    'kartseek-business-doha': [
      { name: 'Executive Room', type: RoomType.STANDARD, bedType: RoomBedType.QUEEN, description: 'Well-appointed 30 sqm room with executive work desk and high-speed internet.', maxGuests: 2, maxAdults: 2, area: '30 sqm', pricePerNight: 380, rackRate: 450, currency: 'QAR', taxPercentage: 0, totalInventory: 80, availableCount: 65, amenities: ['WiFi', 'Work Desk', 'Safe', 'Iron'], view: 'City View', breakfastIncluded: true, freeCancellation: true, payAtHotel: true, status: RoomStatus.ACTIVE },
      { name: 'Executive Suite', type: RoomType.EXECUTIVE_SUITE, bedType: RoomBedType.KING, description: '55 sqm suite with separate office, meeting table for 4, and panoramic bay views.', maxGuests: 3, maxAdults: 2, maxChildren: 1, area: '55 sqm', pricePerNight: 680, rackRate: 800, currency: 'QAR', extraBedCharge: 150, taxPercentage: 0, totalInventory: 25, availableCount: 18, amenities: ['WiFi', 'Meeting Table', 'Safe', 'Printer', 'Nespresso', 'Bay View'], view: 'Bay View', hasLivingRoom: true, breakfastIncluded: true, halfBoardAvailable: true, freeCancellation: true, status: RoomStatus.ACTIVE },
    ],
    'seaside-resort-mumbai': [
      { name: 'Sea View Deluxe', type: RoomType.DELUXE, bedType: RoomBedType.KING, description: '40 sqm room with private balcony overlooking the Arabian Sea.', maxGuests: 3, maxAdults: 2, maxChildren: 1, area: '40 sqm', pricePerNight: 12000, rackRate: 15000, currency: 'INR', extraBedCharge: 2500, taxPercentage: 18, totalInventory: 60, availableCount: 42, amenities: ['WiFi', 'Mini Bar', 'Safe', 'Sea View', 'Rain Shower'], view: 'Sea View', hasBalcony: true, breakfastIncluded: true, freeCancellation: true, status: RoomStatus.ACTIVE },
      { name: 'Family Suite', type: RoomType.FAMILY, bedType: RoomBedType.KING_PLUS_TWIN, description: '70 sqm suite with connecting kids room, bunk beds, and game console.', maxGuests: 5, maxAdults: 2, maxChildren: 3, area: '70 sqm', pricePerNight: 18000, rackRate: 22000, currency: 'INR', taxPercentage: 18, totalInventory: 15, availableCount: 10, amenities: ['WiFi', 'Mini Bar', 'Safe', 'Sea View', 'Game Console', 'Kids Corner'], view: 'Sea View', hasBalcony: true, hasLivingRoom: true, breakfastIncluded: true, fullBoardAvailable: true, freeCancellation: true, status: RoomStatus.ACTIVE },
      { name: 'Garden View Standard', type: RoomType.STANDARD, bedType: RoomBedType.DOUBLE, description: '30 sqm room with garden views and pool access.', maxGuests: 2, maxAdults: 2, area: '30 sqm', pricePerNight: 8500, rackRate: 10000, currency: 'INR', taxPercentage: 18, totalInventory: 50, availableCount: 38, amenities: ['WiFi', 'Safe', 'Garden View'], view: 'Garden View', breakfastIncluded: false, freeCancellation: true, payAtHotel: true, status: RoomStatus.ACTIVE },
    ],
    'heritage-boutique-london': [
      { name: 'Classic Heritage Room', type: RoomType.DELUXE, bedType: RoomBedType.QUEEN, description: 'Individually designed 28 sqm room with period furnishings and modern comforts.', maxGuests: 2, maxAdults: 2, area: '28 sqm', pricePerNight: 420, rackRate: 520, currency: 'GBP', taxPercentage: 20, totalInventory: 20, availableCount: 15, amenities: ['WiFi', 'Mini Bar', 'Safe', 'Nespresso', 'Complimentary Newspaper'], view: 'Street View', breakfastIncluded: true, freeCancellation: true, status: RoomStatus.ACTIVE },
      { name: 'Mayfair Suite', type: RoomType.SUITE, bedType: RoomBedType.KING, description: '55 sqm suite with antique writing desk, four-poster bed, and marble bathroom.', maxGuests: 2, maxAdults: 2, area: '55 sqm', pricePerNight: 780, rackRate: 950, currency: 'GBP', taxPercentage: 20, totalInventory: 8, availableCount: 5, amenities: ['WiFi', 'Mini Bar', 'Safe', 'Four-Poster Bed', 'Roll-Top Bath', 'Butler Service'], view: 'Courtyard View', hasLivingRoom: true, breakfastIncluded: true, halfBoardAvailable: true, freeCancellation: true, status: RoomStatus.ACTIVE },
    ],
    'cityscape-modern-riyadh': [
      { name: 'Modern King Room', type: RoomType.STANDARD, bedType: RoomBedType.KING, description: '35 sqm room with contemporary design and city skyline views.', maxGuests: 2, maxAdults: 2, area: '35 sqm', pricePerNight: 480, rackRate: 580, currency: 'SAR', taxPercentage: 15, totalInventory: 100, availableCount: 78, amenities: ['WiFi', 'Mini Bar', 'Safe', 'Smart TV', 'USB Charging'], view: 'City View', breakfastIncluded: true, freeCancellation: true, payAtHotel: true, status: RoomStatus.ACTIVE },
      { name: 'Premium Panorama Suite', type: RoomType.PREMIUM, bedType: RoomBedType.KING, description: '60 sqm corner suite with 270-degree skyline views and lounge access.', maxGuests: 3, maxAdults: 2, maxChildren: 1, area: '60 sqm', pricePerNight: 950, rackRate: 1200, currency: 'SAR', extraBedCharge: 200, taxPercentage: 15, totalInventory: 20, availableCount: 14, amenities: ['WiFi', 'Mini Bar', 'Safe', 'Lounge Access', 'Panoramic View', 'Rainfall Shower'], view: 'Panoramic', hasBalcony: true, hasLivingRoom: true, breakfastIncluded: true, halfBoardAvailable: true, freeCancellation: true, status: RoomStatus.ACTIVE },
    ],
    'desert-oasis-muscat': [
      { name: 'Desert Tent Suite', type: RoomType.SUITE, bedType: RoomBedType.KING, description: 'Luxury canvas tent with en-suite bathroom, private deck, and unobstructed dune views.', maxGuests: 2, maxAdults: 2, area: '45 sqm', pricePerNight: 220, rackRate: 280, currency: 'OMR', taxPercentage: 5, totalInventory: 30, availableCount: 22, amenities: ['WiFi', 'Mini Bar', 'Private Deck', 'Outdoor Shower', 'Stargazing Telescope'], view: 'Desert View', hasBalcony: true, breakfastIncluded: true, halfBoardAvailable: true, fullBoardAvailable: true, freeCancellation: true, status: RoomStatus.ACTIVE },
      { name: 'Royal Desert Villa', type: RoomType.PENTHOUSE, bedType: RoomBedType.KING, description: '100 sqm standalone villa with private plunge pool, fire pit, and personal chef option.', maxGuests: 4, maxAdults: 2, maxChildren: 2, area: '100 sqm', pricePerNight: 480, rackRate: 600, currency: 'OMR', extraBedCharge: 50, taxPercentage: 5, totalInventory: 5, availableCount: 3, amenities: ['WiFi', 'Private Pool', 'Fire Pit', 'Butler Service', 'Personal Chef', 'Spa Bath'], view: 'Desert Panorama', hasBalcony: true, hasLivingRoom: true, hasKitchenette: true, breakfastIncluded: true, fullBoardAvailable: true, allInclusiveAvailable: true, freeCancellation: true, status: RoomStatus.ACTIVE },
    ],
    'palm-residences-dubai': [
      { name: 'One-Bedroom Apartment', type: RoomType.STUDIO, bedType: RoomBedType.QUEEN, description: '55 sqm apartment with full kitchen, washer/dryer, and beach access.', maxGuests: 3, maxAdults: 2, maxChildren: 1, area: '55 sqm', pricePerNight: 650, rackRate: 800, currency: 'AED', extraBedCharge: 150, taxPercentage: 5, totalInventory: 80, availableCount: 60, amenities: ['WiFi', 'Kitchen', 'Washer', 'Dryer', 'Beach Access', 'Parking'], view: 'Sea View', hasKitchenette: true, breakfastIncluded: false, freeCancellation: true, payAtHotel: true, status: RoomStatus.ACTIVE },
      { name: 'Two-Bedroom Premium', type: RoomType.FAMILY, bedType: RoomBedType.KING_PLUS_TWIN, description: '90 sqm apartment with two bedrooms, full kitchen, and sea views.', maxGuests: 5, maxAdults: 3, maxChildren: 2, area: '90 sqm', pricePerNight: 1100, rackRate: 1400, currency: 'AED', taxPercentage: 5, totalInventory: 40, availableCount: 28, amenities: ['WiFi', 'Kitchen', 'Washer', 'Dryer', 'Beach Access', 'Parking', 'Smart TV'], view: 'Sea View', hasKitchenette: true, hasLivingRoom: true, breakfastIncluded: false, freeCancellation: true, status: RoomStatus.ACTIVE },
    ],
    'backpackers-hub-mumbai': [
      { name: '6-Bed Mixed Dormitory', type: RoomType.DORMITORY, bedType: RoomBedType.BUNK, description: 'Clean, secure 6-bed mixed dorm with personal lockers and reading lights.', maxGuests: 1, maxAdults: 1, area: '6 sqm', pricePerNight: 800, rackRate: 1000, currency: 'INR', taxPercentage: 12, totalInventory: 60, availableCount: 45, amenities: ['WiFi', 'Locker', 'Reading Light', 'Power Outlet', 'Shared Bathroom'], breakfastIncluded: false, freeCancellation: true, payAtHotel: true, status: RoomStatus.ACTIVE },
      { name: 'Private Double Room', type: RoomType.STANDARD, bedType: RoomBedType.DOUBLE, description: 'Compact 15 sqm private room with en-suite shower and rooftop cafe access.', maxGuests: 2, maxAdults: 2, area: '15 sqm', pricePerNight: 2500, rackRate: 3000, currency: 'INR', taxPercentage: 12, totalInventory: 10, availableCount: 7, amenities: ['WiFi', 'Safe', 'En-Suite Shower', 'Rooftop Access'], breakfastIncluded: true, freeCancellation: true, payAtHotel: true, status: RoomStatus.ACTIVE },
    ],
  };

  return (roomSets[hotelSlug] || []).map(r => ({ ...r, hotelId }));
}

// ── Reviews ────────────────────────────────────────────────────────────────

function generateReviews(hotelId: string): Partial<HotelReview>[] {
  return [
    { hotelId, customerId: 'cust-001', customerName: 'Sarah Mitchell', rating: 5, cleanlinessRating: 5, serviceRating: 5, locationRating: 5, valueRating: 4, amenitiesRating: 5, title: 'Absolutely stunning — best stay ever!', comment: 'From the moment we arrived, everything was perfect. The room was immaculate, the staff remembered our names, and the breakfast buffet was extraordinary. Will definitely return!', stayType: 'Couple', roomType: 'Deluxe', stayDate: '2026-05-15', helpfulCount: 24, isVisible: true },
    { hotelId, customerId: 'cust-002', customerName: 'Mohammed Al-Farsi', rating: 4, cleanlinessRating: 5, serviceRating: 4, locationRating: 5, valueRating: 3, amenitiesRating: 4, title: 'Great location, slightly overpriced', comment: 'The hotel is in a fantastic location and very clean. Service was good but not exceptional for the price point. The pool area gets crowded on weekends.', stayType: 'Business', roomType: 'Standard', stayDate: '2026-04-22', helpfulCount: 12, isVisible: true },
    { hotelId, customerId: 'cust-003', customerName: 'Priya Sharma', rating: 5, cleanlinessRating: 5, serviceRating: 5, locationRating: 4, valueRating: 5, amenitiesRating: 5, title: 'Perfect family vacation!', comment: 'Kids loved the pool and kids club. The family suite was spacious and well-equipped. Staff arranged a birthday surprise for my daughter — above and beyond!', stayType: 'Family', roomType: 'Family Suite', stayDate: '2026-06-10', helpfulCount: 31, isVisible: true },
    { hotelId, customerId: 'cust-004', customerName: 'James Henderson', rating: 4, cleanlinessRating: 4, serviceRating: 5, locationRating: 4, valueRating: 4, amenitiesRating: 4, title: 'Excellent business hotel', comment: 'Fast WiFi, quiet rooms, and the meeting facilities are top-notch. The restaurant options are limited for dinner though. Overall a solid choice for business travel.', stayType: 'Solo', roomType: 'Executive', stayDate: '2026-03-18', helpfulCount: 8, isVisible: true },
    { hotelId, customerId: 'cust-005', customerName: 'Aisha Al-Rashidi', rating: 5, cleanlinessRating: 5, serviceRating: 5, locationRating: 5, valueRating: 5, amenitiesRating: 5, title: 'A magical experience', comment: 'This was our anniversary trip and the hotel made it unforgettable. The suite was decorated with rose petals, complimentary champagne on arrival, and a private dinner arranged on the terrace. Truly magical.', stayType: 'Couple', roomType: 'Suite', stayDate: '2026-06-25', helpfulCount: 45, isVisible: true },
  ];
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Connecting to database...');
  await ds.initialize();
  console.log('✅ Connected\n');

  const ownerRepo = ds.getRepository(HotelOwner);
  const hotelRepo = ds.getRepository(Hotel);
  const roomRepo = ds.getRepository(HotelRoom);
  const reviewRepo = ds.getRepository(HotelReview);

  // 1. Seed owners
  console.log('👤 Seeding hotel owners...');
  for (const owner of OWNERS) {
    const existing = await ownerRepo.findOne({ where: { userId: owner.userId } });
    if (existing) {
      await ownerRepo.update(existing.id, owner);
    } else {
      await ownerRepo.save(ownerRepo.create(owner));
    }
  }
  console.log(`   ✅ ${OWNERS.length} owners upserted\n`);

  // 2. Seed hotels
  console.log('🏨 Seeding hotels...');
  const savedHotels: Hotel[] = [];
  for (const hotel of HOTELS) {
    const existing = await hotelRepo.findOne({ where: { slug: hotel.slug } });
    if (existing) {
      await hotelRepo.update(existing.id, hotel);
      savedHotels.push({ ...existing, ...hotel } as Hotel);
    } else {
      const saved = await hotelRepo.save(hotelRepo.create(hotel));
      savedHotels.push(saved);
    }
  }
  console.log(`   ✅ ${savedHotels.length} hotels upserted\n`);

  // 3. Seed rooms for each hotel
  console.log('🛏️  Seeding rooms...');
  let totalRooms = 0;
  for (const hotel of savedHotels) {
    const rooms = generateRooms(hotel.id, hotel.slug);
    for (const room of rooms) {
      const existing = await roomRepo.findOne({ where: { name: room.name, hotelId: hotel.id } });
      if (!existing) {
        await roomRepo.save(roomRepo.create(room));
        totalRooms++;
      }
    }
  }
  console.log(`   ✅ ${totalRooms} rooms seeded across ${savedHotels.length} hotels\n`);

  // 4. Seed reviews for each hotel
  console.log('⭐ Seeding reviews...');
  let totalReviews = 0;
  for (const hotel of savedHotels) {
    const reviews = generateReviews(hotel.id);
    for (const review of reviews) {
      const existing = await reviewRepo.findOne({ where: { customerId: review.customerId, hotelId: hotel.id } });
      if (!existing) {
        await reviewRepo.save(reviewRepo.create(review));
        totalReviews++;
      }
    }
  }
  console.log(`   ✅ ${totalReviews} reviews seeded\n`);

  // Summary
  const ownerCount = await ownerRepo.count();
  const hotelCount = await hotelRepo.count();
  const roomCount = await roomRepo.count();
  const reviewCount = await reviewRepo.count();
  console.log('═══════════════════════════════════════════');
  console.log(`  👤 Owners:     ${ownerCount}`);
  console.log(`  🏨 Hotels:     ${hotelCount}`);
  console.log(`  🛏️  Rooms:      ${roomCount}`);
  console.log(`  ⭐ Reviews:    ${reviewCount}`);
  console.log('═══════════════════════════════════════════');
  console.log('\n🎉 Hotel seed complete!\n');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
