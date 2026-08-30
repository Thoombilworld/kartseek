'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar, Clock, User, FileText, ChevronRight, ShieldCheck,
  MapPin, Star, CheckCircle, Upload, ArrowLeft, Lock, LogIn, UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { ZoneLink } from '@/components/zone-link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { getDoctor, getProviderLabel, getProviderColor } from '@/lib/modules/doctor-registry';
import { useRegion } from '@/lib/contexts/region-context';

// ─── Date Generation ────────────────────────────────────────────────────────────
function generateDates(count: number) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return {
      id: i,
      day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : days[d.getDay()],
      date: d.getDate(),
      month: months[d.getMonth()],
      full: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    };
  });
}

const MORNING_SLOTS = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'];
const AFTERNOON_SLOTS = ['02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'];
const EVENING_SLOTS = ['05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'];
const BOOKED_SLOTS = ['10:00 AM', '03:00 PM'];

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AppointmentBookingPage({ params }: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = React.use(params);
  const dates = useMemo(() => generateDates(14), []);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const doc = getDoctor(doctorId);
  const platformFee = 25;
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [symptoms, setSymptoms] = useState('');

  const { isAuthenticated, user, isHydrated } = useAuth();
  const router = useRouter();
  const { formatCurrencyValue } = useRegion();

  const selectedDateObj = dates[selectedDate];

  const handleConfirmBooking = () => {
    if (!isAuthenticated) return;
    // Store booking data in sessionStorage for the confirmation page
    const bookingData = {
      doctorId: doctorId,
      doctor: { name: doc.name, specialty: doc.specialty, rating: doc.rating, fee: doc.fee, hospital: doc.providerName, image: doc.image },
      providerType: doc.providerType,
      providerName: doc.providerName,
      providerLocation: doc.providerLocation,
      date: selectedDateObj?.full,
      slot: selectedSlot,
      patient: { name: patientName, age: patientAge, gender: patientGender },
      symptoms,
      total: doc.fee + platformFee,
      tokenNumber: `A-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`,
      bookedAt: new Date().toISOString(),
    };
    sessionStorage.setItem('kartseek_last_booking', JSON.stringify(bookingData));
    router.push(`/book/${doctorId}/confirmation`);
  };

  function SlotGroup({ label, emoji, slots }: { label: string; emoji: string; slots: string[] }) {
    return (
      <div className="mb-5">
        <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <span>{emoji}</span> {label}
          <span className="text-xs font-normal text-slate-400 ml-1">({slots.filter(s => !BOOKED_SLOTS.includes(s)).length} available)</span>
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {slots.map((s) => {
            const isBooked = BOOKED_SLOTS.includes(s);
            const isSelected = selectedSlot === s;
            return (
              <button
                key={s}
                disabled={isBooked}
                onClick={() => setSelectedSlot(isSelected ? null : s)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isBooked
                    ? 'bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed line-through'
                    : isSelected
                    ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-sm shadow-blue-200/50'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen pb-24 pt-4 md:pt-8 relative">

      {/* ── Auth Gate Overlay ───────────────────────────────────────────── */}
      {isHydrated && !isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 max-w-md mx-4 text-center relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-violet-500 to-teal-500" />

            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Sign In Required</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              You need to sign in or create an account before booking an appointment with <span className="font-bold text-slate-700">{doc.name}</span>.
            </p>

            <div className="space-y-3 mb-6">
              <ZoneLink
                href={`/auth/login?redirect=${encodeURIComponent(`/doctor/book/${doctorId}`)}`}
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4" /> Sign In to Continue
              </ZoneLink>
              <ZoneLink
                href={`/auth/register?redirect=${encodeURIComponent(`/doctor/book/${doctorId}`)}`}
                className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Create New Account
              </ZoneLink>
            </div>

            <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Your data is secure and encrypted</span>
            </div>

            <Link href="/" className="block mt-4 text-xs text-slate-400 hover:text-slate-600 transition-colors">
              ← Back to Doctor Home
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <Link href={`/profile/${doctorId}`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" /> Back to Doctor Profile
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Book Appointment</h1>
          <p className="text-sm text-slate-500 mt-1">Select a date and time, then provide patient details</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

          {/* ── Booking Flow (Left 2/3) ───────────────────────────────── */}
          <div className="md:col-span-2 space-y-5">

            {/* Step 1: Date & Time */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">1</span>
                Select Date & Time
              </h2>

              {/* Date Selector */}
              <div className="flex gap-2.5 overflow-x-auto hide-scrollbar snap-x pb-3 mb-6 -mx-1 px-1">
                {dates.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedDate(d.id); setSelectedSlot(null); }}
                    className={`snap-start shrink-0 w-[72px] h-[88px] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                      selectedDate === d.id
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200/50 border-2 border-blue-600 scale-[1.02]'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/30'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${selectedDate === d.id ? 'text-blue-200' : 'text-slate-400'}`}>
                      {d.day}
                    </span>
                    <span className="text-2xl font-black">{d.date}</span>
                    <span className={`text-[10px] font-semibold ${selectedDate === d.id ? 'text-blue-200' : 'text-slate-400'}`}>
                      {d.month}
                    </span>
                  </button>
                ))}
              </div>

              {/* Time Slots */}
              <SlotGroup label="Morning" emoji="🌅" slots={MORNING_SLOTS} />
              <SlotGroup label="Afternoon" emoji="☀️" slots={AFTERNOON_SLOTS} />
              <SlotGroup label="Evening" emoji="🌇" slots={EVENING_SLOTS} />
            </div>

            {/* Step 2: Patient Details */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">2</span>
                Patient Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient's full name"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 text-sm transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="Years"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      aria-label="Patient gender"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 bg-white text-sm transition-all"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="symptoms-reason-for-visit">Symptoms / Reason for Visit</label>
                  <textarea id="symptoms-reason-for-visit"
                    rows={3}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Briefly describe your symptoms or reason for consulting..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 text-sm transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Upload Reports */}
            <div className="bg-gradient-to-br from-blue-50 to-teal-50/30 border border-blue-100 rounded-2xl p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0 border border-blue-100">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-1">Have past medical reports?</h3>
                  <p className="text-sm text-slate-500 mb-3">Upload previous prescriptions or lab tests to help the doctor.</p>
                  <button className="inline-flex items-center gap-2 bg-white border border-blue-200 text-blue-700 font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm hover:bg-blue-50 transition-colors">
                    <Upload className="w-4 h-4" /> Upload Documents (Optional)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Booking Summary (Right 1/3) ───────────────────────────── */}
          <div className="md:col-span-1">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden sticky top-24">

              {/* Doctor Info */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                <h3 className="font-bold text-slate-900 mb-4 text-sm">Booking Summary</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-50 shadow-sm shrink-0">
                    <img src={doc.image} alt="Doctor" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{doc.name}</p>
                    <p className="text-xs text-slate-500">{doc.specialty}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-[11px] font-bold text-amber-700">{doc.rating}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-5 border-b border-slate-100 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-700">{selectedDateObj?.full || 'Select a date'}</p>
                    <p className={`font-bold ${selectedSlot ? 'text-blue-600' : 'text-slate-400'}`}>
                      {selectedSlot || 'Select a time slot'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-700">{doc.providerName}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {doc.providerLocation}</p>
                  </div>
                </div>
                <div className="mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getProviderColor(doc.providerType)}`}>
                    {getProviderLabel(doc.providerType)}
                  </span>
                </div>
              </div>

              {/* Loyalty Points Banner */}
              {isAuthenticated && (
                <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                  <span className="text-lg">🎁</span>
                  <div>
                    <p className="text-xs font-bold text-amber-800">Earn +25 Loyalty Points</p>
                    <p className="text-[10px] text-amber-600">for booking this appointment</p>
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="p-5 bg-slate-50/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-500">Consultation Fee</span>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrencyValue(doc.fee)}</span>
                </div>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Platform Fee</span>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrencyValue(platformFee)}</span>
                </div>
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold text-slate-900">Total Payable</span>
                  <span className="text-xl font-black text-slate-900">{formatCurrencyValue(doc.fee + platformFee)}</span>
                </div>

                <button
                  onClick={handleConfirmBooking}
                  disabled={!selectedSlot || !patientName.trim() || !isAuthenticated}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-sm shadow-blue-200/50 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  Pay & Confirm <ChevronRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> 100% secure payment
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
