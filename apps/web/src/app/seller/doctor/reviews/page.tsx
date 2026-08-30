'use client';
import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';
import { vendorDoctorApi } from '@/lib/api/vendor-doctor';

const REVIEWS = [
  { id: 'r1', patient: 'John Kimani', rating: 5, comment: 'Excellent consultation. Dr. Okonkwo was very thorough and professional. Highly recommended!', date: 'Jun 14, 2026', verified: true, reply: null },
  { id: 'r2', patient: 'Sarah Mwangi', rating: 4, comment: 'Good experience overall. Wait time could be improved but the consultation was detailed.', date: 'Jun 12, 2026', verified: true, reply: 'Thank you Sarah! We are working on reducing wait times.' },
  { id: 'r3', patient: 'David Mishra', rating: 5, comment: 'Best doctor I have visited. Very patient and explains everything clearly.', date: 'Jun 10, 2026', verified: true, reply: null },
  { id: 'r4', patient: 'Grace Njeri', rating: 5, comment: 'Amazing doctor! She really cares about her patients.', date: 'Jun 8, 2026', verified: true, reply: null },
  { id: 'r5', patient: 'Ali Mohamed', rating: 3, comment: 'Decent consultation but I expected more detailed explanation of my condition.', date: 'Jun 5, 2026', verified: false, reply: null },
  { id: 'r6', patient: 'Mary Wambui', rating: 5, comment: 'Outstanding service. Follow-up was great too.', date: 'Jun 3, 2026', verified: true, reply: 'Thank you Mary! Happy to help.' },
];

const avg = (REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length).toFixed(1);
const dist = [5,4,3,2,1].map(r => ({ stars: r, count: REVIEWS.filter(rv => rv.rating === r).length, pct: Math.round(REVIEWS.filter(rv => rv.rating === r).length / REVIEWS.length * 100) }));

export default function ReviewsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Star className="w-6 h-6 text-amber-500" /> Reviews & Ratings</h1><p className="text-sm text-slate-500 mt-1">See what your patients say about you</p></div>
      {/* Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row gap-8">
        <div className="text-center md:text-left shrink-0">
          <p className="text-5xl font-black text-slate-900">{avg}</p>
          <div className="flex items-center justify-center md:justify-start gap-0.5 mt-1">{Array.from({length:5}).map((_,i) => <Star key={i} className={`w-5 h-5 ${i < Math.round(+avg) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}</div>
          <p className="text-sm text-slate-500 mt-1">{REVIEWS.length} reviews</p>
        </div>
        <div className="flex-1 space-y-2">
          {dist.map(d => (
            <div key={d.stars} className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 w-8">{d.stars}★</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5"><div className="bg-amber-400 h-2.5 rounded-full transition-all" style={{width:`${d.pct}%`}} /></div>
              <span className="text-xs font-bold text-slate-600 w-8 text-right">{d.count}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Review List */}
      <div className="space-y-4">
        {REVIEWS.map(r => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2"><span className="font-bold text-slate-900">{r.patient}</span>{r.verified && <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-blue-100">Verified</span>}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">{r.date}</p>
              </div>
              <div className="flex items-center gap-0.5">{Array.from({length:5}).map((_,i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}</div>
            </div>
            <p className="text-sm text-slate-700 mb-3">{r.comment}</p>
            {r.reply && <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 ml-6"><p className="text-[10px] font-bold text-violet-600 mb-1">Your Reply</p><p className="text-xs text-slate-700">{r.reply}</p></div>}
            {!r.reply && <button className="text-xs font-bold text-violet-600 flex items-center gap-1 hover:text-violet-700 transition-colors"><MessageSquare className="w-3.5 h-3.5" /> Reply to Review</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
