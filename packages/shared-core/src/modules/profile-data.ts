'use client';

/**
 * KARTSEEK — Live per-module profile data.
 *
 * Every counter, history row and loyalty balance a profile section shows is
 * loaded from the module's own API here. The previous implementation shipped
 * these as literals in `./profiles`, so the figures were identical for every
 * customer and unrelated to anything they had done.
 *
 * Two rules hold throughout:
 *
 *  • A failure is reported, never papered over. No loader substitutes sample
 *    rows or a zero when a request fails — a dead service must not read as an
 *    empty account, which is how a customer concludes their orders are gone.
 *
 *  • Money stays numeric. Rows carry `amount` plus, where the record has one,
 *    its own `currency`; formatting happens in the component through the region
 *    registry. Nothing here builds a string with a currency symbol in it.
 */

import { getOrders } from '../api/marketplace';
import { groceryApi } from '@/lib/grocery-api';
import { restaurantApi } from '../api/restaurant';
import { pharmacyApi } from '../api/pharmacy';
import { doctorApi } from '../api/doctor';
import { hotelApi } from '../api/hotel';
import { taxiModuleApi } from '../api/taxi';
import { loyaltyApi } from '../api/loyalty';
import type { ModuleKey, ProfileCountKey } from './profiles';

// ─── Shapes ─────────────────────────────────────────────────────────────────────

/** How a status should read — colour is the component's business, not this file's. */
export type ActivityTone = 'progress' | 'success' | 'warning' | 'danger' | 'neutral';

export interface ProfileActivity {
  /** Customer-facing reference — an order number where one exists. */
  reference: string;
  title: string;
  subtitle: string;
  /** ISO timestamp, or null when the record carries no usable date. */
  dateISO: string | null;
  statusLabel: string;
  tone: ActivityTone;
  /** Numeric, unformatted. Null when the record has no amount. */
  amount: number | null;
  /** ISO currency code when the record carries its own, else null (use region). */
  currency: string | null;
  /** Where this row's detail view lives. */
  href: string;
  icon: string;
}

export interface ProfileStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  /** Set when `value` is a money figure the component must format. */
  amount?: number;
}

export interface ModuleProfileSnapshot {
  stats: ProfileStat[];
  activity: ProfileActivity[];
  counts: Partial<Record<ProfileCountKey, number>>;
  /** How many records exist in total, not just how many were fetched. */
  totalRecords: number;
}

export interface LoyaltySnapshot {
  points: number;
  tier: string;
  nextTier: string | null;
  pointsToNextTier: number;
  totalEarned: number;
}

// ─── Status vocabulary ──────────────────────────────────────────────────────────

/**
 * Each vertical names its states differently — `OUT_FOR_DELIVERY` in the
 * marketplace, `RIDE_STARTED` in taxi, `CHECKED_IN` in hotels. This maps the
 * union of them onto one tone plus a readable label so a customer reading two
 * modules is not learning two vocabularies.
 */
