'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  Car, ArrowRight, CheckCircle, Shield, DollarSign, Clock, Users,
  MapPin, TrendingUp, Globe, BarChart3, FileText, Building2,
  ChevronDown, Star, Zap, Phone, Mail, Headphones
} from 'lucide-react';

// ─── Country-Specific Landing Content ─────────────────────────────────────────
// In production, this would come from an API managed by Super Admin
type TaxiCountryContent = Record<string, {
  heroTitle: string; heroSub: string; earningRange: string; currency: string;
  driverCount: string; payout: string; payoutFreq: string;
  requirements: string[]; documents: string[];
  testimonial: { name: string; quote: string; fleet: string; rating: number };
}>;

const COUNTRY_CONTENT: TaxiCountryContent = {
  QA: {
    heroTitle: 'Launch Your Fleet Business in Qatar',
    heroSub: 'Partner with KARTSEEK to serve Doha\'s growing ride-hailing market. Zero income tax, premium customer base.',
    earningRange: 'QAR 30,000 – 150,000/month', currency: 'QAR',
    driverCount: '500+', payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['MOI Fleet License', 'Commercial Registration (CR)', 'Vehicle Insurance', 'Qatar Chamber Membership', 'QID (Owner)', 'Vehicles under 5 years old'],
    documents: ['MOI Fleet License', 'Commercial Registration', 'QID', 'Vehicle Insurance', 'Vehicle Registration (Istimara)', 'Trade License'],
    testimonial: { name: 'Khalid Al-Marri', quote: 'KARTSEEK made launching our fleet in Doha seamless. Payouts are always on time and the vendor portal is excellent.', fleet: 'Doha Express Fleet', rating: 4.9 }
  },
  IN: {
    heroTitle: 'Launch Your Fleet Business in India',
    heroSub: 'Join 1,200+ fleet vendors earning with KARTSEEK across Bangalore, Mumbai, Delhi & 50+ cities.',
    earningRange: '₹3,00,000 – ₹12,00,000/month', currency: 'INR',
    driverCount: '8,000+', payout: 'Bank Transfer + UPI', payoutFreq: 'Weekly (Mondays)',
    requirements: ['GST Registration', 'PAN Card', 'Business Registration Certificate', 'Vehicle Insurance Policy', 'Fleet Registration (RC Book)', 'Minimum 1 vehicle less than 8 years old'],
    documents: ['GST Certificate', 'PAN Card', 'Business Registration', 'Fleet RC Books', 'Vehicle Insurance', 'Address Proof'],
    testimonial: { name: 'Rajesh Patel', quote: 'Started with 5 autos in Bangalore. Now I manage 40 cabs and 12 autos. KARTSEEK\'s vendor portal is world-class.', fleet: 'SpeedCab India', rating: 4.8 }
  },
  AE: {
    heroTitle: 'Start Your Fleet Business in the UAE',
    heroSub: 'Partner with KARTSEEK to serve millions across Dubai, Abu Dhabi, Sharjah & more.',
    earningRange: 'AED 50,000 – 200,000/month', currency: 'AED',
    driverCount: '1,500+', payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['RTA Fleet Operator Permit', 'Valid Trade License', 'TRN Certificate', 'Fleet Insurance Policy', 'Emirates ID (Owner)', 'Vehicles under 5 years old'],
    documents: ['RTA Fleet Permit', 'Trade License', 'TRN Certificate', 'Emirates ID', 'Fleet Insurance', 'MOHRE Labor Card'],
    testimonial: { name: 'Ahmed Al-Fahim', quote: 'Managing a fleet in Dubai was challenging until KARTSEEK. Now payouts, compliance, and driver docs are all automated.', fleet: 'SafeRide UAE', rating: 4.7 }
  },
  SA: {
    heroTitle: 'Launch Your Fleet Business in Saudi Arabia',
    heroSub: 'Serve Vision 2030 transportation demand across Riyadh, Jeddah, Dammam & beyond.',
    earningRange: 'SAR 40,000 – 180,000/month', currency: 'SAR',
    driverCount: '1,200+', payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['TGA Transport License', 'Commercial Registration (CR)', 'VAT Certificate', 'Fleet Insurance', 'Municipality License', 'Vehicles under 5 years'],
    documents: ['TGA License', 'CR Certificate', 'VAT Registration', 'National ID / Iqama', 'Fleet Insurance', 'Municipality License'],
    testimonial: { name: 'Fahad Al-Otaibi', quote: 'KARTSEEK\'s vendor portal handles all our Saudi compliance needs. We focus on growing our fleet.', fleet: 'Riyadh Express', rating: 4.8 }
  },
  GB: {
    heroTitle: 'Start Your Fleet Business in the UK',
    heroSub: 'Join the growing private hire market across London, Manchester, Birmingham & 30+ cities.',
    earningRange: '£15,000 – £60,000/month', currency: 'GBP',
    driverCount: '800+', payout: 'Bank Transfer', payoutFreq: 'Weekly',
    requirements: ['Private Hire Operator License', 'Companies House Registration', 'VAT Registration (if applicable)', 'Public Liability Insurance', 'Fleet Insurance', 'DBS Check (Director)'],
    documents: ['PHV Operator License', 'Companies House Certificate', 'VAT Registration', 'Public Liability Insurance', 'Fleet Insurance', 'DBS Check'],
    testimonial: { name: 'David Thompson', quote: 'KARTSEEK understands UK transport regulations. Their compliance tracking saves us hours every week.', fleet: 'GreenCab London', rating: 4.6 }
  }
};

