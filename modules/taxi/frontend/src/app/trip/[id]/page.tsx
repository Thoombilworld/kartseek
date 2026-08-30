'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Phone, MessageSquare, ShieldAlert, Star, CreditCard, ChevronRight, Share2, Wifi, WifiOff, Car, Clock } from 'lucide-react';
import Link from 'next/link';
import { getSocket } from '@/lib/socket/socket';
import type { Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/config/api-base';

// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const API_BASE = API_BASE_URL;
// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverLocation {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}

interface RideInfo {
  status: string;
  eta: number;
  driverName: string;
  driverRating: number;
  vehicleName: string;
  vehiclePlate: string;
  vehicleColor: string;
  vehicleType: string;
  pickup: string;
  destination: string;
  fare: number;
  currency: string;
  paymentMethod: string;
  otp: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActiveTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  // Default data (used until API/WebSocket provides live data)
  const [ride, setRide] = useState<RideInfo>({
    status: 'driver_arriving',
    eta: 3,
    driverName: 'Rajesh Kumar',
    driverRating: 4.8,
    vehicleName: 'Toyota Innova',
    vehiclePlate: 'MH 02 AB 1234',
    vehicleColor: 'White',
    vehicleType: 'Prime SUV',
    pickup: 'Infinity Mall, Andheri West',
    destination: 'Terminal 2, Chhatrapati Shivaji Airport',
    fare: 540,
    currency: '₹',
    paymentMethod: 'Wallet',
    otp: '4812',
  });

  const [driverPos, setDriverPos] = useState<DriverLocation>({ lat: 0, lng: 0, heading: 0, speed: 0 });
  const [wsConnected, setWsConnected] = useState(false);
  const [carOffset, setCarOffset] = useState({ top: 45, left: 42 });
  const socketRef = useRef<Socket | null>(null);

  // ── Fetch ride data from REST API ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/taxi/rides/${id}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ride) {
            setRide(prev => ({ ...prev, ...data.ride }));
          }
        }
      } catch { /* Use fallback data */ }
    })();
  }, [id]);

  // ── WebSocket: Live tracking ──
  useEffect(() => {
    const socket = getSocket('taxi');
    socketRef.current = socket;

    const handleConnect = () => {
      setWsConnected(true);
      socket.emit('joinRideTracking', id);
      console.log(`[WS /taxi] 📡 Joined ride tracking for ${id}`);
    };

    const handleDisconnect = () => setWsConnected(false);

    // Live driver GPS — update car position on the mock map
    const handleLiveTracking = (data: any) => {
      try {
        const loc = typeof data === 'string' ? JSON.parse(data) : data;
        setDriverPos({
          lat: loc.lat ?? 0,
          lng: loc.lng ?? 0,
          heading: loc.heading ?? 0,
          speed: loc.speed ?? 0,
        });
        // Map lat/lng to CSS offsets (simple linear projection)
        // These would be proper map coordinates in a real integration
        setCarOffset({
          top: 20 + Math.random() * 40, // Simulated movement within bounds
          left: 30 + Math.random() * 30,
        });
      } catch (e) {
        console.warn('[WS] liveRideTracking parse error:', e);
      }
    };

    // Ride status changes
    const handleStatusChange = (data: any) => {
      try {
        const info = typeof data === 'string' ? JSON.parse(data) : data;
        if (info.status) setRide(prev => ({ ...prev, status: info.status }));
        if (info.eta !== undefined) setRide(prev => ({ ...prev, eta: info.eta }));
      } catch (e) {
        console.warn('[WS] ride_status_changed parse error:', e);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('liveRideTracking', handleLiveTracking);
    socket.on('taxi_location_updated', handleLiveTracking);
    socket.on('ride_status_changed', handleStatusChange);

    if (socket.connected) handleConnect();

    return () => {
      socket.emit('leave_trip_tracking', { tripId: id });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('liveRideTracking', handleLiveTracking);
      socket.off('taxi_location_updated', handleLiveTracking);
      socket.off('ride_status_changed', handleStatusChange);
    };
  }, [id]);

  // ── ETA countdown ──
  useEffect(() => {
    if (ride.status === 'completed') return;
    const interval = setInterval(() => {
      setRide(prev => ({ ...prev, eta: Math.max(0, prev.eta - 1) }));
    }, 60000);
    return () => clearInterval(interval);
  }, [ride.status]);

  const statusLabel = ride.status === 'driver_arriving'
    ? `Arriving in ${ride.eta} mins`
    : ride.status === 'en_route'
      ? 'On the way to destination'
      : ride.status === 'arriving_destination'
        ? 'Arriving at destination'
        : 'Trip completed';

  const statusSubtext = ride.status === 'driver_arriving'
    ? 'Your driver is nearby'
    : ride.status === 'en_route'
      ? `ETA: ${ride.eta} min remaining`
      : ride.status === 'arriving_destination'
        ? 'Almost there!'
        : 'Rate your ride';

  return (
    <div className="bg-slate-900 min-h-screen flex flex-col relative font-sans">

      {/* Mock Map Background */}
      <div className="absolute inset-0 z-0 bg-[#e5e3df] overflow-hidden">
        <div ref={useCallback((node: HTMLDivElement | null) => { if (node) node.style.backgroundImage = 'url("https://www.transparenttextures.com/patterns/cubes.png")'; }, [])} className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none"></div>

        {/* Mock Route Line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
           <path d="M 200,800 C 300,600 400,500 500,400 S 700,200 800,100" fill="none" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" strokeDasharray="10, 10" className="animate-pulse" />
        </svg>

        {/* Map Pins */}
        <div className="absolute top-[20%] left-[60%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg mb-1 whitespace-nowrap">Drop: {ride.destination.split(',')[0]}</div>
          <div className="w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow-md"></div>
        </div>

        <div className="absolute top-[60%] left-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="bg-white text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg mb-1 whitespace-nowrap">Pickup: {ride.pickup.split(',')[0]}</div>
          <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
        </div>

        {/* Live Car Pin — position updates from WebSocket */}
        <div
          className="absolute transition-all duration-1000 ease-in-out z-10"
          {...{
            style: {
              top: `${carOffset.top}%`,
              left: `${carOffset.left}%`,
              transform: `translate(-50%, -50%) rotate(${driverPos.heading}deg)`
            }
          }}
        >
           <div className="bg-white p-1 rounded-full shadow-xl border-2 border-slate-200 ring-2 ring-blue-400/30">
             <Car className="w-8 h-8 text-blue-600" />
           </div>
           {driverPos.speed > 0 && (
             <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/80 text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
               {Math.round(driverPos.speed)} km/h
             </div>
           )}
        </div>
      </div>

      {/* Header Over Map */}
      <header className="relative z-10 p-4 flex justify-between items-center bg-linear-to-b from-black/50 to-transparent">
        <Link href="/taxi" className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md text-slate-700 hover:bg-white transition-colors">
          ←
        </Link>
        {/* WS Status */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-md ${
          wsConnected
            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
            : 'bg-red-500/20 border border-red-500/40 text-red-400'
        }`}>
          {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {wsConnected ? 'LIVE' : 'OFFLINE'}
        </div>
        <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-md flex items-center gap-2 transition-colors">
          <ShieldAlert className="w-4 h-4" /> SOS
        </button>
      </header>

      {/* Bottom Sheet UI */}
      <div className="mt-auto relative z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] w-full max-w-lg mx-auto pb-8">

        {/* Status Strip */}
        <div className="bg-blue-600 text-white rounded-t-3xl px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg">{statusLabel}</h2>
            <p className="text-blue-100 text-sm">{statusSubtext}</p>
          </div>
          <div className="bg-white/20 px-3 py-1.5 rounded-lg border border-white/30 backdrop-blur-sm">
            <span className="text-[10px] uppercase tracking-wider font-bold block text-center text-blue-50">OTP</span>
            <span className="font-black text-xl tracking-widest text-white">{ride.otp}</span>
          </div>
        </div>

        {/* Driver Info */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-slate-800 rounded-full border-2 border-slate-100 overflow-hidden shadow-sm flex items-center justify-center text-white font-black text-lg">
                  {ride.driverName.split(' ').map(w => w[0]).join('')}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-0.5 shadow-sm">
                  {ride.driverRating} <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">{ride.driverName}</h3>
                <p className="text-slate-500 text-sm">{ride.vehicleName} • {ride.vehicleColor}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-slate-100 border border-slate-200 text-slate-900 font-black text-xl px-3 py-1 rounded-lg tracking-wider mb-1">{ride.vehiclePlate}</div>
              <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{ride.vehicleType}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
              <Phone className="w-4 h-4" /> Call
            </button>
            <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
              <MessageSquare className="w-4 h-4" /> Message
            </button>
            <button title="Share trip" className="w-12 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl flex items-center justify-center transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trip Details */}
        <div className="p-6">
          <div className="relative pl-6 before:absolute before:inset-0 before:left-[11px] before:w-[2px] before:bg-slate-200 before:h-[calc(100%-12px)] before:mt-3 mb-6">
             <div className="relative mb-6">
               <div className="absolute left-[-24px] top-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm z-10"></div>
               <p className="font-bold text-slate-900 text-sm">{ride.pickup}</p>
               <p className="text-xs text-slate-500">Pickup Location</p>
             </div>
             <div className="relative">
               <div className="absolute left-[-24px] top-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm z-10"></div>
               <p className="font-bold text-slate-900 text-sm">{ride.destination}</p>
               <p className="text-xs text-slate-500">Drop Location</p>
             </div>
          </div>

          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Payment via</p>
                <p className="font-bold text-slate-900 text-sm">{ride.paymentMethod}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Estimated Fare</p>
              <p className="font-black text-slate-900 text-lg">{ride.currency}{ride.fare.toLocaleString()}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
