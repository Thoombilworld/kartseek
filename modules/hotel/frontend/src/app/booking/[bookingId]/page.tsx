'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle, Download, ArrowRight, CalendarCheck, MapPin,
  Clock, Users, Phone, Mail, Shield, BedDouble, ChevronRight, Star,
} from 'lucide-react';

export default function BookingConfirmationPage() {
  const { bookingId } = useParams();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Success Animation */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Booking Confirmed! 🎉</h1>
        <p className="text-slate-500">Your hotel reservation has been successfully confirmed.</p>
      </div>

      {/* Booking Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">Confirmation Code</span>
            <span className="font-mono font-black text-lg tracking-wider">KS-A7B3C9</span>
          </div>
          <p className="text-sm text-white/80">Booking ID: {bookingId || 'HBK-001'}</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900">The Grand Palace Hotel</h3>
            <p className="text-sm text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />Sheikh Zayed Road, Downtown Dubai, UAE
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-slate-400 font-medium">Check-in</p>
              <p className="font-bold text-slate-900 flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5 text-rose-500" />Jul 1, 2026
              </p>
              <p className="text-xs text-slate-400">After 14:00</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Check-out</p>
              <p className="font-bold text-slate-900 flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5 text-rose-500" />Jul 3, 2026
              </p>
              <p className="text-xs text-slate-400">Before 12:00</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium">Room</p>
              <p className="font-bold text-slate-900 flex items-center gap-1"><BedDouble className="w-3 h-3" />Deluxe King</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Guests</p>
              <p className="font-bold text-slate-900 flex items-center gap-1"><Users className="w-3 h-3" />2 Adults</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Duration</p>
              <p className="font-bold text-slate-900 flex items-center gap-1"><Clock className="w-3 h-3" />2 Nights</p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Room (2 nights × AED 450)</span>
              <span className="font-medium">AED 900</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Taxes &amp; Fees</span>
              <span className="font-medium">AED 135</span>
            </div>
            <div className="flex justify-between font-black text-lg border-t border-slate-200 pt-2 mt-2">
              <span>Total</span>
              <span className="text-rose-600">AED 1,035</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button className="w-full bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2" aria-label="Download invoice PDF">
          <Download className="w-4 h-4" /> Download Invoice
        </button>
        <Link href={`/hotel-booking/review/${bookingId || 'HBK-001'}`}
          className="w-full bg-amber-50 border border-amber-200 text-amber-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
        >
          <Star className="w-4 h-4" /> Rate Your Stay & Earn Points
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <a href="tel:+97141234567" className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2" aria-label="Call the hotel">
            <Phone className="w-4 h-4" /> Call Hotel
          </a>
          <a href="mailto:reservations@grandpalace.ae" className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2" aria-label="Email the hotel">
            <Mail className="w-4 h-4" /> Email
          </a>
        </div>
        <Link href="/hotel-booking/my-bookings"
          className="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          View My Bookings <ChevronRight className="w-4 h-4" />
        </Link>
        <Link href="/hotel-booking"
          className="w-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors text-center flex items-center justify-center gap-2"
        >
          Browse More Hotels <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-blue-700">Free Cancellation</p>
          <p className="text-xs text-blue-600">Cancel for free up to 24 hours before check-in. After that, cancellation fees may apply.</p>
        </div>
      </div>
    </div>
  );
}