// Default fallback
const DEFAULT_CONTENT = COUNTRY_CONTENT.IN;

const HOW_IT_WORKS = [
  { num: 1, title: 'Register Your Fleet', desc: 'Create your vendor account, select your country, and add your fleet details.' },
  { num: 2, title: 'Upload Documents', desc: 'Submit country-specific compliance documents for Super Admin verification.' },
  { num: 3, title: 'Get Approved', desc: 'Our team reviews and approves your application within 1–3 business days.' },
  { num: 4, title: 'Add Drivers', desc: 'Onboard drivers with their documentation. Each driver is individually approved.' },
  { num: 5, title: 'Start Earning', desc: 'Your fleet goes live. Track earnings, trips, and payouts from your dashboard.' },
];

const PERKS = [
  { icon: DollarSign, title: 'High Revenue', desc: 'Maximize fleet earnings with dynamic pricing and surge optimization.' },
  { icon: Shield, title: 'Full Insurance', desc: 'Every trip is covered. Comprehensive fleet and passenger insurance.' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Real-time KPIs, driver performance, and revenue trends at your fingertips.' },
  { icon: Clock, title: 'Fast Payouts', desc: 'guaranteed weekly or bi-weekly payouts directly to your bank or UPI.' },
  { icon: Users, title: 'Driver Management', desc: 'Complete onboarding, document tracking, and performance monitoring.' },
  { icon: Globe, title: 'Multi-Country', desc: 'Operate across multiple countries with compliant, localized workflows.' },
];

export default function VendorLandingPage() {
  const { selectedRegion } = useRegion();
  const [selectedCountry, setSelectedCountry] = useState<string>(
    selectedRegion !== 'ALL' && selectedRegion in COUNTRY_CONTENT ? selectedRegion : 'IN'
  );

  const content = COUNTRY_CONTENT[selectedCountry] || DEFAULT_CONTENT;
  const regionConfig = REGIONS[selectedCountry as Exclude<SupportedCountryCode, 'ALL'>];

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-400 to-amber-500 flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-white">KARTSEEK <span className="text-amber-400">VENDOR</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Country Selector */}
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="appearance-none bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-2 pr-8 rounded-lg outline-none cursor-pointer"
                aria-label="Select country"
                id="landing-country-select"
              >
                {Object.entries(COUNTRY_CONTENT).map(([code, c]) => (
                  <option key={code} value={code} className="text-slate-900">
                    <CountryFlag code={code as Exclude<SupportedCountryCode, 'ALL'>} size="sm" /> {REGIONS[code as Exclude<SupportedCountryCode, 'ALL'>]?.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-white/50 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <Link href="/seller/taxi/login" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors" id="landing-login">
              Sign In
            </Link>
            <Link href={`/seller/taxi/register?country=${selectedCountry}`} className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-md" id="landing-register">
              Register Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm font-bold px-4 py-2 rounded-full mb-6">
              <Zap className="w-4 h-4" /> <CountryFlag code={regionConfig?.code ?? ""} size="sm" /> Fleet Partner Program — {regionConfig?.name || selectedCountry}
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
              {content.heroTitle.split(' ').map((word, i) => {
                if (['India', 'India', 'UAE', 'Saudi', 'UK'].includes(word))
                  return <span key={i} className="text-amber-400">{word} </span>;
                return <span key={i}>{word} </span>;
              })}
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl">{content.heroSub}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={`/seller/taxi/register?country=${selectedCountry}`} className="bg-amber-400 hover:bg-amber-300 text-black font-black px-8 py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2" id="hero-register">
                Register Your Fleet <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/seller/taxi/login" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2">
                Vendor Login
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-12">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-black text-amber-400">{content.driverCount}</p>
                <p className="text-xs text-slate-400">Active Drivers</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-black text-emerald-400">{content.earningRange.split(' ')[0]}</p>
                <p className="text-xs text-slate-400">Potential Monthly Earnings</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-black text-blue-400">{content.payoutFreq}</p>
                <p className="text-xs text-slate-400">Payout Schedule</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Partner With Us */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-black text-white text-center mb-3">Why Partner With KARTSEEK?</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">Industry-leading technology, transparent payouts, and full compliance management.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PERKS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-amber-400/30 hover:bg-white/[0.07] transition-all group">
              <div className="w-12 h-12 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-400/20 transition-colors">
                <Icon className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="font-bold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-800/50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-black text-white text-center mb-12">How to Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {i < HOW_IT_WORKS.length - 1 && <div className="hidden md:block absolute top-6 left-1/2 w-full h-px bg-white/10" />}
                <div className="w-12 h-12 bg-amber-400 text-black font-black text-lg rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">{s.num}</div>
                <h3 className="font-bold text-white mb-2 text-sm">{s.title}</h3>
                <p className="text-slate-400 text-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Country Requirements + Earnings */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-black text-white text-center mb-3"><CountryFlag code={regionConfig?.code ?? ""} size="sm" /> Requirements in {regionConfig?.name}</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">Country-specific documentation and compliance requirements for fleet vendors.</p>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Requirements */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-400" /> Fleet Requirements</h3>
            <ul className="space-y-3">
              {content.requirements.map(r => (
                <li key={r} className="flex items-center gap-3 text-slate-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Earnings Card */}
          <div className="bg-linear-to-br from-amber-500/20 to-amber-600/10 border border-amber-400/30 rounded-2xl p-6">
            <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-amber-400" /> Earnings Potential</h3>
            <div className="space-y-4">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-sm text-amber-200">Monthly Revenue Range</p>
                <p className="text-2xl font-black text-white">{content.earningRange}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-200">Payout Method</p>
                  <p className="text-sm font-bold text-white">{content.payout}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-200">Frequency</p>
                  <p className="text-sm font-bold text-white">{content.payoutFreq}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Required Documents */}
      <section className="bg-slate-800/50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-black text-white text-center mb-3"><CountryFlag code={regionConfig?.code ?? ""} size="sm" /> Documents Needed</h2>
          <p className="text-slate-400 text-center mb-10 max-w-xl mx-auto">All documents are verified by our Super Admin team within 1–3 business days.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {content.documents.map((doc, i) => (
              <div key={doc} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:border-amber-400/30 transition-colors">
                <div className="w-8 h-8 bg-amber-400/10 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-sm font-medium text-slate-200">{doc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-5 h-5 ${i < Math.floor(content.testimonial.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
            ))}
            <span className="text-amber-400 font-bold text-sm ml-2">{content.testimonial.rating}</span>
          </div>
          <blockquote className="text-xl text-white font-medium leading-relaxed mb-6">
            &ldquo;{content.testimonial.quote}&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-linear-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-black text-sm">
              {content.testimonial.name.split(' ').map(w => w[0]).join('')}
            </div>
            <div>
              <p className="font-bold text-white">{content.testimonial.name}</p>
              <p className="text-xs text-slate-400">{content.testimonial.fleet} · <CountryFlag code={regionConfig?.code ?? ""} size="sm" /> {regionConfig?.name}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-linear-to-r from-amber-500 to-amber-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-white mb-4">Ready to Grow Your Fleet?</h2>
          <p className="text-amber-100 mb-8 max-w-xl mx-auto">Register today and join thousands of successful fleet vendors across {Object.keys(COUNTRY_CONTENT).length} countries.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/seller/taxi/register?country=${selectedCountry}`} className="bg-white text-amber-600 font-black px-8 py-4 rounded-2xl text-lg hover:bg-amber-50 transition-all flex items-center justify-center gap-2" id="cta-register">
              Register Your Fleet <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/seller/taxi/login" className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all border border-amber-400/30">
              Vendor Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer / Support */}
      <section className="bg-slate-900 border-t border-white/10 py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">KARTSEEK Vendor Support</p>
              <p className="text-xs text-slate-400">Available 24/7 for fleet partner inquiries</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-1.5 bg-white/10 text-white px-4 py-2 rounded-lg text-xs font-bold border border-white/10 hover:bg-white/20"><Mail className="w-3.5 h-3.5" /> vendors@kartseek.com</button>
            <button className="flex items-center gap-1.5 bg-white/10 text-white px-4 py-2 rounded-lg text-xs font-bold border border-white/10 hover:bg-white/20" aria-label="Call"><Phone className="w-3.5 h-3.5" /> +91 700 000 000</button>
            <button className="flex items-center gap-1.5 bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-400"><Headphones className="w-3.5 h-3.5" /> Live Chat</button>
          </div>
        </div>
      </section>
    </div>
  );
}
