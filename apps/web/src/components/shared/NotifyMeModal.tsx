'use client';

import React, { useState } from 'react';
import { X, Bell, Mail, Phone, CheckCircle, MapPin } from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
interface NotifyMeModalProps {
  pincode: string;
  onClose: () => void;
  onSubmit: (data: { email: string; phone?: string; pincode: string }) => void;
}

/**
 * NotifyMeModal — shown when a pincode is found unserviceable.
 * Captures the customer's email (+ optional phone) so operations
 * can track demand and notify them when zone becomes active.
 */
export default function NotifyMeModal({ pincode, onClose, onSubmit }: NotifyMeModalProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onSubmit({ email: email.trim(), phone: phone.trim() || undefined, pincode });
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10">
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <>
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-6 py-8 text-white text-center">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur">
                <Bell className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black">Get Notified</h2>
              <p className="text-blue-100 text-sm mt-1.5">
                We&apos;ll let you know when we start delivering to
              </p>
              <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-4 py-1.5 mt-2.5 backdrop-blur-sm">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-mono font-bold text-sm">{pincode}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Phone (optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!email.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm shadow-md"
              >
                <Bell className="w-4 h-4" /> Notify Me When Available
              </button>

              <p className="text-[10px] text-slate-400 text-center">
                We&apos;ll only use your email to notify you about delivery availability for this area.
              </p>
            </form>
          </>
        ) : (
          /* Success state */
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900">You&apos;re on the list!</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
              We&apos;ll send an update to <span className="font-bold text-slate-700">{email}</span> when delivery starts for pincode <span className="font-mono font-bold text-slate-700">{pincode}</span>.
            </p>
            <button
              onClick={onClose}
              className="mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
