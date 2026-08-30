'use client';
import React, { useState } from 'react';
import { MapPin, Navigation, Car, Clock, Shield, Star, Zap, ChevronRight, Users, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRegion } from '@/lib/contexts/region-context';
import { useModuleTitle } from '@/hooks/useModuleTitle';
import { API_BASE_URL } from '@/lib/config/api-base';

const vehicleTypes = [
  { id: 'economy', label: 'Economy', icon: '🚗', desc: 'Affordable everyday rides', base: 80, eta: '3–5 min' },
  { id: 'comfort', label: 'Comfort', icon: '🚙', desc: 'Spacious sedans & SUVs', base: 130, eta: '4–7 min' },
  { id: 'premium', label: 'Premium', icon: '🚘', desc: 'Luxury vehicles', base: 220, eta: '6–10 min' },
  { id: 'bike', label: 'Moto', icon: '🏍️', desc: 'Beat traffic on a bike', base: 40, eta: '2–3 min' },
];

const features = [
  { icon: Shield, title: 'Safe & Verified', desc: 'Every driver is background-checked and rated by thousands of riders.' },
  { icon: Zap, title: 'Instant Booking', desc: 'Get matched to a nearby driver in under 60 seconds, 24/7.' },
  { icon: Star, title: 'Top-Rated Drivers', desc: 'Only drivers with 4.5★ and above serve you.' },
  { icon: Users, title: 'Share & Save', desc: 'Split rides with friends and pay less together.' },
];

// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const API_BASE = API_BASE_URL;

