'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Car, Clock, MapPin, ChevronRight, Shield, Star, User, Fuel,
  Gauge, Check, Briefcase, ArrowLeftRight, Calendar, Info,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getCountryConfig, formatCancellationPolicy } from '@/lib/config/rental-policies';

// ── Rental Modes ─────────────────────────────────────────────────────────────

type RentalMode = 'chauffeur' | 'self_drive';
type RentalDuration = 'hourly' | 'daily' | 'weekly';

interface HourlyPackage {
  id: string;
  hours: number;
  kmIncluded: number;
  label: string;
  popular?: boolean;
}

interface VehicleOption {
  id: string;
  name: string;
  type: string;
  seats: number;
  bags: number;
  image: string;
  rates: { hourly: number; daily: number; weekly: number };
  chauffeurSurcharge: number;
  features: string[];
  fuelPolicy: string;
  rating: number;
  trips: number;
  selfDriveAvailable: boolean;
}

const HOURLY_PACKAGES: HourlyPackage[] = [
  { id: 'h1', hours: 1, kmIncluded: 10, label: '1 Hour' },
  { id: 'h2', hours: 2, kmIncluded: 20, label: '2 Hours' },
  { id: 'h4', hours: 4, kmIncluded: 40, label: '4 Hours', popular: true },
  { id: 'h8', hours: 8, kmIncluded: 80, label: '8 Hours' },
  { id: 'h12', hours: 12, kmIncluded: 120, label: '12 Hours' },
];

const VEHICLES: VehicleOption[] = [
  { id: 'v1', name: 'Toyota Fielder', type: 'Economy', seats: 5, bags: 2, image: '🚗', rates: { hourly: 800, daily: 3500, weekly: 21000 }, chauffeurSurcharge: 1500, features: ['AC', 'USB Charging', 'Bluetooth'], fuelPolicy: 'Full-to-Full', rating: 4.7, trips: 1240, selfDriveAvailable: true },
  { id: 'v2', name: 'Toyota Corolla', type: 'Comfort', seats: 5, bags: 3, image: '🚙', rates: { hourly: 1200, daily: 5000, weekly: 30000 }, chauffeurSurcharge: 1500, features: ['AC', 'Leather Seats', 'USB', 'Cruise Control'], fuelPolicy: 'Full-to-Full', rating: 4.8, trips: 890, selfDriveAvailable: true },
  { id: 'v3', name: 'Toyota Prado', type: 'SUV', seats: 7, bags: 4, image: '🚙', rates: { hourly: 2000, daily: 7500, weekly: 45000 }, chauffeurSurcharge: 2000, features: ['AC', '4WD', 'Leather', 'Sunroof', 'Tow Bar'], fuelPolicy: 'Full-to-Full', rating: 4.9, trips: 560, selfDriveAvailable: true },
  { id: 'v4', name: 'Mercedes C-Class', type: 'Premium', seats: 4, bags: 2, image: '🚘', rates: { hourly: 3000, daily: 12000, weekly: 72000 }, chauffeurSurcharge: 2500, features: ['AC', 'Luxury Interior', 'Ambient Lighting', 'Heated Seats'], fuelPolicy: 'Full-to-Full', rating: 4.9, trips: 320, selfDriveAvailable: false },
  { id: 'v5', name: 'Toyota HiAce Van', type: 'Van', seats: 14, bags: 8, image: '🚐', rates: { hourly: 2500, daily: 9000, weekly: 54000 }, chauffeurSurcharge: 2000, features: ['AC', 'PA System', 'Large Luggage Compartment'], fuelPolicy: 'Full-to-Full', rating: 4.6, trips: 210, selfDriveAvailable: false },
  { id: 'v6', name: 'Range Rover Sport', type: 'Luxury', seats: 5, bags: 3, image: '🏎️', rates: { hourly: 4500, daily: 18000, weekly: 108000 }, chauffeurSurcharge: 3000, features: ['Premium Sound', 'Panoramic Roof', 'Massage Seats', 'Night Vision'], fuelPolicy: 'Full-to-Full', rating: 5.0, trips: 85, selfDriveAvailable: true },
];

const EXTRAS = [
  { id: 'child_seat', label: 'Child Seat', price: 500, icon: '👶' },
  { id: 'gps', label: 'GPS Navigation', price: 300, icon: '📍' },
  { id: 'extra_driver', label: 'Additional Driver', price: 1000, icon: '👤' },
  { id: 'insurance_premium', label: 'Premium Insurance', price: 800, icon: '🛡️' },
  { id: 'wifi', label: 'Mobile WiFi Hotspot', price: 400, icon: '📶' },
];

