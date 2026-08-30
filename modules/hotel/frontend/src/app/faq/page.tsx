'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ZoneLink } from '@/components/zone-link';
import {
  ArrowLeft, ChevronDown, ChevronUp, Search,
  HelpCircle, CalendarDays, CreditCard, Shield, Clock,
  BedDouble, Star, Globe, Baby,
} from 'lucide-react';

const FAQ_SECTIONS = [
  {
    title: 'Booking & Reservations',
    icon: <CalendarDays className="w-5 h-5" />,
    color: 'bg-rose-50 text-rose-600',
    faqs: [
      { q: 'How do I book a hotel on KARTSEEK?', a: 'Search for your destination, select dates and guests, browse available hotels, choose a room and rate plan, enter guest details, and complete payment. You will receive an instant confirmation via email and in-app notification.' },
      { q: 'Can I book multiple rooms in one reservation?', a: 'Yes, you can book up to 5 rooms in a single reservation. Simply adjust the number of rooms on the search page. For groups larger than 5 rooms, please contact our group bookings team.' },
      { q: 'Do I need to create an account to book?', a: 'While guest checkout is available, we recommend creating a KARTSEEK account to earn loyalty points, manage bookings easily, and access exclusive member-only rates.' },
      { q: 'How far in advance can I book?', a: 'You can book hotels up to 365 days in advance, subject to hotel availability. For peak seasons and holidays, we recommend booking 2-3 months ahead for the best rates.' },
      { q: 'Can I book for someone else?', a: 'Yes. During checkout, you can enter the guest name which can be different from the account holder. The primary guest must present valid ID at check-in.' },
    ],
  },
  {
    title: 'Payments & Pricing',
    icon: <CreditCard className="w-5 h-5" />,
    color: 'bg-blue-50 text-blue-600',
    faqs: [
      { q: 'What payment methods are accepted?', a: 'We accept Visa, Mastercard, American Express, Apple Pay, Google Pay, KARTSEEK Wallet, and bank transfers. Available methods may vary by region.' },
      { q: 'When am I charged for my booking?', a: 'This depends on the rate plan selected. "Pay Now" rates are charged immediately. "Pay at Property" rates require a credit card guarantee but are charged at check-in.' },
      { q: 'Are there any hidden fees?', a: 'No. The total price shown at checkout includes all taxes, service charges, and fees. Some hotels may charge optional resort fees or parking fees — these are clearly displayed before booking.' },
      { q: 'Can I pay in my local currency?', a: 'KARTSEEK supports multi-currency payments. Your bill will show prices in the hotel currency, and your bank may apply exchange rates at the time of transaction.' },
    ],
  },
  {
    title: 'Cancellation & Refunds',
    icon: <Shield className="w-5 h-5" />,
    color: 'bg-emerald-50 text-emerald-600',
    faqs: [
      { q: 'What is the cancellation policy?', a: 'Cancellation policies vary by rate plan. Flexible rates typically allow free cancellation up to 24-48 hours before check-in. Non-refundable rates cannot be cancelled. The specific policy is shown on the rate plan before booking.' },
      { q: 'How do I cancel a booking?', a: 'Go to My Bookings, select the reservation, and click "Cancel Booking". You will see the refund amount and policy before confirming. Alternatively, contact our support team.' },
      { q: 'How long does a refund take?', a: 'Refunds for eligible cancellations are processed within 1-3 business days. The actual time to receive funds depends on your bank and may take 5-10 business days to appear on your statement.' },
      { q: 'Can I modify my booking instead of cancelling?', a: 'Yes, you can modify dates, room type, or guest count from the booking details page, subject to availability. Date changes may result in a price difference.' },
    ],
  },
  {
    title: 'Check-in & Check-out',
    icon: <Clock className="w-5 h-5" />,
    color: 'bg-amber-50 text-amber-600',
    faqs: [
      { q: 'What are the typical check-in and check-out times?', a: 'Standard check-in is 2:00 PM and check-out is 12:00 PM. Exact times vary by hotel and are shown on your booking confirmation.' },
      { q: 'Can I request early check-in or late check-out?', a: 'You can add this as a special request during booking. Early check-in and late check-out are subject to availability and some hotels may charge an additional fee.' },
      { q: 'What ID do I need at check-in?', a: 'You will need a valid government-issued photo ID (passport for international guests, national ID for domestic stays). The name on the ID must match the guest name on the reservation.' },
    ],
  },
  {
    title: 'Room & Amenities',
    icon: <BedDouble className="w-5 h-5" />,
    color: 'bg-purple-50 text-purple-600',
    faqs: [
      { q: 'Can I request a specific room or floor?', a: 'You can add room preferences (high floor, quiet room, accessible room) as special requests. While hotels try their best to accommodate, specific rooms cannot be guaranteed.' },
      { q: 'Is breakfast included?', a: 'This depends on the rate plan you select. Look for "Breakfast Included" or "Half Board" rate plans. Room-only rates do not include meals.' },
      { q: 'Are pets allowed?', a: 'Pet policies vary by hotel. Check the hotel amenities section for pet-friendly status. Some hotels charge pet fees and have size/breed restrictions.' },
    ],
  },
  {
    title: 'Loyalty & Rewards',
    icon: <Star className="w-5 h-5" />,
    color: 'bg-amber-50 text-amber-500',
    faqs: [
      { q: 'How do I earn loyalty points on hotel bookings?', a: 'KARTSEEK members earn 1 point per AED 10 spent on hotel bookings. Points are credited after check-out and can be redeemed for future bookings or other KARTSEEK services.' },
      { q: 'Can I use loyalty points to pay for a hotel?', a: 'Yes. During checkout, you can apply your KARTSEEK loyalty points for partial or full payment. 10 points = AED 1 value.' },
    ],
  },
];

export default function FAQPage() {
  const [query, setQuery] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredSections = query
    ? FAQ_SECTIONS.map(s => ({
        ...s,
        faqs: s.faqs.filter(f =>
          f.q.toLowerCase().includes(query.toLowerCase()) ||
          f.a.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter(s => s.faqs.length > 0)
    : FAQ_SECTIONS;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-linear-to-br from-rose-600 to-rose-800 text-white">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/" className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-bold">Frequently Asked Questions</h1>
          </div>
          <p className="text-rose-200 text-sm mb-4">Find answers to common questions about hotel bookings</p>
          <div className="relative">
            <Search className="w-4 h-4 text-white/50 absolute left-4 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full bg-white/15 border border-white/20 text-white placeholder-white/50 pl-11 pr-4 py-3 rounded-xl text-sm outline-none focus:bg-white/20 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {filteredSections.map(section => (
          <div key={section.title}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${section.color}`}>{section.icon}</div>
              <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
            </div>
            <div className="space-y-2">
              {section.faqs.map((faq, idx) => {
                const key = `${section.title}-${idx}`;
                const isOpen = openItems[key];
                return (
                  <div key={key} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-slate-900 pr-4">{faq.q}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 border-t border-slate-50 pt-3">
                        <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="text-center py-16">
            <HelpCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No matching questions found</p>
            <p className="text-sm text-slate-400 mt-1">Try different keywords or contact support</p>
          </div>
        )}

        {/* Still need help */}
        <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-center text-white">
          <h3 className="font-bold text-lg mb-2">Still have questions?</h3>
          <p className="text-slate-300 text-sm mb-4">Our support team is available 24/7</p>
          <ZoneLink href="/support/hotel-booking" className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-slate-100 transition-colors">
            Contact Support
          </ZoneLink>
        </div>
      </div>
    </div>
  );
}
