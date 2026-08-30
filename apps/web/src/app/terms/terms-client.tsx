'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ChevronRight, Mail, Scale, Landmark, Building2 } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getTermsSections, getLegal } from '@/lib/localization';
import { CountryFlag } from '@/components/shared/country-flag';

/**
 * Terms of Service for the customer's own market.
 *
 * The contracting entity, the governing law, the court with jurisdiction, the
 * tax treatment, the accepted payment methods and the consumer-protection
 * regime are all market-specific. A single global page stated all of them
 * wrongly for every market but one — a Doha customer was told their contract
 * was governed by the laws of India and heard in the courts of Bangalore, which
 * is both untrue and unactionable.
 *
 * Content comes from `getTermsSections(country)`, which composes it from the
 * region's legal and compliance records.
 */
export function TermsClient() {
  const { country, formatDateValue, dir } = useRegion();

  const sections = getTermsSections(country.code);
  const legal = getLegal(country.code);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50/30" dir={dir}>
      <section className="bg-linear-to-r from-slate-800 via-slate-900 to-slate-800 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Terms of Service</h1>
          <p className="text-white/70 text-sm max-w-2xl mx-auto">
            The terms governing your use of KARTSEEK in {country.name}
          </p>
          <p className="text-white/50 text-xs mt-3">
            Effective {formatDateValue(new Date('2026-07-01T00:00:00Z'))}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Terms of Service</span>
        </nav>

        {/* ── Which market's terms these are ───────────────────────────────── */}
        <div className="bg-white border border-blue-200 rounded-xl p-5 mb-5">
          <div className="flex items-start gap-3">
            <CountryFlag code={country.code} size="xl" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm">
                You are viewing the {country.name} terms
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Because you are browsing from {country.name}, your contract is with{' '}
                <strong>{legal.entityName}</strong> and is governed by {legal.governingLaw}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <Fact icon={Building2} label="Contracting entity" value={legal.entityName} />
            <Fact icon={Scale} label="Governing law" value={legal.governingLaw} />
            <Fact icon={Landmark} label="Jurisdiction" value={legal.courts} />
          </div>
        </div>

        {/* ── Clauses ──────────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-slate-800 mb-2">{section.heading}</h2>
              <div className="space-y-2.5">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-xs text-slate-600 leading-relaxed">{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul className="space-y-1.5 mt-2.5">
                    {section.bullets.map((bullet, i) => (
                      <li key={i} className="text-xs text-slate-600 leading-relaxed flex gap-2">
                        <span className="text-blue-500 shrink-0">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Questions about our Terms?</h3>
          <p className="text-xs text-slate-500 mb-4">Our legal team is available to help.</p>
          <a href="mailto:legal@kartseek.com" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Mail className="w-4 h-4" /> legal@kartseek.com
          </a>
          <p className="text-[11px] text-slate-400 mt-4">
            Consumer rights in {country.name} are protected under {legal.consumerLaw}. You may contact the{' '}
            {legal.consumerAuthority}
            {legal.consumerHelpline ? ` on ${legal.consumerHelpline}` : ''}.
          </p>
        </div>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className="text-xs font-bold text-slate-800 leading-snug">{value}</p>
    </div>
  );
}

export default TermsClient;
