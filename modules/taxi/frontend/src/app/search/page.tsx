'use client';
import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, Shield, Star, Navigation, Loader2, AlertCircle, Route } from 'lucide-react';
import Link from 'next/link';
import { useRegion } from '@/lib/contexts/region-context';
import { API_BASE_URL } from '@/lib/config/api-base';
import { getAuthToken } from '@/lib/auth-token';

// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const API_BASE = API_BASE_URL;

// ─── Vehicle Types with pricing tiers ─────────────────────────────────────────

const vehicleTypes = [
  { id: 'economy',  label: 'Economy',  icon: '🚗', desc: 'Affordable everyday rides', baseFare: 80,  perKm: 18, perMin: 2, minFare: 100, eta: '3–5 min' },
  { id: 'comfort',  label: 'Comfort',  icon: '🚙', desc: 'Spacious sedans & SUVs',   baseFare: 130, perKm: 28, perMin: 3, minFare: 180, eta: '4–7 min' },
  { id: 'premium',  label: 'Premium',  icon: '🚘', desc: 'Luxury vehicles',           baseFare: 220, perKm: 45, perMin: 5, minFare: 300, eta: '6–10 min' },
  { id: 'bike',     label: 'Moto',     icon: '🏍️', desc: 'Beat traffic on a bike',   baseFare: 40,  perKm: 10, perMin: 1, minFare: 50,  eta: '2–3 min' },
];

// ─── OSRM + Nominatim helpers ─────────────────────────────────────────────────

interface RouteInfo {
  distanceKm: number;
  durationMin: number;
}

/** Geocode an address string to lat/lng using Nominatim */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'KartSeek/1.0' }, signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.warn('[Geocode] Error:', e);
  }
  return null;
}

/** Get route distance and duration from OSRM */
async function getOSRMRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteInfo | null> {
  try {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.length > 0) {
      const route = data.routes[0];
      return {
        distanceKm: Math.round((route.distance / 1000) * 10) / 10, // 1 decimal
        durationMin: Math.round(route.duration / 60),
      };
    }
  } catch (e) {
    console.warn('[OSRM] Error:', e);
  }
  return null;
}

// ─── Search Results Component ─────────────────────────────────────────────────

