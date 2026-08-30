'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle, Calendar, Clock, MapPin, User, Star, Ticket,
  Bell, CalendarPlus, QrCode, ArrowRight, Gift, ShieldCheck,
  Stethoscope, ChevronRight, Copy, Share2,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';

interface BookingData {
  doctorId: string;
  doctor: { name: string; specialty: string; rating: number; fee: number; hospital: string; image: string };
  providerType?: 'individual' | 'hospital' | 'clinic';
  providerName?: string;
  providerLocation?: string;
  date: string;
  slot: string;
  patient: { name: string; age: string; gender: string };
  symptoms: string;
  total: number;
  tokenNumber: string;
  bookedAt: string;
}

export default function BookingConfirmationPage({ params }: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = React.use(params);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [showAnimation, setShowAnimation] = useState(true);
  const [copied, setCopied] = useState(false);
  const { user, updateUser } = useAuth();
  const { formatCurrencyValue } = useRegion();

  useEffect(() => {
    try {
      const data = sessionStorage.getItem('kartseek_last_booking');
      if (data) {
        const parsed = JSON.parse(data) as BookingData;
        setBooking(parsed);
        // Award loyalty points for booking
        if (user) {
          updateUser({ loyaltyPoints: (user.loyaltyPoints || 0) + 25 });
        }
      }
    } catch { /* ignore */ }
    const timer = setTimeout(() => setShowAnimation(false), 2500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyToken = () => {
    if (booking) {
      navigator.clipboard.writeText(booking.tokenNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <span className="text-5xl mb-4 block">📋</span>
          <h1 className="text-xl font-bold text-slate-900 mb-2">No Booking Found</h1>
          <p className="text-slate-500 text-sm mb-4">Start by booking an appointment.</p>
          <Link href="/" className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors">
            Browse Doctors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-white to-slate-50 pb-20">

      {/* ── Success Animation Overlay ──────────────────────────────────── */}
      {showAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
          <div className="text-center animate-bounce-in">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <CheckCircle className="w-14 h-14 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Booking Confirmed! 🎉</h1>
            <p className="text-slate-500">Preparing your appointment details...</p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-8">

        {/* ── Success Banner ───────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200/30 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black mb-1">Appointment Confirmed</h1>
              <p className="text-emerald-100 text-sm">Your appointment has been successfully booked and confirmed.</p>
            </div>
          </div>
        </div>

        {/* ── Live Token Number ────────────────────────────────────────── */}
        <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 mb-6 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Ticket className="w-5 h-5 text-blue-600" />
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Your Token Number</p>
          </div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-5xl font-black text-slate-900 tracking-wider">{booking.tokenNumber}</span>
            <button onClick={copyToken} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" title="Copy token">
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
          <p className="text-sm text-slate-500">Show this token number at the reception desk</p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs">
            <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-lg">Queue Position: ~3rd</span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-lg">Est. Wait: ~15 min</span>
          </div>
        </div>

        {/* ── 30 Minute Reminder ───────────────────────────────────────── */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 mb-0.5">⏰ Arrive 30 Minutes Early</h3>
            <p className="text-sm text-amber-700">Please arrive at least <span className="font-bold">30 minutes before</span> your scheduled time for registration and check-in. Carry your token number and a valid ID.</p>
          </div>
        </div>

        {/* ── Appointment Summary ──────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-600" /> Appointment Details</h3>
          </div>
          <div className="p-5">
            {/* Doctor */}
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-slate-100">
              <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-blue-50 shadow-sm shrink-0">
                <img src={booking.doctor.image} alt={booking.doctor.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{booking.doctor.name}</p>
                <p className="text-sm text-slate-500">{booking.doctor.specialty}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-amber-700">{booking.doctor.rating}</span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Date</p>
                  <p className="font-semibold text-slate-900">{booking.date}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Time</p>
                  <p className="font-semibold text-slate-900">{booking.slot}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Location</p>
                  <p className="font-semibold text-slate-900">{booking.providerName || booking.doctor.hospital}</p>
                  {booking.providerLocation && <p className="text-xs text-slate-400">{booking.providerLocation}</p>}
                  {booking.providerType && (
                    <span className={`text-[9px] font-bold mt-1 inline-block px-1.5 py-0.5 rounded border ${
                      booking.providerType === 'hospital' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      booking.providerType === 'clinic' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                      'bg-violet-50 text-violet-700 border-violet-200'
                    }`}>
                      {booking.providerType === 'hospital' ? '🏥 Hospital' : booking.providerType === 'clinic' ? '🏪 Clinic' : '👨‍⚕️ Independent'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Patient</p>
                  <p className="font-semibold text-slate-900">{booking.patient.name}</p>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-sm text-slate-500">Total Paid</span>
              <span className="text-lg font-black text-slate-900">{formatCurrencyValue(booking.total)}</span>
            </div>
          </div>
        </div>

        {/* ── QR Code (placeholder) ────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 text-center shadow-sm">
          <QrCode className="w-24 h-24 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-900">Scan at Reception</p>
          <p className="text-xs text-slate-400">Show this QR code for quick check-in</p>
        </div>

        {/* ── Loyalty Points Earned ────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-2xl p-5 mb-6 text-white flex items-center gap-4 shadow-lg shadow-violet-200/30">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shrink-0">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-violet-200 uppercase">Loyalty Points Earned</p>
            <p className="text-2xl font-black">+25 Points 🎉</p>
            <p className="text-xs text-violet-200 mt-0.5">Total balance: {((user?.loyaltyPoints || 0)).toLocaleString()} points</p>
          </div>
        </div>

        {/* ── Action Buttons ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">
            <CalendarPlus className="w-4 h-4 text-blue-600" /> Add to Calendar
          </button>
          <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">
            <Share2 className="w-4 h-4 text-violet-600" /> Share Details
          </button>
        </div>

        {/* ── Navigation ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          <Link href="/my-appointments" className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-sm">
            <Stethoscope className="w-4 h-4" /> View My Appointments <ChevronRight className="w-4 h-4" />
          </Link>
          <Link href="/" className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors">
            ← Back to Doctor Home
          </Link>
        </div>
      </div>

      {/* ── Animation Styles ──────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounceIn 0.6s ease-out; }
      `}} />
    </div>
  );
}
