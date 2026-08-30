'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Star, ArrowLeft, CheckCircle, MessageSquare, Gift, Send,
  ThumbsUp, Stethoscope, Clock, Sparkles, ShieldCheck, Eye, EyeOff, MapPin,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';

// ─── Appointment stub ───────────────────────────────────────────────────────────
const APPOINTMENTS: Record<string, {
  doctor: { name: string; specialty: string; image: string; hospital: string };
  providerType: 'individual' | 'hospital' | 'clinic';
  providerLocation: string;
  date: string; time: string;
}> = {
  'apt-004': {
    doctor: { name: 'Dr. Zara Ahmed', specialty: 'Pediatrician', image: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=100&q=80', hospital: 'Mumbai Hospital' },
    providerType: 'individual', providerLocation: 'Mumbai, India',
    date: 'Mon, Jun 9, 2026', time: '09:00 AM',
  },
  'apt-003': {
    doctor: { name: 'Dr. Meera Reddy', specialty: 'Dermatologist', image: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=100&q=80', hospital: 'SkinFirst Dermatology Center' },
    providerType: 'clinic', providerLocation: 'Andheri West, Mumbai',
    date: 'Wed, Jun 11, 2026', time: '11:00 AM',
  },
  'apt-002': {
    doctor: { name: 'Dr. Sunil Kapoor', specialty: 'Cardiologist', image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&q=80', hospital: 'Apollo Heart & Multi-Speciality Hospital' },
    providerType: 'hospital', providerLocation: 'Andheri, Mumbai',
    date: 'Mon, Jun 16, 2026', time: '02:30 PM',
  },
};

const RATING_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: 'Very Poor', emoji: '😞', color: 'text-red-600' },
  2: { label: 'Poor', emoji: '😕', color: 'text-orange-600' },
  3: { label: 'Average', emoji: '😐', color: 'text-amber-600' },
  4: { label: 'Good', emoji: '😊', color: 'text-emerald-600' },
  5: { label: 'Excellent', emoji: '🤩', color: 'text-emerald-600' },
};

const CATEGORIES = [
  { key: 'overall', label: 'Overall Experience', icon: ThumbsUp },
  { key: 'communication', label: 'Doctor Communication', icon: MessageSquare },
  { key: 'waitTime', label: 'Wait Time', icon: Clock },
  { key: 'cleanliness', label: 'Clinic Cleanliness', icon: Sparkles },
];

export default function ReviewPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = React.use(params);
  const apt = APPOINTMENTS[appointmentId];
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [overallRating, setOverallRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const displayRating = hoverRating || overallRating;
  const ratingLabel = displayRating ? RATING_LABELS[displayRating] : null;

  const hasDetailedReview = comment.trim().length >= 20;
  const ratedCategories = Object.keys(categoryRatings).length;

  // Calculate loyalty points
  const pointsBreakdown = {
    rating: overallRating > 0 ? 10 : 0,
    detailed: hasDetailedReview ? 15 : 0,
    categories: ratedCategories >= 4 ? 5 : 0,
  };
  const totalPoints = pointsBreakdown.rating + pointsBreakdown.detailed + pointsBreakdown.categories;

  const handleSubmit = () => {
    if (overallRating === 0) return;
    // Award loyalty points
    if (user) {
      updateUser({ loyaltyPoints: (user.loyaltyPoints || 0) + totalPoints });
    }
    setSubmitted(true);
  };

  if (!apt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <span className="text-5xl mb-4 block">📋</span>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Appointment Not Found</h1>
          <Link href="/my-appointments" className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors">
            My Appointments
          </Link>
        </div>
      </div>
    );
  }

  // ── Success State ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Review Submitted! 🎉</h1>
          <p className="text-slate-500 mb-6">Thank you for reviewing <span className="font-bold text-slate-700">{apt.doctor.name}</span>. Your feedback helps other patients.</p>

          {/* Points Earned */}
          <div className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-2xl p-5 mb-6 text-white text-left shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5" />
              <p className="text-sm font-bold text-violet-200">Loyalty Points Earned</p>
            </div>
            <p className="text-3xl font-black mb-3">+{totalPoints} Points</p>
            <div className="space-y-1 text-xs text-violet-200">
              {pointsBreakdown.rating > 0 && <p className="flex justify-between"><span>Star rating</span><span className="font-bold text-white">+{pointsBreakdown.rating}</span></p>}
              {pointsBreakdown.detailed > 0 && <p className="flex justify-between"><span>Detailed comment</span><span className="font-bold text-white">+{pointsBreakdown.detailed}</span></p>}
              {pointsBreakdown.categories > 0 && <p className="flex justify-between"><span>All categories rated</span><span className="font-bold text-white">+{pointsBreakdown.categories}</span></p>}
            </div>
            <div className="mt-3 pt-3 border-t border-white/20 text-xs">
              <p>Total balance: <span className="font-bold text-white">{(user?.loyaltyPoints || 0).toLocaleString()} points</span></p>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/my-appointments" className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
              <Stethoscope className="w-4 h-4" /> View My Appointments
            </Link>
            <Link href="/" className="flex items-center justify-center w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors">
              ← Back to Doctor Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Review Form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      <div className="max-w-xl mx-auto px-4 pt-8">

        {/* Header */}
        <div className="mb-6">
          <Link href="/my-appointments" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" /> My Appointments
          </Link>
          <h1 className="text-2xl font-black text-slate-900 mb-1">Write a Review</h1>
          <p className="text-sm text-slate-500">Share your experience to help other patients</p>
        </div>

        {/* Doctor Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm shrink-0">
              <img src={apt.doctor.image} alt={apt.doctor.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{apt.doctor.name}</p>
              <p className="text-sm text-slate-500">{apt.doctor.specialty}</p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {apt.doctor.hospital} · {apt.providerLocation}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">{apt.date} · {apt.time}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  apt.providerType === 'hospital' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  apt.providerType === 'clinic' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                  'bg-violet-50 text-violet-700 border-violet-200'
                }`}>
                  {apt.providerType === 'hospital' ? '🏥 Hospital' : apt.providerType === 'clinic' ? '🏪 Clinic' : '👨‍⚕️ Independent'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Overall Star Rating ──────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 text-center">
          <h2 className="font-bold text-slate-900 mb-4">How was your overall experience?</h2>
          <div className="flex items-center justify-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                onClick={() => setOverallRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                title={`Rate ${i} star${i > 1 ? 's' : ''}`}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-all duration-150 ${
                    i <= displayRating
                      ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                      : 'text-slate-200'
                  }`}
                />
              </button>
            ))}
          </div>
          {ratingLabel && (
            <p className={`text-sm font-bold ${ratingLabel.color}`}>
              {ratingLabel.emoji} {ratingLabel.label}
            </p>
          )}
        </div>

        {/* ── Category Ratings ─────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-slate-900 mb-4">Rate specific areas <span className="text-xs text-slate-400 font-normal">(optional)</span></h2>
          <div className="space-y-4">
            {CATEGORIES.map(cat => {
              const CatIcon = cat.icon;
              const rating = categoryRatings[cat.key] || 0;
              return (
                <div key={cat.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CatIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <button
                        key={i}
                        onClick={() => setCategoryRatings(prev => ({ ...prev, [cat.key]: i }))}
                        title={`Rate ${cat.label} ${i} star${i > 1 ? 's' : ''}`}
                      >
                        <Star className={`w-5 h-5 transition-colors ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Written Review ───────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-slate-900 mb-2">Write your review</h2>
          <p className="text-xs text-slate-400 mb-3">Write at least 20 characters to earn +15 bonus loyalty points</p>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with the doctor, their diagnosis, communication, and the overall visit..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 text-sm resize-none transition-all"
          />
          <div className="flex justify-between mt-2">
            <span className={`text-xs font-medium ${comment.length >= 20 ? 'text-emerald-600' : 'text-slate-400'}`}>
              {comment.length}/20 {comment.length >= 20 ? '✓' : 'min characters'}
            </span>
            <button
              onClick={() => setAnonymous(!anonymous)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                anonymous ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {anonymous ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {anonymous ? 'Anonymous' : 'Publish with name'}
            </button>
          </div>
        </div>

        {/* ── Points Preview ───────────────────────────────────────── */}
        {overallRating > 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-violet-600" />
              <p className="text-sm font-bold text-violet-800">Loyalty Points Preview</p>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-violet-700">Star rating submitted</span>
                <span className="font-bold text-violet-900">+10</span>
              </div>
              <div className="flex justify-between">
                <span className={hasDetailedReview ? 'text-violet-700' : 'text-violet-400'}>Detailed review (20+ chars)</span>
                <span className={`font-bold ${hasDetailedReview ? 'text-violet-900' : 'text-violet-300'}`}>+15</span>
              </div>
              <div className="flex justify-between">
                <span className={ratedCategories >= 4 ? 'text-violet-700' : 'text-violet-400'}>All categories rated</span>
                <span className={`font-bold ${ratedCategories >= 4 ? 'text-violet-900' : 'text-violet-300'}`}>+5</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-violet-200 font-bold text-violet-900">
                <span>Total</span>
                <span className="text-lg">+{totalPoints} pts</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Submit ───────────────────────────────────────────────── */}
        <button
          onClick={handleSubmit}
          disabled={overallRating === 0}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-sm shadow-violet-200/50 disabled:shadow-none flex items-center justify-center gap-2 text-sm"
        >
          <Send className="w-4 h-4" /> Submit Review & Earn {totalPoints} Points
        </button>

        <p className="text-[11px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Your review will be published after moderation
        </p>
      </div>
    </div>
  );
}
