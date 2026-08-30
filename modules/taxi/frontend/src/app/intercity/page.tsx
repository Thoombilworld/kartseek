'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, ArrowRight, Clock, ChevronRight, Users, ArrowLeftRight,
  Check, Shield, Star, Briefcase, Wifi, Zap, Coffee, Info,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getCountryConfig, formatCancellationPolicy } from '@/lib/config/rental-policies';

type TripType = 'one_way' | 'round_trip';

interface IntercityRoute {
  id: string;
  from: string;
  to: string;
  duration: string;
  distance: string;
  baseFare: number;
  departures: string[];
  vehicleOptions: { type: string; icon: string; fare: number; features: string[]; seats: number; bags: number; rating: number }[];
  amenities: string[];
  stops?: string[];
}

const ROUTES: IntercityRoute[] = [
  { id: 'ic1', from: 'Mumbai', to: 'Delhi', duration: '8h', distance: '480 km', baseFare: 1800,
    departures: ['06:00 AM', '08:00 AM', '02:00 PM', '10:00 PM'],
    vehicleOptions: [
      { type: 'Shuttle', icon: '🚐', fare: 1800, features: ['AC', 'Reclining Seats'], seats: 14, bags: 2, rating: 4.5 },
      { type: 'Comfort Bus', icon: '🚌', fare: 2500, features: ['AC', 'WiFi', 'USB', 'Snacks'], seats: 30, bags: 3, rating: 4.7 },
      { type: 'VIP Coach', icon: '🚍', fare: 3500, features: ['AC', 'WiFi', 'Meals', 'Legroom+', 'Power Outlets'], seats: 18, bags: 3, rating: 4.9 },
    ],
    amenities: ['Restroom stops', 'Luggage compartment', 'Insurance included'],
    stops: ['Mtito Andei', 'Voi'],
  },
  { id: 'ic2', from: 'Mumbai', to: 'Chennai', duration: '6h', distance: '350 km', baseFare: 1500,
    departures: ['07:00 AM', '09:00 AM', '04:00 PM'],
    vehicleOptions: [
      { type: 'Shuttle', icon: '🚐', fare: 1500, features: ['AC', 'Reclining Seats'], seats: 14, bags: 2, rating: 4.4 },
      { type: 'Comfort Bus', icon: '🚌', fare: 2200, features: ['AC', 'WiFi', 'USB'], seats: 30, bags: 3, rating: 4.6 },
    ],
    amenities: ['Rest stops', 'Luggage included', 'Insurance included'],
    stops: ['Naivasha', 'Pune', 'Kericho'],
  },
  { id: 'ic3', from: 'Mumbai', to: 'Pune', duration: '2.5h', distance: '160 km', baseFare: 700,
    departures: ['07:30 AM', '10:00 AM', '12:30 PM', '02:00 PM', '05:00 PM', '07:00 PM'],
    vehicleOptions: [
      { type: 'Shuttle', icon: '🚐', fare: 700, features: ['AC'], seats: 14, bags: 1, rating: 4.3 },
      { type: 'Express', icon: '🚙', fare: 1200, features: ['AC', 'Non-stop', 'Comfort Seats'], seats: 7, bags: 2, rating: 4.8 },
    ],
    amenities: ['Direct route', 'Luggage included'],
  },
  { id: 'ic4', from: 'Mumbai', to: 'Bangalore', duration: '4h', distance: '310 km', baseFare: 1200,
    departures: ['06:00 AM', '08:00 AM', '01:00 PM', '06:00 PM'],
    vehicleOptions: [
      { type: 'Shuttle', icon: '🚐', fare: 1200, features: ['AC', 'Reclining Seats'], seats: 14, bags: 2, rating: 4.5 },
      { type: 'Comfort Bus', icon: '🚌', fare: 1800, features: ['AC', 'WiFi', 'USB'], seats: 30, bags: 3, rating: 4.7 },
    ],
    amenities: ['Rest stops', 'Luggage included', 'Insurance included'],
    stops: ['Pune'],
  },
  { id: 'ic5', from: 'Mumbai', to: 'Nyeri', duration: '2h', distance: '150 km', baseFare: 650,
    departures: ['08:00 AM', '12:00 PM', '04:00 PM'],
    vehicleOptions: [
      { type: 'Shuttle', icon: '🚐', fare: 650, features: ['AC'], seats: 14, bags: 1, rating: 4.4 },
    ],
    amenities: ['Direct route', 'Luggage included'],
  },
];

