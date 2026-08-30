/// KARTSEEK — Region-aware date, time and delivery-window formatting
///
/// Every timestamp the platform renders is an instant (UTC on the wire). What
/// wall clock it is shown against is a property of the region, not of the
/// browser: a Doha customer tracking a delivery must see Doha time even when
/// their laptop is set to another zone, and a Super Admin reviewing a Qatari
/// order must see the time the customer saw.

import { getCountry } from './countries';
import { getLanguage } from './languages';

function toDate(value: Date | string | number): Date {
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(NaN) : d;
}

/**
 * Locale tag for `Intl.DateTimeFormat`.
 *
 * The base locale is chosen from the region's declared `dateFormat` rather than
 * from its country code. `en-QA` is not a locale Node's bundled ICU carries, so
 * it silently degrades to `en-US` and renders Qatari dates as `07/28/2026`
 * instead of `28/07/2026` — the same digits in the wrong order, which reads as
 * a valid but different date. Pinning `en-GB` for day-first regions and
 * `en-US` for month-first ones makes the ordering deterministic wherever the
 * code runs.
 */
function intlLocale(country?: string, language?: string): string {
  const c = getCountry(country);
  const lang = getLanguage(language ?? c.defaultLanguage);
  const base = c.dateFormat.startsWith('MM') ? 'en-US' : 'en-GB';

  // Latin digits even in Arabic — dates with Arabic-Indic numerals are hard to
  // scan against order numbers and tracking IDs, which stay Latin.
  return lang.rtl ? `ar-${c.code}-u-nu-latn` : base;
}

export interface DateTimeOptions {
  country?: string;
  language?: string;
  /** Override the region's timezone (rarely needed). */
  timeZone?: string;
}

/** The IANA zone for a region — `Asia/Qatar` for QA. */
export function getTimezone(country?: string): string {
  return getCountry(country).timezone;
}

// ─── Core formatters ─────────────────────────────────────────────────────────

export function formatDateFor(value: Date | string | number, opts: DateTimeOptions = {}): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  const c = getCountry(opts.country);
  return new Intl.DateTimeFormat(intlLocale(opts.country, opts.language), {
    timeZone: opts.timeZone ?? c.timezone,
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
}

export function formatTimeFor(value: Date | string | number, opts: DateTimeOptions = {}): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  const c = getCountry(opts.country);
  return new Intl.DateTimeFormat(intlLocale(opts.country, opts.language), {
    timeZone: opts.timeZone ?? c.timezone,
    hour: '2-digit', minute: '2-digit', hour12: c.hour12,
  }).format(d);
}

export function formatDateTimeFor(value: Date | string | number, opts: DateTimeOptions = {}): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  const c = getCountry(opts.country);
  return new Intl.DateTimeFormat(intlLocale(opts.country, opts.language), {
    timeZone: opts.timeZone ?? c.timezone,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: c.hour12,
  }).format(d);
}

/** Long form for order confirmations: "Sunday, 27 July 2026". */
export function formatLongDateFor(value: Date | string | number, opts: DateTimeOptions = {}): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  const c = getCountry(opts.country);
  return new Intl.DateTimeFormat(intlLocale(opts.country, opts.language), {
    timeZone: opts.timeZone ?? c.timezone,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
}

/** Zone abbreviation to append to a tracking timestamp, e.g. "AST" for Qatar. */
export function getTimezoneLabel(country?: string): string {
  const c = getCountry(country);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: c.timezone, timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? c.timezone;
  } catch {
    return c.timezone;
  }
}

