'use client';
import React, { useState, useMemo } from 'react';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  TrendingUp, Clock, Star, Car, ToggleLeft, ToggleRight, MapPin, Bell,
  DollarSign, Percent, CheckCircle, XCircle, Wallet, Gift, Trophy,
  ChevronDown, ChevronUp, Banknote, ArrowUpRight, ArrowDownRight,
  Zap, Target, Timer, Award,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';

// ── Types ────────────────────────────────────────────────────────────────────

interface Trip {
  id: string;
  pickup: string;
  drop: string;
  fare: number;
  tip: number;
  time: string;
  rating: number;
  status: 'Completed' | 'Cancelled';
  distance: string;
  duration: string;
  vehicleType: string;
  paymentMethod: string;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const trips: Trip[] = [
  { id: 'T001', pickup: 'Westlands Mall', drop: 'CBD, Nation Centre', fare: 280, tip: 40, time: '09:14 AM', rating: 5, status: 'Completed', distance: '6.2 km', duration: '18 min', vehicleType: 'Economy', paymentMethod: 'UPI' },
  { id: 'T002', pickup: 'Bandra West', drop: 'JKIA Terminal 1A', fare: 650, tip: 100, time: '11:32 AM', rating: 5, status: 'Completed', distance: '22.8 km', duration: '42 min', vehicleType: 'Comfort', paymentMethod: 'Card' },
  { id: 'T003', pickup: 'Kilimani, Galana Rd', drop: 'Upper Hill, NHIF Bldg', fare: 210, tip: 0, time: '02:05 PM', rating: 4, status: 'Completed', distance: '3.4 km', duration: '12 min', vehicleType: 'Economy', paymentMethod: 'Cash' },
  { id: 'T004', pickup: 'Junction Mall', drop: 'SV Road', fare: 0, tip: 0, time: '03:20 PM', rating: 0, status: 'Cancelled', distance: '—', duration: '—', vehicleType: 'Economy', paymentMethod: '—' },
  { id: 'T005', pickup: 'Lavington Green', drop: 'Hurlingham, Argwings', fare: 180, tip: 20, time: '04:10 PM', rating: 5, status: 'Completed', distance: '2.8 km', duration: '10 min', vehicleType: 'Economy', paymentMethod: 'UPI' },
];

const WEEKLY_EARNINGS = [
  { day: 'Mon', amount: 1850, trips: 8 },
  { day: 'Tue', amount: 2200, trips: 10 },
  { day: 'Wed', amount: 1400, trips: 6 },
  { day: 'Thu', amount: 2650, trips: 12 },
  { day: 'Fri', amount: 3100, trips: 14 },
  { day: 'Sat', amount: 3800, trips: 16 },
  { day: 'Sun', amount: 1320, trips: 5 },
];

const PAYOUTS = [
  { id: 'PO-401', amount: 8200, date: 'Jul 1–7', status: 'paid', bank: '****4521' },
  { id: 'PO-400', amount: 7650, date: 'Jun 24–30', status: 'paid', bank: '****4521' },
  { id: 'PO-399', amount: 9100, date: 'Jun 17–23', status: 'paid', bank: '****4521' },
];

export default function DriverDashboard() {
  const [online, setOnline] = useState(false);
  const [newRide, setNewRide] = useState<null | { pickup: string; drop: string; fare: number }>(null);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [showPayouts, setShowPayouts] = useState(false);
  const { formatCurrencyValue } = useRegion();

  const goOnline = () => {
    setOnline(true);
    setTimeout(() => {
      setNewRide({ pickup: 'Yaya Centre, Kilimani', drop: 'Sarit Centre, Westlands', fare: 340 });
    }, 2500);
  };

  const completedTrips = trips.filter(t => t.status === 'Completed');
  const totalFare = completedTrips.reduce((s, t) => s + t.fare, 0);
  const totalTips = completedTrips.reduce((s, t) => s + t.tip, 0);
  const acceptanceRate = 92;
  const completionRate = Math.round((completedTrips.length / trips.length) * 100);
  const cancellationRate = 100 - completionRate;
  const weeklyTotal = WEEKLY_EARNINGS.reduce((s, d) => s + d.amount, 0);
  const maxDayEarning = Math.max(...WEEKLY_EARNINGS.map(d => d.amount));

  return (
    <div className="min-h-[calc(100vh-130px)] bg-slate-900">
      {/* New Ride Popup */}
      {newRide && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-yellow-500 animate-bounce" />
              <h3 className="font-black text-lg">New Ride Request!</h3>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2 text-sm"><MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /><span><b>Pickup:</b> {newRide.pickup}</span></div>
              <div className="flex items-start gap-2 text-sm"><MapPin className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" /><span><b>Drop:</b> {newRide.drop}</span></div>
              <div className="flex items-center gap-2 text-sm font-bold text-green-600">💰 Estimated fare: {formatCurrencyValue(newRide.fare)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setNewRide(null)} className="py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">Decline</button>
              <button onClick={() => setNewRide(null)} className="py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black text-sm transition-colors">Accept Ride</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-black text-2xl">Driver Dashboard</h1>
            <p className="text-slate-400 text-sm">Welcome back, Rahul K. 👋</p>
          </div>
          <button onClick={online ? () => setOnline(false) : goOnline}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${online ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {online ? <><ToggleRight className="w-5 h-5" />Online</> : <><ToggleLeft className="w-5 h-5" />Go Online</>}
          </button>
        </div>

        {online && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <p className="text-green-300 text-sm font-medium">You're online — waiting for ride requests nearby…</p>
          </div>
        )}

        {/* Primary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Today's Earnings", value: formatCurrencyValue(totalFare), sub: `+${formatCurrencyValue(totalTips)} tips`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
            { label: 'Trips Today', value: `${trips.length}`, sub: `${completedTrips.length} completed`, icon: Car, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Hours Online', value: '4.5h', sub: 'Active 82%', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
            { label: 'Your Rating', value: '4.9 ⭐', sub: '1,240 ratings', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className={`border rounded-2xl p-4 ${bg}`}>
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{label}</p>
              {sub && <p className="text-[10px] text-slate-500 mt-1">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Acceptance Rate', value: `${acceptanceRate}%`, icon: Target, color: acceptanceRate >= 85 ? 'text-emerald-400' : 'text-amber-400', trend: '+2%' },
            { label: 'Completion Rate', value: `${completionRate}%`, icon: CheckCircle, color: completionRate >= 80 ? 'text-emerald-400' : 'text-amber-400', trend: '+1%' },
            { label: 'Cancellation Rate', value: `${cancellationRate}%`, icon: XCircle, color: cancellationRate <= 15 ? 'text-emerald-400' : 'text-red-400', trend: '-3%' },
          ].map(({ label, value, icon: Icon, color, trend }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color} shrink-0`} />
              <div>
                <p className={`text-lg font-black ${color}`}>{value}</p>
                <p className="text-slate-500 text-[10px]">{label}</p>
              </div>
              <span className={`ml-auto text-[10px] font-bold ${trend.startsWith('+') ? 'text-emerald-400' : trend.startsWith('-') && label !== 'Cancellation Rate' ? 'text-red-400' : 'text-emerald-400'}`}>{trend}</span>
            </div>
          ))}
        </div>

        {/* Weekly Earnings Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-black text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" /> Weekly Earnings</h2>
            <span className="text-green-400 font-bold text-sm">{formatCurrencyValue(weeklyTotal)} total</span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {WEEKLY_EARNINGS.map((d) => {
              const pct = (d.amount / maxDayEarning) * 100;
              const isToday = d.day === 'Tue';
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-bold">{formatCurrencyValue(d.amount)}</span>
                  <div className="w-full flex-1 flex items-end">
                    <ProgressBar value={pct} className={`w-full rounded-t-lg transition-all min-h-[8px] ${isToday ? 'bg-linear-to-t from-yellow-500 to-yellow-400' : 'bg-linear-to-t from-white/10 to-white/20'}`} />
                  </div>
                  <span className={`text-[10px] font-bold ${isToday ? 'text-yellow-400' : 'text-slate-500'}`}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-black text-lg mb-4 flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-400" /> Earnings Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Base Fares', amount: totalFare, icon: Car, color: 'text-white' },
              { label: 'Tips', amount: totalTips, icon: Gift, color: 'text-green-400' },
              { label: 'Bonuses', amount: 150, icon: Trophy, color: 'text-yellow-400' },
              { label: 'Incentives', amount: 200, icon: Zap, color: 'text-violet-400' },
            ].map(({ label, amount, icon: Icon, color }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                <Icon className={`w-4 h-4 ${color} shrink-0`} />
                <div>
                  <p className={`text-sm font-black ${color}`}>{formatCurrencyValue(amount)}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm text-slate-400">Net Earnings Today</span>
            <span className="text-lg font-black text-green-400">{formatCurrencyValue(totalFare + totalTips + 150 + 200)}</span>
          </div>
        </div>

        {/* Today's Trips */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-black text-lg mb-4">Today's Trips</h2>
          <div className="space-y-2">
            {trips.map((t) => (
              <div key={t.id} className="bg-white/5 rounded-xl overflow-hidden">
                <button onClick={() => setExpandedTrip(expandedTrip === t.id ? null : t.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.status === 'Completed' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {t.status === 'Completed' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold">{t.pickup} → {t.drop}</p>
                      <p className="text-slate-400 text-xs">{t.time} · {t.vehicleType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-black ${t.status === 'Completed' ? 'text-green-400' : 'text-red-400'}`}>
                        {t.status === 'Completed' ? formatCurrencyValue(t.fare) : 'Cancelled'}
                      </p>
                      {t.tip > 0 && <p className="text-[10px] text-yellow-400">+{formatCurrencyValue(t.tip)} tip</p>}
                    </div>
                    {expandedTrip === t.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </button>
                {expandedTrip === t.id && t.status === 'Completed' && (
                  <div className="px-4 pb-3 border-t border-white/5 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-slate-500">Distance</span><p className="text-white font-bold">{t.distance}</p></div>
                    <div><span className="text-slate-500">Duration</span><p className="text-white font-bold">{t.duration}</p></div>
                    <div><span className="text-slate-500">Payment</span><p className="text-white font-bold">{t.paymentMethod}</p></div>
                    <div><span className="text-slate-500">Rating</span><p className="text-yellow-400 font-bold">{'⭐'.repeat(t.rating)}</p></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payout History */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <button onClick={() => setShowPayouts(!showPayouts)} className="w-full flex items-center justify-between">
            <h2 className="text-white font-black text-lg flex items-center gap-2"><Banknote className="w-5 h-5 text-green-400" /> Payout History</h2>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showPayouts ? 'rotate-180' : ''}`} />
          </button>
          {showPayouts && (
            <div className="mt-4 space-y-2">
              <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-400">Bank Account</p>
                  <p className="text-white font-bold text-sm">India Commercial Bank ****4521</p>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg font-bold">Verified</span>
              </div>
              {PAYOUTS.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-semibold">{p.date}</p>
                    <p className="text-slate-500 text-xs">{p.id} · Bank {p.bank}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-black">{formatCurrencyValue(p.amount)}</p>
                    <p className="text-xs text-emerald-500 font-bold">Paid ✓</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peak Hours */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-black text-lg mb-4 flex items-center gap-2"><Timer className="w-5 h-5 text-amber-400" /> Peak Hours Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { period: 'Morning Rush', time: '7 AM – 9 AM', rides: 2, earnings: 480, surge: '1.15×', color: 'from-amber-500/20 to-orange-500/20', textColor: 'text-amber-400' },
              { period: 'Evening Rush', time: '5 PM – 8 PM', rides: 3, earnings: 780, surge: '1.25×', color: 'from-violet-500/20 to-indigo-500/20', textColor: 'text-violet-400' },
              { period: 'Late Night', time: '10 PM – 5 AM', rides: 0, earnings: 0, surge: '1.1×', color: 'from-slate-500/20 to-slate-600/20', textColor: 'text-slate-400' },
            ].map(p => (
              <div key={p.period} className={`bg-linear-to-br ${p.color} border border-white/10 rounded-xl p-4`}>
                <p className={`font-bold text-sm ${p.textColor}`}>{p.period}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.time} · {p.surge} surge</p>
                <div className="flex items-end justify-between mt-3">
                  <div>
                    <p className="text-white font-black text-lg">{p.rides} rides</p>
                    <p className={`text-xs font-bold ${p.textColor}`}>{formatCurrencyValue(p.earnings)}</p>
                  </div>
                  <Award className={`w-6 h-6 ${p.rides > 0 ? p.textColor : 'text-slate-600'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
