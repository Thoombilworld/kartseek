'use client';
import React from 'react';
import { Star, MessageCircle } from 'lucide-react';
const reviews=[
  {id:'REV-001',guest:'Sarah K.',rating:5,comment:'Absolutely stunning hotel! The service was impeccable.',date:'Jun 1, 2026',stayType:'Couple',reply:'Thank you, Sarah! We look forward to welcoming you again.'},
  {id:'REV-002',guest:'Amit P.',rating:4,comment:'Great location and clean rooms. The breakfast could use more variety.',date:'May 28, 2026',stayType:'Business',reply:null},
  {id:'REV-003',guest:'Maria L.',rating:5,comment:'The pool area is gorgeous and the spa was divine.',date:'May 20, 2026',stayType:'Family',reply:'Thank you for your kind words, Maria!'},
];
export default function OwnerReviewsPage(){
  return(<div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Guest Reviews</h1><p className="text-slate-500 text-sm">Read and respond to customer feedback.</p></div>
    <div className="flex items-center gap-4 bg-amber-50 border border-amber-100 rounded-xl p-4"><Star className="w-8 h-8 text-amber-500 fill-amber-500"/><div><p className="text-2xl font-black text-amber-700">4.8</p><p className="text-xs text-amber-600">Average from {reviews.length} reviews</p></div></div>
    <div className="space-y-4">{reviews.map(r=>(
      <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div><p className="font-bold text-slate-900">{r.guest}</p><p className="text-xs text-slate-400">{r.stayType} · {r.date}</p></div>
          <div className="flex gap-0.5">{Array.from({length:5}).map((_,i)=><Star key={i} className={`w-4 h-4 ${i<r.rating?'text-amber-400 fill-amber-400':'text-slate-200'}`}/>)}</div>
        </div>
        <p className="text-sm text-slate-600 mb-3">{r.comment}</p>
        {r.reply?<div className="bg-slate-50 rounded-lg p-3 border-l-2 border-rose-300"><p className="text-[10px] font-bold text-slate-400 mb-1">YOUR REPLY</p><p className="text-sm text-slate-600">{r.reply}</p></div>
        :<button className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5"/>Write Reply</button>}
      </div>
    ))}</div>
  </div>);
}
