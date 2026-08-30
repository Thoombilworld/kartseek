'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Utensils, Users, Clock, QrCode, ArrowRight, Home } from 'lucide-react';

export default function DineInSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8 py-12">
        {/* Success Animation */}
        <div className="relative">
          <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-600" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-lg animate-bounce">🎉</div>
        </div>

        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Order Confirmed!</h1>
          <p className="text-slate-500">Your dine-in order has been placed successfully</p>
        </div>

        {/* Order Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Order ID</span>
            <span className="font-bold text-slate-900">#ORD-5023</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Restaurant</span>
            <span className="font-bold text-slate-900">The Grand Biryani House</span>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <Utensils className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Table</p>
              <p className="font-bold text-sm text-slate-900">T-03</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <Users className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Guests</p>
              <p className="font-bold text-sm text-slate-900">4</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <Clock className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Time</p>
              <p className="font-bold text-sm text-slate-900">7:30 PM</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="border-t border-dashed border-slate-200 pt-4 text-center">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-3 rounded-xl">
              <QrCode className="w-8 h-8 text-slate-700" />
              <div className="text-left">
                <p className="text-xs text-slate-500">Show this at the restaurant</p>
                <p className="font-bold text-sm text-slate-900">Scan QR to check-in</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-slate-200 pt-4">
            <span className="text-slate-500 text-sm">Total Payable</span>
            <span className="text-2xl font-black text-slate-900">₹1,180</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/dine-in/track/ORD-5023"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-200">
            Track Order Status <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/"
            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Home className="w-4 h-4" /> Back to Restaurants
          </Link>
        </div>
      </div>
    </div>
  );
}
