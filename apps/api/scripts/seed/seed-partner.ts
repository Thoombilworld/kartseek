/**
 * KARTSEEK Partner — Database Seed Script
 * ─────────────────────────────────────────────
 * Populates partner-related tables with test data.
 * Uses the API Gateway entity definitions (source of truth).
 *
 * Usage:
 *   npx ts-node scripts/seed-partner.ts
 */

import { DataSource } from 'typeorm';
import {
  Partner,
  PartnerUser,
  PartnerRole,
  PartnerRoleAssignment,
  PartnerDocument,
  PartnerComplianceStatus,
  PartnerOnlineSession,
  PartnerLocationUpdate,
  PartnerEarning,
  PartnerPayout,
  PartnerSosCase,
} from '../../apps/api-gateway/src/entities/partner.entity';

const ENTITIES = [
  Partner,
  PartnerUser,
  PartnerRole,
  PartnerRoleAssignment,
  PartnerDocument,
  PartnerComplianceStatus,
  PartnerOnlineSession,
  PartnerLocationUpdate,
  PartnerEarning,
  PartnerPayout,
  PartnerSosCase,
];

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kartseek123',
  database: process.env.DB_NAME || 'kartseek_db',
  entities: ENTITIES,
  synchronize: false,
  logging: false,
});

