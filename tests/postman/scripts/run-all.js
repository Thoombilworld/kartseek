#!/usr/bin/env node
/**
 * KARTSEEK — Run All Postman Collections via Newman
 * ──────────────────────────────────────────────────
 * Sequentially runs all Postman collections against the selected environment.
 *
 * Usage:
 *   node run-all.js                              # Default: Local environment
 *   node run-all.js --env staging                 # Staging environment
 *   node run-all.js --env production              # Production environment
 *   node run-all.js --collection 01               # Run single collection
 *   node run-all.js --critical-only               # Run only critical path collections
 *   node run-all.js --env staging --bail          # Stop on first failure
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const COLLECTIONS_DIR = path.join(ROOT, 'collections');
const ENVIRONMENTS_DIR = path.join(ROOT, 'environments');
const REPORTS_DIR = path.join(ROOT, 'reports');
const config = require(path.join(ROOT, 'newman.config.js'));

// ── Parse CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const envName = getArg('env') || 'Local';
const singleCollection = getArg('collection');
const criticalOnly = hasFlag('critical-only');
const bail = hasFlag('bail');

// Critical path collections (must pass for deployment)
const CRITICAL_COLLECTIONS = [
  '01-auth-user-management',
  '02-api-gateway',
  '06-marketplace',
  '08-grocery',
  '10-restaurant',
  '16-taxi-booking',
  '22-wallet-payment-settlement',
  '30-security-compliance',
];

// ── Resolve environment file ────────────────────────────────────────────────

const envMap = {
  local: 'KARTSEEK_Local.postman_environment.json',
  staging: 'KARTSEEK_Staging.postman_environment.json',
  production: 'KARTSEEK_Production.postman_environment.json',
  india: 'KARTSEEK_India.postman_environment.json',
  qatar: 'KARTSEEK_Qatar.postman_environment.json',
  uae: 'KARTSEEK_UAE.postman_environment.json',
  uk: 'KARTSEEK_UK.postman_environment.json',
  usa: 'KARTSEEK_USA.postman_environment.json',
};

const envFile = path.join(ENVIRONMENTS_DIR, envMap[envName.toLowerCase()] || envMap.local);

if (!fs.existsSync(envFile)) {
  console.error(`❌ Environment file not found: ${envFile}`);
  process.exit(1);
}

// ── Discover collections ────────────────────────────────────────────────────

let collections = fs.readdirSync(COLLECTIONS_DIR)
  .filter(f => f.endsWith('.postman_collection.json'))
  .sort();

if (singleCollection) {
  collections = collections.filter(f => f.startsWith(singleCollection));
  if (collections.length === 0) {
    console.error(`❌ No collection found matching: ${singleCollection}`);
    process.exit(1);
  }
}

if (criticalOnly) {
  collections = collections.filter(f =>
    CRITICAL_COLLECTIONS.some(c => f.startsWith(c))
  );
}

// ── Ensure reports directory exists ─────────────────────────────────────────
fs.mkdirSync(REPORTS_DIR, { recursive: true });

// ── Create working environment copy (for chaining state between runs) ───────
const workingEnvFile = path.join(REPORTS_DIR, '_working_environment.json');
fs.copyFileSync(envFile, workingEnvFile);
console.log(`\n📋 Working env: ${workingEnvFile}`);
console.log(`   (Tokens & IDs will persist between collection runs)\n`);

// ── Run collections ─────────────────────────────────────────────────────────

console.log('🚀 KARTSEEK API Test Runner\n');
console.log('═'.repeat(60));
console.log(`  Environment:  ${envName}`);
console.log(`  Collections:  ${collections.length}`);
console.log(`  Bail on fail: ${bail}`);
console.log(`  Reports dir:  ${REPORTS_DIR}`);
console.log('═'.repeat(60));

const results = { passed: 0, failed: 0, errors: [] };
const startTime = Date.now();

for (const collectionFile of collections) {
  const collectionPath = path.join(COLLECTIONS_DIR, collectionFile);
  const baseName = collectionFile.replace('.postman_collection.json', '');
  const reportPath = path.join(REPORTS_DIR, `${baseName}-report.json`);

  console.log(`\n▶ Running: ${baseName}`);
  console.log('─'.repeat(40));

  const cmd = [
    'npx', 'newman', 'run',
    `"${collectionPath}"`,
    '-e', `"${workingEnvFile}"`,
    '--export-environment', `"${workingEnvFile}"`,
    '--reporters', 'cli,json',
    '--reporter-json-export', `"${reportPath}"`,
    '--timeout-request', String(config.timeout?.request || 10000),
    '--delay-request', String(config.delayRequest || 100),
    '--color', 'on',
    bail ? '--bail' : '',
  ].filter(Boolean).join(' ');

  const MAX_RETRIES = 3;
  let passed = false;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      execSync(cmd, { stdio: 'inherit', cwd: ROOT });
      results.passed++;
      console.log(`  ✅ PASSED: ${baseName}`);
      passed = true;
      break;
    } catch (err) {
      const output = err.stderr ? err.stderr.toString() : '';
      const isConnectionError = output.includes('ECONNREFUSED') ||
        (fs.existsSync(reportPath) && fs.readFileSync(reportPath, 'utf8').includes('ECONNREFUSED'));

      if (isConnectionError && attempt < MAX_RETRIES) {
        console.log(`  ⚠️  Connection refused — server may be recovering. Retry ${attempt}/${MAX_RETRIES} in 5s...`);
        execSync('ping -n 6 127.0.0.1 > nul', { stdio: 'ignore' }); // 5s delay on Windows
        continue;
      }

      results.failed++;
      results.errors.push(baseName);
      console.log(`  ❌ FAILED: ${baseName}`);
      if (bail) {
        console.log('\n⛔ Bailing on first failure.');
        break;
      }
      break;
    }
  }

  if (bail && !passed && results.failed > 0) break;

  // Cooldown between collections to avoid overwhelming the server
  if (collectionFile !== collections[collections.length - 1]) {
    execSync('ping -n 3 127.0.0.1 > nul', { stdio: 'ignore' }); // 2s delay on Windows
  }
}

// ── Summary ─────────────────────────────────────────────────────────────────

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

// Read per-collection reports for detailed stats
const collectionDetails = [];
let totalAssertions = 0, totalAssertionsPassed = 0, totalRequests = 0;

for (const collectionFile of collections) {
  const baseName = collectionFile.replace('.postman_collection.json', '');
  const reportPath = path.join(REPORTS_DIR, `${baseName}-report.json`);
  try {
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      const stats = report.run?.stats || {};
      const a = stats.assertions || {};
      const r = stats.requests || {};
      const failures = (report.run?.failures || []).map(f => ({
        test: f.error?.test || 'Unknown',
        message: f.error?.message || 'Unknown error',
        endpoint: f.source?.name || 'Unknown',
      }));
      const detail = {
        collection: baseName,
        status: (a.failed || 0) > 0 ? 'FAILED' : 'PASSED',
        assertions: { total: a.total || 0, passed: (a.total || 0) - (a.failed || 0), failed: a.failed || 0 },
        requests: { total: r.total || 0, failed: r.failed || 0 },
        failures: failures.length > 0 ? failures : undefined,
      };
      totalAssertions += detail.assertions.total;
      totalAssertionsPassed += detail.assertions.passed;
      totalRequests += detail.requests.total;
      collectionDetails.push(detail);
    }
  } catch (e) {
    collectionDetails.push({ collection: baseName, status: 'ERROR', assertions: { total: 0, passed: 0, failed: 0 }, requests: { total: 0, failed: 0 } });
  }
}

const passRate = totalAssertions > 0 ? ((totalAssertionsPassed / totalAssertions) * 100).toFixed(1) : '0';

console.log('\n' + '═'.repeat(60));
console.log('📊 KARTSEEK API Test Summary');
console.log('═'.repeat(60));
console.log(`  Environment:        ${envName}`);
console.log(`  Total Collections:  ${collections.length}`);
console.log(`  Passed:             ${results.passed}`);
console.log(`  Failed:             ${results.failed}`);
console.log(`  Total Requests:     ${totalRequests}`);
console.log(`  Total Assertions:   ${totalAssertionsPassed}/${totalAssertions} (${passRate}%)`);
console.log(`  Duration:           ${elapsed}s`);

console.log('\n' + '─'.repeat(60));
console.log('  Per-Collection Results:');
console.log('─'.repeat(60));
for (const d of collectionDetails) {
  const icon = d.status === 'PASSED' ? '✅' : '❌';
  const aStr = `${d.assertions.passed}/${d.assertions.total}`;
  console.log(`  ${icon} ${d.collection.padEnd(40)} ${aStr}`);
}

if (results.errors.length > 0) {
  console.log('\n' + '─'.repeat(60));
  console.log('  Failure Details:');
  console.log('─'.repeat(60));
  for (const d of collectionDetails.filter(c => c.failures)) {
    console.log(`\n  ❌ ${d.collection}:`);
    d.failures.forEach((f, i) => {
      console.log(`     ${i + 1}. [${f.endpoint}] ${f.test}: ${f.message.substring(0, 80)}`);
    });
  }
}

console.log('\n' + '═'.repeat(60));

// Write comprehensive summary report
const summaryPath = path.join(REPORTS_DIR, 'summary.json');
fs.writeFileSync(summaryPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  environment: envName,
  totalCollections: collections.length,
  passed: results.passed,
  failed: results.failed,
  totalRequests,
  totalAssertions,
  totalAssertionsPassed,
  assertionPassRate: `${passRate}%`,
  failedCollections: results.errors,
  durationSeconds: parseFloat(elapsed),
  collections: collectionDetails,
}, null, 2));

console.log(`\n📄 Summary report: ${summaryPath}\n`);

// Exit with error code if any tests failed
process.exit(results.failed > 0 ? 1 : 0);

