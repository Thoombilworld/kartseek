/**
 * KARTSEEK Delivery — Database Seed Script
 * ─────────────────────────────────────────────
 * Populates the delivery tables with realistic test data.
 * Uses the API Gateway entity definitions (source of truth).
 *
 * Usage:
 *   npx ts-node scripts/seed-delivery.ts
 */

import { DataSource } from 'typeorm';
import {
  DeliveryPartner,
  DeliveryTask,
  DeliveryTaskStatusHistory,
  DeliveryPartnerEarning,
  DeliveryCodCollection,
  DeliveryReturnTask,
} from '../../apps/api-gateway/src/entities/delivery.entity';

/**
 * The database password comes from the environment or the script stops — there
 * is no built-in default (AUD2-074). CommonJS `require` because the helper is
 * shared with the plain-node scripts under `maintenance/marketplace-catalog`.
 */
const requireDbPassword: (...keys: string[]) => string =
  require('../lib/db-password').requireDbPassword;
const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: requireDbPassword(),
  database: process.env.DB_NAME || 'kartseek_db',
  entities: [
    DeliveryPartner,
    DeliveryTask,
    DeliveryTaskStatusHistory,
    DeliveryPartnerEarning,
    DeliveryCodCollection,
    DeliveryReturnTask,
  ],
  synchronize: false,
  logging: false,
});

async function seed() {
  console.log('🚚 Connecting to database...');
  await ds.initialize();
  console.log('✅ Connected.\n');

  const partnerRepo = ds.getRepository(DeliveryPartner);
  const taskRepo = ds.getRepository(DeliveryTask);
  const historyRepo = ds.getRepository(DeliveryTaskStatusHistory);
  const earningRepo = ds.getRepository(DeliveryPartnerEarning);
  const codRepo = ds.getRepository(DeliveryCodCollection);

  // ── 1. Delivery Partners ────────────────────────────────────────────────────
  console.log('👤 Seeding delivery partners...');
  const partnerData = [
    { partnerId: 'partner-001', status: 'APPROVED', rating: 4.8 },
    { partnerId: 'partner-002', status: 'APPROVED', rating: 4.6 },
    { partnerId: 'partner-003', status: 'APPROVED', rating: 4.9 },
    { partnerId: 'partner-004', status: 'APPROVED', rating: 4.3 },
    { partnerId: 'partner-005', status: 'APPROVED', rating: 4.7 },
    { partnerId: 'partner-006', status: 'APPROVED', rating: 4.5 },
    { partnerId: 'partner-007', status: 'APPROVED', rating: 4.1 },
    { partnerId: 'partner-008', status: 'SUSPENDED', rating: 3.2 },
  ];

  const savedPartners: DeliveryPartner[] = [];
  for (const p of partnerData) {
    const existing = await partnerRepo.findOneBy({ partnerId: p.partnerId });
    if (existing) {
      savedPartners.push(existing);
      continue;
    }
    savedPartners.push(await partnerRepo.save(partnerRepo.create(p)));
  }
  console.log(`   ✅ ${savedPartners.length} partners seeded.\n`);

  // ── 2. Delivery Tasks ───────────────────────────────────────────────────────
  console.log('📦 Seeding delivery tasks...');
  const serviceTypes = ['food', 'grocery', 'pharmacy', 'marketplace'];
  const locations = [
    {
      pickup: 'Tandoori Palace, Indiatta Ave',
      drop: 'Khar, Mumbai',
      pLat: 19.076,
      pLng: 72.8777,
      dLat: -1.275,
      dLng: 36.78,
    },
    {
      pickup: 'HealthPlus Pharmacy, Andheri West',
      drop: 'Powai, Mumbai',
      pLat: -1.2637,
      pLng: 36.8118,
      dLat: -1.28,
      dLng: 36.77,
    },
    {
      pickup: 'FreshMart Grocery, Juhu',
      drop: 'Bandra East, Mumbai',
      pLat: -1.3202,
      pLng: 36.7178,
      dLat: -1.33,
      dLng: 36.76,
    },
    {
      pickup: 'KartSeek Warehouse, Ikeja',
      drop: 'Victoria Island, Lagos',
      pLat: 6.6018,
      pLng: 3.3515,
      dLat: 6.4281,
      dLng: 3.4219,
    },
    {
      pickup: 'Suya Republic, Allen Ave',
      drop: 'Lekki Phase 1, Lagos',
      pLat: 6.6,
      pLng: 3.35,
      dLat: 6.44,
      dLng: 3.42,
    },
  ];
  const taskStatuses = [
    'DELIVERED',
    'DELIVERED',
    'DELIVERED',
    'PICKED_UP',
    'DELIVERING',
    'ASSIGNED',
  ];

  const activePartners = savedPartners.filter((p) => p.status === 'APPROVED');
  let taskCount = 0;
  for (let i = 0; i < 20; i++) {
    const partner = activePartners[i % activePartners.length];
    const loc = locations[i % locations.length];
    const status = taskStatuses[i % taskStatuses.length];
    const isCod = Math.random() > 0.7;

    const task = taskRepo.create({
      orderId: `order-${5000 + i}`,
      deliveryPartnerId: partner.id,
      serviceType: serviceTypes[i % serviceTypes.length],
      status,
      pickupAddress: loc.pickup,
      dropAddress: loc.drop,
      pickupLat: loc.pLat,
      pickupLng: loc.pLng,
      dropLat: loc.dLat,
      dropLng: loc.dLng,
      isCod,
      codAmount: isCod ? +(500 + Math.random() * 2000).toFixed(2) : 0,
      deliveryFee: +(100 + Math.random() * 200).toFixed(2),
      otpCode: String(1000 + Math.floor(Math.random() * 9000)),
    });

    try {
      const savedTask = await taskRepo.save(task);
      taskCount++;

      // Add status history
      const historyStatuses = ['ASSIGNED', 'ACCEPTED'];
      if (['PICKED_UP', 'DELIVERING', 'DELIVERED'].includes(status))
        historyStatuses.push('PICKING_UP', 'PICKED_UP');
      if (['DELIVERING', 'DELIVERED'].includes(status)) historyStatuses.push('DELIVERING');
      if (status === 'DELIVERED') historyStatuses.push('DELIVERED');

      for (const hs of historyStatuses) {
        await historyRepo.save(historyRepo.create({ taskId: savedTask.id, status: hs }));
      }

      // Add earning for delivered tasks
      if (status === 'DELIVERED') {
        await earningRepo.save(
          earningRepo.create({
            partnerId: partner.id,
            taskId: savedTask.id,
            amount: +(50 + Math.random() * 150).toFixed(2),
            status: Math.random() > 0.5 ? 'PAID' : 'UNPAID',
          }),
        );
      }

      // Add COD collection for COD delivered tasks
      if (isCod && status === 'DELIVERED') {
        await codRepo.save(
          codRepo.create({
            partnerId: partner.id,
            taskId: savedTask.id,
            collectedAmount: task.codAmount,
            status: Math.random() > 0.5 ? 'REMITTED' : 'PENDING_REMITTANCE',
          }),
        );
      }
    } catch {
      /* skip duplicates */
    }
  }
  console.log(`   ✅ ${taskCount} tasks seeded.\n`);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('🎉 Delivery seed complete!');
  console.log(`   Partners: ${savedPartners.length}`);
  console.log(`   Tasks:    ${taskCount}`);
  console.log('═══════════════════════════════════════════════');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Delivery seed failed:', err);
  process.exit(1);
});
