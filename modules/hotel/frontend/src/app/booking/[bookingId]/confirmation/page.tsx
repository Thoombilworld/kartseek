'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle, CalendarDays, MapPin, Users, BedDouble, Clock,
  Download, Share2, Phone, MessageSquare, Plus, Printer,
  CreditCard, Star, ArrowRight, Shield, Copy, ExternalLink,
} from 'lucide-react';

export default function BookingConfirmationPage() {
  const { bookingId } = useParams();
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const booking = {
    id: bookingId || 'HBK-1718500000000',
    confirmationCode: 'KS-A7B3C9',
    status: 'CONFIRMED',
    hotelName: 'The Grand Palace Hotel',
    hotelAddress: 'Sheikh Zayed Road, Downtown Dubai, UAE',
    roomName: 'Deluxe King Room',
    roomType: 'Deluxe',
    checkIn: 'Tue, Jul 1, 2026',
    checkInTime: '2:00 PM',
    checkOut: 'Thu, Jul 3, 2026',
    checkOutTime: '12:00 PM',
    nights: 2,
    guests: 2,
    rooms: 1,
    guestName: 'Ahmed Al Maktoum',
    guestEmail: 'ahmed@example.com',
    guestPhone: '+971 50 123 4567',
    roomRate: 450,
    taxesAndFees: 135,
    grandTotal: 1035,
    currency: 'AED',
    paymentMethod: 'Visa ending in 4242',
    paymentStatus: 'Paid',
    loyaltyPoints: 103,
    cancellationPolicy: 'Free cancellation until Jun 30, 2026 (24h before check-in)',
    specialRequests: 'High floor, late check-out if possible',
    hotelPhone: '+971 4 123 4567',
    hotelEmail: 'reservations@grandpalace.ae',
    bookedAt: 'Jun 15, 2026, 10:32 AM',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(booking.confirmationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Success Banner */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white relative overflow-hidden">
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none animate-pulse">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ['#FBBF24', '#F472B6', '#60A5FA', '#34D399', '#A78BFA'][i % 5],
                  animation: `fall ${1 + Math.random() * 2}s ease-in forwards`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>
        )}
        <div className="max-w-3xl mx-auto px-4 py-10 text-center relative z-10">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black mb-2">Booking Confirmed!</h1>
          <p className="text-emerald-100 text-sm mb-4">Your reservation has been successfully confirmed</p>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-xl px-4 py-2">
            <span className="text-xs text-emerald-100">Confirmation Code</span>
            <span className="font-mono font-bold text-lg">{booking.confirmationCode}</span>
            <button onClick={handleCopy} className="ml-1 hover:bg-white/20 p-1 rounded-lg transition-colors" title="Copy code">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Download className="w-5 h-5" />, label: 'Download\nVoucher', href: `/booking/${bookingId}/voucher` },
            { icon: <CalendarDays className="w-5 h-5" />, label: 'Add to\nCalendar', href: '/#' },
            { icon: <Share2 className="w-5 h-5" />, label: 'Share\nBooking', href: '/#' },
          ].map(action => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col items-center gap-2 text-center hover:border-rose-200 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                {action.icon}
              </div>
              <span className="text-xs font-bold text-slate-700 whitespace-pre-line leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* Hotel & Stay Details */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-4">Stay Details</h2>
          <div className="flex items-start gap-4 mb-5 pb-5 border-b border-slate-50">
            <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🏨</div>
            <div>
              <h3 className="font-bold text-slate-900">{booking.hotelName}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {booking.hotelAddress}</p>
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-amber-400 fill-current" />)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Check-in</p>
              <p className="text-sm font-bold text-slate-900">{booking.checkIn}</p>
              <p className="text-xs text-slate-500">From {booking.checkInTime}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Check-out</p>
              <p className="text-sm font-bold text-slate-900">{booking.checkOut}</p>
              <p className="text-xs text-slate-500">Until {booking.checkOutTime}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Room</p>
              <p className="text-sm font-bold text-slate-900">{booking.roomName}</p>
              <p className="text-xs text-slate-500">{booking.nights} nights · {booking.rooms} room</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Guests</p>
              <p className="text-sm font-bold text-slate-900">{booking.guests} Adults</p>
              <p className="text-xs text-slate-500">No children</p>
            </div>
          </div>
        </div>

        {/* Guest Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-3">Guest Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{booking.guestName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium text-slate-900">{booking.guestEmail}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium text-slate-900">{booking.guestPhone}</span></div>
          </div>
          {booking.specialRequests && (
            <div className="mt-4 pt-4 border-t border-slate-50">
              <p className="text-xs text-slate-400 font-medium mb-1">Special Requests</p>
              <p className="text-sm text-slate-600 italic">{booking.specialRequests}</p>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-3">Payment Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Room Rate × {booking.nights} nights</span><span className="text-slate-900">{booking.currency} {booking.roomRate * booking.nights}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Taxes & Fees</span><span className="text-slate-900">{booking.currency} {booking.taxesAndFees}</span></div>
            <div className="flex justify-between pt-3 border-t border-slate-100 font-bold text-base">
              <span className="text-slate-900">Total Paid</span>
              <span className="text-emerald-600">{booking.currency} {booking.grandTotal}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 bg-slate-50 rounded-xl p-3">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-600">{booking.paymentMethod}</span>
            <span className="ml-auto text-xs font-bold text-emerald-600">{booking.paymentStatus}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 bg-amber-50 rounded-xl p-3">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-amber-700 font-medium">You earned {booking.loyaltyPoints} KARTSEEK Loyalty Points!</span>
          </div>
        </div>

        {/* Cancellation Policy */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-2">Cancellation Policy</h2>
          <p className="text-sm text-emerald-600 font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" /> {booking.cancellationPolicy}
          </p>
        </div>

        {/* Contact Hotel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-3">Contact Hotel</h2>
          <div className="flex gap-3">
            <a href={`tel:${booking.hotelPhone}`} className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-700 font-bold text-sm py-3 rounded-xl hover:bg-rose-100 transition-colors">
              <Phone className="w-4 h-4" /> Call Hotel
            </a>
            <a href={`mailto:${booking.hotelEmail}`} className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 font-bold text-sm py-3 rounded-xl hover:bg-blue-100 transition-colors">
              <MessageSquare className="w-4 h-4" /> Email Hotel
            </a>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-3 pb-6">
          <Link href="/my-bookings" className="block w-full bg-rose-600 text-white text-center font-bold py-4 rounded-2xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">
            View My Bookings
          </Link>
          <Link href="/" className="block w-full bg-white border border-slate-200 text-slate-700 text-center font-bold py-4 rounded-2xl hover:bg-slate-50 transition-colors">
            Book Another Hotel
          </Link>
        </div>
      </div>
    </div>
  );
}
