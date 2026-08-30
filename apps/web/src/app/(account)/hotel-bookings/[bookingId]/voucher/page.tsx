'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Printer, Share2, CalendarDays, MapPin, Users, BedDouble, Star, QrCode, Shield } from 'lucide-react';

export default function VoucherPage() {
  const { bookingId } = useParams();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href={`/hotel-bookings/${bookingId}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors"><ArrowLeft className="w-4 h-4" /></Link><h1 className="text-lg font-bold text-slate-900">Booking Voucher</h1></div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors" title="Print"><Printer className="w-4 h-4 text-slate-600" /></button>
            <button className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors" title="Share"><Share2 className="w-4 h-4 text-slate-600" /></button>
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Voucher Header */}
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-rose-200 font-medium uppercase tracking-wider">KARTSEEK Hotel Booking</p><h2 className="text-2xl font-black mt-1">Booking Voucher</h2></div>
              <div className="text-right"><p className="text-xs text-rose-200">Confirmation Code</p><p className="text-xl font-mono font-bold">KS-A7B3C9</p></div>
            </div>
          </div>
          {/* Hotel Details */}
          <div className="p-6 border-b border-dashed border-slate-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-rose-50 rounded-xl flex items-center justify-center text-3xl">🏰</div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">The Grand Palace Hotel</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> Sheikh Zayed Road, Downtown Dubai, UAE</p>
                <div className="flex gap-0.5 mt-1">{[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-amber-400 fill-current" />)}</div>
              </div>
            </div>
          </div>
          {/* Stay Info */}
          <div className="p-6 border-b border-dashed border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[10px] text-slate-400 uppercase font-medium">Check-in</p><p className="text-sm font-bold text-slate-900">Tue, Jul 1, 2026</p><p className="text-xs text-slate-500">From 2:00 PM</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-medium">Check-out</p><p className="text-sm font-bold text-slate-900">Thu, Jul 3, 2026</p><p className="text-xs text-slate-500">Until 12:00 PM</p></div>
            </div>
            <div className="flex gap-4 mt-4 text-sm text-slate-600">
              <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" /> Deluxe King Room</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 2 Guests</span>
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> 2 Nights</span>
            </div>
          </div>
          {/* Guest & Payment */}
          <div className="p-6 border-b border-dashed border-slate-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-[10px] text-slate-400 uppercase font-medium mb-1">Guest Name</p><p className="font-bold text-slate-900">Ahmed Al Maktoum</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-medium mb-1">Total Paid</p><p className="font-bold text-emerald-600">AED 1,046</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-medium mb-1">Rate Plan</p><p className="font-medium text-slate-700">Breakfast Included</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-medium mb-1">Booking ID</p><p className="font-mono text-slate-700">{String(bookingId)}</p></div>
            </div>
          </div>
          {/* QR Code placeholder + Footer */}
          <div className="p-6 flex items-center justify-between">
            <div className="w-24 h-24 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200"><QrCode className="w-12 h-12 text-slate-300" /></div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Present this voucher at check-in</p>
              <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 justify-end mt-1"><Shield className="w-3 h-3" /> Verified by KARTSEEK</p>
            </div>
          </div>
        </div>
        <button className="w-full bg-rose-600 text-white font-bold py-4 rounded-2xl mt-4 hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download as PDF</button>
      </div>
    </div>
  );
}
