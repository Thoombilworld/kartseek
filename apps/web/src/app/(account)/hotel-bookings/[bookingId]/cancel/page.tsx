'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, XCircle, Shield, Check, CalendarDays, CreditCard, MessageSquare } from 'lucide-react';

export default function CancelBookingPage() {
  const { bookingId } = useParams();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const reasons = ['Change of plans', 'Found a better deal', 'Travel restrictions', 'Personal emergency', 'Weather conditions', 'Other'];

  if (cancelled) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><XCircle className="w-8 h-8 text-red-500" /></div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Booking Cancelled</h1>
          <p className="text-sm text-slate-500 mb-6">Your refund of AED 1,046 will be processed within 1-3 business days.</p>
          <Link href="/hotel-bookings" className="block w-full bg-rose-600 text-white font-bold py-4 rounded-2xl hover:bg-rose-700 transition-colors">Back to My Bookings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href={`/hotel-bookings/${bookingId}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-lg font-bold text-slate-900">Cancel Booking</h1>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Are you sure you want to cancel?</p>
            <p className="text-xs text-red-600 mt-1">This action cannot be undone. Please review the refund details below.</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-3">Refund Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Booking Total</span><span>AED 1,046</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Cancellation Fee</span><span className="text-emerald-600 font-medium">FREE (within policy)</span></div>
            <div className="flex justify-between pt-2 border-t border-slate-100 font-bold"><span>Refund Amount</span><span className="text-emerald-600">AED 1,046</span></div>
          </div>
          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1"><Shield className="w-3 h-3" /> Free cancellation until Jun 30, 2026</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-3">Reason for Cancellation</h3>
          <div className="space-y-2">{reasons.map(r => (<label key={r} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${reason === r ? 'border-rose-500 bg-rose-50' : 'border-slate-100 hover:border-slate-200'}`}><input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="hidden" /><div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${reason === r ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`}>{reason === r && <div className="w-2 h-2 bg-white rounded-full" />}</div><span className="text-sm text-slate-700">{r}</span></label>))}</div>
        </div>
        <label className="flex items-center gap-2 px-1 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
          <span className="text-xs text-slate-600">I confirm I want to cancel this booking and agree to the refund terms</span>
        </label>
        <button onClick={() => setCancelled(true)} disabled={!confirmed || !reason} className={`w-full font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 ${confirmed && reason ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
          <XCircle className="w-4 h-4" /> Cancel Booking
        </button>
      </div>
    </div>
  );
}
