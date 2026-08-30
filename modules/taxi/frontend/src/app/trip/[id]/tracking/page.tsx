'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Phone, MessageCircle, Shield, MapPin, Navigation,
  Clock, Star, Car, Share2, AlertTriangle, CheckCircle, XCircle,
  Wifi, WifiOff,
} from 'lucide-react';
import { getSocket, disconnectSocket, isConnected } from '@/lib/socket/socket';
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
  driverId?: string;
  rideId?: string;
  timestamp?: string;
}

interface TripData {
  id: string;
  status: 'driver_arriving' | 'en_route' | 'arriving_destination' | 'completed';
  driverName: string;
  driverRating: number;
  driverTrips: number;
  driverPhone: string;
  vehicleName: string;
  vehiclePlate: string;
  vehicleColor: string;
  vehicleType: string;
  vendorName: string;
  pickup: string;
  destination: string;
  fare: number;
  currency: string;
  eta: number;
  distance: number;
  elapsedMin: number;
  paymentMethod: string;
}

// ─── Fallback Data ────────────────────────────────────────────────────────────

const FALLBACK_TRIP: TripData = {
  id: 'RIDE-4823',
  status: 'en_route',
  driverName: 'Rajesh Kumar',
  driverRating: 4.8,
  driverTrips: 1284,
  driverPhone: '+91 700 111 222',
  vehicleName: 'Toyota Corolla',
  vehiclePlate: 'KBZ 001A',
  vehicleColor: 'Silver',
  vehicleType: 'Comfort',
  vendorName: 'SafeRide India',
  pickup: 'BKC Complex Mall, Thika Road',
  destination: 'CST, Fort',
  fare: 650,
  currency: '₹',
  eta: 12,
  distance: 8.4,
  elapsedMin: 15,
  paymentMethod: 'UPI',
};

const statusSteps = [
  { key: 'driver_arriving', label: 'Driver arriving', icon: Car },
  { key: 'en_route', label: 'En route', icon: Navigation },
  { key: 'arriving_destination', label: 'Arriving destination', icon: MapPin },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
] as const;

const statusIndex: Record<string, number> = {
  driver_arriving: 0,
  en_route: 1,
  arriving_destination: 2,
  completed: 3,
};