async function seed() {
  console.log('🤝 Connecting to database...');
  await ds.initialize();
  console.log('✅ Connected.\n');

  const partnerRepo = ds.getRepository(Partner);
  const userRepo = ds.getRepository(PartnerUser);
  const roleRepo = ds.getRepository(PartnerRole);
  const roleAssignRepo = ds.getRepository(PartnerRoleAssignment);
  const docRepo = ds.getRepository(PartnerDocument);
  const complianceRepo = ds.getRepository(PartnerComplianceStatus);
  const sessionRepo = ds.getRepository(PartnerOnlineSession);
  const locationRepo = ds.getRepository(PartnerLocationUpdate);
  const earningRepo = ds.getRepository(PartnerEarning);
  const payoutRepo = ds.getRepository(PartnerPayout);

  // ── 1. Roles ────────────────────────────────────────────────────────────────
  console.log('🏷️  Seeding partner roles...');
  const rolesData = [
    { name: 'TAXI_DRIVER', permissions: ['accept_ride', 'update_status', 'view_earnings', 'sos'] },
    {
      name: 'DELIVERY_PARTNER',
      permissions: ['accept_task', 'update_status', 'view_earnings', 'collect_cod', 'sos'],
    },
  ];
  const savedRoles: PartnerRole[] = [];
  for (const r of rolesData) {
    let role = await roleRepo.findOneBy({ name: r.name });
    if (!role) {
      role = await roleRepo.save(roleRepo.create(r));
    }
    savedRoles.push(role);
  }
  console.log(`   ✅ ${savedRoles.length} roles.\n`);

  // ── 2. Partners ─────────────────────────────────────────────────────────────
  console.log('👤 Seeding partners...');
  const partnersData = [
    {
      name: 'Rahul Sharma',
      phone: '+91981234001',
      email: 'rahul.sharma@email.com',
      status: 'APPROVED',
      regionCode: 'IN-MH',
    },
    {
      name: 'Priya Patel',
      phone: '+91981234002',
      email: 'priya.p@email.com',
      status: 'APPROVED',
      regionCode: 'IN-MH',
    },
    {
      name: 'Obi Nnamdi',
      phone: '+234801234003',
      email: 'obi.nnamdi@email.com',
      status: 'APPROVED',
      regionCode: 'NG-LA',
    },
    {
      name: 'Fatima Khan',
      phone: '+91981234004',
      email: 'fatima.khan@email.com',
      status: 'APPROVED',
      regionCode: 'IN-MH',
    },
    {
      name: 'Suresh Kumar',
      phone: '+91981234005',
      email: 'suresh.k@email.com',
      status: 'APPROVED',
      regionCode: 'IN-MH',
    },
    {
      name: 'Ada Eze',
      phone: '+234801234006',
      email: 'ada.eze@email.com',
      status: 'APPROVED',
      regionCode: 'NG-LA',
    },
    {
      name: 'Hamisi Juma',
      phone: '+255701234007',
      email: 'hamisi.j@email.com',
      status: 'APPROVED',
      regionCode: 'TZ-DA',
    },
    {
      name: 'Anjali Gupta',
      phone: '+91981234008',
      email: 'anjali.g@email.com',
      status: 'PENDING',
      regionCode: 'IN-MH',
    },
    {
      name: 'Chinedu Okwu',
      phone: '+234801234009',
      email: 'chinedu.o@email.com',
      status: 'BLOCKED',
      regionCode: 'NG-LA',
    },
    {
      name: 'Amina Sheikh',
      phone: '+91981234010',
      email: 'amina.s@email.com',
      status: 'APPROVED',
      regionCode: 'IN-MH',
    },
  ];

  const savedPartners: Partner[] = [];
  for (const p of partnersData) {
    let partner = await partnerRepo.findOneBy({ email: p.email });
    if (!partner) {
      partner = await partnerRepo.save(partnerRepo.create(p));
    }
    savedPartners.push(partner);
  }
  console.log(`   ✅ ${savedPartners.length} partners.\n`);

  // ── 3. Partner Users & Role Assignments ─────────────────────────────────────
  console.log('🔗 Seeding partner users & role assignments...');
  const roleNames = ['TAXI_DRIVER', 'DELIVERY_PARTNER'];
  let puCount = 0;
  const savedUsers: PartnerUser[] = [];
  for (let i = 0; i < savedPartners.length; i++) {
    const partner = savedPartners[i];
    if (partner.status !== 'APPROVED') continue;

    const roles =
      i < 5 ? ['TAXI_DRIVER'] : i < 8 ? ['DELIVERY_PARTNER'] : ['TAXI_DRIVER', 'DELIVERY_PARTNER'];
    const userId = `auth-user-${6000 + i}`;

    let pu = await userRepo.findOneBy({ partnerId: partner.id, userId });
    if (!pu) {
      pu = await userRepo.save(
        userRepo.create({
          partnerId: partner.id,
          userId,
          allowedRoles: roles,
          activeRole: roles[0],
        }),
      );
      puCount++;
    }
    savedUsers.push(pu);

    // Role assignments
    for (const roleName of roles) {
      const role = savedRoles.find((r) => r.name === roleName);
      if (role) {
        const existingAssignment = await roleAssignRepo.findOneBy({
          partnerUserId: pu.id,
          roleId: role.id,
        });
        if (!existingAssignment) {
          await roleAssignRepo.save(
            roleAssignRepo.create({ partnerUserId: pu.id, roleId: role.id }),
          );
        }
      }
    }
  }
  console.log(`   ✅ ${puCount} partner users, with role assignments.\n`);

  // ── 4. Documents ────────────────────────────────────────────────────────────
  console.log('📄 Seeding partner documents...');
  const docTypes = ['LICENSE', 'INDEMNITY', 'VEHICLE_REG', 'INSURANCE'];
  let docCount = 0;
  for (const partner of savedPartners) {
    if (partner.status !== 'APPROVED') continue;
    for (const docType of docTypes) {
      const existing = await docRepo.findOneBy({ partnerId: partner.id, docType });
      if (!existing) {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        await docRepo.save(
          docRepo.create({
            partnerId: partner.id,
            roleType: 'COMMON',
            docType,
            docUrl: `https://storage.kartseek.com/docs/${partner.id}/${docType.toLowerCase()}.pdf`,
            expiryDate,
            status: 'APPROVED',
          }),
        );
        docCount++;
      }
    }
  }
  console.log(`   ✅ ${docCount} documents.\n`);

  // ── 5. Compliance Status ────────────────────────────────────────────────────
  console.log('✅ Seeding compliance status...');
  let compCount = 0;
  for (const partner of savedPartners) {
    const existing = await complianceRepo.findOneBy({ partnerId: partner.id });
    if (!existing) {
      await complianceRepo.save(
        complianceRepo.create({
          partnerId: partner.id,
          isCompliant: partner.status === 'APPROVED',
          reason: partner.status !== 'APPROVED' ? 'Pending verification' : null,
        }),
      );
      compCount++;
    }
  }
  console.log(`   ✅ ${compCount} compliance records.\n`);

  // ── 6. Online Sessions ──────────────────────────────────────────────────────
  console.log('🟢 Seeding online sessions...');
  let sessCount = 0;
  for (const pu of savedUsers) {
    const loginTime = new Date();
    loginTime.setHours(loginTime.getHours() - Math.floor(Math.random() * 8));
    try {
      await sessionRepo.save(
        sessionRepo.create({
          partnerId: pu.partnerId,
          roleType: pu.activeRole || 'TAXI_DRIVER',
          loginTime,
          status: Math.random() > 0.3 ? 'ONLINE' : 'OFFLINE',
        }),
      );
      sessCount++;
    } catch {
      /* skip */
    }
  }
  console.log(`   ✅ ${sessCount} sessions.\n`);

  // ── 7. Location Updates ─────────────────────────────────────────────────────
  console.log('📍 Seeding location updates...');
  const baseLocations = [
    { lat: 19.076, lng: 72.8777 }, // Mumbai Central
    { lat: -1.2637, lng: 36.8118 }, // Andheri West
    { lat: -1.3202, lng: 36.7178 }, // Juhu
    { lat: 6.6018, lng: 3.3515 }, // Lagos Ikeja
    { lat: -6.816, lng: 39.2803 }, // Dar es Salaam
  ];
  let locCount = 0;
  for (const partner of savedPartners) {
    if (partner.status !== 'APPROVED') continue;
    const base = baseLocations[Math.floor(Math.random() * baseLocations.length)];
    for (let j = 0; j < 3; j++) {
      await locationRepo.save(
        locationRepo.create({
          partnerId: partner.id,
          lat: base.lat + (Math.random() - 0.5) * 0.02,
          lng: base.lng + (Math.random() - 0.5) * 0.02,
          heading: Math.floor(Math.random() * 360),
        }),
      );
      locCount++;
    }
  }
  console.log(`   ✅ ${locCount} location updates.\n`);

  // ── 8. Earnings ─────────────────────────────────────────────────────────────
  console.log('💰 Seeding earnings...');
  let earnCount = 0;
  for (const partner of savedPartners) {
    if (partner.status !== 'APPROVED') continue;
    for (let j = 0; j < 5; j++) {
      await earningRepo.save(
        earningRepo.create({
          partnerId: partner.id,
          referenceType: Math.random() > 0.5 ? 'TAXI_RIDE' : 'DELIVERY_TASK',
          referenceId: `ref-${7000 + earnCount}`,
          amount: +(200 + Math.random() * 800).toFixed(2),
          tip: +(0 + Math.random() * 100).toFixed(2),
        }),
      );
      earnCount++;
    }
  }
  console.log(`   ✅ ${earnCount} earnings.\n`);

  // ── 9. Payouts ──────────────────────────────────────────────────────────────
  console.log('💳 Seeding payouts...');
  let payoutCount = 0;
  for (const partner of savedPartners) {
    if (partner.status !== 'APPROVED') continue;
    await payoutRepo.save(
      payoutRepo.create({
        partnerId: partner.id,
        amount: +(1000 + Math.random() * 5000).toFixed(2),
        status: 'COMPLETED',
        transactionReference: `TXN-${8000 + payoutCount}`,
      }),
    );
    payoutCount++;
    await payoutRepo.save(
      payoutRepo.create({
        partnerId: partner.id,
        amount: +(500 + Math.random() * 3000).toFixed(2),
        status: 'PENDING',
      }),
    );
    payoutCount++;
  }
  console.log(`   ✅ ${payoutCount} payouts.\n`);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('🎉 Partner seed complete!');
  console.log(`   Roles:         ${savedRoles.length}`);
  console.log(`   Partners:      ${savedPartners.length}`);
  console.log(`   Partner Users: ${puCount}`);
  console.log(`   Documents:     ${docCount}`);
  console.log(`   Compliance:    ${compCount}`);
  console.log(`   Sessions:      ${sessCount}`);
  console.log(`   Locations:     ${locCount}`);
  console.log(`   Earnings:      ${earnCount}`);
  console.log(`   Payouts:       ${payoutCount}`);
  console.log('═══════════════════════════════════════════════');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Partner seed failed:', err);
  process.exit(1);
});
