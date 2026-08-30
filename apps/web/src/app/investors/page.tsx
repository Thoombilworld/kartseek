import React from 'react';
import Link from 'next/link';
import { TrendingUp, ChevronRight, DollarSign, Users, Globe, BarChart3, Mail, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Investor Relations — KartSeek', description: 'KartSeek investor information, financial highlights, and partnership inquiries.' };

/**
 * Deliberately not localised.
 *
 * Unlike the storefront and the legal pages, this one is global by nature: an
 * investor evaluates the whole company and its consolidated figures, which do
 * not change with the reader's location. Reporting different financials to
 * different visitors would be misleading rather than helpful.
 *
 * What *was* wrong here was single-market framing — the page positioned a
 * company operating in six-plus countries as an Indian one, and quoted India's
 * addressable market as though it were the whole opportunity. Both are now
 * stated at company scope. Amounts stay in USD, the reporting currency.
 */

const HIGHLIGHTS = [
  { label: 'GMV (FY26)', value: '$2.4B', icon: DollarSign, change: '+180% YoY' },
  { label: 'Active Users', value: '100M+', icon: Users, change: '+120% YoY' },
  { label: 'Markets', value: '6 Countries', icon: Globe, change: '+3 new' },
  { label: 'Revenue Growth', value: '3.2x', icon: TrendingUp, change: 'FY25 → FY26' },
];

const MILESTONES = [
  { year: '2024', event: 'Founded in Bangalore. Launched marketplace MVP.' },
  { year: '2024', event: 'Raised $15M Seed round. Expanded to 3 Indian cities.' },
  { year: '2025', event: 'Series A: $45M. Launched grocery, restaurant, and pharmacy verticals.' },
  { year: '2025', event: 'Crossed 10M users. Expanded to the UAE and Saudi Arabia.' },
  { year: '2026', event: 'Series B: $120M. Launched hotel, taxi, and healthcare verticals.' },
  { year: '2026', event: 'Opened Qatar operations. Crossed 100M users across India, the Gulf, the UK and the US.' },
];

export default function InvestorsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <section className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <TrendingUp className="w-14 h-14 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3">Investor Relations</h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">Building India&apos;s most ambitious super-app</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <nav className="text-sm text-slate-500 mb-8">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Investors</span>
        </nav>

        {/* Financial Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {HIGHLIGHTS.map(h => (
            <div key={h.label} className="bg-white border border-slate-200 rounded-xl p-5 text-center">
              <h.icon className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-black text-slate-800">{h.value}</div>
              <div className="text-xs text-slate-500 font-medium">{h.label}</div>
              <div className="text-[10px] text-green-600 font-bold mt-1">{h.change}</div>
            </div>
          ))}
        </div>

        {/* Milestones */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" /> Key Milestones
          </h2>
          <div className="space-y-4">
            {MILESTONES.map((m, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-16 text-sm font-bold text-blue-600 shrink-0 pt-0.5">{m.year}</div>
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                  <p className="text-sm text-slate-700">{m.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Invest */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Why KartSeek?</h2>
          <ul className="space-y-2">
            {[
              'Super-app model capturing 8 verticals with a single customer acquisition cost',
              'India\'s digital commerce TAM projected at $400B by 2030',
              'Unified technology platform with shared infrastructure reducing per-vertical costs by 60%',
              'Strong network effects: sellers, customers, and delivery partners reinforce each other',
              'Proven unit economics with marketplace achieving contribution margin positivity',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <ArrowRight className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" /> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <h3 className="font-bold text-slate-800 mb-2">Investor & Partnership Inquiries</h3>
          <p className="text-sm text-slate-500 mb-4">For investment, partnership, or financial inquiries</p>
          <a href="mailto:investors@kartseek.com" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            <Mail className="w-4 h-4" /> investors@kartseek.com
          </a>
        </div>
      </div>
    </div>
  );
}
