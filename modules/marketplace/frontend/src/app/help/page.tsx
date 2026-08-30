'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle, ChevronRight, ChevronDown, Search, Package, RotateCcw, CreditCard,
  User, Store, Shield, MessageCircle, Mail, Phone, ExternalLink,
} from 'lucide-react';

const CATEGORIES = [
  { icon: Package, title: 'Orders & Delivery', desc: 'Track, cancel, or modify orders', color: 'text-blue-600', bg: 'bg-blue-50',
    topics: ['Where is my order?', 'Cancel an order', 'Change delivery address', 'Delivery delays', 'Missing item in delivery'] },
  { icon: RotateCcw, title: 'Returns & Refunds', desc: 'Return items and track refunds', color: 'text-green-600', bg: 'bg-green-50',
    topics: ['Start a return', 'Refund status', 'Return policy', 'Exchange an item', 'Return pickup not scheduled'] },
  { icon: CreditCard, title: 'Payments & EMI', desc: 'Payment methods, EMI, and billing', color: 'text-purple-600', bg: 'bg-purple-50',
    topics: ['Payment failed', 'EMI options & eligibility', 'Invoice download', 'Gift card balance', 'Double charged'] },
  { icon: User, title: 'Account Settings', desc: 'Manage your profile and preferences', color: 'text-amber-600', bg: 'bg-amber-50',
    topics: ['Update profile info', 'Change password', 'Delete my account', 'Manage addresses', 'Notification preferences'] },
  { icon: Store, title: 'Sellers & Products', desc: 'Seller policies, quality, authenticity', color: 'text-rose-600', bg: 'bg-rose-50',
    topics: ['Contact a seller', 'Report a seller', 'Product authenticity', 'Counterfeit product', 'Seller not responding'] },
  { icon: Shield, title: 'Security & Privacy', desc: 'Account security and data privacy', color: 'text-cyan-600', bg: 'bg-cyan-50',
    topics: ['Suspicious activity', 'Enable two-factor auth', 'Data privacy & GDPR', 'Report fraud', 'Unrecognized login'] },
];

const FAQS = [
  { q: 'How do I track my order?', a: 'Go to Orders → select your order → click "Track Package". You\'ll see real-time tracking with delivery estimates.' },
  { q: 'What is the return policy?', a: 'Most products can be returned within 7-30 days of delivery depending on the category. Electronics have a 10-day return window, fashion items 30 days.' },
  { q: 'How long do refunds take?', a: 'Refunds are initiated within 24 hours of return pickup. Bank refunds take 5-7 business days; wallet refunds are instant.' },
  { q: 'Can I change my delivery address after ordering?', a: 'You can change the address before the order is shipped. Go to Orders → select order → "Change Address".' },
  { q: 'How do I contact a seller?', a: 'Go to the product page → scroll down to "Sold By" section → click "Contact Seller" to send a message.' },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [expandedCat, setExpandedCat] = useState<number | null>(null);

  const filteredFaqs = search
    ? FAQS.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
    : FAQS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white py-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-80" />
          <h1 className="text-3xl font-extrabold mb-2">How can we help you?</h1>
          <p className="text-white/70 mb-6">Find answers to your questions or reach out to our support team.</p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search for help topics..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-slate-800 text-base shadow-lg focus:ring-2 focus:ring-white/50 outline-none"
            />
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Help Center</span>
        </nav>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            const isExpanded = expandedCat === i;
            return (
              <div key={cat.title} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all">
                <button onClick={() => setExpandedCat(isExpanded ? null : i)}
                  className="w-full p-5 text-left flex items-start gap-4">
                  <div className={`${cat.bg} p-3 rounded-xl`}>
                    <Icon className={`w-6 h-6 ${cat.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">{cat.title}</h3>
                    <p className="text-sm text-slate-500">{cat.desc}</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-3 space-y-2">
                    {cat.topics.map(topic => (
                      <button key={topic} className="w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <ChevronRight className="w-3 h-3" /> {topic}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <h2 className="text-xl font-bold text-slate-800 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3 mb-10">
          {filteredFaqs.map((faq, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full px-5 py-4 text-left flex items-center justify-between">
                <span className="font-medium text-slate-800">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ${expandedFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === i && (
                <div className="px-5 pb-4 text-sm text-slate-600 border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Still need help?</h3>
          <p className="text-slate-500 mb-6">Our support team is available 24/7.</p>
          {/* All three were handler-less <button>s — the "still need help?" panel
              was the one place on the page where nothing could be clicked. Each
              is now the link it was drawn to look like. */}
          <div className="flex justify-center gap-3 flex-wrap">
            <Link href="/support" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md">
              <MessageCircle className="w-5 h-5" /> Live Chat
            </Link>
            <a href="mailto:support@kartseek.com" className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2">
              <Mail className="w-5 h-5" /> Email Support
            </a>
            <a href="tel:+911800123456" className="px-6 py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-semibold hover:bg-green-100 transition-colors flex items-center gap-2">
              <Phone className="w-5 h-5" /> Call Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
