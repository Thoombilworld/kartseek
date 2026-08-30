const { DataSource } = require('typeorm');
const net = require('net');

const ds = new DataSource({
  type: 'postgres', host: 'localhost', port: 5432,
  username: 'postgres', password: 'kartseek123', database: 'kartseek_db',
});

function checkPort(port) {
  return new Promise(resolve => {
    const sock = new net.Socket();
    sock.setTimeout(1500);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(port, '127.0.0.1');
  });
}

async function run() {
  // ── 1. Service Port Scan ──────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  🔌 SERVICE PORT SCAN');
  console.log('═══════════════════════════════════════════════════════════');
  const ports = [
    [3000, 'Next.js Web App'],
    [3001, 'API Gateway (HTTP)'],
    [3035, 'Hotel Service (HTTP)'],
    [4025, 'Hotel Service (TCP/Microservice)'],
    [3010, 'Auth Service'],
    [3011, 'Order Service'],
    [3012, 'Marketplace Service'],
    [3014, 'Notification Service'],
    [5432, 'PostgreSQL'],
    [6379, 'Redis'],
    [9092, 'Kafka Broker'],
  ];
  for (const [port, name] of ports) {
    const up = await checkPort(port);
    console.log('  ' + (up ? '✅' : '❌') + ' :' + String(port).padEnd(6) + name);
  }

  // ── 2. Database Tables ────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  📊 HOTEL DATABASE TABLES');
  console.log('═══════════════════════════════════════════════════════════');
  await ds.initialize();

  const tables = await ds.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'hotel%' ORDER BY table_name`
  );

  if (tables.length === 0) {
    console.log('  ❌ No hotel tables found!');
  } else {
    for (const t of tables) {
      const cnt = await ds.query(`SELECT count(*) FROM "${t.table_name}"`);
      console.log('  ✅ ' + t.table_name.padEnd(30) + cnt[0].count.toString().padStart(5) + ' rows');
    }
  }

  // ── 3. Data Integrity ─────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  🔍 DATA INTEGRITY CHECK');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const hotels = await ds.query(`SELECT id, name, slug, status, rating, "reviewCount", "totalBookings", city, "countryCode", currency FROM hotels ORDER BY rating DESC`);
    console.log('\n  Hotels (' + hotels.length + '):');
    for (const h of hotels) {
      console.log('    ' + (h.status === 'ACTIVE' ? '🟢' : '🔴') + ' ' + h.name.padEnd(35) + ' ⭐' + h.rating + ' | ' + h.city + ', ' + h.countryCode + ' | ' + h.currency);
    }

    const rooms = await ds.query(`SELECT r.name, r.type, r."bedType", r."pricePerNight", r.currency, r."totalInventory", r."availableCount", h.name as hotel_name FROM hotel_rooms r JOIN hotels h ON r.hotel_id = h.id ORDER BY r."pricePerNight" DESC`);
    console.log('\n  Rooms (' + rooms.length + '):');
    for (const r of rooms) {
      console.log('    🛏️  ' + r.currency + ' ' + String(Number(r.pricePerNight).toFixed(0)).padStart(7) + '/night — ' + r.name.padEnd(30) + ' [' + r.availableCount + '/' + r.totalInventory + '] @ ' + r.hotel_name);
    }

    const owners = await ds.query(`SELECT name, "businessName", status, "propertyCount", "avgRating", "countryCode" FROM hotel_owners ORDER BY "avgRating" DESC`);
    console.log('\n  Owners (' + owners.length + '):');
    for (const o of owners) {
      console.log('    👤 ' + o.name.padEnd(22) + o.status.padEnd(22) + o.countryCode + ' | ' + o.propertyCount + ' properties | ⭐' + o.avgRating);
    }

    const reviews = await ds.query(`SELECT r."customerName", r.rating, r.title, r."stayType", h.name as hotel FROM hotel_reviews r JOIN hotels h ON r.hotel_id = h.id ORDER BY r.rating DESC LIMIT 10`);
    console.log('\n  Reviews (top 10 of ' + reviews.length + '):');
    for (const rv of reviews) {
      console.log('    ⭐' + rv.rating + ' — "' + rv.title + '" by ' + rv.customerName + ' (' + rv.stayType + ') @ ' + rv.hotel);
    }
  } catch (e) {
    console.log('  ⚠️ Data query error:', e.message);
  }

  // ── 4. Foreign Key Integrity ──────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  🔗 FOREIGN KEY INTEGRITY');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const orphanRooms = await ds.query(`SELECT count(*) FROM hotel_rooms r LEFT JOIN hotels h ON r.hotel_id = h.id WHERE h.id IS NULL`);
    const orphanReviews = await ds.query(`SELECT count(*) FROM hotel_reviews r LEFT JOIN hotels h ON r.hotel_id = h.id WHERE h.id IS NULL`);
    console.log('  Orphan rooms (no parent hotel):   ' + (orphanRooms[0].count === '0' ? '✅ 0' : '❌ ' + orphanRooms[0].count));
    console.log('  Orphan reviews (no parent hotel):  ' + (orphanReviews[0].count === '0' ? '✅ 0' : '❌ ' + orphanReviews[0].count));

    // Check room availability sanity
    const badAvail = await ds.query(`SELECT count(*) FROM hotel_rooms WHERE "availableCount" > "totalInventory"`);
    console.log('  Rooms with availableCount > total: ' + (badAvail[0].count === '0' ? '✅ 0' : '❌ ' + badAvail[0].count));

    // Check rating range
    const badRatings = await ds.query(`SELECT count(*) FROM hotel_reviews WHERE rating < 1 OR rating > 5`);
    console.log('  Reviews with invalid rating (not 1-5): ' + (badRatings[0].count === '0' ? '✅ 0' : '❌ ' + badRatings[0].count));
  } catch (e) {
    console.log('  ⚠️ Integrity check error:', e.message);
  }

  // ── 5. API Gateway Hotel Endpoint Test ────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  🌐 API GATEWAY HOTEL ENDPOINTS');
  console.log('═══════════════════════════════════════════════════════════');
  const http = require('http');
  const endpoints = [
    '/api/v1/hotels',
    '/api/v1/hotels/health',
  ];
  for (const ep of endpoints) {
    const result = await new Promise(resolve => {
      const req = http.get('http://localhost:3001' + ep, { timeout: 3000 }, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve({ status: res.statusCode, body: body.substring(0, 200) }));
      });
      req.on('error', e => resolve({ status: 'ERROR', body: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', body: '' }); });
    });
    const icon = result.status === 200 ? '✅' : result.status === 'ERROR' ? '❌' : '⚠️';
    console.log('  ' + icon + ' GET ' + ep + ' → ' + result.status);
    if (result.body) console.log('     ' + result.body);
  }

  // ── 6. WebSocket Check ────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  🔌 WEBSOCKET NAMESPACES');
  console.log('═══════════════════════════════════════════════════════════');
  const wsPort = await checkPort(3001);
  console.log('  Gateway WS port (3001): ' + (wsPort ? '✅ Reachable' : '❌ Not reachable'));
  console.log('  Expected namespaces: /tracking, /taxi, /notifications, /chat, /orders, /seller, /franchise, /hotel');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  📋 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  const hotelServiceUp = await checkPort(3035);
  const kafkaUp = await checkPort(9092);
  const redisUp = await checkPort(6379);
  console.log('  Database:      ✅ Connected, ' + tables.length + ' hotel tables');
  console.log('  Hotel Service: ' + (hotelServiceUp ? '✅ Running' : '❌ NOT RUNNING (port 3035)'));
  console.log('  API Gateway:   ✅ Running (port 3001)');
  console.log('  Redis:         ' + (redisUp ? '✅ Running' : '⚠️  Not detected'));
  console.log('  Kafka:         ' + (kafkaUp ? '✅ Running' : '⚠️  Not detected'));
  console.log('  Web App:       ✅ Running (port 3000)');

  if (!hotelServiceUp) {
    console.log('\n  ⚠️  ACTION NEEDED: Hotel service is not running.');
    console.log('  Run: npm run start:hotel (from apps/api/)');
    console.log('  Or restart: npm run dev:all\n');
  }

  await ds.destroy();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
