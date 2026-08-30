'use client';
import React from 'react';
import Link from 'next/link';
import { XCircle, RefreshCw, CreditCard, Phone, MessageSquare, Shield, AlertTriangle } from 'lucide-react';

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Error Icon */}
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>

          <h1 className="text-2xl font-black text-slate-900 mb-2">Payment Failed</h1>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            We were unable to process your payment. Your reservation has not been confirmed and you have not been charged.
          </p>

          {/* Reason Box */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">Possible Reasons</p>
                <ul className="text-xs text-red-600 mt-2 space-y-1.5">
                  <li>• Insufficient funds in your account</li>
                  <li>• Card declined by your bank</li>
                  <li>• 3D Secure verification failed</li>
                  <li>• Network timeout or connectivity issue</li>
                </ul>
              </div>
            </div>
          </div>

          {/* What to do */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6 text-left">
            <h3 className="font-bold text-slate-900 text-sm mb-3">What You Can Do</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Try Again</p>
                  <p className="text-xs text-slate-400">Retry the same payment method</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Use a Different Card</p>
                  <p className="text-xs text-slate-400">Switch to another payment method</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Contact Your Bank</p>
                  <p className="text-xs text-slate-400">Your bank may have blocked the transaction</p>
                </div>
              </div>
            </div>
          </div>

          {/* Protection */}
          <div className="flex items-center gap-2 justify-center text-xs text-emerald-600 mb-6">
            <Shield className="w-4 h-4" />
            <span className="font-medium">You have NOT been charged. Your room is still available.</span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link href="/hotel-booking" className="w-full bg-rose-600 text-white font-bold py-4 rounded-2xl hover:bg-rose-700 transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Try Again
            </Link>
            <Link href="/support/hotel-booking" className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" /> Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