function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const { formatCurrencyValue } = useRegion();
  const pickup = params.get('pickup') || 'Current Location';
  const destination = params.get('destination') || '';
  const vehicleParam = params.get('vehicle') || 'economy';
  const schedule = params.get('schedule');

  // Coordinates from URL (passed by TaxiHome page when available)
  const pickupLat = params.get('pickupLat');
  const pickupLng = params.get('pickupLng');
  const destLat = params.get('destLat');
  const destLng = params.get('destLng');

  const [selected, setSelected] = React.useState(vehicleParam);
  const [booking, setBooking] = React.useState(false);
  const [booked, setBooked] = React.useState(false);
  const [routeInfo, setRouteInfo] = React.useState<RouteInfo | null>(null);
  // The booking payload needs the pickup and drop coordinates, not just the
  // distance derived from them, so they are kept rather than discarded.
  const [coords, setCoords] = React.useState<{
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
  } | null>(null);
  const [bookError, setBookError] = React.useState<string | null>(null);
  const [routeLoading, setRouteLoading] = React.useState(true);
  const [routeError, setRouteError] = React.useState<string | null>(null);

  // ── Fetch real route on mount ──
  React.useEffect(() => {
    let cancelled = false;

    const fetchRoute = async () => {
      setRouteLoading(true);
      setRouteError(null);

      try {
        let fromCoords: { lat: number; lng: number } | null = null;
        let toCoords: { lat: number; lng: number } | null = null;

        // Use URL coordinates if available, otherwise geocode addresses
        if (pickupLat && pickupLng) {
          fromCoords = { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) };
        } else if (pickup && pickup !== 'Current Location') {
          fromCoords = await geocodeAddress(pickup);
        }

        if (destLat && destLng) {
          toCoords = { lat: parseFloat(destLat), lng: parseFloat(destLng) };
        } else if (destination) {
          toCoords = await geocodeAddress(destination);
        }

        if (cancelled) return;

        if (!fromCoords || !toCoords) {
          // Fallback to estimated distance if geocoding fails
          setRouteError('Could not geocode addresses — using estimated distance');
          setRouteInfo({ distanceKm: 8, durationMin: 20 });
          return;
        }

        setCoords({ from: fromCoords, to: toCoords });

        const route = await getOSRMRoute(fromCoords, toCoords);
        if (cancelled) return;

        if (route) {
          setRouteInfo(route);
        } else {
          setRouteError('Route calculation failed — using estimated distance');
          setRouteInfo({ distanceKm: 8, durationMin: 20 });
        }
      } catch (e) {
        if (!cancelled) {
          setRouteError('Route calculation failed — using estimated distance');
          setRouteInfo({ distanceKm: 8, durationMin: 20 });
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [pickup, destination, pickupLat, pickupLng, destLat, destLng]);

  // ── Fare calculation using OSRM distance + duration ──
  const getFare = (v: typeof vehicleTypes[0]) => {
    if (!routeInfo) return v.baseFare; // Loading state — show base fare
    const distFare = v.baseFare + v.perKm * routeInfo.distanceKm + v.perMin * routeInfo.durationMin;
    return Math.max(Math.round(distFare), v.minFare);
  };

  const handleBook = async () => {
    setBookError(null);

    // The gateway needs coordinates. Without them the ride cannot be dispatched,
    // so this stops here rather than posting a request that will be rejected.
    if (!coords) {
      setBookError('We could not resolve those addresses. Please re-enter your pickup and destination.');
      return;
    }

    setBooking(true);
    try {
      const token = getAuthToken();
      // POST /taxi/request, not /taxi/book — the latter is not a route the
      // gateway declares, so every booking 404'd. The payload shape is the
      // gateway's own: coordinates and addresses as separate fields, and
      // `fareEstimate` rather than `estimatedFare`.
      const res = await fetch(`${API_BASE}/taxi/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pickupLat: coords.from.lat,
          pickupLng: coords.from.lng,
          dropLat: coords.to.lat,
          dropLng: coords.to.lng,
          pickupAddress: pickup,
          dropAddress: destination,
          vehicleType: selected,
          paymentMethod: 'cash',
          fareEstimate: getFare(vehicleTypes.find((v) => v.id === selected)!),
          scheduledAt: schedule || null,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        // This used to be `catch { /* Continue with optimistic booking */ }`
        // followed by an unconditional success screen: the rider was told a car
        // was on the way whether or not anything had been dispatched. A failed
        // booking now says so.
        setBookError(
          res.status === 401
            ? 'Please sign in to book a ride.'
            : 'We could not book that ride. Please try again.',
        );
        setBooking(false);
        return;
      }

      setBooked(true);
    } catch {
      setBookError('We could not reach the booking service. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  if (booked) {
    return (
      <div className="min-h-[calc(100vh-130px)] flex items-center justify-center bg-slate-900">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-black mb-2">Ride Confirmed!</h2>
          <p className="text-slate-500 mb-6">Your driver is on the way. Estimated arrival: <strong className="text-green-600">4 min</strong></p>
          <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Vehicle</span><span className="font-bold">{vehicleTypes.find(v => v.id === selected)?.label}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Fare</span><span className="font-bold">{formatCurrencyValue(getFare(vehicleTypes.find(v => v.id === selected)!))}</span></div>
            {routeInfo && (
              <>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Distance</span><span className="font-bold">{routeInfo.distanceKm} km</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Est. Time</span><span className="font-bold">{routeInfo.durationMin} min</span></div>
              </>
            )}
            <div className="flex justify-between text-sm"><span className="text-slate-500">Pickup</span><span className="font-bold truncate max-w-[180px]">{pickup}</span></div>
          </div>
          <Link href="/taxi" className="block w-full bg-black text-white font-bold py-3 rounded-xl">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-130px)] bg-slate-900">
      <div className="max-w-2xl mx-auto px-3 xs:px-4 py-8">
        {/* Back & route summary */}
        <div className="flex items-center gap-3 mb-6">
          <button title="Go back" onClick={() => router.back()} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-slate-400 text-xs">Route</p>
            <p className="text-white font-semibold text-sm truncate max-w-xs">{pickup} → {destination}</p>
          </div>
        </div>

        {/* Route info banner */}
        {routeLoading ? (
          <div className="bg-blue-400/10 border border-blue-400/20 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            <p className="text-blue-300 text-sm font-medium">Calculating best route via OSRM...</p>
          </div>
        ) : routeInfo ? (
          <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-emerald-400" />
              <p className="text-emerald-300 text-sm font-medium">
                {routeInfo.distanceKm} km · ~{routeInfo.durationMin} min drive
              </p>
            </div>
            {routeError && (
              <div className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="w-3 h-3" />
                <span className="text-[10px] font-medium">Est.</span>
              </div>
            )}
          </div>
        ) : null}

        {schedule && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3 flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-yellow-400" />
            <p className="text-yellow-300 text-sm font-medium">Scheduled for {new Date(schedule).toLocaleString()}</p>
          </div>
        )}

        <h2 className="text-white text-xl font-black mb-4">Choose your ride</h2>

        {/* Ride options */}
        <div className="space-y-3 mb-6">
          {vehicleTypes.map((v) => {
            const fare = getFare(v);
            return (
              <button
                key={v.id}
                onClick={() => setSelected(v.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left
                  ${selected === v.id
                    ? 'border-yellow-400 bg-yellow-400/5'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
              >
                <span className="text-3xl">{v.icon}</span>
                <div className="flex-1">
                  <p className="font-bold text-white">{v.label}</p>
                  <p className="text-slate-400 text-xs">
                    {v.desc} · {v.eta}
                  </p>
                </div>
                <div className="text-right">
                  {routeLoading ? (
                    <div className="w-16 h-5 bg-white/10 rounded animate-pulse" />
                  ) : (
                    <p className="font-black text-white">{formatCurrencyValue(fare)}</p>
                  )}
                  {routeInfo && (
                    <p className="text-slate-400 text-xs">~{routeInfo.distanceKm} km</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Fare breakdown (for selected vehicle) */}
        {routeInfo && !routeLoading && (
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6">
            <p className="text-slate-400 text-[10px] font-bold uppercase mb-2">Fare Breakdown</p>
            {(() => {
              const v = vehicleTypes.find(vt => vt.id === selected)!;
              const distCharge = Math.round(v.perKm * routeInfo.distanceKm);
              const timeCharge = Math.round(v.perMin * routeInfo.durationMin);
              const total = getFare(v);
              return (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Base fare</span>
                    <span className="text-white font-medium">{formatCurrencyValue(v.baseFare)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Distance ({routeInfo.distanceKm} km × {formatCurrencyValue(v.perKm)}/km)</span>
                    <span className="text-white font-medium">{formatCurrencyValue(distCharge)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Time ({routeInfo.durationMin} min × {formatCurrencyValue(v.perMin)}/min)</span>
                    <span className="text-white font-medium">{formatCurrencyValue(timeCharge)}</span>
                  </div>
                  {total === v.minFare && (
                    <div className="flex justify-between text-amber-400">
                      <span>Minimum fare applied</span>
                      <span className="font-medium">{formatCurrencyValue(v.minFare)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-bold pt-1.5 border-t border-white/10">
                    <span>Total</span>
                    <span>{formatCurrencyValue(total)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Trust signals */}
        <div className="flex gap-4 mb-6">
          {[['🛡️', 'Insured rides'], ['⭐', 'Rated drivers'], ['📍', 'Live tracking']].map(([icon, label]) => (
            <div key={label} className="flex-1 bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg">{icon}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* A failed booking has to be visible. The previous version swallowed the
            error and showed the success screen regardless. */}
        {bookError && (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{bookError}</span>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleBook}
          disabled={booking || routeLoading}
          className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-black font-black py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2 shadow-lg"
          aria-label="Navigation">
          {booking ? (
            <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Confirming…</>
          ) : (
            <>
              <Navigation className="w-5 h-5" />
              Confirm {vehicleTypes.find(v => v.id === selected)?.label} Ride
              {routeInfo && !routeLoading && (
                <span className="ml-1 text-sm font-bold opacity-80">
                  · {formatCurrencyValue(getFare(vehicleTypes.find(v => v.id === selected)!))}
                </span>
              )}
            </>
          )}
        </button>
        <p className="text-center text-slate-500 text-xs mt-3">You won't be charged until the trip ends</p>
      </div>
    </div>
  );
}

export default function TaxiSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