export default function IntercityPage() {
  const router = useRouter();
  const { formatCurrencyValue, currentRegionConfig } = useRegion();
  const rentalConfig = getCountryConfig(currentRegionConfig?.code || 'IN');
  const cancelLines = formatCancellationPolicy(rentalConfig.intercityCancellation, rentalConfig.pricing.currencySymbol);

  const [tripType, setTripType] = useState<TripType>('one_way');
  const [from, setFrom] = useState('Mumbai');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [selected, setSelected] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(0);
  const [selectedTime, setSelectedTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [step, setStep] = useState<'search' | 'review' | 'confirmed'>('search');
  const [booking, setBooking] = useState(false);

  const results = useMemo(() => ROUTES.filter(r =>
    r.from.toLowerCase().includes(from.toLowerCase()) &&
    (to === '' || r.to.toLowerCase().includes(to.toLowerCase()))
  ), [from, to]);

  const selectedRoute = ROUTES.find(r => r.id === selected);
  const vehicle = selectedRoute?.vehicleOptions[selectedVehicle];
  const totalFare = vehicle ? (vehicle.fare * passengers * (tripType === 'round_trip' ? 2 : 1)) : 0;

  const handleBook = async () => {
    setBooking(true);
    await new Promise(r => setTimeout(r, 2000));
    setStep('confirmed');
    setBooking(false);
  };

  // ── Confirmed ──────────────────────────────────────────────────────────────
  if (step === 'confirmed' && selectedRoute && vehicle) {
    return (
      <div className="min-h-[calc(100vh-130px)] bg-slate-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-emerald-600" /></div>
            <h2 className="text-2xl font-black mb-1">Seat{passengers > 1 ? 's' : ''} Reserved!</h2>
            <p className="text-slate-400 text-sm">Your intercity trip is confirmed. Show this at boarding.</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm mb-6">
            <div className="flex justify-between"><span className="text-slate-500">Booking Ref</span><span className="font-mono font-bold">IC-{Math.random().toString(36).slice(2, 8).toUpperCase()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Route</span><span className="font-bold">{selectedRoute.from} → {selectedRoute.to}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Trip Type</span><span className="font-bold">{tripType === 'round_trip' ? '↔ Round Trip' : '→ One Way'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-bold">{vehicle.icon} {vehicle.type}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Date & Time</span><span className="font-medium">{date ? new Date(date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'} · {selectedTime}</span></div>
            {tripType === 'round_trip' && <div className="flex justify-between"><span className="text-slate-500">Return</span><span className="font-medium">{returnDate ? new Date(returnDate).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'} · {returnTime}</span></div>}
            <div className="flex justify-between"><span className="text-slate-500">Passengers</span><span className="font-bold">{passengers}</span></div>
            <div className="border-t pt-2"><div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-black text-lg text-emerald-600">{formatCurrencyValue(totalFare)}</span></div></div>
          </div>
          <div className="space-y-2">
            <button onClick={() => router.push('/rides')} className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-slate-800">View My Trips</button>
            <button onClick={() => router.push('/')} className="w-full text-slate-500 font-semibold py-2 text-sm">Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Review ─────────────────────────────────────────────────────────────────
  if (step === 'review' && selectedRoute && vehicle) {
    return (
      <div className="bg-slate-900 min-h-[calc(100vh-130px)]">
        <div className="bg-black py-8 px-4 text-center">
          <h1 className="text-3xl font-black text-white">Review Trip</h1>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
            <div className="flex items-center gap-2 text-2xl font-black text-slate-900 mb-4">
              {selectedRoute.from} <ArrowRight className="w-5 h-5 text-yellow-500" /> {selectedRoute.to}
              {tripType === 'round_trip' && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-bold">Round Trip</span>}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-0.5">Vehicle</span><p className="font-bold">{vehicle.icon} {vehicle.type}</p></div>
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-0.5">Departure</span><p className="font-bold">{date ? new Date(date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'} · {selectedTime}</p></div>
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-0.5">Passengers</span><p className="font-bold">{passengers} pax · {luggage} bag{luggage > 1 ? 's' : ''}</p></div>
              <div><span className="text-slate-400 text-xs uppercase font-bold block mb-0.5">Duration</span><p className="font-medium">{selectedRoute.duration} · {selectedRoute.distance}</p></div>
            </div>
            {tripType === 'round_trip' && (
              <div className="bg-violet-50 rounded-lg p-3 text-sm mb-4">
                <span className="text-violet-500 text-xs font-bold">Return Journey</span>
                <p className="font-bold text-violet-800">{selectedRoute.to} → {selectedRoute.from} · {returnDate ? new Date(returnDate).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'} · {returnTime}</p>
              </div>
            )}
            {selectedRoute.stops && (
              <div className="mb-4">
                <span className="text-slate-400 text-xs uppercase font-bold block mb-1">Route Stops</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700">{selectedRoute.from}</span>
                  {selectedRoute.stops.map(s => <><span key={s + '-arr'} className="text-slate-300">→</span><span key={s} className="text-slate-500">{s}</span></>)}
                  <span className="text-slate-300">→</span>
                  <span className="font-bold text-slate-700">{selectedRoute.to}</span>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-1 mb-4">
              {vehicle.features.map(f => <span key={f} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold">{f}</span>)}
            </div>
            <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">{tripType === 'round_trip' ? 'One-way fare' : 'Fare'} × {passengers}</span><span className="font-medium">{formatCurrencyValue(vehicle.fare * passengers)}</span></div>
              {tripType === 'round_trip' && <div className="flex justify-between"><span className="text-slate-500">Return fare × {passengers}</span><span className="font-medium">{formatCurrencyValue(vehicle.fare * passengers)}</span></div>}
              <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="font-bold">Total</span><span className="font-black text-xl text-emerald-600">{formatCurrencyValue(totalFare)}</span></div>
            </div>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <p className="font-bold mb-1">📋 {rentalConfig.flag} {rentalConfig.countryName} Cancellation Policy</p>
              <ul className="space-y-0.5">
                {cancelLines.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
              {rentalConfig.pricing.taxRate > 0 && <p className="text-[10px] mt-1.5 font-bold">💰 {rentalConfig.pricing.taxLabel} applicable on total fare</p>}
              {rentalConfig.intercity.requiredOperatorLicense !== 'N/A' && <p className="text-[10px] mt-0.5 opacity-70">Operator: {rentalConfig.intercity.requiredOperatorLicense} certified</p>}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('search')} className="flex-1 bg-white/10 border border-white/20 text-white font-bold py-4 rounded-2xl hover:bg-white/20">← Back</button>
            <button onClick={handleBook} disabled={booking} className="flex-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/50 text-black font-black py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2">
              {booking ? <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />Confirming…</> : <>Confirm & Pay {formatCurrencyValue(totalFare)} <ChevronRight className="w-5 h-5" /></>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-900 min-h-[calc(100vh-130px)]">
      <div className="bg-black py-12 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
          Intercity <span className="text-yellow-400">Travel</span>
        </h1>
        <p className="text-slate-300 text-lg max-w-xl mx-auto mb-6">
          Comfortable shuttles and coaches between major cities.
        </p>
        {/* Trip type */}
        <div className="inline-flex bg-white/10 rounded-2xl p-1 gap-1">
          <button onClick={() => setTripType('one_way')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${tripType === 'one_way' ? 'bg-yellow-400 text-black shadow-lg' : 'text-white hover:bg-white/10'}`}>
            → One Way
          </button>
          <button onClick={() => setTripType('round_trip')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${tripType === 'round_trip' ? 'bg-yellow-400 text-black shadow-lg' : 'text-white hover:bg-white/10'}`}>
            <ArrowLeftRight className="w-4 h-4" /> Round Trip
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 xs:px-4 py-8">
        {/* Search */}
        <div className="bg-white rounded-2xl p-5 mb-8 shadow-xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase" htmlFor="from">From</label>
              <input id="from" value={from} onChange={e => setFrom(e.target.value)} placeholder="Departure city" className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase" htmlFor="to">To</label>
              <input id="to" value={to} onChange={e => setTo(e.target.value)} placeholder="Destination" className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase" htmlFor="travel-date">Travel Date</label>
              <input id="travel-date" title="Travel date" type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={e => setDate(e.target.value)} className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase" htmlFor="passengers">Passengers</label>
                <input id="passengers" title="Passengers" type="number" min={1} max={10} value={passengers} onChange={e => setPassengers(+e.target.value)} className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase" htmlFor="bags">Bags</label>
                <input id="bags" title="Luggage" type="number" min={0} max={5} value={luggage} onChange={e => setLuggage(+e.target.value)} className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            </div>
          </div>
          {tripType === 'round_trip' && (
            <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-violet-500 mb-1 uppercase" htmlFor="return-date">↩ Return Date</label>
                <input id="return-date" title="Return date" type="date" value={returnDate} min={date || new Date().toISOString().split('T')[0]} onChange={e => setReturnDate(e.target.value)} className="w-full border border-violet-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-violet-500 mb-1 uppercase" htmlFor="return-time">↩ Return Time</label>
                <select id="return-time" title="Return departure time" value={returnTime} onChange={e => setReturnTime(e.target.value)} className="w-full border border-violet-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-300 bg-white">
                  <option value="">Select time</option>
                  {selectedRoute?.departures.map(t => <option key={t} value={t}>{t}</option>)}
                  {!selectedRoute && <option disabled>Select a route first</option>}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Routes */}
        <h2 className="text-white font-black text-xl mb-4 flex items-center gap-2">
          Available Routes
          <span className="text-xs font-medium text-slate-400 bg-white/10 px-2 py-1 rounded-full">{results.length} found</span>
        </h2>
        <div className="space-y-4 mb-8">
          {results.length === 0 && <div className="text-center py-12 text-slate-400">No routes found. Try a different destination.</div>}
          {results.map(r => {
            const isSelected = selected === r.id;
            const currentVehicle = r.vehicleOptions[isSelected ? selectedVehicle : 0];
            return (
              <div key={r.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${isSelected ? 'border-yellow-400 bg-yellow-400/5' : 'border-white/10 bg-white/5'}`}>
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-white font-black text-lg">
                        {r.from} <ArrowRight className="w-4 h-4 text-yellow-400" /> {r.to}
                        {tripType === 'round_trip' && <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-bold">Round Trip</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-slate-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{r.duration}</span>
                        <span className="text-slate-400 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{r.distance}</span>
                        {r.stops && <span className="text-slate-400 text-xs">{r.stops.length} stop{r.stops.length > 1 ? 's' : ''}</span>}
                        <span className="flex items-center gap-1 text-xs"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /><span className="text-yellow-400 font-bold">{currentVehicle.rating}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-white font-black text-xl">{formatCurrencyValue(currentVehicle.fare * passengers * (tripType === 'round_trip' ? 2 : 1))}</p>
                        <p className="text-slate-400 text-xs">{passengers} pax{tripType === 'round_trip' ? ' · round trip' : ''}</p>
                      </div>
                      <button onClick={() => { setSelected(r.id); setSelectedVehicle(0); setSelectedTime(''); }}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${isSelected ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="border-t border-white/10 p-5 space-y-4">
                    {/* Vehicle types */}
                    {r.vehicleOptions.length > 1 && (
                      <div>
                        <p className="text-white text-sm font-semibold mb-2">Choose vehicle class:</p>
                        <div className="flex gap-2 flex-wrap">
                          {r.vehicleOptions.map((vo, i) => (
                            <button key={i} onClick={() => setSelectedVehicle(i)}
                              className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${selectedVehicle === i ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 hover:border-white/20'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">{vo.icon}</span>
                                <span className={`text-sm font-bold ${selectedVehicle === i ? 'text-yellow-400' : 'text-white'}`}>{vo.type}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span><Users className="w-3 h-3 inline" /> {vo.seats}</span>
                                <span><Briefcase className="w-3 h-3 inline" /> {vo.bags} bags</span>
                                <span><Star className="w-3 h-3 inline text-yellow-500 fill-yellow-500" /> {vo.rating}</span>
                              </div>
                              <p className="text-white font-bold text-sm mt-1">{formatCurrencyValue(vo.fare)}<span className="text-slate-400 text-xs font-normal">/seat</span></p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Features */}
                    <div className="flex flex-wrap gap-1">
                      {currentVehicle.features.map(f => <span key={f} className="bg-white/5 text-slate-300 px-2 py-1 rounded text-[10px] font-medium">{f}</span>)}
                      {r.amenities.map(a => <span key={a} className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[10px] font-medium">{a}</span>)}
                    </div>

                    {/* Departure times */}
                    <div>
                      <p className="text-white text-sm font-semibold mb-2">Departure time:</p>
                      <div className="flex flex-wrap gap-2">
                        {r.departures.map(t => (
                          <button key={t} onClick={() => setSelectedTime(t)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedTime === t ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stops */}
                    {r.stops && (
                      <div className="bg-white/5 rounded-lg px-4 py-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Route: </span>
                        <span className="text-xs text-slate-300">
                          {r.from} → {r.stops.join(' → ')} → {r.to}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selected && selectedTime && (
          <button onClick={() => { if (!date) { alert('Please select a travel date.'); return; } if (tripType === 'round_trip' && (!returnDate || !returnTime)) { alert('Please select return date and time.'); return; } setStep('review'); }}
            className="w-full md:w-auto md:px-12 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2">
            Review Trip — {formatCurrencyValue(totalFare)} <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
