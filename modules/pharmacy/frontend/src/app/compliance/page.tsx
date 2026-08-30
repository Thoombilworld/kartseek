import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as genMeta } from '@/lib/seo/metadata';
import { CountryFlag } from '@/components/shared/country-flag';
import { formatActiveCountryList } from '@/lib/localization/countries';

export const metadata: Metadata = genMeta({
  title: 'Pharmacy Compliance & Country-Wise Regulations — KARTSEEK',
  description: `Learn how KARTSEEK Pharmacy handles compliance across ${formatActiveCountryList()}. HSN codes, GST, VAT, prescription rules, and restricted medicine handling.`,
  path: '/pharmacy/compliance',
  keywords: ['pharmacy compliance', 'HSN code', 'GST pharmacy', 'VAT pharmacy', 'prescription regulations', 'medicine compliance'],
});

const COUNTRIES = [
  { code:'IN', name:'India', flag:'🇮🇳', rules:[
    { title:'HSN Code', desc:'Mandatory Harmonized System Nomenclature code for every pharmacy product for GST classification.' },
    { title:'GST Tax', desc:'5% GST on essential medicines, 12% on medical devices, 18% on personal care and supplements.' },
    { title:'Prescription Rules', desc:'Schedule H, H1, and X medicines require valid doctor prescription. Schedule X substances need special handling.' },
    { title:'Drug License', desc:'All pharmacies must hold a valid drug license issued by the State Drug Controller.' },
    { title:'FSSAI', desc:'Health supplements and nutraceuticals require FSSAI license and labeling compliance.' },
  ]},
  { code:'QA', name:'Qatar', flag:'🇶🇦', rules:[
    { title:'VAT', desc:'5% VAT on pharmacy products as per Qatar Tax Authority regulations.' },
    { title:'MOPH Registration', desc:'All medicines must be registered with the Ministry of Public Health (MOPH).' },
    { title:'Prescription Rules', desc:'Prescription medicines dispensed only with valid prescription from Qatar-licensed physician.' },
    { title:'Controlled Substances', desc:'Strict controls on narcotic and psychotropic substances per MOPH guidelines.' },
  ]},
  { code:'AE', name:'United Arab Emirates', flag:'🇦🇪', rules:[
    { title:'VAT', desc:'5% VAT on pharmacy products as per Federal Tax Authority regulations.' },
    { title:'DHA/DOH Registration', desc:'Medicine registration through Dubai Health Authority (DHA) or Department of Health Abu Dhabi (DOH).' },
    { title:'Arabic Labeling', desc:'Product labels must include Arabic text for medicine name, dosage, and instructions.' },
    { title:'Prescription Rules', desc:'Prescription medicines require valid UAE-issued prescription.' },
  ]},
  { code:'GB', name:'United Kingdom', flag:'🇬🇧', rules:[
    { title:'VAT', desc:'0% VAT on most prescription medicines, 20% on OTC and health products.' },
    { title:'MHRA Registration', desc:'All medicines must be licensed by the Medicines and Healthcare products Regulatory Agency (MHRA).' },
    { title:'POM/P/GSL Classification', desc:'Prescription Only (POM), Pharmacy (P), and General Sales List (GSL) classification system.' },
    { title:'GPhC License', desc:'All pharmacies must be registered with the General Pharmaceutical Council (GPhC).' },
  ]},
  { code:'US', name:'United States', flag:'🇺🇸', rules:[
    { title:'State Sales Tax', desc:'Sales tax varies by state. Some states exempt prescription medicines from sales tax.' },
    { title:'FDA Approval', desc:'All medicines must be FDA-approved. OTC monograph or NDA/ANDA required.' },
    { title:'DEA Scheduling', desc:'Controlled substances classified under DEA Schedules I-V with specific dispensing rules.' },
    { title:'State Pharmacy License', desc:'Pharmacies must hold state board of pharmacy license for each operating state.' },
  ]},
  { code:'IN', name:'India', flag:'🇮🇳', rules:[
    { title:'VAT', desc:'16% VAT on most pharmacy products. Essential medicines may be exempt.' },
    { title:'Drug License', desc:'All medicines must be registered with the Pharmacy and Poisons Board (PPB).' },
    { title:'Prescription Rules', desc:'Prescription medicines require valid prescription from a registered medical practitioner.' },
    { title:'Practice License', desc:'Pharmacies must hold a valid license from the Pharmacy and Poisons Board.' },
  ]},
];

const FAQS = [
  { q:'What compliance codes are required for pharmacy products?', a:'In India, HSN codes are mandatory for GST classification. In GCC countries, medicine registration codes from local health authorities are required. In the UK, MHRA license numbers apply. Each country has specific product identification requirements.' },
  { q:'How does KARTSEEK handle different country tax rules?', a:'The admin panel allows country-wise tax configuration. GST in India, VAT in GCC/UK, state sales tax in USA. Tax rates are configurable per product category and country.' },
  { q:'Are prescription rules different per country?', a:'Yes. India follows Schedule H/H1/X classification. UAE/Qatar follow MOPH/DHA rules. UK uses POM/P/GSL. USA follows DEA scheduling. KARTSEEK configures prescription requirements per country.' },
  { q:'How are restricted medicines controlled?', a:'Restricted medicines require prescription upload, pharmacist verification, and admin approval. Controlled substances have additional verification steps configured per country regulations.' },
];

export default function CompliancePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Pharmacy Compliance</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">KARTSEEK configures pharmacy regulations per country. Here&apos;s how we handle compliance across all supported markets.</p>
      </div>

      {/* Country Sections */}
      {COUNTRIES.map(country => (
        <section key={country.code} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <CountryFlag code={country.code} size="xl" />
            <h2 className="text-xl font-bold text-slate-900">{country.name}</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {country.rules.map(rule => (
              <div key={rule.title} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm mb-1">{rule.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{rule.desc}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">Compliance FAQs</h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <details key={i} className="bg-white rounded-xl border border-slate-200 group">
              <summary className="p-4 cursor-pointer font-semibold text-slate-800 text-sm hover:bg-slate-50 transition-colors list-none flex items-center justify-between">{faq.q}<span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span></summary>
              <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{faq.a}</div>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context":"https://schema.org","@type":"FAQPage","mainEntity":FAQS.map(f=>({  "@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}})) }) }} />
      </section>

      {/* Internal Links */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-3">Related Pages</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[{ name:'How It Works', href:'/pharmacy/how-it-works' },{ name:'Pharmacy Homepage', href:'/pharmacy' },{ name:'Sell on KARTSEEK', href:'/pharmacy/sell-on-kartseek' }].map(l => (
            <Link key={l.href} href={l.href} className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline">{l.name} →</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
