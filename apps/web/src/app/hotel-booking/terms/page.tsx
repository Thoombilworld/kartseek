'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Shield, CreditCard, Scale, Globe, Clock, AlertTriangle } from 'lucide-react';

export default function HotelTermsPage() {
  const sections = [
    {
      icon: <FileText className="w-5 h-5" />, color: 'bg-rose-50 text-rose-600',
      title: '1. Booking Agreement',
      content: `By completing a hotel booking through KARTSEEK, you enter into a binding agreement with the hotel property. KARTSEEK acts as an intermediary platform connecting guests with hotel partners. The booking is confirmed once you receive a confirmation code via email and/or in-app notification. Please verify all details including dates, room type, number of guests, and pricing before confirming.`,
    },
    {
      icon: <CreditCard className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600',
      title: '2. Pricing & Payments',
      content: `All prices displayed include applicable taxes and service charges unless otherwise stated. Currency conversion rates are determined at the time of transaction by your payment provider. KARTSEEK does not charge additional booking fees. Hotels may charge resort fees, parking fees, or other incidental charges directly at the property — these are disclosed before booking where applicable.`,
    },
    {
      icon: <Shield className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600',
      title: '3. Cancellation & Refunds',
      content: `Cancellation policies vary by rate plan and hotel. Flexible rates allow free cancellation up to 24-48 hours before check-in. Non-refundable rates cannot be cancelled. Refunds for eligible cancellations are processed within 1-3 business days. Bank processing times may add 5-10 additional business days. In case of no-show, the full booking amount may be charged.`,
    },
    {
      icon: <Clock className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600',
      title: '4. Check-in & Check-out',
      content: `Standard check-in time is 2:00 PM and check-out is 12:00 PM, unless stated otherwise. Early check-in and late check-out are subject to availability and may incur additional charges. Guests must present valid government-issued photo identification at check-in. The name on the ID must match the booking guest name.`,
    },
    {
      icon: <Scale className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600',
      title: '5. Guest Responsibilities',
      content: `Guests are responsible for any damage to hotel property during their stay. Hotels reserve the right to charge for damages. Guests must comply with hotel policies including noise regulations, smoking policies, and pool/facility rules. KARTSEEK is not liable for personal belongings left at hotel properties.`,
    },
    {
      icon: <Globe className="w-5 h-5" />, color: 'bg-cyan-50 text-cyan-600',
      title: '6. International Bookings',
      content: `For international bookings, guests are responsible for ensuring they have valid travel documents (passport, visa). KARTSEEK does not provide visa assistance. Local taxes (tourism tax, city tax, VAT) may apply and are subject to change based on local government regulations.`,
    },
    {
      icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-red-50 text-red-600',
      title: '7. Force Majeure',
      content: `In the event of natural disasters, pandemics, government restrictions, or other force majeure events, KARTSEEK and hotel partners will work together to offer rebooking, credit, or refund options. Standard cancellation penalties may be waived at the discretion of the hotel and KARTSEEK.`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/hotel-booking" className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Hotel Booking Terms & Conditions</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 xs:px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            These terms and conditions govern your use of KARTSEEK hotel booking services. By making a reservation,
            you agree to these terms. Please read them carefully. Last updated: June 15, 2026.
          </p>
        </div>

        {sections.map(section => (
          <div key={section.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.color}`}>
                {section.icon}
              </div>
              <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed ml-[52px]">{section.content}</p>
          </div>
        ))}

        <div className="bg-slate-100 rounded-2xl p-6 text-center">
          <p className="text-xs text-slate-500">
            For questions about these terms, contact us at{' '}
            <a href="mailto:legal@kartseek.com" className="text-rose-600 font-medium hover:underline">legal@kartseek.com</a>
            {' '}or visit our{' '}
            <Link href="/support" className="text-rose-600 font-medium hover:underline">Help Center</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
