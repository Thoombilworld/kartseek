'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Gift, Star, ArrowLeft, Trophy, ChevronRight, Sparkles,
  Target, TrendingUp, Clock, CheckCircle, Award, Heart,
  Calendar, Stethoscope, MessageSquare, Zap, Crown,
  ShieldCheck, ArrowRight, Ticket,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────────
interface PointTransaction {
  id: string;
  title: string;
  description: string;
  points: number;
  type: 'earned' | 'redeemed';
  date: string;
  icon: string;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: string;
  icon: string;
  available: boolean;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────────

const TIER_INFO = {
  current: 'Wellness Member',
  icon: '🌟',
  color: 'from-indigo-500 to-violet-600',
  nextTier: 'Silver Wellness',
  nextTierIcon: '🥈',
  pointsToNext: 180,
  progress: 64,
};

const POINTS_HISTORY: PointTransaction[] = [
  { id: 'pt-001', title: 'Appointment Booking', description: 'Dr. Amara Okonkwo — General Physician', points: 25, type: 'earned', date: 'Jun 14, 2026', icon: '📅' },
  { id: 'pt-002', title: 'Review Submitted', description: 'Reviewed Dr. Meera Reddy — 5 stars', points: 30, type: 'earned', date: 'Jun 11, 2026', icon: '⭐' },
  { id: 'pt-003', title: 'Appointment Booking', description: 'Dr. Sunil Kapoor — Cardiologist', points: 25, type: 'earned', date: 'Jun 10, 2026', icon: '📅' },
  { id: 'pt-004', title: 'Redeemed: Free Video Consult', description: 'Used 200 pts for free video consultation', points: -200, type: 'redeemed', date: 'Jun 8, 2026', icon: '🎁' },
  { id: 'pt-005', title: 'Referral Bonus', description: 'Friend joined using your referral code', points: 50, type: 'earned', date: 'Jun 5, 2026', icon: '👥' },
  { id: 'pt-006', title: 'Appointment Booking', description: 'Dr. Zara Ahmed — Pediatrician', points: 25, type: 'earned', date: 'Jun 1, 2026', icon: '📅' },
  { id: 'pt-007', title: 'Health Checkup Bonus', description: 'Completed annual health screening', points: 100, type: 'earned', date: 'May 25, 2026', icon: '🏥' },
  { id: 'pt-008', title: 'Review Submitted', description: 'Reviewed Dr. Vikram Singh — 4 stars', points: 25, type: 'earned', date: 'May 20, 2026', icon: '⭐' },
];

const EARN_METHODS = [
  { icon: '📅', label: 'Book Appointment', points: '+25 pts', description: 'Earn points for every booking' },
  { icon: '⭐', label: 'Write a Review', points: '+10-30 pts', description: 'Star rating + detailed review' },
  { icon: '👥', label: 'Refer a Friend', points: '+50 pts', description: 'When they complete first booking' },
  { icon: '🏥', label: 'Health Checkup', points: '+100 pts', description: 'Complete annual screening' },
  { icon: '📋', label: 'Upload Records', points: '+5 pts', description: 'Digitize your medical history' },
  { icon: '🔁', label: 'Follow-up Visit', points: '+15 pts', description: 'Return to the same doctor' },
];

const AVAILABLE_REWARDS: Reward[] = [
  { id: 'rw-001', title: 'Free Video Consultation', description: 'Redeem for one free video consult with any doctor', pointsCost: 200, category: 'Consultation', icon: '📹', available: true },
  { id: 'rw-002', title: '₹100 Off Next Booking', description: 'Flat ₹100 discount on your next appointment', pointsCost: 100, category: 'Discount', icon: '🏷️', available: true },
  { id: 'rw-003', title: 'Priority Queue Access', description: 'Skip the waiting queue for one appointment', pointsCost: 150, category: 'Premium', icon: '⚡', available: true },
  { id: 'rw-004', title: 'Free Lab Test (CBC)', description: 'Complete blood count test at partner labs', pointsCost: 300, category: 'Health', icon: '🧬', available: false },
  { id: 'rw-005', title: '₹250 Off Health Checkup', description: 'Discount on full-body health screening', pointsCost: 250, category: 'Health', icon: '🩺', available: true },
  { id: 'rw-006', title: 'Exclusive Doctor Access', description: '1-on-1 session with top-rated specialist', pointsCost: 500, category: 'Premium', icon: '👑', available: false },
];

const CURRENT_POINTS = 320;

// ─── Component ───────────────────────────────────────────────────────────────────

export default function WellnessRewardsPage() {
  const [activeTab, setActiveTab] = useState<'rewards' | 'history' | 'earn'>('rewards');

  return (
    <div className="min-h-screen bg-linear-to-b from-indigo-50/40 via-white to-slate-50 pb-20">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 text-white px-4 pt-6 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-3xl" />
        <div className="absolute bottom-0 left-10 w-32 h-32 bg-white/5 rounded-full translate-y-10 blur-2xl" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Link href="/my-profile" className="inline-flex items-center gap-1 text-indigo-200 hover:text-white text-sm font-medium mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Profile
          </Link>
          <h1 className="text-2xl font-black mb-1 flex items-center gap-2">
            <Gift className="w-6 h-6" /> Wellness Rewards
          </h1>
          <p className="text-indigo-200 text-sm">Earn points on every health action, redeem for exclusive rewards</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-14 relative z-10">

        {/* ── Points Hero Card ────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{TIER_INFO.icon}</span>
                <div>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{TIER_INFO.current}</p>
                  <p className="text-4xl font-black text-slate-900">{CURRENT_POINTS} <span className="text-lg text-slate-400 font-bold">pts</span></p>
                </div>
              </div>
              <p className="text-xs text-slate-400">≈ ₹{(CURRENT_POINTS * 0.10).toFixed(0)} redeemable value</p>
            </div>

            {/* Tier Progress */}
            <div className="flex-1 max-w-xs">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700">{TIER_INFO.current} {TIER_INFO.icon}</span>
                <span className="font-bold text-slate-500">{TIER_INFO.nextTierIcon} {TIER_INFO.nextTier}</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                  style={{ width: `${TIER_INFO.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 text-right">{TIER_INFO.pointsToNext} pts to next tier</p>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ─────────────────────────────────────── */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {([
            { key: 'rewards' as const, label: '🎁 Redeem Rewards' },
            { key: 'earn' as const, label: '💰 How to Earn' },
            { key: 'history' as const, label: '📊 Points History' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Rewards Tab ─────────────────────────────────────────── */}
        {activeTab === 'rewards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_REWARDS.map(reward => {
              const canRedeem = CURRENT_POINTS >= reward.pointsCost && reward.available;
              return (
                <div key={reward.id} className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                  !reward.available ? 'opacity-60 border-slate-200' : canRedeem ? 'border-indigo-200 hover:shadow-md' : 'border-slate-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{reward.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{reward.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{reward.description}</p>
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {reward.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1.5">
                          <Gift className="w-4 h-4 text-indigo-500" />
                          <span className="font-black text-indigo-700">{reward.pointsCost} pts</span>
                        </div>
                        <button
                          disabled={!canRedeem}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                            canRedeem
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {!reward.available ? 'Coming Soon' : canRedeem ? 'Redeem Now' : `Need ${reward.pointsCost - CURRENT_POINTS} more pts`}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Earn Tab ─────────────────────────────────────────────── */}
        {activeTab === 'earn' && (
          <div className="space-y-3">
            {EARN_METHODS.map(method => (
              <div key={method.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-xl shrink-0">
                  {method.icon}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">{method.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{method.description}</p>
                </div>
                <span className="text-sm font-black text-indigo-600 whitespace-nowrap bg-indigo-50 px-3 py-1.5 rounded-lg">
                  {method.points}
                </span>
              </div>
            ))}

            {/* Referral CTA */}
            <div className="bg-linear-to-r from-violet-500 to-indigo-600 rounded-2xl p-5 text-white mt-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="font-black text-lg mb-1">Refer & Earn 50 pts</p>
                  <p className="text-violet-200 text-sm">Share your referral code with friends</p>
                  <div className="mt-3 bg-white/20 backdrop-blur rounded-lg px-4 py-2 inline-flex items-center gap-2">
                    <span className="font-mono font-bold text-sm tracking-wider">KARTWELL-JD2026</span>
                    <button className="text-xs bg-white/20 px-2 py-1 rounded font-bold hover:bg-white/30 transition-colors">Copy</button>
                  </div>
                </div>
                <span className="text-5xl opacity-50">👥</span>
              </div>
            </div>
          </div>
        )}

        {/* ── History Tab ─────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            {POINTS_HISTORY.map(tx => (
              <div key={tx.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  tx.type === 'earned' ? 'bg-emerald-50' : 'bg-rose-50'
                }`}>
                  {tx.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{tx.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{tx.description}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{tx.date}</p>
                </div>
                <span className={`font-black text-sm whitespace-nowrap ${
                  tx.type === 'earned' ? 'text-emerald-600' : 'text-rose-500'
                }`}>
                  {tx.type === 'earned' ? '+' : ''}{tx.points} pts
                </span>
              </div>
            ))}

            {/* Summary */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-bold text-indigo-900">Total Earned</span>
              </div>
              <span className="text-lg font-black text-indigo-700">
                +{POINTS_HISTORY.filter(t => t.type === 'earned').reduce((s, t) => s + t.points, 0)} pts
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
