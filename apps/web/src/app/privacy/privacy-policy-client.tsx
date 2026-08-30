'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ChevronRight, Mail, Scale, Landmark, FileCheck2 } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import {
  getPrivacyPolicySections, getDataRequestOptions,
  PRIVACY_POLICY_VERSION, DATA_REQUEST_SLA_DAYS,
} from '@/lib/localization';
import { CountryFlag } from '@/components/shared/country-flag';

/**
 * Privacy policy rendered for the customer's own jurisdiction.
 *
 * A single global policy cannot be accurate: the governing law, the supervisory
 * authority, the rights a person can actually exercise, the retention period
 * and the position on cross-border transfers all differ by market. A visitor in
 * Doha is covered by Qatar's PDPPL (Law No. 13 of 2016) and complains to the
 * NCGAA — telling them their data is handled under the Indian DPDP Act is both
 * wrong and unenforceable.
 *
 * Sections come from `getPrivacyPolicySections(country)`, which composes them
 * from the region's compliance record.
 */
export function PrivacyPolicyClient() {
  const { country, compliance, formatDateValue, dir } = useRegion();

  const sections = getPrivacyPolicySections(country.code);
  const requestOptions = getDataRequestOptions(country.code);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50/30" dir={dir}>
      <section className="bg-linear-to-r from-blue-700 via-indigo-700 to-violet-700 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Privacy Policy</h1>
          <p className="text-white/70 text-sm max-w-2xl mx-auto">
            How we collect, use and protect your personal data in {country.name}
          </p>
          <p className="text-white/50 text-xs mt-3">
            Version {PRIVACY_POLICY_VERSION} · Last updated {formatDateValue(new Date('2026-07-01T00:00:00Z'))}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-8">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Privacy Policy</span>
        </nav>

        {/* ── Which regime applies ─────────────────────────────────────────── */}
        <div className="bg-white border border-blue-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <CountryFlag code={country.code} size="xl" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900">
                You are viewing the {country.name} policy
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Because you are browsing from {country.name}, your personal data is handled
                under <strong>{compliance.citation}</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Scale className="w-3 h-3" /> Governing law
              </div>
              <p className="text-sm font-bold text-slate-800">{compliance.law}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Landmark className="w-3 h-3" /> Regulator
              </div>
              <p className="text-sm font-bold text-slate-800 leading-snug">{compliance.regulator}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <FileCheck2 className="w-3 h-3" /> Breach notice
              </div>
              <p className="text-sm font-bold text-slate-800">Within {compliance.breachNotificationHours} hours</p>
            </div>
          </div>

          {compliance.dataResidencyRequired && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mt-3">
              Personal data collected in {country.name} is stored and processed in-region by default.
            </p>
          )}
        </div>

        {/* ── Policy sections ────────────────────────────────────────────────
             Set a step down from body copy, matching the Terms page — these are
             long reference sections that are scanned for a specific clause. */}
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

        {/* ── Self-service data requests ───────────────────────────────────── */}
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Exercise your rights</h2>
          <p className="text-sm text-slate-500 mb-4">
            We respond to every request within {DATA_REQUEST_SLA_DAYS} days.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requestOptions.map((option) => (
              <Link
                key={option.type}
                href={`/profile/privacy?request=${option.type}`}
                className="border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              >
                <p className="font-bold text-sm text-slate-800">{option.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <h3 className="font-bold text-slate-800 mb-2">Questions about your privacy?</h3>
          <p className="text-sm text-slate-500 mb-4">Contact our Data Protection Officer at any time.</p>
          <a href="mailto:privacy@kartseek.com" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            <Mail className="w-4 h-4" /> privacy@kartseek.com
          </a>
          {compliance.regulatorUrl && (
            <p className="text-xs text-slate-400 mt-4">
              You may also complain directly to the {compliance.regulator} at{' '}
              <a href={compliance.regulatorUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {compliance.regulatorUrl.replace(/^https?:\/\//, '')}
              </a>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicyClient;
