/**
 * KARTSEEK Taxi — Database Seed Script
 * ─────────────────────────────────────────────
 * Populates the taxi tables with realistic test data for dev/staging.
 *
 * Uses the API Gateway entity definitions (which are the source of truth
 * for the shared kartseek_db schema).
 *
 * Usage:
 *   npx ts-node scripts/seed-taxi.ts
 *
 * Prerequisites:
 *   - PostgreSQL running (npm run infra:up)
 *   - Database `kartseek_db` exists
 *   - API Gateway has been started at least once to create tables
 */

import { DataSource } from 'typeorm';
import {
  TaxiVendor, TaxiVendorUser, TaxiDriver, TaxiVehicle,
  TaxiDriverDocument, TaxiVehicleDocument, TaxiRide,
  TaxiRideStatusHistory, TaxiFareRule, TaxiFareRuleVersion,
  TaxiSurgeRule, TaxiSurgeZone, TaxiCancellationRule, TaxiWaitingFeeRule,
  TaxiFareBreakdown, TaxiDriverEarning, TaxiVendorSettlement,
  TaxiCommissionRecord, TaxiPaymentRecord,
  TaxiSosCase, TaxiDispute, TaxiAuditLog,
} from '../../apps/api-gateway/src/entities/taxi.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kartseek123',
  // This vertical owns its own database now. Seeding kartseek_db would write
  // rows the service never reads, and leave the module looking empty.
  database: process.env.TAXI_DB_NAME ?? process.env.DB_NAME ?? 'kartseek_taxi',
  // Tables live in the `taxi` schema, not `public`.
  schema: 'taxi',
  entities: [
    TaxiVendor, TaxiVendorUser, TaxiDriver, TaxiVehicle,
    TaxiDriverDocument, TaxiVehicleDocument, TaxiRide,
    TaxiRideStatusHistory, TaxiFareRule, TaxiFareRuleVersion,
    TaxiSurgeRule, TaxiSurgeZone, TaxiCancellationRule, TaxiWaitingFeeRule,
    TaxiFareBreakdown, TaxiDriverEarning, TaxiVendorSettlement,
    TaxiCommissionRecord, TaxiPaymentRecord,
    TaxiSosCase, TaxiDispute, TaxiAuditLog,
  ],
  synchronize: false,
  logging: false,
});

