'use client';

import React from 'react';
import Link from 'next/link';
import { Newspaper, ChevronRight, Calendar, ArrowRight, Download, Mail } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getPressReleases } from '@/lib/localization';
import { CountryFlag } from '@/components/shared/country-flag';

/**
 * Press releases, ordered by relevance to the reader's market.
 *
 * A release is a dated statement of fact — it is never rewritten per reader,
 * and none are hidden, so the full history stays available. Announcements about
 * this market simply surface first, and ones tied to a specific market are
 * badged with it so a reader is not left guessing whether "rural PIN codes"
 * applies to them.
 */
export function PressClient() {
  const { country, dir } = useRegion();
  const releases = getPressReleases(country.code);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50/30" dir={dir}>
      <section className="bg-linear-to-r from-slate-800 via-slate-900 to-slate-800 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Newspaper className="w-14 h-14 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3">Press &amp; Media</h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">
            Latest news, press releases and media resources
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <nav className="text-sm text-slate-500 mb-8">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Press</span>
        </nav>

        <h2 className="text-xl font-bold text-slate-800 mb-1">Press Releases</h2>
        <p className="text-xs text-slate-500 mb-4">
          Showing news relevant to {country.name} first. All announcements remain listed.
        </p>

        <div className="space-y-4 mb-10">
          {releases.map(pr => (
            <div key={pr.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-600 font-semibold">{pr.date}</span>
                {/* Badged with the market it concerns, so a reader can tell at a
                    glance whether an announcement applies where they are. */}
                {pr.regions?.map(code => (
                  <span key={code} className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    <CountryFlag code={code} size="xs" /> {code}
                  </span>
                ))}
                {!pr.regions?.length && (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    Company-wide
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{pr.title}</h3>
              <p className="text-sm text-slate-600">{pr.desc}</p>
              <button className="mt-3 text-sm text-blue-600 font-semibold flex items-center gap-1 hover:underline">
                Read full release <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Brand Assets */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Brand Assets</h2>
          <p className="text-sm text-slate-600 mb-4">Download official KartSeek logos, brand guidelines and media assets.</p>
          <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Download Brand Kit
          </button>
        </div>

        {/* Media Contact */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <h3 className="font-bold text-slate-800 mb-2">Media Inquiries</h3>
          <p className="text-sm text-slate-500 mb-4">For press inquiries, interviews and media requests</p>
          <a href="mailto:press@kartseek.com" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            <Mail className="w-4 h-4" /> press@kartseek.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default PressClient;
