'use client';
/* cSpell:words amara okonkwo Amara Okonkwo interventional catheterization Rakesh AIIMS Echocardiography Holter */

import React, { useState } from 'react';
import {
  Star, MapPin, Clock, Award, ShieldCheck, Languages, GraduationCap,
  Building2, CalendarDays, Video, ChevronRight, ThumbsUp, Share2,
  Heart, Phone, MessageSquare, Users, Check,
} from 'lucide-react';
import Link from 'next/link';
import { useRegion } from '@/lib/contexts/region-context';

// ─── Doctor Data (by slug) ──────────────────────────────────────────────────────
const DOCTORS: Record<string, { name: string; specialty: string; experience: string; qualifications: string; rating: number; ratingCount: number; languages: string; hospital: string; fee: number; videoFee: number; about: string; image: string }> = {
  'dr-amara-okonkwo': { name: 'Dr. Amara Okonkwo', specialty: 'General Physician', experience: '12 Years', qualifications: 'MBBS, MD (Internal Medicine)', rating: 4.8, ratingCount: 342, languages: 'English, Swahili', hospital: 'Mumbai Hospital', fee: 1500, videoFee: 800, about: 'Specialist in internal medicine and preventive healthcare with over 12 years of experience in managing chronic conditions.', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&q=80' },
  'dr-zara-ahmed': { name: 'Dr. Zara Ahmed', specialty: 'Pediatrician', experience: '8 Years', qualifications: 'MBBS, DCH (Pediatrics)', rating: 4.9, ratingCount: 289, languages: 'English, Arabic', hospital: 'Mumbai Hospital', fee: 2000, videoFee: 1200, about: 'Child health specialist with focus on developmental pediatrics and newborn care.', image: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=500&q=80' },
  'dr-james-ochieng': { name: 'Dr. Suresh Nair', specialty: 'Senior Cardiologist', experience: '15 Years', qualifications: 'MBBS, MD, DM (Cardiology)', rating: 4.9, ratingCount: 456, languages: 'English, Swahili', hospital: 'Aga Khan University Hospital', fee: 3000, videoFee: 2000, about: 'Senior interventional cardiologist with 15 years of experience in cardiac catheterization and angioplasty.', image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&q=80' },
  'dr-grace-wanjiku': { name: 'Dr. Grace Wanjiku', specialty: 'Dermatologist', experience: '6 Years', qualifications: 'MBBS, MD (Dermatology)', rating: 4.7, ratingCount: 198, languages: 'English, Swahili', hospital: 'HealthFirst Clinic', fee: 1200, videoFee: 700, about: 'Skin care specialist focused on cosmetic and medical dermatology, acne management, and laser treatments.', image: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=500&q=80' },
  'dr-raj-patel': { name: 'Dr. Raj Patel', specialty: 'Orthopedic Surgeon', experience: '10 Years', qualifications: 'MBBS, MS (Orthopedics)', rating: 4.6, ratingCount: 178, languages: 'English, Hindi, Swahili', hospital: 'MP Shah Hospital', fee: 2500, videoFee: 1500, about: 'Sports medicine and joint replacement specialist with experience in arthroscopic surgery.', image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&q=80' },
  'dr-fatima-hassan': { name: 'Dr. Fatima Hassan', specialty: 'Gynecologist & Obstetrician', experience: '9 Years', qualifications: 'MBBS, MD (OB/GYN)', rating: 4.8, ratingCount: 267, languages: 'English, Arabic, Swahili', hospital: 'Independent Practice', fee: 1800, videoFee: 1000, about: 'Women\'s health specialist with expertise in high-risk pregnancies and minimally invasive surgery.', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&q=80' },
};
const FALLBACK_DOCTOR = { name: 'Dr. Rahul Sharma', specialty: 'Senior Cardiologist', experience: '15 Years', qualifications: 'MBBS, MD (General Medicine), DM (Cardiology)', rating: 4.9, ratingCount: 428, languages: 'English, Hindi, Marathi', hospital: 'Apollo Hospital', fee: 1200, videoFee: 800, about: 'Renowned cardiologist with over 15 years of experience in preventive and interventional cardiology.', image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&q=80' };

const REVIEWS = [
  { id: 'r1', name: 'Sunita K.', rating: 5, date: '2 weeks ago', comment: 'Excellent doctor. Explained my condition thoroughly and made me feel at ease. Highly recommended!', verified: true },
  { id: 'r2', name: 'Rakesh M.', rating: 5, date: '1 month ago', comment: 'Very knowledgeable doctor. Wait time was minimal. The clinic was clean and well-maintained.', verified: true },
  { id: 'r3', name: 'Priya D.', rating: 4, date: '1 month ago', comment: 'Good experience overall. The staff was friendly and the consultation was detailed. Would visit again.', verified: false },
];

export default function DoctorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'location'>('overview');
  const [isFav, setIsFav] = useState(false);
  const doc = DOCTORS[slug] || FALLBACK_DOCTOR;
  const { formatCurrencyValue } = useRegion();

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen pb-24">

      {/* ── Doctor Header ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            {/* Photo */}
            <div className="relative shrink-0">
              <div className="w-28 h-28 md:w-40 md:h-40 rounded-2xl border-4 border-blue-50 shadow-lg overflow-hidden">
                <img
                  src={doc.image}
                  alt={doc.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-blue-600 to-teal-500 text-white p-2 rounded-xl border-3 border-white shadow-md">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">{doc.name}</h1>
                <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-wide flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              </div>

              <p className="text-base md:text-lg text-slate-600 font-medium mb-1 flex items-center gap-2">
                {doc.specialty}
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                {doc.experience} Experience
              </p>

              <p className="text-slate-500 mb-4 text-sm">{doc.qualifications}</p>

              <div className="flex flex-wrap gap-3 text-sm font-medium border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-amber-700">{doc.rating}</span>
                  <span className="text-amber-600 text-xs">({doc.ratingCount} Reviews)</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                  <Languages className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700 text-xs font-semibold">{doc.languages}</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 text-xs font-semibold">Top Doctor 2025</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setIsFav(!isFav)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    isFav ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                  {isFav ? 'Saved' : 'Save'}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 mt-6">

        {/* ── Tab Navigation ───────────────────────────────────────────── */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-8">
          {(['overview', 'reviews', 'location'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6">

          {/* ── Booking Cards ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Clinic Visit */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 className="w-24 h-24 text-blue-600" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-blue-50 text-blue-700 p-2 rounded-xl border border-blue-100"><Building2 className="w-5 h-5" /></span>
                  <h3 className="font-bold text-slate-900 text-lg">Clinic Visit</h3>
                </div>
                <p className="font-black text-2xl text-slate-900 mb-1">{formatCurrencyValue(doc.fee)}</p>
                <p className="text-sm text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{doc.hospital}</p>
                <p className="text-sm font-semibold text-emerald-600 mb-5 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Next slot: Today, 4:30 PM</p>
                <Link
                  href={`/doctor/book/${slug}?type=clinic`}
                  className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-center font-bold py-3 rounded-xl transition-all shadow-sm shadow-blue-200/50"
                >
                  Book Clinic Visit
                </Link>
              </div>
            </div>

            {/* Video Consult */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Video className="w-24 h-24 text-teal-600" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-teal-50 text-teal-700 p-2 rounded-xl border border-teal-100"><Video className="w-5 h-5" /></span>
                  <h3 className="font-bold text-slate-900 text-lg">Video Consultation</h3>
                </div>
                <p className="font-black text-2xl text-slate-900 mb-1">{formatCurrencyValue(doc.videoFee)}</p>
                <p className="text-sm text-slate-500 mb-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Secure encrypted call</p>
                <p className="text-sm font-semibold text-emerald-600 mb-5 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Available in 15 mins</p>
                <Link
                  href={`/doctor/book/${slug}?type=video`}
                  className="block w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white text-center font-bold py-3 rounded-xl transition-all shadow-sm shadow-teal-200/50"
                >
                  Book Video Consult
                </Link>
              </div>
            </div>
          </div>

          {/* ── Tab Content ──────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">About {doc.name}</h2>
                <p className="text-slate-600 leading-relaxed">
                  {doc.about}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-blue-600" /> Education
                  </h3>
                  <div className="space-y-4">
                    <div className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2.5 before:h-2.5 before:bg-blue-600 before:rounded-full">
                      <p className="font-bold text-slate-800 text-sm">DM - Cardiology</p>
                      <p className="text-xs text-slate-500">AIIMS, New Delhi (2012)</p>
                    </div>
                    <div className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2.5 before:h-2.5 before:bg-blue-400 before:rounded-full">
                      <p className="font-bold text-slate-800 text-sm">MD - General Medicine</p>
                      <p className="text-xs text-slate-500">KEM Hospital, Mumbai (2009)</p>
                    </div>
                    <div className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2.5 before:h-2.5 before:bg-blue-300 before:rounded-full">
                      <p className="font-bold text-slate-800 text-sm">MBBS</p>
                      <p className="text-xs text-slate-500">Grant Medical College, Mumbai (2006)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600" /> Working Hours
                  </h3>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-0">
                    {[
                      { day: 'Mon - Fri', time: '10:00 AM - 07:00 PM', active: true },
                      { day: 'Saturday', time: '10:00 AM - 02:00 PM', active: true },
                      { day: 'Sunday', time: 'Closed', active: false },
                    ].map((s, i) => (
                      <div key={i} className={`flex justify-between items-center py-3 ${i < 2 ? 'border-b border-slate-200' : ''}`}>
                        <span className={`text-sm font-semibold ${s.active ? 'text-slate-700' : 'text-red-500'}`}>{s.day}</span>
                        <span className={`text-sm ${s.active ? 'text-slate-600' : 'text-red-500 font-medium'}`}>{s.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Services */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Services Offered</h3>
                <div className="flex flex-wrap gap-2">
                  {['ECG', 'Echocardiography', 'Angiography', 'Stress Test', 'Holter Monitoring', 'Blood Pressure Management', 'Cholesterol Management', 'Heart Failure Treatment'].map((s) => (
                    <span key={s} className="text-xs font-medium bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-500" /> {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
              {/* Rating Summary */}
              <div className="flex items-center gap-6 mb-8 pb-6 border-b border-slate-100">
                <div className="text-center">
                  <p className="text-5xl font-black text-slate-900">4.9</p>
                  <div className="flex gap-0.5 mt-1 justify-center">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">428 reviews</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5,4,3,2,1].map(n => (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 w-3">{n}</span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-amber-400 rounded-full ${n === 5 ? 'w-[78%]' : n === 4 ? 'w-[15%]' : n === 3 ? 'w-[5%]' : 'w-[1%]'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-5">
                {REVIEWS.map((r) => (
                  <div key={r.id} className="pb-5 border-b border-slate-100 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                          {r.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{r.name}</p>
                          <p className="text-[11px] text-slate-400">{r.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />
                        ))}
                        {r.verified && (
                          <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">✓ Verified</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>
                    <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 mt-2 transition-colors">
                      <ThumbsUp className="w-3 h-3" /> Helpful
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" /> Clinic Location
              </h3>
              <div className="bg-slate-100 rounded-xl h-64 flex items-center justify-center mb-4">
                <div className="text-center text-slate-400">
                  <MapPin className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-semibold">Apollo Heart Center</p>
                  <p className="text-sm">Andheri West, Mumbai - 400053</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 font-bold py-3 rounded-xl text-sm border border-blue-100 hover:bg-blue-100 transition-colors">
                  <Phone className="w-4 h-4" /> Call Clinic
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-700 font-bold py-3 rounded-xl text-sm border border-slate-200 hover:bg-slate-100 transition-colors">
                  <MapPin className="w-4 h-4" /> Get Directions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
