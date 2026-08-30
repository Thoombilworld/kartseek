/**
 * KARTSEEK — Master Seed Runner
 * ─────────────────────────────────
 * Runs ALL individual seed scripts in the correct dependency order.
 *
 * Usage:
 *   npx ts-node scripts/seed-all.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';

const seeds = [
  { name: 'Marketplace', script: 'seed-marketplace.ts' },
  { name: 'Taxi',        script: 'seed-taxi.ts' },
  { name: 'Pharmacy',    script: 'seed-pharmacy.ts' },
  { name: 'Hotel',       script: 'seed-hotel.ts' },
  { name: 'Grocery',     script: 'seed-grocery.ts' },
  { name: 'Restaurant',  script: 'seed-restaurant.ts' },
  { name: 'Doctor',      script: 'seed-doctor.ts' },
  { name: 'Delivery',    script: 'seed-delivery.ts' },
  { name: 'Partner',     script: 'seed-partner.ts' },
  { name: 'Franchise',   script: 'seed-franchise.ts' },  // Must run last — links entities from other modules
];

const results: { name: string; status: string; time: number }[] = [];

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║         KARTSEEK — Master Database Seed Runner        ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

for (const seed of seeds) {
  const start = Date.now();
  console.log(`\n${'━'.repeat(55)}`);
  console.log(`▶ Running: ${seed.name} (${seed.script})`);
  console.log('━'.repeat(55));

  try {
    const scriptPath = path.join(__dirname, seed.script);
    execSync(`npx ts-node "${scriptPath}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env },
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    results.push({ name: seed.name, status: '✅ SUCCESS', time: +elapsed });
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    results.push({ name: seed.name, status: '❌ FAILED', time: +elapsed });
    console.error(`❌ ${seed.name} seed failed!`);
  }
}

// ── Final Report ────────────────────────────────────────────────────────────
console.log('\n\n╔═══════════════════════════════════════════════════════╗');
console.log('║               SEED EXECUTION REPORT                   ║');
console.log('╠═══════════════════════════════════════════════════════╣');
for (const r of results) {
  const pad = ' '.repeat(Math.max(0, 18 - r.name.length));
  console.log(`║  ${r.status}  ${r.name}${pad} (${r.time}s)`);
}
console.log('╠═══════════════════════════════════════════════════════╣');
const passed = results.filter(r => r.status.includes('SUCCESS')).length;
const total = results.length;
const totalTime = results.reduce((acc, r) => acc + r.time, 0).toFixed(1);
console.log(`║  ${passed}/${total} seeds passed in ${totalTime}s`);
console.log('╚═══════════════════════════════════════════════════════╝');

process.exit(results.some(r => r.status.includes('FAILED')) ? 1 : 0);
