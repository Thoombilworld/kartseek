import React from 'react';
import {
  LifeBuoy, MessageSquare, Phone, Mail, ChevronRight,
  ShoppingBag, Car, Pill, UtensilsCrossed, MapPin,
  CreditCard, Package, HelpCircle, FileText, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

/* ── FAQ Data ───────────────────────────────────────────────────────────────── */
const FAQ_ITEMS = [
  { q: 'How do I track my order?', a: 'Go to Orders from your profile, tap on the active order, and you can track it in real-time on the map.' },
  { q: 'How do I cancel a taxi ride?', a: 'Open the active ride, tap "Cancel Ride". Cancellation fees may apply if the driver has already been dispatched.' },
  { q: 'How do refunds work?', a: 'Refunds are credited to your KARTSEEK Wallet within 24 hours. For bank refunds, it ta5–7 business days.' },
  { q: 'How do I add a prescription?', a: 'Go to the Pharmacy section, tap "Upload Prescription", and our pharmacist will verify it within 30 minutes.' },
];

/* ── Quick Help Topics ──────────────────────────────────────────────────────── */
const HELP_TOPICS = [
  { icon: <ShoppingBag className="w-5 h-5" />, label: 'Marketplace Orders',   color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { icon: <UtensilsCrossed className="w-5 h-5" />, label: 'Restaurant / Food',  color: 'bg-orange-50 text-orange-600 border-orange-100' },
  { icon: <Package className="w-5 h-5" />,    label: 'Grocery Delivery',    color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { icon: <Car className="w-5 h-5" />,        label: 'Taxi & Rides',        color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  { icon: <Pill className="w-5 h-5" />,       label: 'Pharmacy Orders',     color: 'bg-pink-50 text-pink-600 border-pink-100' },
  { icon: <MapPin className="w-5 h-5" />,     label: 'Delivery Issues',     color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'Payments & Refunds',  color: 'bg-violet-50 text-violet-600 border-violet-100' },
  { icon: <HelpCircle className="w-5 h-5" />, label: 'Account & Security',  color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function SupportPage() {
  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">

      {/* Hero Header */}
      <div className="bg-linear-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-5 border border-white/20">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            Help &amp; Support
          </h1>
          <p className="text-indigo-200 text-base md:text-lg max-w-lg mx-auto">
            We&apos;re here to help. Browse help topics, check FAQs, or reach out to our support team.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-6">

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/support/tickets"
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">My Tickets</h3>
              <p className="text-sm text-slate-500 mt-0.5">View and manage your support tickets.</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 mt-2">
                2 active <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          <a
            href="tel:+91700000000"
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Call Us</h3>
              <p className="text-sm text-slate-500 mt-0.5">Talk to a support agent now.</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 mt-2">
                Available 24/7 <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </a>

          <a
            href="mailto:support@kartseek.com"
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Email Support</h3>
              <p className="text-sm text-slate-500 mt-0.5">Get a reply within 4 hours.</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 mt-2">
                support@kartseek.com <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </a>
        </div>

        {/* ── Help Topics Grid ─────────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" /> Browse by Topic
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {HELP_TOPICS.map((topic) => (
              <button
                key={topic.label}
                className={`rounded-xl border p-4 text-left hover:shadow-md transition-all ${topic.color}`}
              >
                <div className="mb-2">{topic.icon}</div>
                <p className="text-sm font-semibold">{topic.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── FAQs ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-500" /> Frequently Asked Questions
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {FAQ_ITEMS.map((faq, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors list-none">
                  <span className="font-semibold text-slate-900 text-sm pr-4">{faq.q}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 pb-5 -mt-1">
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {faq.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* ── Still need help CTA ──────────────────────────────────────────── */}
        <div className="bg-linear-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Still need help?</h3>
            <p className="text-sm text-slate-500">
              Create a support ticket and our team will get back to you within 1 hour.
            </p>
          </div>
          <Link
            href="/support/tickets"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-colors text-sm shrink-0"
          >
            <MessageSquare className="w-4 h-4" /> Create a Ticket
          </Link>
        </div>
      </div>
    </div>
  );
}
