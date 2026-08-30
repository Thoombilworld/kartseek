'use client';

import React from 'react';
import Link from 'next/link';
import { XCircle, RefreshCw, Home, MessageCircle, CreditCard, ArrowRight, ShieldAlert } from 'lucide-react';

export default function CheckoutFailedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50/20 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center py-12">
        {/* Error Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Payment Failed</h1>
        <p className="text-slate-500 mb-8">
          We couldn't process your payment. Don't worry — no money has been deducted from your account.
        </p>

        {/* Common Reasons */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-left mb-6">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" /> Common Reasons
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
              Insufficient funds or credit limit reached
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
              Card expired or incorrect card details
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
              Bank declined the transaction (try another payment method)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
              Network timeout — please try again
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href="/marketplace/checkout"
            className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md">
            <RefreshCw className="w-5 h-5" /> Retry Payment
          </Link>
          <Link href="/marketplace/cart"
            className="px-6 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5" /> Try a Different Payment Method
          </Link>
          <Link href="/marketplace"
            className="px-6 py-3.5 text-slate-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 text-sm">
            <Home className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        {/* Support */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500 mb-3">If this issue persists, contact our support team.</p>
          {/* No chat widget is mounted anywhere in the app, so this button
              could never open one. The help centre is the real support path. */}
          <Link href="/marketplace/help" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mx-auto w-fit">
            <MessageCircle className="w-4 h-4" /> Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
