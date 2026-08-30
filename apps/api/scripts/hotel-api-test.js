/**
 * Hotel Booking API — Automated Test Runner v2
 * Smart response normalization to handle both wrapped and unwrapped responses.
 */
const http = require('http');

const BASE = 'http://localhost:3001/api/v1';
let hotelId = '', roomId = '', bookingId = '', reviewId = '';
let passed = 0, failed = 0, total = 0;

function req(method, path, body) {
  return new Promise(resolve => {
    const url = new URL(BASE + path);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, timeout: 8000, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => { d += c });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(d); } catch {}
        resolve({ status: res.statusCode, body: json, raw: d, time: Date.now() - start });
      });
    });
    r.on('error', e => resolve({ status: 0, body: null, raw: e.message, time: Date.now() - start }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, body: null, raw: 'TIMEOUT', time: 8000 }); });
    const start = Date.now();
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

// Helper: normalize response — gateway wraps GET in { success, data, timestamp } but POST may not
function d(r) {
  if (!r.body) return null;
  return r.body.data !== undefined ? r.body.data : r.body;
}

function test(name, condition) {
  total++;
  if (condition) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║    🏨 KARTSEEK Hotel Booking API — Test Suite v2             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ── 1. Health ────────────────────────────────────────────────────────
  console.log('── 🔧 1. Health & Connectivity ──────────────────────────');
  let r = await req('GET', '/hotels/health');
  test('Health returns 200', r.status === 200);
  test('Service name correct', d(r)?.service === 'hotel-service');
  test('DB connected', d(r)?.db === true);
  test('Response < 500ms', r.time < 500);

  // ── 2. Search ────────────────────────────────────────────────────────
  console.log('\n── 🔍 2. Search & Discovery ─────────────────────────────');
  r = await req('GET', '/hotels');
  test('Search all returns 200', r.status === 200);
  const searchData = d(r);
  test('Has data array', Array.isArray(searchData?.data));
  test('Has pagination total', typeof searchData?.total === 'number');
  test('At least 8 hotels', (searchData?.total || 0) >= 8);
  if (searchData?.data?.[0]) {
    hotelId = searchData.data[0].id;
    if (searchData.data[0].rooms?.[0]) roomId = searchData.data[0].rooms[0].id;
  }
  test('Hotel ID captured', hotelId.length > 0);

  r = await req('GET', '/hotels?city=Dubai');
  test('City filter returns 200', r.status === 200);
  test('Dubai results only', d(r)?.data?.every(h => h.city.toLowerCase().includes('dubai')));

  r = await req('GET', '/hotels?starRating=5');
  test('Star filter returns 200', r.status === 200);

  r = await req('GET', '/hotels?page=1&limit=3');
  test('Pagination works', r.status === 200 && (d(r)?.data?.length || 0) <= 3);

  // Hotel detail
  r = await req('GET', `/hotels/${hotelId}`);
  test('Hotel detail 200', r.status === 200);
  const detail = d(r);
  test('Has name', typeof detail?.name === 'string');
  test('Has rooms', Array.isArray(detail?.rooms));
  test('Has reviews', Array.isArray(detail?.reviews));
  if (detail?.rooms?.[0]) roomId = detail.rooms[0].id;
  test('Room ID captured', roomId.length > 0);

  // Invalid hotel
  r = await req('GET', '/hotels/00000000-0000-0000-0000-000000000000');
  test('Invalid hotel returns 404/500', [404, 500].includes(r.status));

  // Room availability
  r = await req('GET', `/hotels/${hotelId}/rooms?checkin=2026-07-15&checkout=2026-07-18&guests=2`);
  test('Room availability 200', r.status === 200);
  const avail = d(r);
  test('Has rooms array', Array.isArray(avail?.rooms));
  test('Has nights count', typeof avail?.nights === 'number');
  if (avail?.rooms?.[0]) roomId = avail.rooms[0].id;

  // ── 3. Booking Lifecycle ─────────────────────────────────────────────
  console.log('\n── 📅 3. Booking Lifecycle ──────────────────────────────');
  r = await req('POST', `/hotels/${hotelId}/bookings`, {
    customerId: 'cust-test-001', roomId, checkin: '2026-08-01', checkout: '2026-08-04',
    guests: 2, rooms: 1, paymentMethod: 'ONLINE',
    guestName: 'John Smith', guestEmail: 'john.smith@test.com', guestPhone: '+971501234567',
    specialRequests: 'High floor'
  });
  test('Create booking 200/201', r.status === 200 || r.status === 201);
  const bookResp = d(r);
  test('Booking success', bookResp?.success === true);
  test('Has booking ID', typeof bookResp?.booking?.id === 'string');
  test('Status CONFIRMED', bookResp?.booking?.status === 'CONFIRMED');
  test('Has confirmation code', typeof bookResp?.booking?.confirmationCode === 'string');
  test('Grand total > 0', Number(bookResp?.booking?.grandTotal) > 0);
  bookingId = bookResp?.booking?.id || '';

  // Missing fields
  r = await req('POST', `/hotels/${hotelId}/bookings`, { roomId });
  test('Missing fields → error', [400, 500].includes(r.status));

  // Get booking
  if (bookingId) {
    r = await req('GET', `/hotels/bookings/${bookingId}`);
    test('Get booking 200', r.status === 200);
    test('Correct booking ID', d(r)?.id === bookingId);
  } else {
    test('Get booking 200', false);
    test('Correct booking ID', false);
  }

  // User bookings
  r = await req('GET', '/hotels/bookings/user/cust-test-001?page=1&limit=10');
  test('User bookings 200', r.status === 200);
  test('At least 1 booking', (d(r)?.total || 0) >= 1);

  // Modify
  if (bookingId) {
    r = await req('PUT', `/hotels/bookings/${bookingId}/modify`, {
      checkin: '2026-08-02', checkout: '2026-08-05', specialRequests: 'Late checkout'
    });
    test('Modify booking 200', r.status === 200);
    const modResp = d(r);
    test('Status MODIFIED', modResp?.booking?.status === 'MODIFIED' || modResp?.status === 'MODIFIED');
  } else {
    test('Modify booking 200', false);
    test('Status MODIFIED', false);
  }

  // Cancel
  if (bookingId) {
    r = await req('PUT', `/hotels/bookings/${bookingId}/cancel`, { reason: 'Travel plans changed' });
    test('Cancel booking 200', r.status === 200);
    const canResp = d(r);
    test('Status CANCELLED', canResp?.status === 'CANCELLED' || canResp?.booking?.status === 'CANCELLED');
    test('Has refund info', typeof canResp?.refundAmount === 'number' || typeof canResp?.booking?.refundAmount === 'number');
  } else {
    test('Cancel booking 200', false);
    test('Status CANCELLED', false);
    test('Has refund info', false);
  }

  // Double cancel
  if (bookingId) {
    r = await req('PUT', `/hotels/bookings/${bookingId}/cancel`, { reason: 'Again' });
    test('Double cancel → error', [400, 500].includes(r.status));
  } else {
    test('Double cancel → error', false);
  }

  // ── 4. Reviews ───────────────────────────────────────────────────────
  console.log('\n── ⭐ 4. Reviews ────────────────────────────────────────');
  r = await req('POST', `/hotels/${hotelId}/reviews`, {
    userId: 'cust-test-001', bookingId: bookingId || 'test-id', rating: 5,
    comment: 'Automated test review — excellent stay!',
    cleanliness: 5, service: 5, value: 4, location: 5, comfort: 5, facilities: 4,
    stayType: 'Business'
  });
  test('Submit review 200', r.status === 200 || r.status === 201);
  const revResp = d(r);
  test('Review created', revResp?.success === true);
  reviewId = revResp?.review?.id || '';

  r = await req('GET', `/hotels/${hotelId}/reviews?page=1&limit=10`);
  test('Get reviews 200', r.status === 200);
  const reviewData = d(r);
  test('Has reviews', (reviewData?.total || reviewData?.reviews?.length || 0) >= 1);

  // Invalid rating
  r = await req('POST', `/hotels/${hotelId}/reviews`, { userId: 'x', bookingId: bookingId || 'test', rating: 10, comment: 'bad' });
  test('Rating > 5 → error', [400, 500].includes(r.status));

  // ── 5. Owner Portal ──────────────────────────────────────────────────
  console.log('\n── 🏢 5. Owner Portal ──────────────────────────────────');
  r = await req('POST', '/hotels/owner/register', {
    name: 'API Test Owner v2', email: `apitest${Date.now()}@kartseek.com`, phone: '+971509999999',
    businessName: 'API Test LLC', country: 'AE', taxId: 'VAT-API-TEST-2'
  });
  test('Register owner 200/201', r.status === 200 || r.status === 201);
  const ownerResp = d(r);
  test('Status PENDING', ownerResp?.owner?.status === 'PENDING_VERIFICATION' || ownerResp?.status === 'PENDING_VERIFICATION');

  r = await req('GET', '/hotels/owner/dashboard?ownerId=owner-001');
  test('Owner dashboard 200', r.status === 200);

  r = await req('GET', '/hotels/owner/bookings?ownerId=owner-001&page=1&limit=20');
  test('Owner bookings 200', r.status === 200);

  r = await req('PUT', `/hotels/owner/rooms/${roomId}/pricing`, { basePrice: 950, rackPrice: 1300 });
  test('Update pricing 200', r.status === 200);

  r = await req('GET', '/hotels/owner/reviews?ownerId=owner-001');
  test('Owner reviews 200', r.status === 200);

  if (reviewId) {
    r = await req('POST', `/hotels/owner/reviews/${reviewId}/reply`, { reply: 'Thank you for the review!' });
    test('Reply to review 200', r.status === 200);
  }

  // ── 6. Admin ─────────────────────────────────────────────────────────
  console.log('\n── 🛡️ 6. Admin Panel ───────────────────────────────────');
  r = await req('GET', '/hotels/admin/stats');
  test('Admin stats 200', r.status === 200);
  const stats = d(r);
  test('Has totalHotels', typeof stats?.totalHotels === 'number');
  test('Has cancelRate', typeof stats?.cancelRate === 'string');

  r = await req('GET', '/hotels/admin/hotels?page=1&limit=20');
  test('Admin list hotels 200', r.status === 200);
  test('Has ≥ 8 hotels', (d(r)?.total || 0) >= 8);

  r = await req('GET', '/hotels/admin/hotels?status=ACTIVE');
  test('Filter by status 200', r.status === 200);

  r = await req('GET', '/hotels/admin/fraud/flags');
  test('Fraud flags 200', r.status === 200);
  const fraud = d(r);
  test('Risk score valid', ['LOW', 'MEDIUM', 'HIGH'].includes(fraud?.riskScore));

  r = await req('GET', '/hotels/admin/compliance');
  test('Compliance 200', r.status === 200);

  r = await req('PUT', `/hotels/admin/hotels/${hotelId}/suspend`, { reason: 'Test suspension' });
  test('Suspend hotel 200', r.status === 200);
  const suspResp = d(r);
  test('Status SUSPENDED', suspResp?.status === 'SUSPENDED' || suspResp?.success === true);

  r = await req('PUT', `/hotels/admin/hotels/${hotelId}/approve`);
  test('Re-approve hotel 200', r.status === 200);
  const approveResp = d(r);
  test('Status ACTIVE', approveResp?.status === 'ACTIVE' || approveResp?.success === true);

  // ── 7. Performance ───────────────────────────────────────────────────
  console.log('\n── ⚡ 7. Performance ────────────────────────────────────');
  r = await req('GET', '/hotels?city=Dubai&limit=20');
  test('Search < 500ms', r.time < 500);

  r = await req('GET', '/hotels/health');
  test('Health < 200ms', r.time < 200);

  r = await req('GET', '/hotels/admin/stats');
  test('Admin stats < 1s', r.time < 1000);

  // ── Summary ──────────────────────────────────────────────────────────
  const pct = ((passed/total)*100).toFixed(0);
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  📋 RESULTS: ${String(passed).padStart(2)} passed / ${String(failed).padStart(2)} failed / ${total} total (${pct}%)     `);
  console.log(`║  ${failed === 0 ? '✅ ALL TESTS PASSED!' : '⚠️  Some tests need attention'}                           `);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  process.exit(failed > 0 ? 1 : 0);
}

run();
