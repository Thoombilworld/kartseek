'use client';

import React from 'react';
import Link from 'next/link';
import { Phone, ChevronRight, Mail, MapPin, Clock, MessageCircle, HelpCircle } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getLegal, getBusinessDaysLabel, getWeekendLabel } from '@/lib/localization';
import { CountryFlag } from '@/components/shared/country-flag';

/**
 * Contact details for the customer's own market.
 *
 * The support line, its opening hours, the working week and the registered
 * office all change with the market. A single set of Indian details told a Doha
 * customer to ring a toll-free Indian number during IST hours, on a Monday–
 * Friday week that is not the Qatari working week.
 */
export function ContactClient() {
  const { country, dir } = useRegion();
  const legal = getLegal(country.code);

  const channels = [
    {
      icon: Phone,
      title: 'Call us',
      desc: legal.support.hours,
      action: legal.support.phone,
      href: `tel:${legal.support.phoneE164}`,
    },
    {
      icon: Mail,
      title: 'Email us',
      desc: 'We respond within 4 hours',
      action: legal.support.email,
      href: `mailto:${legal.support.email}`,
    },
    { icon: MessageCircle, title: 'Live chat', desc: '24/7 in-app chat support', action: 'Start chat', href: '#' },
    { icon: HelpCircle, title: 'Help centre', desc: 'FAQs and self-service tools', action: 'Visit help centre', href: '/marketplace/help' },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50/30" dir={dir}>
      <section className="bg-linear-to-r from-blue-600 via-cyan-600 to-teal-600 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Phone className="w-14 h-14 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3">Contact Us</h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">
            We&apos;re here to help. Reach out through any of these channels.
          </p>
          <p className="text-white/70 text-sm mt-3 inline-flex items-center gap-1.5">
            <CountryFlag code={country.code} size="xs" /> {country.name} support
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <nav className="text-sm text-slate-500 mb-8">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Contact</span>
        </nav>

        {/* Channels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {channels.map(c => (
            <a key={c.title} href={c.href} className="bg-white border border-slate-200 rounded-xl p-6 flex items-start gap-4 hover:shadow-md transition-all hover:border-blue-300">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <c.icon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 mb-0.5">{c.title}</h3>
                <p className="text-xs text-slate-500 mb-2">{c.desc}</p>
                <span className="text-sm font-semibold text-blue-600 break-words">{c.action}</span>
              </div>
            </a>
          ))}
        </div>

        {/* Contact Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-10">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Send us a message</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input placeholder="Full Name *" className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Email Address *" type="email" className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            {/* Placeholder carries the market's own calling code so the expected
                format is obvious without a separate hint. */}
            <input placeholder={`Phone Number (${country.callingCode})`} className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <select className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-500">
              <option>Select Topic</option>
              <option>Order Issue</option>
              <option>Returns &amp; Refunds</option>
              <option>Account Help</option>
              <option>Payment Issue</option>
              <option>Seller Inquiry</option>
              <option>Partnership</option>
              <option>Other</option>
            </select>
          </div>
          <textarea placeholder="Your message..." rows={5} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4" />
          <button className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">Send Message</button>
        </div>

        {/* Office Address */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" /> Our office
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Registered office</h3>
              <p className="text-sm text-slate-600 mt-1">
                {legal.entityName}
                {legal.registeredAddress.map((line) => (
                  <React.Fragment key={line}><br />{line}</React.Fragment>
                ))}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {legal.registrationLabel} {legal.registrationNumber}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Business hours</h3>
              {/* Working week derived from the market's weekend — Qatar runs
                  Sunday–Thursday, not Monday–Friday. */}
              <div className="text-sm text-slate-600 mt-1 space-y-1">
                <p className="flex items-center gap-2">
                  <Clock className="w-3 h-3 shrink-0" /> {getBusinessDaysLabel(country.code)}: {legal.support.hours}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-3 h-3 shrink-0" /> {getWeekendLabel(country.code)}: reduced hours
                </p>
                <p className="text-xs text-slate-400 mt-1.5">All times {country.timezone}.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactClient;
