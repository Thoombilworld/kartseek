'use client';
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Printer, FileText, CreditCard, MapPin, Star, CalendarDays } from 'lucide-react';

export default function InvoicePage() {
  const { bookingId } = useParams();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href={`/hotel-bookings/${bookingId}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors"><ArrowLeft className="w-4 h-4" /></Link><h1 className="text-lg font-bold text-slate-900">Invoice</h1></div>
          <div className="flex gap-2">
            <button title="Print invoice" className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors"><Printer className="w-4 h-4 text-slate-600" /></button>
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
          {/* Invoice Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-100">
            <div><p className="text-2xl font-black text-slate-900">INVOICE</p><p className="text-xs text-slate-400 mt-1">Invoice No: INV-2026-{String(bookingId).slice(-6)}</p><p className="text-xs text-slate-400">Date: Jun 15, 2026</p></div>
            <div className="text-right"><p className="text-lg font-black text-rose-600">KARTSEEK</p><p className="text-[10px] text-slate-400">KARTSEEK Technologies FZ-LLC</p><p className="text-[10px] text-slate-400">Dubai Internet City, Dubai, UAE</p><p className="text-[10px] text-slate-400">TRN: 100123456700003</p></div>
          </div>
          {/* Bill To */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div><p className="text-[10px] text-slate-400 uppercase font-medium mb-2">Bill To</p><p className="text-sm font-bold text-slate-900">Ahmed Al Maktoum</p><p className="text-xs text-slate-500">ahmed@example.com</p><p className="text-xs text-slate-500">+971 50 123 4567</p></div>
            <div><p className="text-[10px] text-slate-400 uppercase font-medium mb-2">Hotel</p><p className="text-sm font-bold text-slate-900">The Grand Palace Hotel</p><p className="text-xs text-slate-500">Sheikh Zayed Road, Dubai</p><p className="text-xs text-slate-500">TRN: 100987654300001</p></div>
          </div>
          {/* Booking Summary */}
          <div className="mb-6"><p className="text-[10px] text-slate-400 uppercase font-medium mb-2">Booking Details</p><div className="text-xs text-slate-600 space-y-1"><p>Confirmation: KS-A7B3C9 | Booking ID: {String(bookingId)}</p><p>Check-in: Jul 1, 2026 | Check-out: Jul 3, 2026 | Duration: 2 nights</p><p>Room: Deluxe King Room | Guests: 2 Adults</p></div></div>
          {/* Line Items */}
          <table className="w-full mb-6">
            <thead><tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase"><th className="text-left py-2 font-medium">Description</th><th className="text-center py-2 font-medium">Qty</th><th className="text-center py-2 font-medium">Rate</th><th className="text-right py-2 font-medium">Amount</th></tr></thead>
            <tbody className="text-sm">
              <tr className="border-b border-slate-50"><td className="py-3 text-slate-700">Deluxe King Room (Breakfast Included)</td><td className="text-center text-slate-500">2 nights</td><td className="text-center text-slate-500">AED 520</td><td className="text-right font-medium">AED 1,040</td></tr>
              <tr className="border-b border-slate-50"><td className="py-3 text-slate-700">Tourism Dirham Fee</td><td className="text-center text-slate-500">2 nights</td><td className="text-center text-slate-500">AED 20</td><td className="text-right font-medium">AED 40</td></tr>
              <tr className="border-b border-slate-50"><td className="py-3 text-slate-700">Municipality Fee (7%)</td><td className="text-center text-slate-500">—</td><td className="text-center text-slate-500">—</td><td className="text-right font-medium">AED 72.80</td></tr>
              <tr className="border-b border-slate-50"><td className="py-3 text-slate-700">VAT (5%)</td><td className="text-center text-slate-500">—</td><td className="text-center text-slate-500">—</td><td className="text-right font-medium">AED 43.20</td></tr>
              <tr className="border-b border-slate-50"><td className="py-3 text-emerald-600">Promo Discount (FIRSTHOTEL)</td><td className="text-center">—</td><td className="text-center">—</td><td className="text-right font-medium text-emerald-600">-AED 150.00</td></tr>
            </tbody>
          </table>
          {/* Total */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>AED 1,040.00</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Taxes & Fees</span><span>AED 156.00</span></div>
              <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-AED 150.00</span></div>
              <div className="flex justify-between pt-3 border-t border-slate-200 font-bold text-lg"><span>Total</span><span>AED 1,046.00</span></div>
            </div>
          </div>
          {/* Payment Info */}
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500">
            <p className="font-bold text-slate-700 mb-1">Payment Information</p>
            <p>Method: Visa ending in 4242 | Status: Paid | Date: Jun 15, 2026</p>
            <p className="mt-2 text-[10px] text-slate-400">This is a computer-generated invoice and does not require a signature.</p>
          </div>
        </div>
        <button className="w-full bg-rose-600 text-white font-bold py-4 rounded-2xl mt-4 hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download Invoice (PDF)</button>
      </div>
    </div>
  );
}