// ─── Map coordinates to CSS percentages ──────────────────────────────────────
function latLngToPercent(lat: number, lng: number, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100;
  return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = (params?.id as string) || 'RIDE-4823';

  // State
  const [trip, setTrip] = useState<TripData>(FALLBACK_TRIP);
  const [driverPos, setDriverPos] = useState<DriverLocation>({ lat: -1.286, lng: 36.817, heading: 45, speed: 32 });
  const [eta, setEta] = useState(FALLBACK_TRIP.eta);
  const [wsConnected, setWsConnected] = useState(false);
  const [locationHistory, setLocationHistory] = useState<{ x: number; y: number }[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Map bounds (Mumbai area — adjust dynamically later)
  const bounds = {
    minLat: -1.32, maxLat: -1.26,
    minLng: 36.79, maxLng: 36.85,
  };

  // ── Fetch trip data from REST API on mount ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/taxi/rides/${tripId}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ride) {
            setTrip(prev => ({ ...prev, ...data.ride }));
            if (data.ride.eta) setEta(data.ride.eta);
          }
        }
      } catch { /* Use fallback data */ }
    })();
  }, [tripId]);

  // ── WebSocket: Connect → Join ride room → Listen for live updates ──
  useEffect(() => {
    const socket = getSocket('taxi');
    socketRef.current = socket;

    const handleConnect = () => {
      setWsConnected(true);
      // Join the ride tracking room to receive driver GPS updates
      socket.emit('joinRideTracking', tripId);
      console.log(`[WS /taxi] 📡 Joined ride tracking for ${tripId}`);
    };

    const handleDisconnect = () => {
      setWsConnected(false);
    };

    // Live driver GPS updates (primary event)
    const handleLiveTracking = (data: any) => {
      try {
        const loc: DriverLocation = typeof data === 'string' ? JSON.parse(data) : data;
        setDriverPos(prev => ({
          lat: loc.lat ?? prev.lat,
          lng: loc.lng ?? prev.lng,
          heading: loc.heading ?? prev.heading,
          speed: loc.speed ?? prev.speed,
          driverId: loc.driverId,
          rideId: loc.rideId,
          timestamp: loc.timestamp || new Date().toISOString(),
        }));
        // Track path history
        const pos = latLngToPercent(loc.lat, loc.lng, bounds);
        setLocationHistory(prev => [...prev.slice(-30), pos]); // keep last 30 points
      } catch (e) {
        console.warn('[WS] liveRideTracking parse error:', e);
      }
    };

    // Unified tracking event (alternative event name)
    const handleLocationUpdated = (data: any) => {
      handleLiveTracking(data);
    };

    // Ride status changes
    const handleStatusChange = (data: any) => {
      try {
        const info = typeof data === 'string' ? JSON.parse(data) : data;
        if (info.status) {
          setTrip(prev => ({ ...prev, status: info.status }));
        }
        if (info.eta !== undefined) {
          setEta(info.eta);
        }
      } catch (e) {
        console.warn('[WS] ride_status_changed parse error:', e);
      }
    };

    // Register listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('liveRideTracking', handleLiveTracking);
    socket.on('taxi_location_updated', handleLocationUpdated);
    socket.on('ride_status_changed', handleStatusChange);

    // If already connected, join immediately
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      // Leave the ride tracking room on unmount
      socket.emit('leave_trip_tracking', { tripId });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('liveRideTracking', handleLiveTracking);
      socket.off('taxi_location_updated', handleLocationUpdated);
      socket.off('ride_status_changed', handleStatusChange);
    };
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ETA countdown (decrement every 60s when > 0) ──
  useEffect(() => {
    if (trip.status === 'completed') return;
    const interval = setInterval(() => {
      setEta(prev => Math.max(0, prev - 1));
    }, 60000);
    return () => clearInterval(interval);
  }, [trip.status]);

  const currentStep = statusIndex[trip.status] ?? 0;
  const carPos = latLngToPercent(driverPos.lat, driverPos.lng, bounds);
  // Fixed pickup/dest positions
  const pickupPos = latLngToPercent(-1.298, 36.808, bounds);
  const destPos = latLngToPercent(-1.271, 36.835, bounds);

  return (
    <div className="min-h-[calc(100vh-130px)] bg-slate-900">
      {/* Map Area */}
      <div className="relative h-[45vh] bg-slate-800 overflow-hidden">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-10"
          {...{
            style: {
              backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, transparent 1px, transparent 60px, #fff 61px),
                repeating-linear-gradient(90deg, #fff 0px, transparent 1px, transparent 60px, #fff 61px)`,
            }
          }}
        />
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />

        {/* Route trail from location history */}
        {locationHistory.length > 1 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" {...{ style: { zIndex: 4 } }}>
            <polyline
              points={locationHistory.map(p => `${p.x}%,${p.y}%`).join(' ')}
              fill="none"
              stroke="#22D3EE"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.7}
            />
          </svg>
        )}

        {/* Static route lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" {...{ style: { zIndex: 5 } }}>
          {/* Pickup → Driver */}
          <line
            x1={`${pickupPos.x}%`} y1={`${pickupPos.y}%`}
            x2={`${carPos.x}%`} y2={`${carPos.y}%`}
            stroke="#FBBF24" strokeWidth="3" strokeDasharray="6 4"
          />
          {/* Driver → Destination */}
          <line
            x1={`${carPos.x}%`} y1={`${carPos.y}%`}
            x2={`${destPos.x}%`} y2={`${destPos.y}%`}
            stroke="#FBBF24" strokeWidth="3" strokeDasharray="6 4" opacity={0.4}
          />
        </svg>

        {/* Pickup marker */}
        <div className="absolute z-10 flex flex-col items-center" {...{ style: { top: `${pickupPos.y}%`, left: `${pickupPos.x}%`, transform: 'translate(-50%, -50%)' } }}>
          <div className="w-4 h-4 bg-white border-4 border-slate-400 rounded-full shadow-lg" />
          <div className="mt-1 bg-white px-2 py-0.5 rounded text-[10px] font-bold text-slate-700 shadow whitespace-nowrap">
            Pickup
          </div>
        </div>

        {/* Destination marker */}
        <div className="absolute z-10 flex flex-col items-center" {...{ style: { top: `${destPos.y}%`, left: `${destPos.x}%`, transform: 'translate(-50%, -50%)' } }}>
          <div className="w-4 h-4 bg-yellow-400 rounded-sm shadow-lg" />
          <div className="mt-1 bg-yellow-400 px-2 py-0.5 rounded text-[10px] font-black text-black shadow whitespace-nowrap">
            Destination
          </div>
        </div>

        {/* Live driver car icon */}
        <div
          className="absolute z-20 transition-all duration-1000 ease-in-out"
          {...{
              style: {
                left: `${carPos.x}%`,
                top: `${carPos.y}%`,
                zIndex: 10,
                transition: 'all 2s ease-in-out',
                transform: `translate(-50%, -50%) rotate(${driverPos.heading}deg)`
              }
            }}
        >
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-xl ring-2 ring-yellow-400/50">
            <Car className="w-5 h-5 text-yellow-400" />
          </div>
          {/* Speed label */}
          {driverPos.speed > 0 && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/80 text-yellow-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
              {Math.round(driverPos.speed)} km/h
            </div>
          )}
        </div>

        {/* Back button */}
        <button
          title="Go back"
          onClick={() => router.back()}
          className="absolute top-6 left-4 z-30 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>

        {/* ETA pill */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-md text-white px-5 py-2 rounded-full flex items-center gap-2 shadow-lg">
          <Clock className="w-4 h-4 text-yellow-400" />
          <span className="font-black text-lg">{eta} min</span>
          <span className="text-slate-400 text-xs">ETA</span>
        </div>

        {/* WebSocket status indicator */}
        <div className={`absolute top-6 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-md ${
          wsConnected
            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
            : 'bg-red-500/20 border border-red-500/40 text-red-300'
        }`}>
          {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {wsConnected ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>

      {/* Driver Info Card */}
      <div className="max-w-2xl mx-auto px-4 -mt-8 relative z-30">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Status Progress */}
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center justify-between mb-2">
              {statusSteps.map((step, i) => {
                const Icon = step.icon;
                const isActive = i <= currentStep;
                const isCurrent = i === currentStep;
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isCurrent
                            ? 'bg-yellow-400 text-black scale-110 shadow-md'
                            : isActive
                              ? 'bg-green-500 text-white'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-semibold ${isCurrent ? 'text-yellow-600' : isActive ? 'text-green-600' : 'text-slate-400'}`}>
                        {step.label}
                      </span>
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 rounded ${i < currentStep ? 'bg-green-400' : 'bg-slate-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Driver details */}
          <div className="px-6 py-4 flex items-center gap-4">
            <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white font-black text-lg shadow-md">
              {trip.driverName.split(' ').map((w) => w[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">{trip.driverName}</h3>
                <span className="flex items-center gap-0.5 text-xs text-yellow-600 font-bold">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {trip.driverRating}
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                {trip.vehicleColor} {trip.vehicleName} · {trip.vehiclePlate}
              </p>
              {trip.vendorName && (
                <div className="inline-flex items-center gap-1 mt-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold text-amber-700">
                  <Shield className="w-3 h-3" /> {trip.vendorName}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 bg-green-50 hover:bg-green-100 rounded-full flex items-center justify-center transition-colors" title="Call driver">
                <Phone className="w-4 h-4 text-green-600" />
              </button>
              <button className="w-10 h-10 bg-blue-50 hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors" title="Message driver">
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Trip info */}
          <div className="px-6 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex flex-col items-center">
                <div className="w-3 h-3 bg-slate-400 rounded-full" />
                <div className="w-px h-6 bg-slate-200" />
                <div className="w-3 h-3 bg-yellow-400 rounded-sm" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Pickup</p>
                  <p className="text-sm font-semibold text-slate-900">{trip.pickup}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Destination</p>
                  <p className="text-sm font-semibold text-slate-900">{trip.destination}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Bottom row: fare + actions */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Estimated Fare</p>
              <p className="text-xl font-black text-slate-900">{trip.currency} {trip.fare}</p>
              <p className="text-[10px] text-slate-400">{trip.paymentMethod} · {trip.vehicleType} · {trip.distance} km</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Share Trip
              </button>
              <button className="px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-bold text-red-600 transition-colors flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> SOS
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safety message */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <p className="text-center text-slate-500 text-xs">
          🛡️ Your trip is monitored and insured. In an emergency, tap SOS or call 999.
        </p>
      </div>
    </div>
  );
}