/** Timestamp plus zone, for delivery events: "27/07/2026, 04:15 PM AST". */
export function formatTrackingTimestamp(value: Date | string | number, opts: DateTimeOptions = {}): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDateFor(d, opts)}, ${formatTimeFor(d, opts)} ${getTimezoneLabel(opts.country)}`;
}

// ─── Region "now" ────────────────────────────────────────────────────────────

/** The calendar parts of the current instant in a region's zone. */
export function nowInRegion(country?: string): {
  year: number; month: number; day: number;
  hour: number; minute: number; weekday: number;
  timezone: string; label: string;
} {
  const c = getCountry(country);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: c.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    // Intl renders midnight as "24" in some hour12:false configurations.
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    weekday: Math.max(0, weekdayNames.indexOf(get('weekday'))),
    timezone: c.timezone,
    label: getTimezoneLabel(country),
  };
}

/** Whether the region is currently on a weekend — Friday/Saturday in Qatar. */
export function isWeekendInRegion(country?: string): boolean {
  const c = getCountry(country);
  return c.weekend.includes(nowInRegion(country).weekday);
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The region's working week as a label, derived from its weekend.
 *
 * Qatar rests Friday–Saturday, so its offices run Sunday–Thursday — printing
 * "Mon – Fri" there is simply the wrong week. Computed from `weekend` rather
 * than listed per country so the two cannot disagree.
 */
export function getBusinessDaysLabel(country?: string): string {
  const c = getCountry(country);
  const working = [0, 1, 2, 3, 4, 5, 6].filter((d) => !c.weekend.includes(d));
  if (working.length === 0) return '—';

  // Rotate so the run starts at the first working day after the weekend, which
  // is what makes Qatar read "Sunday – Thursday" rather than "Sunday – Wednesday,
  // Thursday" when the week wraps.
  const start = working.find((d) => c.weekend.includes((d + 6) % 7)) ?? working[0];
  const ordered: number[] = [];
  for (let i = 0; i < 7 && ordered.length < working.length; i++) {
    const day = (start + i) % 7;
    if (working.includes(day)) ordered.push(day);
    else break;
  }

  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  return first === last ? DAY_NAMES[first] : `${DAY_NAMES[first]} – ${DAY_NAMES[last]}`;
}

/** The region's weekend as a label, e.g. "Friday – Saturday" in Qatar. */
export function getWeekendLabel(country?: string): string {
  const days = getCountry(country).weekend;
  if (days.length === 0) return '—';
  if (days.length === 1) return DAY_NAMES[days[0]];
  return `${DAY_NAMES[days[0]]} – ${DAY_NAMES[days[days.length - 1]]}`;
}

/** Whether a business is open, given local `HH:mm` opening hours. */
export function isWithinBusinessHours(open: string, close: string, country?: string): boolean {
  const { hour, minute } = nowInRegion(country);
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const now = hour * 60 + minute;
  const from = toMinutes(open);
  const to = toMinutes(close);
  // Windows that cross midnight (e.g. 20:00–02:00) wrap around.
  return from <= to ? now >= from && now < to : now >= from || now < to;
}

// ─── Delivery windows ────────────────────────────────────────────────────────

export interface DeliveryWindow {
  /** Start of the promised window, as an instant. */
  from: Date;
  to: Date;
  /** "Today, 4:00 PM – 6:00 PM (AST)" */
  label: string;
  /** "Today" | "Tomorrow" | "Sun, 27 Jul" — relative to the region's calendar. */
  dayLabel: string;
  timezone: string;
}

/**
 * Build a delivery window in the region's own clock.
 *
 * The relative day ("Today"/"Tomorrow") is computed against the *region's*
 * calendar date, not the browser's: at 23:30 in Doha a UK-based operator's
 * browser is still on the previous day, and a window labelled "Tomorrow" there
 * would be "Today" to the customer receiving the parcel.
 */
export function buildDeliveryWindow(
  fromValue: Date | string | number,
  toValue: Date | string | number,
  opts: DateTimeOptions = {},
): DeliveryWindow {
  const from = toDate(fromValue);
  const to = toDate(toValue);
  const c = getCountry(opts.country);

  const dayLabel = relativeDayLabel(from, opts);
  const label = Number.isNaN(from.getTime())
    ? '—'
    : `${dayLabel}, ${formatTimeFor(from, opts)} – ${formatTimeFor(to, opts)} (${getTimezoneLabel(opts.country)})`;

  return { from, to, label, dayLabel, timezone: c.timezone };
}

/** "Today" / "Tomorrow" / "Sun, 27 Jul", resolved in the region's timezone. */
export function relativeDayLabel(value: Date | string | number, opts: DateTimeOptions = {}): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  const c = getCountry(opts.country);
  const zone = opts.timeZone ?? c.timezone;

  const dayKey = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

  const today = dayKey(new Date());
  const target = dayKey(d);
  if (target === today) return 'Today';

  const tomorrow = dayKey(new Date(Date.now() + 86_400_000));
  if (target === tomorrow) return 'Tomorrow';

  return new Intl.DateTimeFormat(intlLocale(opts.country, opts.language), {
    timeZone: zone, weekday: 'short', day: 'numeric', month: 'short',
  }).format(d);
}

/**
 * Estimated arrival, expressed as a window in the region's clock.
 *
 * `minMinutes`/`maxMinutes` come from the delivery service as durations, so the
 * conversion to a wall-clock window has to happen after the zone is known.
 */
export function estimateArrival(
  minMinutes: number,
  maxMinutes: number,
  opts: DateTimeOptions & { placedAt?: Date | string | number } = {},
): DeliveryWindow {
  const base = opts.placedAt ? toDate(opts.placedAt).getTime() : Date.now();
  return buildDeliveryWindow(
    new Date(base + minMinutes * 60_000),
    new Date(base + maxMinutes * 60_000),
    opts,
  );
}

/** "in 25 min" / "in 2 h 10 m" / "overdue by 12 min" — for live tracking. */
export function countdownTo(value: Date | string | number): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = d.getTime() - Date.now();
  const overdue = diffMs < 0;
  const minutes = Math.round(Math.abs(diffMs) / 60_000);

  const body =
    minutes < 60
      ? `${minutes} min`
      : `${Math.floor(minutes / 60)} h ${minutes % 60} m`;

  return overdue ? `overdue by ${body}` : `in ${body}`;
}

/** "Just now" / "12m ago" / date, for activity feeds. */
export function formatRelativeFor(value: Date | string | number, opts: DateTimeOptions = {}): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateFor(d, opts);
}