function useTaxiHome() {
  const [layout, setLayout] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);

  const fetchHome = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/layouts/taxi/homepage`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data ? json.data : json;
        if (data && data.sections) {
          setLayout(data);
          setIsLive(true);
          return;
        }
      }
    } catch {
      // Fallback
    }
    setIsLive(false);
  }, []);

  React.useEffect(() => {
    fetchHome();
    const interval = setInterval(fetchHome, 5000);
    return () => clearInterval(interval);
  }, [fetchHome]);

  return { layout, isLive, refresh: fetchHome };
}

export default function TaxiHome() {
  useModuleTitle('taxi');
  const router = useRouter();
  const { formatCurrencyValue, currentRegionConfig } = useRegion();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('economy');
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [searching, setSearching] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Auto-detect pickup location via browser geolocation
  const detectLocation = React.useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }
    setDetectingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocode via Nominatim (free, no API key)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18`,
            { headers: { 'User-Agent': 'KartSeekWeb/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address;
            // Build a human-readable address from components
            const parts = [addr?.road, addr?.suburb || addr?.neighbourhood, addr?.city || addr?.town || addr?.village].filter(Boolean);
            setPickup(parts.join(', ') || data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } else {
            setPickup(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch {
          setPickup(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setDetectingLocation(false);
      },
      (error) => {
        setDetectingLocation(false);
        setLocationError(error.code === 1 ? 'Location permission denied' : 'Could not detect your location');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Auto-detect location on mount
  React.useEffect(() => {
    if (!pickup) detectLocation();
  }, [detectLocation, pickup]);

  const handleSearch = async () => {
    if (!pickup.trim() || !destination.trim()) {
      alert('Please enter both pickup and destination.');
      return;
    }
    setSearching(true);
    await new Promise((r) => setTimeout(r, 1000));
    const params = new URLSearchParams({
      pickup,
      destination,
      vehicle: selectedVehicle,
      ...(scheduleMode && scheduleTime ? { schedule: scheduleTime } : {}),
    });
    router.push(`/search?${params.toString()}`);
    setSearching(false);
  };

  const selected = vehicleTypes.find((v) => v.id === selectedVehicle)!;
  const { layout, isLive, refresh } = useTaxiHome();

  const renderSection = (section: any) => {
    switch (section.type) {
      case 'hero_slider':
        // Two columns from lg, not md. The booking card is a fixed 28rem and the
        // hero copy's headline has a min-content width well past what was left of
        // a 768px viewport, so the pair could not fit and pushed the page into
        // horizontal scroll across the whole 768–1023 band.
        return (
          <div key={section.id} className="relative z-10 max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 py-10 xs:py-12 md:py-20 flex flex-col lg:flex-row items-center gap-8 xs:gap-12">
            {/* Booking Card */}
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden lg:shrink-0">
              {/* Card Header */}
              <div className="bg-black px-6 pt-6 pb-4">
                <h2 className="text-2xl font-black text-white mb-1">{section.title || 'Request a ride'}</h2>
                <p className="text-slate-400 text-sm">Where would you like to go?</p>
              </div>

              <div className="p-6 space-y-5">
                {/* Pickup & Drop */}
                <div className="space-y-3 relative">
                  <div className="absolute left-[11px] top-6 bottom-6 w-px bg-slate-200 z-0" />

                  <div className="relative flex items-center gap-3">
                    <div className="w-6 h-6 bg-slate-100 border-2 border-slate-400 rounded-full flex items-center justify-center z-10 shrink-0">
                      <div className="w-2 h-2 bg-slate-700 rounded-full" />
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder={detectingLocation ? 'Detecting your location...' : 'Pickup location'}
                        value={pickup}
                        onChange={(e) => setPickup(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 pr-10 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm font-medium text-slate-900 transition"
                      />
                      <button
                        type="button"
                        title="Detect my location"
                        onClick={detectLocation}
                        disabled={detectingLocation}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-yellow-500 transition disabled:opacity-50"
                      >
                        {detectingLocation ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Navigation className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  {locationError && (
                    <p className="text-xs text-red-400 ml-9 -mt-1">{locationError}</p>
                  )}

                  <div className="relative flex items-center gap-3">
                    <div className="w-6 h-6 bg-yellow-400 rounded-sm flex items-center justify-center z-10 shrink-0">
                      <div className="w-2 h-2 bg-black rounded-sm" />
                    </div>
                    <input
                      type="text"
                      placeholder="Where to?"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm font-medium text-slate-900 transition"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                </div>

                {/* Fare Preview */}
                <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Estimated fare</p>
                    <p className="font-bold text-slate-900">From {formatCurrencyValue(selected.base)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Driver ETA</p>
                    <p className="font-bold text-green-600">{selected.eta}</p>
                  </div>
                </div>

                {/* Schedule Toggle */}
                <div>
                  <button
                    onClick={() => setScheduleMode(!scheduleMode)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-yellow-600 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    {scheduleMode ? 'Switch to leave now' : 'Schedule for later'}
                  </button>
                  {scheduleMode && (<label className="block mt-2">
                      <span className="sr-only">Scheduled ride time</span>
                      <input
                        type="datetime-local"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        aria-label="Scheduled ride time"
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </label>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-4 rounded-xl text-base transition-all shadow-lg flex items-center justify-center gap-2"
                 aria-label="Action">{searching ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Finding rides…
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5" />
                      Search Rides
                    </>
                  )}</button>
              </div>
            </div>

            {/* Hero Copy */}
            {/* `min-w-0` so this column may shrink below its headline's
                min-content width instead of forcing the row wider than the page. */}
            <div className="hidden md:flex flex-col max-w-lg min-w-0 text-white">
              <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-sm font-semibold px-4 py-2 rounded-full mb-6 w-fit">
                <Zap className="w-4 h-4" /> Available 24/7 across {currentRegionConfig?.name ?? 'your region'}
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black mb-6 leading-tight">
                Go anywhere with <span className="text-yellow-400">KARTSEEK.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                Request a ride in seconds, hop in, and go. Transparent pricing, verified professional drivers, and a seamless experience every time.
              </p>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-3 mb-8">
                {[['50K+', 'Active Riders'], ['2K+', 'Verified Drivers'], ['4.8★', 'Avg Rating']].map(([stat, label]) => (
                  <div key={stat} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm">
                    <p className="font-black text-xl text-yellow-400">{stat}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Drive CTA */}
              <a href="/taxi/drive" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-yellow-400 transition-colors group">
                <Car className="w-5 h-5" />
                Earn money driving with us
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        );
      case 'category_grid':
        return (
          <div key={section.id} className="relative z-10 max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 3xl:px-8 mt-8">
            <p className="text-lg font-bold text-white mb-4">{section.title || 'Ride Options'}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
              {vehicleTypes.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicle(v.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all font-semibold
                    ${selectedVehicle === v.id
                      ? 'border-yellow-400 bg-yellow-400 text-black'
                      : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                    }`}
                >
                  <span className="text-3xl">{v.icon}</span>
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 'trust_badges':
        return (
          <div key={section.id} className="relative z-10 bg-black/60 backdrop-blur-sm border-t border-white/10 mt-12">
            <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 3xl:px-8 py-12">
              <h2 className="text-xl font-bold text-white mb-6">{section.title || 'Safety Features'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-yellow-400/10 border border-yellow-400/20 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm mb-1">{title}</p>
                      <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-slate-900">
      {/* Map-style background */}
      <div className="absolute inset-0 bg-slate-800">
        <div className="absolute inset-0 opacity-10 taxi-map-grid" />
        {/* Glow accents */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 3xl:px-8 mt-6">
        {isLive && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-yellow-500">
              <Zap className="w-4 h-4" />
              <span className="font-bold">Live sync active</span>
              <span className="text-yellow-400/70">— Data updates in real time</span>
            </div>
            <button onClick={refresh} className="flex items-center gap-1 text-xs text-yellow-500 hover:text-yellow-400 font-bold transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        )}
      </div>

      {layout?.sections ? (
        layout.sections.map((section: any) => renderSection(section))
      ) : (
        <>
          {renderSection({ id: 'default-hero', type: 'hero_slider', title: 'Request a ride' })}
          {renderSection({ id: 'default-vehicles', type: 'category_grid', title: 'Ride Options' })}
          {renderSection({ id: 'default-trust', type: 'trust_badges', title: 'Why riders love us' })}
        </>
      )}
    </div>
  );
}