export default function RentalsPage() {
  const router = useRouter();
  const { formatCurrencyValue, currentRegionConfig } = useRegion();
  const rentalConfig = getCountryConfig(currentRegionConfig?.code || 'IN');
  const cancelLines = formatCancellationPolicy(rentalConfig.rentalCancellation, rentalConfig.pricing.currencySymbol);

  // Form state
  const [mode, setMode] = useState<RentalMode>('chauffeur');
  const [durationType, setDurationType] = useState<RentalDuration>('daily');
  const [hourlyPackage, setHourlyPackage] = useState('h4');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [sameReturn, setSameReturn] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [days, setDays] = useState(1);
  const [weeks, setWeeks] = useState(1);
  const [selected, setSelected] = useState('');
  const [extras, setExtras] = useState<string[]>([]);
  const [booking, setBooking] = useState(false);
  const [step, setStep] = useState<'select' | 'review' | 'confirmed'>('select');

  // Computed
  const selectedVehicle = VEHICLES.find(v => v.id === selected);
  const selectedPkg = HOURLY_PACKAGES.find(p => p.id === hourlyPackage);

  const filteredVehicles = useMemo(() => {
    if (mode === 'self_drive') return VEHICLES.filter(v => v.selfDriveAvailable);
    return VEHICLES;
  }, [mode]);

  const getPrice = (vehicle: VehicleOption) => {
    let base = 0;
    if (durationType === 'hourly') base = vehicle.rates.hourly * (selectedPkg?.hours || 4);
    else if (durationType === 'daily') base = vehicle.rates.daily * days;
    else base = vehicle.rates.weekly * weeks;
    if (mode === 'chauffeur') base += vehicle.chauffeurSurcharge * (durationType === 'hourly' ? 1 : durationType === 'daily' ? days : weeks * 7);
    return base;
  };

  const getExtrasTotal = () => extras.reduce((s, eId) => s + (EXTRAS.find(e => e.id === eId)?.price || 0), 0) * (durationType === 'hourly' ? 1 : durationType === 'daily' ? days : weeks * 7);
  const getTotalPrice = () => selectedVehicle ? getPrice(selectedVehicle) + getExtrasTotal() : 0;

  const toggleExtra = (id: string) => {
    setExtras(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const handleBook = async () => {
    setBooking(true);
    await new Promise(r => setTimeout(r, 2000));
    setStep('confirmed');
    setBooking(false);
  };

  // ── Confirmed ──────────────────────────────────────────────────────────────
  if (step === 'confirmed' && selectedVehicle) {
    return (
      <div className="min-h-[calc(100vh-130px)] bg-slate-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-emerald-600" /></div>
            <h2 className="text-2xl font-black mb-1">Booking Confirmed!</h2>
            <p className="text-slate-400 text-sm">Your rental has been confirmed and the {mode === 'chauffeur' ? 'driver will be assigned shortly' : 'vehicle is reserved for pickup'}.</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm mb-6">
            <div className="flex justify-between"><span className="text-slate-500">Booking Ref</span><span className="font-mono font-bold">RNT-{Math.random().toString(36).slice(2, 8).toUpperCase()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-bold">{selectedVehicle.image} {selectedVehicle.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Rental Type</span><span className="font-bold">{mode === 'chauffeur' ? '👨‍✈️ Chauffeur-Driven' : '🔑 Self-Drive'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-bold">{durationType === 'hourly' ? `${selectedPkg?.hours}h (${selectedPkg?.kmIncluded} km)` : durationType === 'daily' ? `${days} day${days > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''}`}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pickup</span><span className="font-medium">{pickup || 'TBD'}</span></div>
            {!sameReturn && <div className="flex justify-between"><span className="text-slate-500">Return</span><span className="font-medium">{dropoff || 'TBD'}</span></div>}
            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between"><span className="text-slate-500">Total</span><span className="font-black text-lg text-emerald-600">{formatCurrencyValue(getTotalPrice())}</span></div>
          </div>
          <div className="space-y-2">
            <button onClick={() => router.push('/taxi/rides')} className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">View My Bookings</button>
            <button onClick={() => router.push('/taxi')} className="w-full text-slate-500 font-semibold py-2 text-sm hover:text-slate-700">Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Review Step ─────────────────────────────────────────────────────────────
  if (step === 'review' && selectedVehicle) {
    return (
      <div className="bg-slate-900 min-h-[calc(100vh-130px)]">
        <div className="bg-black py-8 px-4 text-center">
          <h1 className="text-3xl font-black text-white">Review Booking</h1>
          <p className="text-slate-400 text-sm mt-1">Verify your rental details before confirming</p>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
            {/* Vehicle */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100 mb-4">
              <span className="text-5xl">{selectedVehicle.image}</span>
              <div>
                <h3 className="text-lg font-black">{selectedVehicle.name}</h3>
                <p className="text-sm text-slate-500">{selectedVehicle.type} · {selectedVehicle.seats} seats · {selectedVehicle.bags} bags</p>
                <div className="flex items-center gap-1 mt-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /><span className="text-xs font-bold">{selectedVehicle.rating}</span><span className="text-xs text-slate-400">({selectedVehicle.trips} trips)</span></div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-0.5">Rental Type</span><p className="font-bold">{mode === 'chauffeur' ? '👨‍✈️ Chauffeur-Driven' : '🔑 Self-Drive'}</p></div>
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-0.5">Duration</span><p className="font-bold">{durationType === 'hourly' ? `${selectedPkg?.label} (${selectedPkg?.kmIncluded} km included)` : durationType === 'daily' ? `${days} Day${days > 1 ? 's' : ''}` : `${weeks} Week${weeks > 1 ? 's' : ''}`}</p></div>
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-0.5">Pickup</span><p className="font-medium">{pickup || 'Not specified'}</p></div>
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-0.5">{sameReturn ? 'Return to Same Location' : 'Return Location'}</span><p className="font-medium">{sameReturn ? 'Yes' : (dropoff || 'Not specified')}</p></div>
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-0.5">Start</span><p className="font-medium">{startDate ? new Date(startDate).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'} at {startTime}</p></div>
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-0.5">Fuel Policy</span><p className="font-medium flex items-center gap-1"><Fuel className="w-3 h-3" />{selectedVehicle.fuelPolicy}</p></div>
            </div>

            {/* Extras */}
            {extras.length > 0 && (
              <div className="border-t border-slate-100 pt-3 mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Add-ons</p>
                <div className="flex flex-wrap gap-2">
                  {extras.map(eId => { const ex = EXTRAS.find(e => e.id === eId); return ex ? <span key={eId} className="bg-yellow-50 text-yellow-800 px-2 py-1 rounded-lg text-xs font-bold border border-yellow-200">{ex.icon} {ex.label} +{formatCurrencyValue(ex.price)}/day</span> : null; })}
                </div>
              </div>
            )}

            {/* Pricing breakdown */}
            <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Base rental</span><span className="font-medium">{formatCurrencyValue(getPrice(selectedVehicle) - (mode === 'chauffeur' ? selectedVehicle.chauffeurSurcharge * (durationType === 'hourly' ? 1 : durationType === 'daily' ? days : weeks * 7) : 0))}</span></div>
              {mode === 'chauffeur' && <div className="flex justify-between"><span className="text-slate-500">Chauffeur surcharge</span><span className="font-medium">{formatCurrencyValue(selectedVehicle.chauffeurSurcharge * (durationType === 'hourly' ? 1 : durationType === 'daily' ? days : weeks * 7))}</span></div>}
              {extras.length > 0 && <div className="flex justify-between"><span className="text-slate-500">Add-ons</span><span className="font-medium">{formatCurrencyValue(getExtrasTotal())}</span></div>}
              <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="font-bold text-slate-900">Total</span><span className="font-black text-xl text-emerald-600">{formatCurrencyValue(getTotalPrice())}</span></div>
            </div>

            {/* Policies — region-aware */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              <p className="font-bold mb-1">📋 {rentalConfig.flag} {rentalConfig.countryName} Policies</p>
              <ul className="space-y-0.5">
                {durationType === 'hourly' && <li>• Extra km charged at {formatCurrencyValue(rentalConfig.pricing.extraKmRate)}/km beyond {selectedPkg?.kmIncluded} km</li>}
                {durationType === 'hourly' && <li>• Overtime charged at {formatCurrencyValue(rentalConfig.pricing.overtimeHourlyRate)}/hr</li>}
                {cancelLines.map((line, i) => <li key={i}>• {line}</li>)}
                <li>• {mode === 'self_drive' ? `Security deposit of ${formatCurrencyValue(rentalConfig.selfDrive.securityDepositAmount)} required at pickup` : 'No security deposit needed for chauffeur bookings'}</li>
                {mode === 'self_drive' && <li>• Minimum age: {rentalConfig.selfDrive.minimumAge} years, valid driving license ({rentalConfig.selfDrive.minimumLicenseYears}+ years) required</li>}
                {mode === 'self_drive' && rentalConfig.selfDrive.insuranceMandatory && <li>• 🛡️ Comprehensive insurance is <b>mandatory</b> in {rentalConfig.countryName}</li>}
                {rentalConfig.pricing.taxRate > 0 && <li>• 💰 {rentalConfig.pricing.taxLabel} will be applied</li>}
              </ul>
              {mode === 'self_drive' && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="font-bold text-[10px] mb-0.5">Required Documents:</p>
                  <p className="text-[10px] opacity-80">{rentalConfig.selfDrive.requiredDocuments.map(d => d.replace(/_/g, ' ')).join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('select')} className="flex-1 bg-white/10 border border-white/20 text-white font-bold py-4 rounded-2xl hover:bg-white/20 transition-all">← Back</button>
            <button onClick={handleBook} disabled={booking} className="flex-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-black font-black py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2">
              {booking ? <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />Confirming…</> : <>Confirm & Pay {formatCurrencyValue(getTotalPrice())} <ChevronRight className="w-5 h-5" /></>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Selection ─────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-900 min-h-[calc(100vh-130px)]">
      {/* Hero */}
      <div className="bg-black py-12 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
          Car <span className="text-yellow-400">Rentals</span>
        </h1>
        <p className="text-slate-300 text-lg max-w-xl mx-auto mb-6">
          Rent by the hour, day, or week. Chauffeur-driven or self-drive.
        </p>
        {/* Mode Selector */}
        <div className="inline-flex bg-white/10 rounded-2xl p-1 gap-1">
          <button onClick={() => setMode('chauffeur')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'chauffeur' ? 'bg-yellow-400 text-black shadow-lg' : 'text-white hover:bg-white/10'}`}>
            👨‍✈️ Chauffeur-Driven
          </button>
          <button onClick={() => { setMode('self_drive'); setSelected(''); }} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${mode === 'self_drive' ? 'bg-yellow-400 text-black shadow-lg' : 'text-white hover:bg-white/10'}`}>
            🔑 Self-Drive
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 xs:px-4 py-8">
        {/* Duration Type */}
        <div className="flex gap-2 mb-6">
          {([{ key: 'hourly', label: '⏱️ Hourly', desc: '1–12 hrs' }, { key: 'daily', label: '📅 Daily', desc: '1–30 days' }, { key: 'weekly', label: '📆 Weekly', desc: '1–4 weeks' }] as const).map(d => (
            <button key={d.key} onClick={() => setDurationType(d.key)} className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all border-2 ${durationType === d.key ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : 'border-white/10 text-slate-300 hover:border-white/20'}`}>
              <span className="block">{d.label}</span>
              <span className="block text-[10px] font-normal mt-0.5 opacity-60">{d.desc}</span>
            </button>
          ))}
        </div>

        {/* Hourly Packages */}
        {durationType === 'hourly' && (
          <div className="mb-6">
            <h3 className="text-white font-bold text-sm mb-3">Select Package</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {HOURLY_PACKAGES.map(pkg => (
                <button key={pkg.id} onClick={() => setHourlyPackage(pkg.id)} className={`relative shrink-0 px-5 py-3 rounded-xl text-sm font-bold transition-all border-2 ${hourlyPackage === pkg.id ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : 'border-white/10 text-slate-300 hover:border-white/20'}`}>
                  {pkg.popular && <span className="absolute -top-2 -right-1 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">POPULAR</span>}
                  <span className="block font-black">{pkg.label}</span>
                  <span className="block text-[10px] opacity-60">{pkg.kmIncluded} km included</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Booking Form */}
        <div className="bg-white rounded-2xl p-5 mb-8 shadow-xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase" htmlFor="pickup-location">Pickup Location</label>
              <input id="pickup-location" placeholder="e.g. Westlands, Mumbai" value={pickup} onChange={e => setPickup(e.target.value)} className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase" htmlFor="start-date">Start Date</label>
              <input id="start-date" title="Start date" type="date" value={startDate} min={new Date().toISOString().split('T')[0]} onChange={e => setStartDate(e.target.value)} className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase" htmlFor="pickup-time">Pickup Time</label>
              <input id="pickup-time" title="Pickup time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mt-4">
            {durationType === 'daily' && (
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase" htmlFor="duration-days">Duration (Days)</label><input id="duration-days" title="Days" type="number" min={1} max={30} value={days} onChange={e => setDays(+e.target.value)} className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" /></div>
            )}
            {durationType === 'weekly' && (
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase" htmlFor="duration-weeks">Duration (Weeks)</label><input id="duration-weeks" title="Weeks" type="number" min={1} max={4} value={weeks} onChange={e => setWeeks(+e.target.value)} className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" /></div>
            )}
            {mode === 'self_drive' && (
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <button title="Toggle same return location" onClick={() => setSameReturn(!sameReturn)} className={`relative w-10 h-5 rounded-full transition-colors ${sameReturn ? 'bg-yellow-400' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow ${sameReturn ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Return to same location</span>
                </div>
                {!sameReturn && <input placeholder="Return location" value={dropoff} onChange={e => setDropoff(e.target.value)} className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />}
              </div>
            )}
          </div>
        </div>

        {/* Self-drive info banner */}
        {mode === 'self_drive' && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300">
              <p className="font-bold mb-1">Self-Drive Requirements</p>
              <p>Valid driving license (min. 2 years) · Age 23+ · Security deposit required · Fuel: Full-to-Full</p>
            </div>
          </div>
        )}

        {/* Vehicle Grid */}
        <h2 className="text-white font-black text-xl mb-4 flex items-center gap-2">
          Choose Vehicle
          <span className="text-xs font-medium text-slate-400 bg-white/10 px-2 py-1 rounded-full">{filteredVehicles.length} available</span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filteredVehicles.map(v => {
            const price = getPrice(v);
            const isSelected = selected === v.id;
            return (
              <button key={v.id} onClick={() => setSelected(v.id)} className={`text-left p-5 rounded-2xl border-2 transition-all ${isSelected ? 'border-yellow-400 bg-yellow-400/5 shadow-lg shadow-yellow-400/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{v.image}</span>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block mb-1 ${isSelected ? 'bg-yellow-400 text-black' : 'bg-white/10 text-slate-300'}`}>{v.type}</span>
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-slate-300 font-bold">{v.rating}</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-white font-black mb-1">{v.name}</h3>
                <div className="flex items-center gap-2 text-slate-400 text-[10px] mb-3">
                  <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{v.seats}</span>
                  <span className="flex items-center gap-0.5"><Briefcase className="w-3 h-3" />{v.bags}</span>
                  <span className="flex items-center gap-0.5"><Gauge className="w-3 h-3" />{v.fuelPolicy}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {v.features.slice(0, 3).map(f => <span key={f} className="bg-white/5 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-medium">{f}</span>)}
                  {v.features.length > 3 && <span className="text-slate-500 text-[9px] self-center">+{v.features.length - 3}</span>}
                </div>
                <div className="flex items-baseline gap-1 pt-2 border-t border-white/10">
                  <span className="text-xl font-black text-white">{formatCurrencyValue(price)}</span>
                  <span className="text-slate-400 text-xs">total</span>
                </div>
                {mode === 'chauffeur' && <p className="text-[10px] text-yellow-400/70 mt-0.5">Includes chauffeur</p>}
                {!v.selfDriveAvailable && mode !== 'self_drive' && <p className="text-[10px] text-slate-500 mt-0.5">Chauffeur only</p>}
              </button>
            );
          })}
        </div>

        {/* Add-ons */}
        {selected && (
          <div className="mb-8">
            <h3 className="text-white font-bold text-sm mb-3">Add-ons (optional)</h3>
            <div className="flex gap-2 flex-wrap">
              {EXTRAS.map(ex => {
                const isActive = extras.includes(ex.id);
                return (
                  <button key={ex.id} onClick={() => toggleExtra(ex.id)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 flex items-center gap-2 ${isActive ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : 'border-white/10 text-slate-300 hover:border-white/20'}`}>
                    <span>{ex.icon}</span>
                    <span>{ex.label}</span>
                    <span className="text-[10px] opacity-60">+{formatCurrencyValue(ex.price)}/day</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Continue */}
        {selected && (
          <button onClick={() => { if (!pickup || !startDate) { alert('Please fill pickup location and start date.'); return; } setStep('review'); }}
            className="w-full md:w-auto md:px-12 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2">
            Review Booking — {formatCurrencyValue(getTotalPrice())} <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