async function seed() {
  console.log('🌱 Connecting to database...');
  await AppDataSource.initialize();
  console.log('✅ Connected.\n');

  const vendorRepo    = AppDataSource.getRepository(TaxiVendor);
  const vendorUserRepo = AppDataSource.getRepository(TaxiVendorUser);
  const driverRepo    = AppDataSource.getRepository(TaxiDriver);
  const vehicleRepo   = AppDataSource.getRepository(TaxiVehicle);
  const driverDocRepo = AppDataSource.getRepository(TaxiDriverDocument);
  const rideRepo      = AppDataSource.getRepository(TaxiRide);
  const fareRuleRepo  = AppDataSource.getRepository(TaxiFareRule);
  const surgeZoneRepo = AppDataSource.getRepository(TaxiSurgeZone);
  const surgeRuleRepo = AppDataSource.getRepository(TaxiSurgeRule);
  const cancelRuleRepo = AppDataSource.getRepository(TaxiCancellationRule);
  const waitingRuleRepo = AppDataSource.getRepository(TaxiWaitingFeeRule);

  // ── 1. Vendors ─────────────────────────────────────────────────────────────
  console.log('🏢 Seeding vendors...');
  const vendorData = [
    { name: 'FastRide Nigeria',    status: 'APPROVED', franchiseId: null as string | null, regionCode: 'NG-LA' },
    { name: 'SafeCab Nigeria',     status: 'APPROVED', franchiseId: null as string | null, regionCode: 'NG-AB' },
    { name: 'Premium Rides NG',    status: 'APPROVED', franchiseId: null as string | null, regionCode: 'NG-LA' },
    { name: 'SpeedCab India',     status: 'APPROVED', franchiseId: null as string | null, regionCode: 'IN-MH' },
    { name: 'Mumbai Express',     status: 'APPROVED', franchiseId: null as string | null, regionCode: 'IN-MH' },
    { name: 'CityRide India',      status: 'APPROVED', franchiseId: null as string | null, regionCode: 'IN-MH' },
    { name: 'Metro Cabs',          status: 'APPROVED', franchiseId: null as string | null, regionCode: 'IN-DL' },
    { name: 'PendingFleet Lagos',  status: 'PENDING',  franchiseId: null as string | null, regionCode: 'NG-LA' },
  ];

  const savedVendors: TaxiVendor[] = [];
  for (const v of vendorData) {
    const existing = await vendorRepo.findOneBy({ name: v.name });
    if (existing) { savedVendors.push(existing); continue; }
    const vendor = vendorRepo.create(v);
    savedVendors.push(await vendorRepo.save(vendor));
  }
  console.log(`   ✅ ${savedVendors.length} vendors seeded.\n`);

  // ── 2. Vendor Users ────────────────────────────────────────────────────────
  console.log('👤 Seeding vendor users...');
  const vendorUsers = [
    { vendorId: savedVendors[0]?.id, email: 'chidi@fastride.ng',     role: 'admin' },
    { vendorId: savedVendors[1]?.id, email: 'amina@safecab.ng',      role: 'admin' },
    { vendorId: savedVendors[3]?.id, email: 'james@safaricab.ke',    role: 'admin' },
    { vendorId: savedVendors[5]?.id, email: 'rajesh@cityride.in',    role: 'admin' },
    { vendorId: savedVendors[0]?.id, email: 'dispatch@fastride.ng',  role: 'dispatcher' },
    { vendorId: savedVendors[5]?.id, email: 'ops@cityride.in',       role: 'dispatcher' },
  ];

  let vuCount = 0;
  for (const vu of vendorUsers) {
    const existing = await vendorUserRepo.findOneBy({ email: vu.email });
    if (!existing) { await vendorUserRepo.save(vendorUserRepo.create({ ...vu, userId: '' })); vuCount++; }
  }
  console.log(`   ✅ ${vuCount} vendor users seeded.\n`);

  // ── 3. Drivers ─────────────────────────────────────────────────────────────
  console.log('🚗 Seeding drivers...');
  const driverData = [
    { firstName: 'Oluwaseun', lastName: 'Adebayo', phone: '+2348101000001', status: 'APPROVED', vendorIdx: 0, rating: 4.8 },
    { firstName: 'Blessing',  lastName: 'Okafor',  phone: '+2348101000002', status: 'APPROVED', vendorIdx: 0, rating: 4.6 },
    { firstName: 'Ahmed',     lastName: 'Bello',   phone: '+2348101000003', status: 'APPROVED', vendorIdx: 1, rating: 4.9 },
    { firstName: 'Chioma',    lastName: 'Eze',     phone: '+2348101000004', status: 'APPROVED', vendorIdx: 2, rating: 4.7 },
    { firstName: 'Tunde',     lastName: 'Afolabi', phone: '+2348101000005', status: 'APPROVED', vendorIdx: -1, rating: 4.5 },
    { firstName: 'David',     lastName: 'Kamau',   phone: '+91711000001',  status: 'APPROVED', vendorIdx: 3, rating: 4.4 },
    { firstName: 'Faith',     lastName: 'Njeri',   phone: '+91711000002',  status: 'APPROVED', vendorIdx: 3, rating: 4.7 },
    { firstName: 'Peter',     lastName: 'Odhiambo', phone: '+91711000003', status: 'APPROVED', vendorIdx: 4, rating: 4.3 },
    { firstName: 'Suresh',    lastName: 'Kumar',   phone: '+919800000001',  status: 'APPROVED', vendorIdx: 5, rating: 4.2 },
    { firstName: 'Deepa',     lastName: 'Verma',   phone: '+919800000002',  status: 'APPROVED', vendorIdx: 5, rating: 4.6 },
    { firstName: 'Amit',      lastName: 'Singh',   phone: '+919800000003',  status: 'APPROVED', vendorIdx: 6, rating: 4.9 },
    { firstName: 'Pending',   lastName: 'Driver',  phone: '+2348101000099', status: 'PENDING',  vendorIdx: -1, rating: 5.0 },
  ];

  const savedDrivers: TaxiDriver[] = [];
  for (const d of driverData) {
    const existing = await driverRepo.findOneBy({ phone: d.phone });
    if (existing) { savedDrivers.push(existing); continue; }
    const { vendorIdx, ...fields } = d;
    const driver = driverRepo.create({
      ...fields,
      vendorId: vendorIdx >= 0 ? savedVendors[vendorIdx]?.id : null,
      userId: '',
      onlineStatus: d.status === 'APPROVED' ? 'ONLINE' : 'OFFLINE',
    });
    savedDrivers.push(await driverRepo.save(driver));
  }
  console.log(`   ✅ ${savedDrivers.length} drivers seeded.\n`);

  // ── 4. Vehicles ────────────────────────────────────────────────────────────
  console.log('🚙 Seeding vehicles...');
  const vehicleData = [
    { driverIdx: 0,  plateNumber: 'LA-123-ABC', model: 'Toyota Corolla 2020',  type: 'economy',  vendorIdx: 0 },
    { driverIdx: 1,  plateNumber: 'LA-456-DEF', model: 'Honda Accord 2021',   type: 'comfort',  vendorIdx: 0 },
    { driverIdx: 2,  plateNumber: 'AB-789-GHI', model: 'Mercedes E-Class',    type: 'premium',  vendorIdx: 1 },
    { driverIdx: 3,  plateNumber: 'LA-012-JKL', model: 'Toyota Highlander',   type: 'suv',      vendorIdx: 2 },
    { driverIdx: 4,  plateNumber: 'LA-BIKE-001', model: 'Bajaj Pulsar',       type: 'bike',     vendorIdx: -1 },
    { driverIdx: 5,  plateNumber: 'KBA-123A',   model: 'Suzuki Alto 2019',    type: 'economy',  vendorIdx: 3 },
    { driverIdx: 6,  plateNumber: 'KCA-456B',   model: 'Toyota Axio 2020',    type: 'comfort',  vendorIdx: 3 },
    { driverIdx: 7,  plateNumber: 'MSA-TT-001', model: 'Piaggio Ape',         type: 'economy',  vendorIdx: 4 },
    { driverIdx: 8,  plateNumber: 'MH-01-AB-1234', model: 'Bajaj RE',         type: 'economy',  vendorIdx: 5 },
    { driverIdx: 9,  plateNumber: 'MH-01-CD-5678', model: 'Maruti Swift',     type: 'economy',  vendorIdx: 5 },
    { driverIdx: 10, plateNumber: 'DL-01-EF-9012', model: 'Toyota Camry',     type: 'premium',  vendorIdx: 6 },
  ];

  let vhCount = 0;
  for (const vh of vehicleData) {
    const existing = await vehicleRepo.findOneBy({ plateNumber: vh.plateNumber });
    if (existing) continue;
    const vehicle = vehicleRepo.create({
      plateNumber: vh.plateNumber,
      model: vh.model,
      type: vh.type,
      status: 'APPROVED',
      vendorId: vh.vendorIdx >= 0 ? savedVendors[vh.vendorIdx]?.id : null,
      assignedDriverId: savedDrivers[vh.driverIdx]?.id,
    });
    await vehicleRepo.save(vehicle);
    vhCount++;
  }
  console.log(`   ✅ ${vhCount} vehicles seeded.\n`);

  // ── 5. Fare Rules ──────────────────────────────────────────────────────────
  console.log('💰 Seeding fare rules...');
  const fareData = [
    { vehicleType: 'economy', baseFare: 500,  distanceFareRate: 100, timeFareRate: 20, minimumFare: 700 },
    { vehicleType: 'comfort', baseFare: 800,  distanceFareRate: 150, timeFareRate: 30, minimumFare: 1000 },
    { vehicleType: 'premium', baseFare: 1500, distanceFareRate: 250, timeFareRate: 50, minimumFare: 2000 },
    { vehicleType: 'bike',    baseFare: 200,  distanceFareRate: 50,  timeFareRate: 10, minimumFare: 300 },
    { vehicleType: 'suv',     baseFare: 2000, distanceFareRate: 300, timeFareRate: 60, minimumFare: 2500 },
  ];

  let frCount = 0;
  for (const fr of fareData) {
    const existing = await fareRuleRepo.findOneBy({ vehicleType: fr.vehicleType });
    if (!existing) { await fareRuleRepo.save(fareRuleRepo.create({ ...fr, zoneId: 'default' })); frCount++; }
  }
  console.log(`   ✅ ${frCount} fare rules seeded.\n`);

  // ── 6. Surge Zones & Rules ─────────────────────────────────────────────────
  console.log('⚡ Seeding surge zones & rules...');
  const zones = [
    { name: 'Lagos Island',    activeMultiplier: 1.0, geoJson: { type: 'Polygon', coordinates: [[[3.38, 6.44], [3.42, 6.44], [3.42, 6.46], [3.38, 6.46], [3.38, 6.44]]] } },
    { name: 'Victoria Island', activeMultiplier: 1.2, geoJson: { type: 'Polygon', coordinates: [[[3.39, 6.43], [3.43, 6.43], [3.43, 6.45], [3.39, 6.45], [3.39, 6.43]]] } },
    { name: 'Mumbai Central',     activeMultiplier: 1.0, geoJson: { type: 'Polygon', coordinates: [[[36.80, -1.30], [36.84, -1.30], [36.84, -1.27], [36.80, -1.27], [36.80, -1.30]]] } },
  ];

  const savedZones: TaxiSurgeZone[] = [];
  for (const z of zones) {
    const existing = await surgeZoneRepo.findOneBy({ name: z.name });
    if (existing) { savedZones.push(existing); continue; }
    savedZones.push(await surgeZoneRepo.save(surgeZoneRepo.create(z)));
  }

  const surgeRules = [
    { zoneId: savedZones[0]?.id, name: 'Morning Rush Lagos',    multiplier: 1.3, isActive: true, capLimit: 3.0 },
    { zoneId: savedZones[0]?.id, name: 'Evening Rush Lagos',    multiplier: 1.5, isActive: true, capLimit: 3.5 },
    { zoneId: savedZones[1]?.id, name: 'VI Peak',               multiplier: 1.4, isActive: true, capLimit: 3.0 },
    { zoneId: savedZones[2]?.id, name: 'Mumbai Peak',          multiplier: 1.2, isActive: true, capLimit: 2.5 },
  ];
  let srCount = 0;
  for (const sr of surgeRules) {
    const existing = await surgeRuleRepo.findOneBy({ name: sr.name });
    if (!existing) { await surgeRuleRepo.save(surgeRuleRepo.create(sr)); srCount++; }
  }
  console.log(`   ✅ ${savedZones.length} zones, ${srCount} surge rules seeded.\n`);

  // ── 7. Cancellation & Waiting Rules ────────────────────────────────────────
  console.log('⏱️  Seeding cancellation & waiting rules...');
  const cancelRules = [
    { vehicleType: 'economy', feeAfterMinutes: 5, amount: 300 },
    { vehicleType: 'comfort', feeAfterMinutes: 5, amount: 400 },
    { vehicleType: 'premium', feeAfterMinutes: 3, amount: 500 },
    { vehicleType: 'bike',    feeAfterMinutes: 3, amount: 100 },
  ];
  let crCount = 0;
  for (const cr of cancelRules) {
    const existing = await cancelRuleRepo.findOneBy({ vehicleType: cr.vehicleType });
    if (!existing) { await cancelRuleRepo.save(cancelRuleRepo.create(cr)); crCount++; }
  }

  const waitingRules = [
    { vehicleType: 'economy', freeMinutes: 5, ratePerMinute: 15 },
    { vehicleType: 'comfort', freeMinutes: 5, ratePerMinute: 25 },
    { vehicleType: 'premium', freeMinutes: 3, ratePerMinute: 40 },
    { vehicleType: 'bike',    freeMinutes: 3, ratePerMinute: 8 },
  ];
  let wrCount = 0;
  for (const wr of waitingRules) {
    const existing = await waitingRuleRepo.findOneBy({ vehicleType: wr.vehicleType });
    if (!existing) { await waitingRuleRepo.save(waitingRuleRepo.create(wr)); wrCount++; }
  }
  console.log(`   ✅ ${crCount} cancellation, ${wrCount} waiting rules seeded.\n`);

  // ── 8. Rides ───────────────────────────────────────────────────────────────
  console.log('🛣️  Seeding rides...');
  const locations = [
    { lat: 6.5244, lng: 3.3792, name: 'Ikeja, Lagos' },
    { lat: 6.4541, lng: 3.3947, name: 'Victoria Island, Lagos' },
    { lat: 6.4400, lng: 3.4200, name: 'Lekki Phase 1, Lagos' },
    { lat: -1.2921, lng: 36.8219, name: 'Mumbai Central' },
    { lat: -1.2634, lng: 36.8073, name: 'Andheri West, Mumbai' },
    { lat: 19.0760, lng: 72.8777, name: 'Mumbai Central' },
    { lat: 28.6139, lng: 77.2090, name: 'Connaught Place, Delhi' },
  ];

  const statuses = ['RIDE_COMPLETED', 'RIDE_COMPLETED', 'RIDE_COMPLETED', 'RIDE_COMPLETED',
    'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_DRIVER', 'SEARCHING_DRIVER', 'RIDE_STARTED'];

  let rideCount = 0;
  const activeDrivers = savedDrivers.filter(d => d.status === 'APPROVED');
  for (let i = 0; i < 30; i++) {
    const driver = activeDrivers[i % activeDrivers.length];
    const pickup = locations[Math.floor(Math.random() * locations.length)];
    let drop = locations[(locations.indexOf(pickup) + 1 + Math.floor(Math.random() * (locations.length - 1))) % locations.length];

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const fareEstimate = +(500 + Math.random() * 5000).toFixed(2);
    const finalFare = status === 'RIDE_COMPLETED' ? +(fareEstimate + Math.random() * 500).toFixed(2) : 0;

    const ride = rideRepo.create({
      customerId: `cust-${100 + Math.floor(Math.random() * 50)}`,
      driverId: status !== 'SEARCHING_DRIVER' ? driver.id : null,
      vendorId: driver.vendorId,
      status,
      pickupAddress: pickup.name,
      dropAddress: drop.name,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropLat: drop.lat,
      dropLng: drop.lng,
      paymentMethod: ['CASH', 'CARD', 'WALLET'][Math.floor(Math.random() * 3)],
      paymentStatus: status === 'RIDE_COMPLETED' ? 'PAID' : 'PENDING',
      fareEstimate,
      finalFare,
    });

    try { await rideRepo.save(ride); rideCount++; } catch { /* skip duplicates */ }
  }
  console.log(`   ✅ ${rideCount} rides seeded.\n`);

  // ── 9. Driver Documents ────────────────────────────────────────────────────
  console.log('📄 Seeding driver documents...');
  const docTypes = ['License', 'BackgroundCheck', 'Insurance'];
  let docCount = 0;
  for (const driver of activeDrivers) {
    for (const docType of docTypes) {
      const existing = await driverDocRepo.findOneBy({ driverId: driver.id, type: docType });
      if (!existing) {
        await driverDocRepo.save(driverDocRepo.create({
          driverId: driver.id,
          type: docType,
          docUrl: `https://docs.kartseek.com/drivers/${driver.id}/${docType.toLowerCase()}.pdf`,
          expiryDate: new Date(2027, 11, 31),
          status: 'APPROVED',
        }));
        docCount++;
      }
    }
  }
  console.log(`   ✅ ${docCount} documents seeded.\n`);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 Taxi seed complete!');
  console.log(`   Vendors:          ${savedVendors.length}`);
  console.log(`   Vendor Users:     ${vuCount}`);
  console.log(`   Drivers:          ${savedDrivers.length}`);
  console.log(`   Vehicles:         ${vhCount}`);
  console.log(`   Fare Rules:       ${frCount}`);
  console.log(`   Surge Zones:      ${savedZones.length}`);
  console.log(`   Cancel/Wait Rules: ${crCount}/${wrCount}`);
  console.log(`   Rides:            ${rideCount}`);
  console.log(`   Documents:        ${docCount}`);
  console.log('═══════════════════════════════════════════════════');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Taxi seed failed:', err);
  process.exit(1);
});
