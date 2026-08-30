'use client';

import React from 'react';
import Link from 'next/link';
import { Briefcase, ChevronRight, MapPin, Clock, Users, Zap, Heart, Globe, ArrowRight } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import {
  getOpenings, getPositioning, LEARNING_BUDGET, formatMoney, type JobOpening,
} from '@/lib/localization';
import { CountryFlag } from '@/components/shared/country-flag';

/**
 * Careers page, ordered for the reader's market.
 *
 * Roles are *not* relabelled per reader: a Bangalore role is in Bangalore and
 * its benefits are quoted in rupees however the page is opened. What changes is
 * ordering and framing — the reader's own market leads, and roles elsewhere are
 * shown under a heading that says so, rather than being presented as if they
 * were local.
 */
export function CareersClient() {
  const { country, dir } = useRegion();
  const { local, elsewhere } = getOpenings(country.code);
  const positioning = getPositioning(country.code);
  const total = local.length + elsewhere.length;

  // Quoted against the market whose roles are on screen. Falls back to the
  // largest hiring market when we do not hire where the reader is.
  const budgetMarket = LEARNING_BUDGET[country.code] !== undefined ? country.code : 'IN';
  const budget = LEARNING_BUDGET[budgetMarket]!;

  const perks = [
    { icon: Heart, title: 'Health & Wellness', desc: 'Comprehensive medical, dental and vision cover for you and your family' },
    {
      icon: Zap,
      title: 'Learning Budget',
      desc: `${formatMoney(budget, { country: budgetMarket, decimals: 0 })} annual allowance for courses, conferences and books`,
    },
    { icon: Globe, title: 'Remote Flexibility', desc: 'Work from anywhere 2 days a week, with quarterly team offsites' },
    { icon: Users, title: 'Equity', desc: 'All full-time employees receive stock options from day one' },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-violet-50/30" dir={dir}>
      <section className="bg-linear-to-r from-violet-700 via-purple-700 to-fuchsia-700 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Briefcase className="w-14 h-14 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3">Join KartSeek</h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">
            Help us build {positioning.tagline}. {total} open positions.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <nav className="text-sm text-slate-500 mb-8">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Careers</span>
        </nav>

        {/* Perks */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {perks.map(p => (
            <div key={p.title} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p.icon className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm mb-1">{p.title}</h3>
              <p className="text-[11px] text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Roles in the reader's market */}
        {local.length > 0 ? (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
              <CountryFlag code={country.code} size="sm" /> Open in {country.name} ({local.length})
            </h2>
            {positioning.offices.length > 0 && (
              <p className="text-xs text-slate-500 mb-4">
                Our {country.name} team is based in {positioning.offices.join(' and ')}.
              </p>
            )}
            <div className="space-y-3 mb-10">
              {local.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-10 text-center">
            <p className="text-sm font-bold text-slate-800">
              We&apos;re not hiring in {country.name} right now
            </p>
            <p className="text-xs text-slate-500 mt-1">
              We do have open roles elsewhere, listed below. Remote-eligible roles are marked.
            </p>
          </div>
        )}

        {/* Roles in other markets — clearly labelled as such */}
        {elsewhere.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              Open elsewhere ({elsewhere.length})
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              These roles are based outside {country.name}. Relocation and eligibility to work
              locally may apply.
            </p>
            <div className="space-y-3">
              {elsewhere.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: JobOpening }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 hover:shadow-sm transition-all">
      <div className="min-w-0">
        <h3 className="font-bold text-slate-800">{job.title}</h3>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {job.team}</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <CountryFlag code={job.country} size="xs" /> {job.location}
            {job.remote && ' / Remote'}
          </span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.type}</span>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {job.tags.map(t => (
            <span key={t} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">{t}</span>
          ))}
        </div>
      </div>
      <button className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1.5 shrink-0">
        Apply <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default CareersClient;
