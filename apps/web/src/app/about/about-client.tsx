'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, Users, Globe, ShoppingBag, Star, Target, Heart, Zap } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getPositioning, COMPANY_MILESTONES } from '@/lib/localization';
import { CountryFlag } from '@/components/shared/country-flag';

/**
 * About page.
 *
 * Two kinds of content, treated differently on purpose:
 *
 *   * The **positioning line** is a claim about the reader's market. "India's
 *     next-generation super-app" read in Doha is a statement about the wrong
 *     country, so it follows the active region.
 *   * The **company story** is history. It stays as written — KARTSEEK really
 *     was founded in Bangalore, and rewriting that per reader would be a
 *     fabrication rather than a localisation.
 */
export function AboutClient() {
  const { country, dir } = useRegion();
  const positioning = getPositioning(country.code);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50/30" dir={dir}>
      <section className="bg-linear-to-r from-blue-700 via-indigo-700 to-violet-700 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ShoppingBag className="w-14 h-14 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3">About KartSeek</h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">
            {positioning.tagline} — {positioning.summary}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <nav className="text-sm text-slate-500 mb-8">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">About</span>
        </nav>

        {/* Stats — company-wide figures, labelled as such so they are not read
            as claims about the reader's market alone. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          {[
            { value: '100M+', label: 'Customers', icon: Users },
            { value: '50K+', label: 'Sellers', icon: Building2 },
            { value: '8', label: 'Verticals', icon: ShoppingBag },
            { value: '500+', label: 'Cities', icon: Globe },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-5 text-center">
              <s.icon className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-black text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mb-10">Figures are company-wide across all markets.</p>

        {/* Presence in the reader's market */}
        <div className="bg-white border border-blue-200 rounded-xl p-5 mb-6">
          <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
            <CountryFlag code={country.code} size="sm" /> KartSeek in {country.name}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {positioning.summary}
            {positioning.hasOffice && positioning.offices.length > 0
              ? ` Our ${country.name} team is based in ${positioning.offices.join(' and ')}.`
              : ` We serve ${country.name} through our regional operations and local seller network.`}
          </p>
        </div>

        {/* Mission */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" /> Our Mission
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            To democratise commerce by building a unified platform that empowers small businesses to reach
            millions of customers, while giving shoppers the best selection, prices and convenience — across
            marketplace, groceries, food delivery, pharmacy, travel, ride-hailing, healthcare and more.
          </p>
        </div>

        {/* Values */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" /> Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Customer First', desc: 'Every decision starts with "How does this benefit the customer?"', icon: Star },
              { title: 'Seller Empowerment', desc: 'We build tools that help small businesses compete at scale.', icon: Zap },
              { title: 'Trust & Transparency', desc: 'Genuine reviews, honest pricing and clear policies — always.', icon: Building2 },
            ].map(v => (
              <div key={v.title} className="bg-slate-50 rounded-xl p-4">
                <v.icon className="w-5 h-5 text-blue-600 mb-2" />
                <h3 className="font-bold text-slate-800 text-sm mb-1">{v.title}</h3>
                <p className="text-xs text-slate-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Story — company history, identical in every market */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-3">Our Story</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            Founded in Bangalore in 2024, KartSeek started with a simple observation: people were juggling
            eight to ten different apps for daily needs — shopping, groceries, food, pharmacy, rides, travel
            and healthcare. We set out to build a single platform that unifies all of them.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Today KartSeek operates across India, Qatar, the UAE, Saudi Arabia, the UK and beyond, with a
            growing network of trusted local sellers in each market. We&apos;re backed by world-class investors
            and driven by a team of 500+ engineers, designers and operators.
          </p>
          <ol className="space-y-2">
            {COMPANY_MILESTONES.map(m => (
              <li key={`${m.year}-${m.event}`} className="flex gap-3 text-sm">
                <span className="font-bold text-blue-600 shrink-0 w-12">{m.year}</span>
                <span className="text-slate-600">{m.event}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default AboutClient;
