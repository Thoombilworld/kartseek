'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search, Star, Clock, MapPin, Filter, ChevronDown,
  Stethoscope, Heart, Brain, Eye, Bone, Baby,
  Shield, Video, Calendar, X, SlidersHorizontal,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  experience: number;
  rating: number;
  reviews: number;
  fee: number;
  currency: string;
  available: string;
  avatar: string;
  videoConsult: boolean;
  gender: 'Male' | 'Female';
  languages: string[];
}

/* ── Mock Data ─────────────────────────────────────────────────────────── */

const SPECIALTIES = [
  { id: 'all', label: 'All', icon: Stethoscope },
  { id: 'general', label: 'General', icon: Stethoscope },
  { id: 'cardiology', label: 'Cardiology', icon: Heart },
  { id: 'neurology', label: 'Neurology', icon: Brain },
  { id: 'ophthalmology', label: 'Eye', icon: Eye },
  { id: 'orthopedics', label: 'Orthopedics', icon: Bone },
  { id: 'pediatrics', label: 'Pediatrics', icon: Baby },
];

const DOCTORS: Doctor[] = [
  { id: 'doc-001', name: 'Dr. Amina Khan', specialty: 'General Physician', hospital: 'Mumbai Hospital', experience: 12, rating: 4.9, reviews: 284, fee: 3500, currency: '₹', available: 'Today, 2:30 PM', avatar: 'AK', videoConsult: true, gender: 'Female', languages: ['English', 'Hindi'] },
  { id: 'doc-002', name: 'Dr. Rajesh Mehta', specialty: 'Cardiologist', hospital: 'Aga Khan University Hospital', experience: 18, rating: 4.8, reviews: 521, fee: 6000, currency: '₹', available: 'Tomorrow, 9:00 AM', avatar: 'RM', videoConsult: true, gender: 'Male', languages: ['English', 'Hindi'] },
  { id: 'doc-003', name: 'Dr. Sunita Sharma', specialty: 'Pediatrician', hospital: 'Kokilaben Hospital', experience: 10, rating: 4.9, reviews: 398, fee: 4000, currency: '₹', available: 'Today, 4:00 PM', avatar: 'WN', videoConsult: true, gender: 'Female', languages: ['English', 'Hindi'] },
  { id: 'doc-004', name: 'Dr. Ahmed Hassan', specialty: 'Orthopedic Surgeon', hospital: 'MP Shah Hospital', experience: 15, rating: 4.7, reviews: 156, fee: 5500, currency: '₹', available: 'Wed, Jun 19, 10:00 AM', avatar: 'AH', videoConsult: false, gender: 'Male', languages: ['English', 'Arabic'] },
  { id: 'doc-005', name: 'Dr. Grace Mathew', specialty: 'Dermatologist', hospital: 'Mumbai Hospital', experience: 8, rating: 4.8, reviews: 203, fee: 4500, currency: '₹', available: 'Today, 3:00 PM', avatar: 'GM', videoConsult: true, gender: 'Female', languages: ['English', 'Hindi'] },
  { id: 'doc-006', name: 'Dr. Rakesh Nair', specialty: 'Neurologist', hospital: 'KEM Hospital', experience: 20, rating: 4.6, reviews: 142, fee: 7000, currency: '₹', available: 'Tomorrow, 11:00 AM', avatar: 'PO', videoConsult: false, gender: 'Male', languages: ['English', 'Hindi'] },
  { id: 'doc-007', name: 'Dr. Fatima Shaikh', specialty: 'Ophthalmologist', hospital: 'Sankara Eye Hospital', experience: 14, rating: 4.9, reviews: 310, fee: 3800, currency: '₹', available: 'Today, 5:30 PM', avatar: 'FR', videoConsult: true, gender: 'Female', languages: ['English', 'Hindi', 'Arabic'] },
  { id: 'doc-008', name: 'Dr. Deepak Kumar', specialty: 'General Physician', hospital: 'Breach Candy Hospital', experience: 6, rating: 4.5, reviews: 89, fee: 2500, currency: '₹', available: 'Today, 1:00 PM', avatar: 'DK', videoConsult: true, gender: 'Male', languages: ['English', 'Hindi'] },
];