const STATUS_TONES: Record<string, { label: string; tone: ActivityTone }> = {
  // Placed / awaiting acceptance
  PENDING: { label: 'Pending', tone: 'warning' },
  PLACED: { label: 'Placed', tone: 'progress' },
  CREATED: { label: 'Placed', tone: 'progress' },
  AWAITING_PAYMENT: { label: 'Awaiting payment', tone: 'warning' },
  // Accepted / in progress
  CONFIRMED: { label: 'Confirmed', tone: 'progress' },
  ACCEPTED: { label: 'Accepted', tone: 'progress' },
  RESTAURANT_ACCEPTED: { label: 'Accepted by restaurant', tone: 'progress' },
  STORE_ACCEPTED: { label: 'Accepted by store', tone: 'progress' },
  PROCESSING: { label: 'Processing', tone: 'progress' },
  PREPARING: { label: 'Preparing', tone: 'progress' },
  PACKING: { label: 'Packing', tone: 'progress' },
  PACKED: { label: 'Packed', tone: 'progress' },
  READY: { label: 'Ready', tone: 'progress' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', tone: 'progress' },
  SHIPPED: { label: 'Shipped', tone: 'progress' },
  DISPATCHED: { label: 'Dispatched', tone: 'progress' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'progress' },
  PICKED_UP: { label: 'Picked up', tone: 'progress' },
  IN_PROGRESS: { label: 'In progress', tone: 'progress' },
  IN_TRANSIT: { label: 'In transit', tone: 'progress' },
  MODIFIED: { label: 'Modified', tone: 'progress' },
  // Waiting on somebody — the customer, a pharmacist, an approval
  PRESCRIPTION_PENDING: { label: 'Awaiting prescription', tone: 'warning' },
  PRESCRIPTION_VERIFIED: { label: 'Prescription verified', tone: 'progress' },
  MODIFICATION_REQUESTED: { label: 'Change requested', tone: 'warning' },
  REFUND_REQUESTED: { label: 'Refund requested', tone: 'warning' },
  HELD: { label: 'On hold', tone: 'warning' },
  // Terminal — good
  DELIVERED: { label: 'Delivered', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CUSTOMER_PICKED_UP: { label: 'Picked up', tone: 'success' },
  SERVED: { label: 'Served', tone: 'success' },
  CHECKED_OUT: { label: 'Checked out', tone: 'success' },
  // Terminal — not good
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  CANCELED: { label: 'Cancelled', tone: 'danger' },
  FAILED: { label: 'Failed', tone: 'danger' },
  PAYMENT_FAILED: { label: 'Payment failed', tone: 'danger' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  RESTAURANT_REJECTED: { label: 'Declined by restaurant', tone: 'danger' },
  STORE_REJECTED: { label: 'Declined by store', tone: 'danger' },
  PRESCRIPTION_REJECTED: { label: 'Prescription rejected', tone: 'danger' },
  NO_SHOW: { label: 'No show', tone: 'danger' },
  NO_DRIVER_FOUND: { label: 'No driver found', tone: 'danger' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
  PARTIALLY_REFUNDED: { label: 'Partially refunded', tone: 'neutral' },
  RELEASED: { label: 'Released', tone: 'neutral' },
  RETURNED: { label: 'Returned', tone: 'neutral' },
  // Hotel
  CHECKED_IN: { label: 'Checked in', tone: 'progress' },
  // Taxi
  SEARCHING_DRIVER: { label: 'Finding a driver', tone: 'progress' },
  DRIVER_ASSIGNED: { label: 'Driver assigned', tone: 'progress' },
  DRIVER_ARRIVING: { label: 'Driver arriving', tone: 'progress' },
  DRIVER_ARRIVED: { label: 'Driver arrived', tone: 'progress' },
  RIDE_STARTED: { label: 'On the way', tone: 'progress' },
  RIDE_COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED_BY_CUSTOMER: { label: 'Cancelled by you', tone: 'danger' },
  CANCELLED_BY_DRIVER: { label: 'Cancelled by driver', tone: 'danger' },
  CANCELLED_BY_ADMIN: { label: 'Cancelled by support', tone: 'danger' },
};

/**
 * Read a raw status.
 *
 * An unrecognised value is shown as-is with a neutral tone rather than being
 * mapped to a plausible-looking default — a new backend state should look
 * unfamiliar here, not silently render as "Delivered".
 */
export function readStatus(raw: unknown): { label: string; tone: ActivityTone } {
  const key = String(raw ?? '').toUpperCase().replace(/[\s-]+/g, '_');
  if (STATUS_TONES[key]) return STATUS_TONES[key];
  if (!key) return { label: 'Unknown', tone: 'neutral' };
  const label = key.toLowerCase().replace(/_/g, ' ');
  return { label: label.charAt(0).toUpperCase() + label.slice(1), tone: 'neutral' };
}

/** Statuses that mean "still happening" — what an "open orders" badge counts. */
const OPEN_TONES: ActivityTone[] = ['progress', 'warning'];

export function isOpen(raw: unknown): boolean {
  return OPEN_TONES.includes(readStatus(raw).tone);
}

// ─── Small helpers ──────────────────────────────────────────────────────────────

/**
 * Coerce a money field to a number.
 *
 * Services disagree about the wire type: marketplace sends `totalAmount` as a
 * number, pharmacy sends `grandTotal` as the string `"645.00"` because the
 * column is a Postgres `decimal`. `Number('')` is 0, which would present a
 * missing total as a free order, so an unparseable value becomes null.
 */
function money(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** First usable ISO date among the candidates, else null. */
function firstDate(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(c as string);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/**
 * Pull the row array out of whatever the gateway sent.
 *
 * There is no single list shape across the platform. `api.get` strips the outer
 * `{ success, data }` envelope, and underneath it a handler may hand back a bare
 * array (`/taxi/rides`), `{ data, total }` (marketplace, pharmacy, hotels), a
 * second nested `data` (grocery), or its own noun (`{ rides }`). Reading only
 * `res.data` — which several screens did — silently yields an empty list for
 * three of those four.
 */
function rowsOf(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.rides)) return res.rides;
  if (Array.isArray(res?.orders)) return res.orders;
  if (Array.isArray(res?.bookings)) return res.bookings;
  if (Array.isArray(res?.appointments)) return res.appointments;
  return [];
}

function totalOf(res: any, rows: any[]): number {
  const t = res?.total ?? res?.data?.total;
  return typeof t === 'number' ? t : rows.length;
}

function itemSummary(items: any[] | undefined, fallback: string): string {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  const names = items
    .map((i) => (typeof i === 'string' ? i : i?.name))
    .filter((n): n is string => typeof n === 'string' && n.length > 0);
  if (names.length === 0) return `${items.length} item${items.length === 1 ? '' : 's'}`;
  if (names.length === 1) return names[0];
  return `${names[0]} + ${names.length - 1} more`;
}

const HISTORY_PREVIEW = 5;

// ─── Loyalty ────────────────────────────────────────────────────────────────────

/**
 * The customer's points balance.
 *
 * One balance, platform-wide. The old profile invented a separate per-module
 * balance — "Mall Points", "Fresh Points", "Ride Points" — with a different
 * figure and tier in each, none of which the loyalty service has any concept of.
 */
export async function loadLoyalty(): Promise<LoyaltySnapshot> {
  const res: any = await loyaltyApi.getPoints();
  return {
    points: Number(res?.points ?? 0),
    tier: String(res?.tier ?? 'Bronze'),
    nextTier: res?.nextTier ?? null,
    pointsToNextTier: Number(res?.pointsToNextTier ?? 0),
    totalEarned: Number(res?.totalEarned ?? 0),
  };
}

// ─── Per-module loaders ─────────────────────────────────────────────────────────

async function loadMarketplace(): Promise<ModuleProfileSnapshot> {
  const res: any = await getOrders({ limit: '50' });
  const rows = rowsOf(res);
  const total = totalOf(res, rows);

  const delivered = rows.filter((o) => readStatus(o.status).tone === 'success').length;
  const open = rows.filter((o) => isOpen(o.status)).length;
  const spent = rows.reduce((sum, o) => sum + (money(o.totalAmount) ?? 0), 0);

  return {
    totalRecords: total,
    counts: { totalOrders: total, openOrders: open },
    stats: [
      { label: 'Orders', value: total, icon: '📦', color: 'bg-blue-50 text-blue-700' },
      { label: 'In progress', value: open, icon: '🚚', color: 'bg-amber-50 text-amber-700' },
      { label: 'Delivered', value: delivered, icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
      { label: 'Total spent', value: spent, amount: spent, icon: '💰', color: 'bg-indigo-50 text-indigo-700' },
    ],
    activity: rows.slice(0, HISTORY_PREVIEW).map((o) => {
      const s = readStatus(o.status);
      const reference = o.orderNumber ?? o.id;
      return {
        reference,
        title: itemSummary(o.items, 'Marketplace order'),
        subtitle: `${Array.isArray(o.items) ? o.items.length : 0} item${Array.isArray(o.items) && o.items.length === 1 ? '' : 's'} · ${o.paymentMethod ?? 'Payment pending'}`,
        dateISO: firstDate(o.placedAt, o.createdAt, o.updatedAt),
        statusLabel: s.label,
        tone: s.tone,
        amount: money(o.totalAmount),
        currency: null,
        href: `/marketplace/orders/${encodeURIComponent(reference)}`,
        icon: '📦',
      };
    }),
  };
}

async function loadGrocery(userId: string): Promise<ModuleProfileSnapshot> {
  const res: any = await groceryApi.getCustomerOrders(userId);
  const rows = rowsOf(res);
  const total = totalOf(res, rows);

  const open = rows.filter((o) => isOpen(o.status)).length;
  const itemsBought = rows.reduce((sum, o) => sum + (Array.isArray(o.items) ? o.items.length : 0), 0);
  const spent = rows.reduce((sum, o) => sum + (money(o.grandTotal ?? o.total) ?? 0), 0);

  return {
    totalRecords: total,
    counts: { totalOrders: total, openOrders: open },
    stats: [
      { label: 'Orders', value: total, icon: '🧺', color: 'bg-emerald-50 text-emerald-700' },
      { label: 'In progress', value: open, icon: '🚚', color: 'bg-amber-50 text-amber-700' },
      { label: 'Items bought', value: itemsBought, icon: '📋', color: 'bg-lime-50 text-lime-700' },
      { label: 'Total spent', value: spent, amount: spent, icon: '💚', color: 'bg-green-50 text-green-700' },
    ],
    activity: rows.slice(0, HISTORY_PREVIEW).map((o) => {
      const s = readStatus(o.status);
      const reference = o.orderNumber ?? o.id;
      return {
        reference,
        title: o.storeName ?? itemSummary(o.items, 'Grocery order'),
        subtitle: itemSummary(o.items, 'Basket'),
        dateISO: firstDate(o.createdAt, o.placedAt),
        statusLabel: s.label,
        tone: s.tone,
        amount: money(o.grandTotal ?? o.total),
        currency: null,
        href: `/grocery/orders/${encodeURIComponent(o.id ?? reference)}`,
        icon: '🥬',
      };
    }),
  };
}

async function loadRestaurant(): Promise<ModuleProfileSnapshot> {
  const res: any = await restaurantApi.getOrderHistory();
  const rows = rowsOf(res);
  const total = totalOf(res, rows);

  const open = rows.filter((o) => isOpen(o.status)).length;
  const dineIn = rows.filter((o) => String(o.type).toLowerCase() === 'dine-in').length;
  const spent = rows.reduce((sum, o) => sum + (money(o.total ?? o.grandTotal) ?? 0), 0);

  return {
    totalRecords: total,
    counts: { totalOrders: total, openOrders: open },
    stats: [
      { label: 'Orders', value: total, icon: '🍽️', color: 'bg-orange-50 text-orange-700' },
      { label: 'In progress', value: open, icon: '🛵', color: 'bg-amber-50 text-amber-700' },
      { label: 'Dine-in visits', value: dineIn, icon: '🪑', color: 'bg-red-50 text-red-700' },
      { label: 'Total spent', value: spent, amount: spent, icon: '💰', color: 'bg-emerald-50 text-emerald-700' },
    ],
    activity: rows.slice(0, HISTORY_PREVIEW).map((o) => {
      const s = readStatus(o.status);
      const reference = o.orderNumber ?? o.id;
      const kind = String(o.type ?? 'delivery').replace('-', ' ');
      return {
        reference,
        // The history query joins the restaurant, so the name is on the relation;
        // `restaurantName` was the flat shape the fabricated gateway used to send.
        title: o.restaurant?.name ?? o.restaurantName ?? 'Restaurant order',
        subtitle: `${kind.charAt(0).toUpperCase() + kind.slice(1)} · ${itemSummary(o.items, `${o.itemCount ?? 0} items`)}`,
        dateISO: firstDate(o.placedAt, o.createdAt),
        statusLabel: s.label,
        tone: s.tone,
        amount: money(o.total ?? o.grandTotal),
        currency: null,
        href: `/restaurant/orders/${encodeURIComponent(reference)}`,
        icon: '🍔',
      };
    }),
  };
}

async function loadPharmacy(userId: string): Promise<ModuleProfileSnapshot> {
  // Prescriptions are a separate call and a separate permission; a customer with
  // no prescriptions on file is not an error, so its failure must not take the
  // orders half of the page down with it.
  const [ordersRes, prescriptionsRes] = await Promise.allSettled([
    pharmacyApi.getMyOrders(),
    pharmacyApi.getMyPrescriptions(userId),
  ]);
  if (ordersRes.status === 'rejected') throw ordersRes.reason;

  const rows = rowsOf(ordersRes.value);
  const total = totalOf(ordersRes.value, rows);
  const prescriptions = prescriptionsRes.status === 'fulfilled' ? rowsOf(prescriptionsRes.value).length : 0;

  const open = rows.filter((o) => isOpen(o.status)).length;
  const rxOrders = rows.filter((o) => o.requiresPrescription === true).length;
  const spent = rows.reduce((sum, o) => sum + (money(o.grandTotal) ?? 0), 0);

  return {
    totalRecords: total,
    counts: { totalOrders: total, openOrders: open, prescriptions },
    stats: [
      { label: 'Orders', value: total, icon: '💊', color: 'bg-teal-50 text-teal-700' },
      { label: 'In progress', value: open, icon: '🚚', color: 'bg-amber-50 text-amber-700' },
      { label: 'Prescriptions', value: prescriptions, icon: '📋', color: 'bg-cyan-50 text-cyan-700' },
      { label: 'Total spent', value: spent, amount: spent, icon: '💰', color: 'bg-emerald-50 text-emerald-700' },
    ],
    activity: rows.slice(0, HISTORY_PREVIEW).map((o) => {
      const s = readStatus(o.status);
      const reference = o.orderNumber ?? o.id;
      return {
        reference,
        title: o.store?.name ?? 'Pharmacy order',
        subtitle: `${itemSummary(o.items, 'Medicines')}${o.requiresPrescription ? ' · Rx' : ''}`,
        dateISO: firstDate(o.createdAt, o.placedAt),
        statusLabel: s.label,
        tone: s.tone,
        amount: money(o.grandTotal),
        currency: null,
        href: `/pharmacy/orders/${encodeURIComponent(o.id ?? reference)}`,
        icon: '💊',
      };
    }),
  };
}

async function loadDoctor(userId: string): Promise<ModuleProfileSnapshot> {
  const [apptRes, familyRes] = await Promise.allSettled([
    doctorApi.getMyAppointments(),
    doctorApi.getFamilyMembers(userId),
  ]);
  if (apptRes.status === 'rejected') throw apptRes.reason;

  const rows = rowsOf(apptRes.value);
  const total = totalOf(apptRes.value, rows);
  const familyMembers = familyRes.status === 'fulfilled' ? rowsOf(familyRes.value).length : 0;

  const upcoming = rows.filter((a) => isOpen(a.status)).length;
  const completed = rows.filter((a) => readStatus(a.status).tone === 'success').length;

  return {
    totalRecords: total,
    counts: { totalOrders: total, upcomingAppointments: upcoming, familyMembers },
    stats: [
      { label: 'Consultations', value: total, icon: '🩺', color: 'bg-indigo-50 text-indigo-700' },
      { label: 'Upcoming', value: upcoming, icon: '📅', color: 'bg-blue-50 text-blue-700' },
      { label: 'Completed', value: completed, icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
      { label: 'Family members', value: familyMembers, icon: '👨‍👩‍👧', color: 'bg-violet-50 text-violet-700' },
    ],
    activity: rows.slice(0, HISTORY_PREVIEW).map((a) => {
      const s = readStatus(a.status);
      const doctorName = a.doctor?.name ?? a.doctorName ?? 'Consultation';
      const specialty = a.doctor?.specialty ?? a.specialty;
      const kind = a.type === 'video' ? 'Video consultation' : 'In-clinic';
      return {
        reference: a.tokenNumber ? `Token ${a.tokenNumber}` : String(a.id ?? ''),
        title: doctorName,
        subtitle: [specialty, kind, a.timeSlot].filter(Boolean).join(' · '),
        dateISO: firstDate(a.date, a.createdAt),
        statusLabel: s.label,
        tone: s.tone,
        amount: money(a.fee),
        currency: null,
        href: '/doctor/my-appointments',
        icon: '🩺',
      };
    }),
  };
}

async function loadHotel(userId: string): Promise<ModuleProfileSnapshot> {
  const res: any = await hotelApi.getMyBookings(userId, { limit: 50 });
  const rows = rowsOf(res);
  const total = totalOf(res, rows);

  const upcoming = rows.filter((b) => isOpen(b.status)).length;
  const nights = rows.reduce((sum, b) => sum + (Number(b.nights) || 0), 0);
  const cities = new Set(rows.map((b) => b.hotelCity).filter(Boolean)).size;

  return {
    totalRecords: total,
    counts: { totalOrders: total, upcomingStays: upcoming },
    stats: [
      { label: 'Bookings', value: total, icon: '🏨', color: 'bg-rose-50 text-rose-700' },
      { label: 'Upcoming', value: upcoming, icon: '📅', color: 'bg-blue-50 text-blue-700' },
      { label: 'Nights', value: nights, icon: '🌙', color: 'bg-pink-50 text-pink-700' },
      { label: 'Cities', value: cities, icon: '🌍', color: 'bg-amber-50 text-amber-700' },
    ],
    activity: rows.slice(0, HISTORY_PREVIEW).map((b) => {
      const s = readStatus(b.status);
      const reference = b.bookingNumber ?? b.confirmationCode ?? b.id;
      return {
        reference,
        title: b.hotelName ?? 'Hotel booking',
        subtitle: [b.roomName, b.hotelCity, b.nights ? `${b.nights} night${b.nights === 1 ? '' : 's'}` : null]
          .filter(Boolean).join(' · '),
        dateISO: firstDate(b.checkinDate, b.createdAt),
        statusLabel: s.label,
        tone: s.tone,
        amount: money(b.grandTotal),
        // A booking is priced in the hotel's currency, which is not necessarily
        // the currency the customer is browsing in.
        currency: b.currency ?? null,
        href: `/hotel-bookings/${encodeURIComponent(b.id ?? reference)}`,
        icon: '🏨',
      };
    }),
  };
}

async function loadTaxi(): Promise<ModuleProfileSnapshot> {
  const res: any = await taxiModuleApi.getRideHistory();
  const rows = rowsOf(res);
  const total = totalOf(res, rows);

  const completed = rows.filter((r) => readStatus(r.status).tone === 'success').length;
  const distance = rows.reduce((sum, r) => sum + (Number(r.finalDistanceKm ?? r.estimatedDistanceKm) || 0), 0);
  const spent = rows.reduce((sum, r) => sum + (money(r.finalFare ?? r.fareEstimate) ?? 0), 0);

  return {
    totalRecords: total,
    counts: { totalOrders: total, completedRides: completed },
    stats: [
      { label: 'Rides', value: total, icon: '🚗', color: 'bg-yellow-50 text-yellow-800' },
      { label: 'Completed', value: completed, icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
      { label: 'Distance', value: `${distance.toFixed(1)} km`, icon: '📍', color: 'bg-amber-50 text-amber-800' },
      { label: 'Total spent', value: spent, amount: spent, icon: '💰', color: 'bg-emerald-50 text-emerald-700' },
    ],
    activity: rows.slice(0, HISTORY_PREVIEW).map((r) => {
      const s = readStatus(r.status);
      return {
        reference: String(r.id ?? ''),
        title: r.dropAddress ? `To ${r.dropAddress}` : 'Ride',
        subtitle: [r.vehicleType, r.pickupAddress ? `from ${r.pickupAddress}` : null,
          r.finalDistanceKm ? `${Number(r.finalDistanceKm).toFixed(1)} km` : null]
          .filter(Boolean).join(' · '),
        dateISO: firstDate(r.createdAt, r.requestedAt),
        statusLabel: s.label,
        tone: s.tone,
        amount: money(r.finalFare ?? r.fareEstimate),
        // Rides record the currency they were priced in.
        currency: r.currency ?? null,
        href: `/taxi/trip/${encodeURIComponent(String(r.id ?? ''))}`,
        icon: '🚕',
      };
    }),
  };
}

// ─── Entry point ────────────────────────────────────────────────────────────────

/**
 * Load one module's profile snapshot for the signed-in customer.
 *
 * `userId` is required by the modules whose history endpoint is scoped by a path
 * or query id rather than by the bearer token. Callers must not invent one: the
 * grocery orders screen used to pass the literal string `'current-user'`, the
 * ownership guard refused it, and the swallowed 403 left demo rows on screen.
 */
export function loadModuleProfile(key: ModuleKey, userId: string): Promise<ModuleProfileSnapshot> {
  switch (key) {
    case 'marketplace': return loadMarketplace();
    case 'grocery':     return loadGrocery(userId);
    case 'restaurant':  return loadRestaurant();
    case 'pharmacy':    return loadPharmacy(userId);
    case 'doctor':      return loadDoctor(userId);
    case 'hotel':       return loadHotel(userId);
    case 'taxi':        return loadTaxi();
  }
}
