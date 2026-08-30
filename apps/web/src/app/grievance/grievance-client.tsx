'use client';

import React from 'react';
import Link from 'next/link';
import { Scale, ChevronRight, User, Mail, Phone, MapPin, Clock, FileText } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getLegal } from '@/lib/localization';
import { CountryFlag } from '@/components/shared/country-flag';

/**
 * Complaint redressal, on the terms of the customer's own market.
 *
 * India's Consumer Protection (E-Commerce) Rules, 2020 require a *named*
 * Grievance Officer and a 30-day resolution window. Qatar has no equivalent
 * appointment requirement — complaints escalate to the Ministry of Commerce and
 * Industry instead. Citing the Indian rules and an Indian officer to a Doha
 * customer both misstates the obligation and sends them to a body that has no
 * jurisdiction over their purchase.
 */
export function GrievanceClient() {
  const { country, dir } = useRegion();
  const legal = getLegal(country.code);

  const officerTitle = legal.requiresGrievanceOfficer ? 'Grievance Officer' : 'Customer Complaints Team';

  const steps = [
    {
      step: 1,
      title: 'Contact customer support first',
      desc: `For order-related issues, use the Help Centre or contact support on ${legal.support.phone} `
        + `(${legal.support.hours}). Most issues are resolved at this stage within 24–48 hours.`,
    },
    {
      step: 2,
      title: 'Submit a formal complaint',
      desc: `If support does not resolve it, email the ${officerTitle} at grievance@kartseek.com with your `
        + 'complaint, order ID and any supporting documents.',
    },
    {
      step: 3,
      title: 'Acknowledgement',
      desc: `We acknowledge your complaint within ${legal.grievanceAcknowledgementDays * 24} hours of receipt.`,
    },
    {
      step: 4,
      title: 'Resolution',
      desc: `We investigate and resolve within ${legal.grievanceResolutionDays} days of acknowledgement`
        + `${legal.requiresGrievanceOfficer ? `, as required under ${legal.consumerLaw}` : ''}.`,
    },
    {
      step: 5,
      title: 'Escalation',
      desc: `If you are not satisfied, you may escalate to the ${legal.consumerAuthority}`
        + `${legal.consumerHelpline ? ` on ${legal.consumerHelpline}` : ''}.`,
    },
  ];

  // Category timelines are capped by the market's statutory resolution window —
  // promising 30 days where the law allows 15 would be a promise we cannot keep.
  const cap = legal.grievanceResolutionDays;
  const timelines = [
    { type: 'Order-related (wrong or damaged item)', ack: '24 hours', res: `${Math.min(7, cap)} days` },
    { type: 'Refund not received', ack: '24 hours', res: `${Math.min(10, cap)} business days` },
    { type: 'Seller dispute', ack: `${legal.grievanceAcknowledgementDays * 24} hours`, res: `${Math.min(15, cap)} days` },
    { type: 'Data privacy concern', ack: `${legal.grievanceAcknowledgementDays * 24} hours`, res: `${Math.min(30, cap)} days` },
    { type: 'Fraudulent activity report', ack: '24 hours', res: `${Math.min(15, cap)} days` },
    { type: 'Content or listing complaint', ack: `${legal.grievanceAcknowledgementDays * 24} hours`, res: `${Math.min(15, cap)} days` },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50/30" dir={dir}>
      <section className="bg-linear-to-r from-slate-700 via-slate-800 to-slate-900 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Scale className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Complaint Redressal</h1>
          <p className="text-white/70 text-sm max-w-2xl mx-auto">
            In accordance with {legal.consumerLaw}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">{officerTitle}</span>
        </nav>

        {/* Contact details */}
        <div className="bg-white border-2 border-blue-200 rounded-xl p-5 mb-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            {officerTitle}
            <span className="ms-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
              <CountryFlag code={country.code} size="xs" /> {country.name}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Row icon={Mail} label="Email">
                <a href="mailto:grievance@kartseek.com" className="font-semibold text-blue-600 hover:underline text-sm">
                  grievance@kartseek.com
                </a>
              </Row>
              <Row icon={Phone} label="Phone">
                <a href={`tel:${legal.support.phoneE164}`} className="font-semibold text-slate-800 text-sm">
                  {legal.support.phone}
                </a>
                <p className="text-xs text-slate-500">{legal.support.hours}</p>
              </Row>
            </div>
            <div className="space-y-3">
              <Row icon={MapPin} label="Registered address">
                <p className="font-semibold text-slate-800 text-sm">{legal.entityName}</p>
                <p className="text-xs text-slate-500">{legal.registeredAddress.join(', ')}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {legal.registrationLabel} {legal.registrationNumber}
                </p>
              </Row>
            </div>
          </div>
        </div>

        {/* How to file */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            How to file a complaint
          </h2>
          <div className="space-y-4">
            {steps.map(item => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 text-xs font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timelines */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Redressal timelines
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Complaint type</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Acknowledgement</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {timelines.map(row => (
                  <tr key={row.type} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-700">{row.type}</td>
                    <td className="py-2.5 px-3 text-blue-600 font-medium">{row.ack}</td>
                    <td className="py-2.5 px-3 text-green-600 font-medium">{row.res}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Regulatory basis */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Regulatory basis</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            This redressal mechanism is established under {legal.consumerLaw}
            {legal.ecommerceLaw ? `, together with ${legal.ecommerceLaw}` : ''}, and personal data handled in the
            course of a complaint is processed under {country.compliance.citation}.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500">{label}</p>
        {children}
      </div>
    </div>
  );
}

export default GrievanceClient;