type SortOption = 'relevance' | 'rating' | 'fee-low' | 'fee-high' | 'experience';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'fee-low', label: 'Fee: Low to High' },
  { value: 'fee-high', label: 'Fee: High to Low' },
  { value: 'experience', label: 'Most Experienced' },
];

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function DoctorSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
  const [videoOnly, setVideoOnly] = useState(false);
  const [maxFee, setMaxFee] = useState(10000);
  const { formatCurrencyValue } = useRegion();

  let filtered = DOCTORS.filter((d) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!d.name.toLowerCase().includes(q) && !d.specialty.toLowerCase().includes(q) && !d.hospital.toLowerCase().includes(q)) return false;
    }
    if (activeSpecialty !== 'all') {
      if (!d.specialty.toLowerCase().includes(activeSpecialty)) return false;
    }
    if (genderFilter !== 'all' && d.gender !== genderFilter) return false;
    if (videoOnly && !d.videoConsult) return false;
    if (d.fee > maxFee) return false;
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'rating': return b.rating - a.rating;
      case 'fee-low': return a.fee - b.fee;
      case 'fee-high': return b.fee - a.fee;
      case 'experience': return b.experience - a.experience;
      default: return b.reviews - a.reviews;
    }
  });

  const activeFilterCount = [genderFilter !== 'all', videoOnly, maxFee < 10000].filter(Boolean).length;

  return (<div className="min-h-screen bg-slate-50">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-linear-to-r from-rose-600 via-pink-600 to-fuchsia-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
          <h1 className="text-3xl sm:text-4xl font-black mb-1">Find a <span className="text-rose-200">Doctor</span></h1>
          <p className="text-rose-200 text-sm">Search from top specialists and book an appointment instantly.</p>

          {/* Search Bar */}
          <div className="mt-6 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor name, specialty, or hospital..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-slate-900 text-sm placeholder-slate-400 outline-none focus:ring-4 focus:ring-white/30 shadow-lg transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-2 pb-12">
        {/* ── Specialty Chips + Sort ───────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-1">
              {SPECIALTIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSpecialty(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                    activeSpecialty === s.id
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 outline-none cursor-pointer"
                aria-label="Sort doctors"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="border-t border-slate-100 pt-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gender</label>
                  <div className="flex gap-2">
                    {(['all', 'Male', 'Female'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGenderFilter(g)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          genderFilter === g ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {g === 'all' ? 'Any' : g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Consultation</label>
                  <button
                    onClick={() => setVideoOnly(!videoOnly)}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      videoOnly ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" /> Video consult only
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Max Fee: {formatCurrencyValue(maxFee)}
                  </label>
                  <input
                    type="range"
                    min={1000}
                    max={10000}
                    step={500}
                    value={maxFee}
                    onChange={(e) => setMaxFee(Number(e.target.value))}
                    className="w-full accent-rose-600"
                    aria-label="Maximum consultation fee"
                  />
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setGenderFilter('all'); setVideoOnly(false); setMaxFee(10000); }}
                  className="mt-3 text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Results Count ───────────────────────────────────────── */}
        <p className="text-sm text-slate-500 mb-4">{filtered.length} doctor{filtered.length !== 1 ? 's' : ''} found</p>

        {/* ── Doctor Cards ────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">No doctors found</h3>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((doc) => (
              <Link
                key={doc.id}
                href={`/doctor/profile/${doc.id}`}
                className="block bg-white border border-slate-200 rounded-2xl hover:border-rose-300 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg shadow-rose-500/20">
                      {doc.avatar}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition-colors">{doc.name}</h3>
                          <p className="text-xs text-rose-600 font-semibold mt-0.5">{doc.specialty}</p>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {doc.hospital}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-black text-slate-900">{formatCurrencyValue(doc.fee)}</p>
                          <p className="text-[10px] text-slate-400">per consultation</p>
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {doc.rating}
                          <span className="text-slate-400 font-normal">({doc.reviews})</span>
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-slate-400" /> {doc.experience} yrs exp.
                        </span>
                        {doc.videoConsult && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                            <Video className="w-3 h-3" /> Video
                          </span>
                        )}
                        <span className="ml-auto text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {doc.available}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
