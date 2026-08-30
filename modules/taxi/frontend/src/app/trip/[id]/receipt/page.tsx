'use client';
import React from 'react';
import Link from 'next/link';
import {
  MapPin, Clock, Navigation, CreditCard, Star, Download,
  Share2, ChevronLeft, Shield, Car, DollarSign, Route,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';

/* ── Mock Data ─────────────────────────────────────────────────────────── */

const RECEIPT = {
  id: 'RIDE-4823',
  date: '2026-06-17',
  time: '10:30 AM',
  pickup: 'BKC Complex Mall, Thika Road',
  dropoff: 'CST, Fort, Mumbai',
  distance: '12.4 km',
  duration: '35 min',
  vehicle: 'Comfort',
  driver: {
    name: 'Rajesh Kumar',
    photo: null,
    rating: 4.8,
    trips: 2340,
    vehicle: 'Toyota Corolla',
    plate: 'KDG 456A',
    color: 'Silver',
  },
  fare: {
    baseFare: 150,
    distanceCharge: 310,
    timeCharge: 105,
    platformFee: 35,
    surge: 0,
    discount: -50,
    total: 650,
  },
  payment: {
    method: 'UPI',
    last4: '7890',
    status: 'Paid',
  },
  rating: null as number | null,
  currency: '₹',
  vendor: 'SafeRide India',
};

function formatPrice(n: number, fmt: (v: number) => string) {
  return fmt(Math.abs(n));
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function RideReceiptPage() {
  const receipt = RECEIPT;
  const { formatCurrencyValue } = useRegion();
  const fmtPrice = (n: number) => formatPrice(n, formatCurrencyValue);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-black py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/taxi/rides" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-medium mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Rides
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white">Ride <span className="text-yellow-400">Receipt</span></h1>
              <p className="text-slate-400 text-xs mt-1">
                {new Date(receipt.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {receipt.time}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">{receipt.id}</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* ── Route Card ──────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Route className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Route</h2>
          </div>

          <div className="flex items-start gap-4">
            {/* Route line */}
            <div className="flex flex-col items-center mt-1">
              <div className="w-3 h-3 bg-white rounded-full border-2 border-slate-400" />
              <div className="w-0.5 h-12 bg-gradient-to-b from-slate-400 to-yellow-400" />
              <div className="w-3 h-3 bg-yellow-400 rounded-sm" />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Pickup</p>
                <p className="text-sm font-semibold text-white">{receipt.pickup}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Drop-off</p>
                <p className="text-sm font-semibold text-white">{receipt.dropoff}</p>
              </div>
            </div>
          </div>

          {/* Trip Stats */}
          <div className="flex gap-4 mt-5 pt-4 border-t border-white/10">
            {[
              { icon: Navigation, label: 'Distance', value: receipt.distance },
              { icon: Clock, label: 'Duration', value: receipt.duration },
              { icon: Car, label: 'Vehicle', value: receipt.vehicle },
            ].map((s) => (
              <div key={s.label} className="flex-1 text-center">
                <s.icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-white font-bold text-sm">{s.value}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Fare Breakdown ──────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Fare Breakdown</h2>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Base Fare', value: receipt.fare.baseFare },
              { label: `Distance (${receipt.distance})`, value: receipt.fare.distanceCharge },
              { label: `Time (${receipt.duration})`, value: receipt.fare.timeCharge },
              { label: 'Platform Fee', value: receipt.fare.platformFee },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{item.label}</span>
                <span className="text-sm text-white font-medium">{fmtPrice(item.value)}</span>
              </div>
            ))}

            {receipt.fare.surge > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-400">Surge Pricing</span>
                <span className="text-sm text-amber-400 font-medium">+{fmtPrice(receipt.fare.surge)}</span>
              </div>
            )}

            {receipt.fare.discount < 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-400">Promo Discount</span>
                <span className="text-sm text-emerald-400 font-medium">-{fmtPrice(receipt.fare.discount)}</span>
              </div>
            )}

            <div className="border-t border-white/10 pt-3 flex items-center justify-between">
              <span className="text-base font-black text-white">Total</span>
              <span className="text-2xl font-black text-yellow-400">{fmtPrice(receipt.fare.total)}</span>
            </div>
          </div>
        </div>

        {/* ── Driver Info ─────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Driver</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-black font-black text-xl">
              {receipt.driver.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold">{receipt.driver.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                  <Star className="w-3.5 h-3.5 fill-yellow-400" /> {receipt.driver.rating}
                </span>
                <span className="text-slate-500 text-xs">·</span>
                <span className="text-slate-400 text-xs">{receipt.driver.trips.toLocaleString()} trips</span>
              </div>
            </div>
            {receipt.vendor && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                <Shield className="w-3 h-3" /> {receipt.vendor}
              </span>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex gap-6">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Vehicle</p>
              <p className="text-sm text-white font-medium">{receipt.driver.color} {receipt.driver.vehicle}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Plate</p>
              <p className="text-sm text-white font-mono font-bold">{receipt.driver.plate}</p>
            </div>
          </div>
        </div>

        {/* ── Payment ─────────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-white font-bold">{receipt.payment.method}</p>
                <p className="text-xs text-slate-500">••••{receipt.payment.last4}</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {receipt.payment.status}
            </span>
          </div>
        </div>

        {/* ── Rating (if not yet rated) ───────────────────────────── */}
        {receipt.rating === null && (
          <div className="bg-gradient-to-r from-yellow-400/10 to-amber-400/10 border border-yellow-400/20 rounded-2xl p-5 text-center">
            <h3 className="text-white font-bold mb-2">How was your ride?</h3>
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} className="hover:scale-125 transition-transform" title={`Rate ${star} stars`}>
                  <Star className="w-8 h-8 text-slate-500 hover:text-yellow-400 hover:fill-yellow-400 transition-colors" />
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Tap a star to rate your experience</p>
          </div>
        )}

        {/* ── Action Buttons ──────────────────────────────────────── */}
        <div className="flex gap-3">
          <button className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Download Receipt
          </button>
          <button className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>

        {/* ── Help Link ───────────────────────────────────────────── */}
        <div className="text-center pb-6">
          <Link href="/support" className="text-sm text-slate-500 hover:text-yellow-400 transition-colors">
            Need help with this ride? <span className="font-semibold underline">Contact Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
