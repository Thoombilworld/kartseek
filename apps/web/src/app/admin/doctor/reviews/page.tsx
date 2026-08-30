'use client';
import { useDoctorRegionFilter } from '@/hooks/useDoctorRegionFilter';
import { adminDoctorApi } from '@/lib/api/admin-doctor';

import React, { useState, useEffect } from 'react';
import {
  Star, Search, Filter, Trash2, Eye, EyeOff, Flag, CheckCircle,
  MessageSquare, AlertTriangle, TrendingUp, Users, BarChart3, XCircle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────
type ReviewStatus = 'published' | 'hidden' | 'flagged';

interface Review {
  id: string;
  patient: { name: string; avatar: string; email: string };
  doctor: { name: string; specialty: string };
  providerType: 'individual' | 'hospital' | 'clinic';
  providerName: string;
  providerLocation: string;
  rating: number;
  categories: { overall: number; communication: number; waitTime: number; cleanliness: number };
  comment: string;
  anonymous: boolean;
  date: string;
  status: ReviewStatus;
  loyaltyAwarded: number;
  appointmentId: string;
}

const MOCK_REVIEWS: Review[] = [
  {
    id: 'rev-001', patient: { name: 'John Kamau', avatar: '👨', email: 'john@example.com' },
    doctor: { name: 'Dr. Amara Okonkwo', specialty: 'General Physician' },
    providerType: 'individual', providerName: 'Mumbai Hospital', providerLocation: 'Mumbai, India',
    rating: 5, categories: { overall: 5, communication: 5, waitTime: 4, cleanliness: 5 },
    comment: 'Excellent doctor! Very thorough examination and clear explanations. The clinic was clean and well-maintained. Would highly recommend to anyone needing a general check-up.',
    anonymous: false, date: '2026-06-13', status: 'published', loyaltyAwarded: 30, appointmentId: 'apt-001',
  },
  {
    id: 'rev-002', patient: { name: 'Priya Patel', avatar: '👩', email: 'wanjiru@example.com' },
    doctor: { name: 'Dr. Sunil Kapoor', specialty: 'Cardiologist' },
    providerType: 'hospital', providerName: 'Apollo Heart & Multi-Speciality Hospital', providerLocation: 'Andheri, Mumbai',
    rating: 4, categories: { overall: 4, communication: 5, waitTime: 3, cleanliness: 4 },
    comment: 'Great cardiologist with deep knowledge. Wait time was a bit long but the consultation was worth it. Very professional and caring approach.',
    anonymous: false, date: '2026-06-12', status: 'published', loyaltyAwarded: 30, appointmentId: 'apt-002',
  },
  {
    id: 'rev-003', patient: { name: 'Anonymous Patient', avatar: '👤', email: 'anon@example.com' },
    doctor: { name: 'Dr. Meera Reddy', specialty: 'Dermatologist' },
    providerType: 'clinic', providerName: 'SkinFirst Dermatology Center', providerLocation: 'Andheri West, Mumbai',
    rating: 2, categories: { overall: 2, communication: 3, waitTime: 1, cleanliness: 2 },
    comment: 'Very disappointing. Had to wait over 2 hours and the consultation lasted barely 5 minutes. The clinic needs major improvements in cleanliness and time management.',
    anonymous: true, date: '2026-06-11', status: 'flagged', loyaltyAwarded: 25, appointmentId: 'apt-003',
  },
  {
    id: 'rev-004', patient: { name: 'Peter Oloo', avatar: '👨', email: 'peter@example.com' },
    doctor: { name: 'Dr. Zara Ahmed', specialty: 'Pediatrician' },
    providerType: 'individual', providerName: 'Mumbai Hospital', providerLocation: 'Mumbai, India',
    rating: 5, categories: { overall: 5, communication: 5, waitTime: 5, cleanliness: 5 },
    comment: 'Dr. Zara is amazing with kids! My daughter was scared at first but Dr. Zara made her comfortable immediately. Best pediatrician in Mumbai.',
    anonymous: false, date: '2026-06-10', status: 'published', loyaltyAwarded: 30, appointmentId: 'apt-004',
  },
  {
    id: 'rev-005', patient: { name: 'Sarah Njeri', avatar: '👩', email: 'sarah@example.com' },
    doctor: { name: 'Dr. Vikram Singh', specialty: 'Oncologist' },
    providerType: 'hospital', providerName: 'Fortis Memorial Research Institute', providerLocation: 'Gurgaon, Delhi NCR',
    rating: 1, categories: { overall: 1, communication: 2, waitTime: 1, cleanliness: 3 },
    comment: 'Terrible experience. The doctor was rude and dismissive. I will never go back. This is completely unacceptable behavior from a medical professional.',
    anonymous: false, date: '2026-06-09', status: 'hidden', loyaltyAwarded: 10, appointmentId: 'apt-005',
  },
  {
    id: 'rev-006', patient: { name: 'Ali Hassan', avatar: '👨', email: 'ali@example.com' },
    doctor: { name: 'Dr. Kavita Gupta', specialty: 'Gynecologist' },
    providerType: 'clinic', providerName: "FemCare Women's Health Clinic", providerLocation: 'JP Nagar, Bangalore',
    rating: 4, categories: { overall: 4, communication: 4, waitTime: 4, cleanliness: 5 },
    comment: 'Professional and empathetic. Made my wife feel very comfortable during the consultation. Good clinic facilities too.',
    anonymous: false, date: '2026-06-08', status: 'published', loyaltyAwarded: 30, appointmentId: 'apt-006',
  },
  {
    id: 'rev-007', patient: { name: 'Anonymous Patient', avatar: '👤', email: 'anon2@example.com' },
    doctor: { name: 'Dr. Vikram Patel', specialty: 'Pediatrician' },
    providerType: 'clinic', providerName: 'Little Stars Pediatric Clinic', providerLocation: 'Indiranagar, Bangalore',
    rating: 3, categories: { overall: 3, communication: 3, waitTime: 2, cleanliness: 4 },
    comment: 'Average experience. Nothing exceptional.',
    anonymous: true, date: '2026-06-07', status: 'published', loyaltyAwarded: 10, appointmentId: 'apt-007',
  },
];

const STATUS_CONFIG: Record<ReviewStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  published: { label: 'Published', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
  hidden: { label: 'Hidden', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200', icon: EyeOff },
  flagged: { label: 'Flagged', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Flag },
};

export default function AdminReviewsPage() {
  const { regionLabel, isFiltered, formatPrice } = useDoctorRegionFilter([]);
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [deleteModal, setDeleteModal] = useState<string | null>(null);

  // Stats
  const published = reviews.filter(r => r.status === 'published').length;
  const flagged = reviews.filter(r => r.status === 'flagged').length;
  const hidden = reviews.filter(r => r.status === 'hidden').length;
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0.0';

  // Filtered list
  const filtered = reviews.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (ratingFilter !== 'all' && r.rating !== ratingFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.patient.name.toLowerCase().includes(q) ||
             r.doctor.name.toLowerCase().includes(q) ||
             r.comment.toLowerCase().includes(q);
    }
    return true;
  });

  const updateStatus = (id: string, status: ReviewStatus) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const deleteReview = (id: string) => {
    setReviews(prev => prev.filter(r => r.id !== id));
    setDeleteModal(null);
  };

  return (<div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Review Management</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor, moderate, and manage patient reviews across all doctors</p>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-bold text-slate-500 uppercase">Total Reviews</p>
          </div>
          <p className="text-2xl font-black text-slate-900">{reviews.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <p className="text-xs font-bold text-slate-500 uppercase">Avg Rating</p>
          </div>
          <p className="text-2xl font-black text-amber-600">{avgRating}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-bold text-slate-500 uppercase">Flagged</p>
          </div>
          <p className="text-2xl font-black text-amber-600">{flagged}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <EyeOff className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase">Hidden</p>
          </div>
          <p className="text-2xl font-black text-slate-500">{hidden}</p>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient, doctor, or comment..."
              className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReviewStatus | 'all')}
          aria-label="Filter by review status"
          className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:border-blue-400"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="flagged">Flagged</option>
          <option value="hidden">Hidden</option>
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          aria-label="Filter by star rating"
          className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:border-blue-400"
        >
          <option value="all">All Ratings</option>
          <option value={5}>⭐ 5 Stars</option>
          <option value={4}>⭐ 4 Stars</option>
          <option value={3}>⭐ 3 Stars</option>
          <option value={2}>⭐ 2 Stars</option>
          <option value={1}>⭐ 1 Star</option>
        </select>
      </div>

      {/* ── Reviews List ────────────────────────────────────────────── */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <span className="text-4xl mb-3 block">📝</span>
            <p className="font-bold text-slate-900 mb-1">No reviews found</p>
            <p className="text-sm text-slate-500">Try adjusting your filters</p>
          </div>
        ) : (
          filtered.map(review => {
            const status = STATUS_CONFIG[review.status];
            const StatusIcon = status.icon;
            return (
              <div key={review.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden ${
                review.status === 'flagged' ? 'border-amber-300' : review.status === 'hidden' ? 'border-slate-300 opacity-70' : 'border-slate-200'
              }`}>
                {/* Header */}
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{review.patient.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 text-sm">
                          {review.anonymous ? 'Anonymous Patient' : review.patient.name}
                        </p>
                        {review.anonymous && (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">ANON</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">→ {review.doctor.name} ({review.doctor.specialty})</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-400">{review.providerName} · {review.providerLocation}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          review.providerType === 'hospital' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          review.providerType === 'clinic' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                          'bg-violet-50 text-violet-700 border-violet-200'
                        }`}>
                          {review.providerType === 'hospital' ? '🏥 Hospital' : review.providerType === 'clinic' ? '🏪 Clinic' : '👨‍⚕️ Independent'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Rating */}
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                    {/* Status */}
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border flex items-center gap-1 ${status.bg} ${status.color}`}>
                      <StatusIcon className="w-3 h-3" /> {status.label}
                    </span>
                  </div>
                </div>

                {/* Comment */}
                <div className="px-5 pb-3">
                  <p className="text-sm text-slate-700 leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
                </div>

                {/* Category Breakdown */}
                <div className="px-5 pb-3 flex flex-wrap gap-2">
                  {Object.entries(review.categories).map(([key, val]) => (
                    <span key={key} className="text-[10px] font-medium bg-slate-50 text-slate-600 px-2 py-1 rounded-md flex items-center gap-1">
                      {key === 'overall' ? '👍' : key === 'communication' ? '💬' : key === 'waitTime' ? '⏰' : '✨'}
                      {key.replace(/([A-Z])/g, ' $1').trim()}: {val}/5
                    </span>
                  ))}
                  <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-md">
                    +{review.loyaltyAwarded} pts
                  </span>
                </div>

                {/* Actions */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <p className="text-xs text-slate-400">{review.patient.email}</p>
                  <div className="flex gap-2">
                    {review.status !== 'flagged' && (
                      <button
                        onClick={() => updateStatus(review.id, 'flagged')}
                        className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        <Flag className="w-3 h-3" /> Flag
                      </button>
                    )}
                    {review.status === 'published' && (
                      <button
                        onClick={() => updateStatus(review.id, 'hidden')}
                        className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <EyeOff className="w-3 h-3" /> Hide
                      </button>
                    )}
                    {review.status === 'hidden' && (
                      <button
                        onClick={() => updateStatus(review.id, 'published')}
                        className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        <Eye className="w-3 h-3" /> Publish
                      </button>
                    )}
                    {review.status === 'flagged' && (
                      <button
                        onClick={() => updateStatus(review.id, 'published')}
                        className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteModal(review.id)}
                      className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Delete Confirmation Modal ────────────────────────────── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm mx-4 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Delete Review?</h3>
            <p className="text-sm text-slate-500 mb-5">This action is permanent and cannot be undone. The patient&apos;s loyalty points from this review will be retained.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteReview(deleteModal)}
                className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-red-700 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
