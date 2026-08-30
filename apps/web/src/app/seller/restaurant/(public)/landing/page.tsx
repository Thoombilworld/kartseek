'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  UtensilsCrossed, ArrowRight, CheckCircle, Shield, DollarSign, Clock, Users,
  MapPin, TrendingUp, Globe, BarChart3, FileText, Building2,
  ChevronDown, Star, Zap, Phone, Mail, Headphones, ShoppingBag, Truck,
  Sparkles, CreditCard, BadgeCheck
} from 'lucide-react';

// ─── Country-Specific Landing Content ─────────────────────────────────────────
// In production, this would come from an API managed by Super Admin
interface RestaurantCountryEntry {
  heroTitle: string; heroSub: string; earningRange: string; currency: string;
  restaurantCount: string; payout: string; payoutFreq: string;
  requirements: string[]; documents: string[];
  testimonial: { name: string; quote: string; restaurant: string; rating: number };
}

const COUNTRY_CONTENT: { [key: string]: RestaurantCountryEntry } = {
  QA: {
    heroTitle: 'Launch Your Restaurant on KARTSEEK in Qatar',
    heroSub: 'Partner with KARTSEEK to serve Doha\'s booming food delivery market. Zero income tax, premium customer base.',
    earningRange: 'QAR 25,000 - 120,000/month', currency: 'QAR',
    restaurantCount: '800+', payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['Qatar Municipality Food License', 'Commercial Registration (CR)', 'Health Card (Food Handlers)', 'Civil Defence Certificate', 'Qatar Chamber Membership', 'Minimum 1 operating outlet'],
    documents: ['Municipality Food License', 'Commercial Registration', 'Health Cards (Staff)', 'Civil Defence Certificate', 'QID (Owner)', 'Trade License'],
    testimonial: { name: 'Ahmed Al-Thani', quote: 'KARTSEEK helped us go from a single restaurant in Doha to serving customers across all of Qatar with seamless delivery.', restaurant: 'Al Shami Kitchen, Doha', rating: 4.9 }
  },
  AE: {
    heroTitle: 'Launch Your Restaurant on KARTSEEK in the UAE',
    heroSub: 'Partner with KARTSEEK to serve millions across Dubai, Abu Dhabi, Sharjah & more.',
    earningRange: 'AED 80,000 - 400,000/month', currency: 'AED',
    restaurantCount: '2,500+', payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['Dubai Municipality Food License', 'HACCP Certification', 'Trade License', 'Ejari / Tenancy Contract', 'Emirates ID (Owner)', 'Civil Defence Approval'],
    documents: ['DM Food License', 'HACCP Certificate', 'Trade License', 'Ejari Contract', 'Emirates ID', 'Civil Defence Certificate'],
    testimonial: { name: 'Fatima Al-Zahra', quote: 'KARTSEEK\'s tech-first approach and automated compliance tracking make running a restaurant in Dubai so much easier.', restaurant: 'Zafran House, Dubai', rating: 4.7 }
  },
  SA: {
    heroTitle: 'Grow Your Restaurant Business in Saudi Arabia',
    heroSub: 'Serve Vision 2030 food demand across Riyadh, Jeddah, Dammam & beyond.',
    earningRange: 'SAR 60,000 - 350,000/month', currency: 'SAR',
    restaurantCount: '1,800+', payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['Baladi / Municipality License', 'Health Permit (Weqaya)', 'Commercial Registration (CR)', 'VAT Certificate', 'Civil Defence Certificate', 'Saudization Compliance'],
    documents: ['Baladi License', 'Health Permit', 'CR Certificate', 'VAT Registration', 'National ID / Iqama', 'Civil Defence Certificate'],
    testimonial: { name: 'Abdullah Al-Rashid', quote: 'KARTSEEK handles all the Saudi compliance. We focus on cooking amazing food while they handle the tech.', restaurant: 'Najd Kitchen, Riyadh', rating: 4.8 }
  },
  BH: {
    heroTitle: 'Start Your Restaurant Business Online in Bahrain',
    heroSub: 'Reach Manama and beyond with Bahrain\'s leading food delivery platform.',
    earningRange: 'BHD 4,000 - 20,000/month', currency: 'BHD',
    restaurantCount: '350+', payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['Municipality Health Permit', 'Commercial Registration', 'Civil Defence Certificate', 'Health Cards (Staff)', 'BCCI Membership', 'Minimum 1 outlet'],
    documents: ['Health Permit', 'CR Certificate', 'Civil Defence Certificate', 'Health Cards', 'CPR (Owner)', 'Trade License'],
    testimonial: { name: 'Yusuf Al-Khalifa', quote: 'Simple onboarding, great support, and our delivery orders tripled within months of joining KARTSEEK.', restaurant: 'Bahrain Bites, Manama', rating: 4.6 }
  },
  KW: {
    heroTitle: 'Grow Your Restaurant Online in Kuwait',
    heroSub: 'Join Kuwait\'s digital food revolution. Zero income tax, premium customer base.',
    earningRange: 'KWD 3,000 - 15,000/month', currency: 'KWD',
    restaurantCount: '280+', payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['KFDA Food License', 'Municipality Health Certificate', 'Commercial License', 'Civil Defence Certificate', 'Health Cards (Staff)', 'KCCI Registration'],
    documents: ['KFDA License', 'Health Certificate', 'Commercial License', 'Civil Defence Certificate', 'Civil ID (Owner)', 'Health Cards'],
    testimonial: { name: 'Mariam Al-Sabah', quote: 'KARTSEEK\'s scheduled delivery and pre-order features are game changers for our catering business.', restaurant: 'Sufra Kuwait, Kuwait City', rating: 4.7 }
  },
  OM: {
    heroTitle: 'Launch Your Restaurant on KARTSEEK in Oman',
    heroSub: 'Serve Muscat and beyond with reliable delivery and full compliance support.',
    earningRange: 'OMR 2,000 - 12,000/month', currency: 'OMR',
    restaurantCount: '180+', payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['Oman Municipality Food Permit', 'Commercial Registration', 'Health Cards (Staff)', 'Civil Defence Certificate', 'OCCI Membership', 'VAT Registration'],
    documents: ['Municipality Permit', 'CR Certificate', 'Health Cards', 'Civil Defence Certificate', 'National ID (Owner)', 'VAT Certificate'],
    testimonial: { name: 'Khalid Al-Balushi', quote: 'The platform handles VAT, food safety, and delivery logistics — we just focus on making great food.', restaurant: 'Muscat Grill, Muscat', rating: 4.5 }
  },
  IN: {
    heroTitle: 'Scale Your Restaurant in India',
    heroSub: 'Join 5,000+ restaurants earning with KARTSEEK across Bangalore, Mumbai, Delhi & 100+ cities.',
    earningRange: '₹5,00,000 - ₹25,00,000/month', currency: 'INR',
    restaurantCount: '5,000+', payout: 'Bank Transfer + UPI', payoutFreq: 'Weekly (Mondays)',
    requirements: ['FSSAI Food License', 'GST Registration', 'Shop & Establishment License', 'Fire NOC', 'Eating House License', 'Minimum 1 operating outlet'],
    documents: ['FSSAI License', 'GST Certificate', 'PAN Card', 'Shop & Establishment License', 'Fire NOC', 'Health / Trade License'],
    testimonial: { name: 'Arjun Sharma', quote: 'Started with one cloud kitchen in Bangalore. KARTSEEK helped us expand to 8 outlets across 3 cities in just a year.', restaurant: 'Spice Route Kitchen, Bangalore', rating: 4.8 }
  },
  GB: {
    heroTitle: 'Partner Your Restaurant with KARTSEEK in the UK',
    heroSub: 'Join the growing food delivery market across London, Manchester, Birmingham & 30+ cities.',
    earningRange: '£20,000 - £80,000/month', currency: 'GBP',
    restaurantCount: '1,500+', payout: 'Bank Transfer', payoutFreq: 'Weekly',
    requirements: ['FSA Food Business Registration', 'Food Hygiene Rating (FHRS)', 'Alcohol License (if applicable)', 'Employer Liability Insurance', 'Allergen Documentation', 'EHO Inspection Compliance'],
    documents: ['FSA Registration', 'Food Hygiene Certificate', 'Premises License', 'Public Liability Insurance', 'Allergen Documentation', 'Gas Safety Certificate'],
    testimonial: { name: 'James Chen', quote: 'KARTSEEK understands UK food regulations perfectly. Their platform helped us get a 5-star hygiene rating and boost online orders.', restaurant: 'Dragon Palace, London', rating: 4.6 }
  },
  US: {
    heroTitle: 'Launch Your Restaurant on KARTSEEK in the USA',
    heroSub: 'Reach millions across New York, LA, Chicago & 100+ cities on America\'s fastest-growing platform.',
    earningRange: '$15,000 - $80,000/month', currency: 'USD',
    restaurantCount: '2,200+', payout: 'ACH Transfer', payoutFreq: 'Weekly',
    requirements: ['FDA Food Facility Registration', 'State Health Department Permit', 'Business License', 'ServSafe Certification', 'Fire Department Permit', 'Employer Identification Number (EIN)'],
    documents: ['Health Permit', 'Business License', 'EIN Certificate', 'ServSafe Certificate', 'Fire Dept Permit', 'Liability Insurance'],
    testimonial: { name: 'Maria Santos', quote: 'KARTSEEK handles state-by-state compliance which was our biggest headache. Now we can focus on growing.', restaurant: 'Casa Santos, New York', rating: 4.7 }
  }
};

const DEFAULT_CONTENT = COUNTRY_CONTENT.QA;

const HOW_IT_WORKS = [
  { num: 1, title: 'Apply Online', desc: 'Create your restaurant account, select your country, and add your business details.' },
  { num: 2, title: 'Upload Documents', desc: 'Submit country-specific food safety and compliance documents for verification.' },
  { num: 3, title: 'Set Up Menu', desc: 'Add your menu items, prices, photos, and configure delivery/dine-in options.' },
  { num: 4, title: 'Get Approved', desc: 'Our team reviews and approves your application within 1-3 business days.' },
  { num: 5, title: 'Start Earning', desc: 'Go live on KARTSEEK. Track orders, reviews, and revenue from your dashboard.' },
];

const PERKS = [
  { icon: DollarSign, title: 'High Revenue', desc: 'Maximize earnings with smart pricing, promotions, and commission optimization.' },
  { icon: ShoppingBag, title: 'Order Management', desc: 'Manage delivery, dine-in, and takeaway orders from a single dashboard.' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Real-time KPIs, customer insights, and revenue trends at your fingertips.' },
  { icon: Clock, title: 'Fast Payouts', desc: 'guaranteed weekly or bi-weekly payouts directly to your bank or UPI.' },
  { icon: Truck, title: 'Delivery Integration', desc: 'Built-in delivery fleet or use your own riders. Real-time driver tracking.' },
  { icon: Globe, title: 'Multi-Location', desc: 'Manage multiple outlets across cities and countries from one portal.' },
];

const RESTAURANT_TYPES = [
  { emoji: '🍽️', label: 'Fine Dining' },
  { emoji: '🍕', label: 'Fast Food' },
  { emoji: '☕', label: 'Café' },
  { emoji: '🍜', label: 'Asian' },
  { emoji: '🥙', label: 'Middle Eastern' },
  { emoji: '🍛', label: 'Indian' },
  { emoji: '🥗', label: 'Healthy' },
  { emoji: '🍰', label: 'Bakery' },
  { emoji: '🏠', label: 'Cloud Kitchen' },
  { emoji: '🍔', label: 'Burger & Grill' },
];

export default function RestaurantLandingPage() {
  const { selectedRegion } = useRegion();

  const getInitialCountry = (): string => {
    if (selectedRegion !== 'ALL' && selectedRegion in COUNTRY_CONTENT) return selectedRegion;
    return 'QA';
  };

  const [selectedCountry, setSelectedCountry] = useState<string>(getInitialCountry());
  const [animatedStats, setAnimatedStats] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStats(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const content = COUNTRY_CONTENT[selectedCountry] || DEFAULT_CONTENT;
  const regionConfig = REGIONS[selectedCountry as Exclude<SupportedCountryCode, 'ALL'>];

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-sm">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black text-slate-900">KARTSEEK <span className="text-orange-600">RESTAURANT</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Country Selector */}
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="appearance-none bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold px-3 py-2 pr-8 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-orange-500"
                aria-label="Select country"
                id="restaurant-landing-country-select"
              >
                {Object.keys(COUNTRY_CONTENT).map(code => (
                  <option key={code} value={code}>
                    <CountryFlag code={code as Exclude<SupportedCountryCode, 'ALL'>} size="sm" /> {REGIONS[code as Exclude<SupportedCountryCode, 'ALL'>]?.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-orange-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <Link href="/seller/restaurant/login" className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors" id="restaurant-landing-login">
              Partner Login
            </Link>
            <Link href={`/seller/restaurant/onboarding?country=${selectedCountry}`} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-md" id="restaurant-landing-register">
              Register Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-orange-50 via-white to-red-50">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-20 w-96 h-96 rounded-full bg-orange-200/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-red-100/40 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-100 border border-orange-200 text-orange-700 text-sm font-bold px-4 py-2 rounded-full mb-6">
                <Sparkles className="w-4 h-4" /> <CountryFlag code={regionConfig?.code ?? ""} size="sm" /> Restaurant Partner Program — {regionConfig?.name || selectedCountry}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-black text-slate-900 leading-tight mb-6">
                {content.heroTitle.split(' ').map((word, i) => {
                  const highlights = ['Qatar', 'India', 'UAE', 'Saudi', 'Arabia', 'Bahrain', 'Kuwait', 'Oman', 'UK', 'USA', 'India', 'KARTSEEK'];
                  if (highlights.includes(word))
                    return <span key={i} className="text-orange-600">{word} </span>;
                  return <span key={i}>{word} </span>;
                })}
              </h1>
              <p className="text-lg text-slate-500 mb-8 max-w-lg">{content.heroSub}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href={`/seller/restaurant/onboarding?country=${selectedCountry}`} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200" id="restaurant-hero-register">
                  Register Your Restaurant <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/seller/restaurant/login" className="bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 font-bold px-8 py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2">
                  Partner Login
                </Link>
              </div>
            </div>

            {/* Right: Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`bg-white border border-orange-100 rounded-2xl p-5 shadow-lg shadow-orange-100/50 transition-all duration-700 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-3xl font-black text-slate-900">{content.restaurantCount}</p>
                <p className="text-xs text-slate-400 mt-1">Partner Restaurants</p>
              </div>
              <div className={`bg-white border border-orange-100 rounded-2xl p-5 shadow-lg shadow-orange-100/50 transition-all duration-700 delay-100 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-black text-slate-900">{content.earningRange.split('-')[0].trim()}<span className="text-orange-500">+</span></p>
                <p className="text-xs text-slate-400 mt-1">Monthly Earnings Potential</p>
              </div>
              <div className={`bg-white border border-orange-100 rounded-2xl p-5 shadow-lg shadow-orange-100/50 transition-all duration-700 delay-200 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-xl font-black text-slate-900">{content.payout}</p>
                <p className="text-xs text-slate-400 mt-1">Payout Methods</p>
              </div>
              <div className={`bg-white border border-orange-100 rounded-2xl p-5 shadow-lg shadow-orange-100/50 transition-all duration-700 delay-300 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xl font-black text-slate-900">{content.payoutFreq}</p>
                <p className="text-xs text-slate-400 mt-1">Payout Schedule</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Types Marquee */}
      <section className="bg-orange-500 py-5 overflow-hidden">
        <div className="flex animate-marquee gap-8 whitespace-nowrap">
          {[...RESTAURANT_TYPES, ...RESTAURANT_TYPES].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-white/90">
              <span className="text-2xl">{t.emoji}</span>
              <span className="text-sm font-bold">{t.label}</span>
              <span className="text-orange-300 mx-2">•</span>
            </div>
          ))}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .animate-marquee { animation: marquee 30s linear infinite; display: flex; width: max-content; }
        ` }} />
      </section>

      {/* Why Partner */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
            <Zap className="w-3 h-3" /> WHY CHOOSE US
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">Everything You Need to Grow Your Restaurant</h2>
          <p className="text-slate-500 max-w-xl mx-auto">From order management to delivery logistics — we handle the technology so you can focus on amazing food.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PERKS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-50 transition-all group">
              <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
                <Icon className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-3">How to Get Started</h2>
            <p className="text-slate-500">Five simple steps from registration to your first online order.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {i < HOW_IT_WORKS.length - 1 && <div className="hidden md:block absolute top-7 left-1/2 w-full h-px bg-orange-200" />}
                <div className="w-14 h-14 bg-orange-500 text-white font-black text-lg rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10 shadow-md shadow-orange-200">{s.num}</div>
                <h3 className="font-bold text-slate-900 mb-2 text-sm">{s.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Country Requirements + Earnings */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 mb-3"><CountryFlag code={regionConfig?.code ?? ""} size="sm" /> Requirements in {regionConfig?.name}</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Country-specific documentation and compliance requirements for restaurant partners.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Required Documents */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <BadgeCheck className="w-4 h-4 text-orange-600" />
              </div>
              <h3 className="font-bold text-slate-900">Restaurant Requirements</h3>
            </div>
            <ul className="space-y-2.5">
              {content.requirements.map(r => (
                <li key={r} className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-slate-700">{r}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Documents Checklist */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900">Documents Needed</h3>
            </div>
            <div className="space-y-2.5">
              {content.documents.map((doc) => (
                <div key={doc} className="flex items-center gap-2.5 bg-slate-50 px-3 py-2 rounded-lg">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <p className="text-sm text-slate-700">{doc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings Card */}
          <div className="bg-linear-to-br from-orange-500 to-red-600 border border-orange-400 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold">Earnings Potential</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-xs text-orange-100">Monthly Revenue</p>
                <p className="text-xl font-black">{content.earningRange}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-[10px] text-orange-100">Payout</p>
                  <p className="text-sm font-bold">{content.payout}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-[10px] text-orange-100">Frequency</p>
                  <p className="text-sm font-bold">{content.payoutFreq}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-5 h-5 ${i < Math.floor(content.testimonial.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
              ))}
              <span className="text-amber-600 font-bold text-sm ml-2">{content.testimonial.rating}</span>
            </div>
            <blockquote className="text-xl text-slate-900 font-medium leading-relaxed mb-6">
              &ldquo;{content.testimonial.quote}&rdquo;
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-black text-sm">
                {content.testimonial.name.split(' ').map(w => w[0]).join('')}
              </div>
              <div>
                <p className="font-bold text-slate-900">{content.testimonial.name}</p>
                <p className="text-xs text-slate-400">{content.testimonial.restaurant} · <CountryFlag code={regionConfig?.code ?? ""} size="sm" /> {regionConfig?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-linear-to-r from-orange-500 via-orange-600 to-red-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-full mb-6">
            <UtensilsCrossed className="w-4 h-4" /> Join {Object.keys(COUNTRY_CONTENT).length} Countries
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Ready to Grow Your Restaurant?</h2>
          <p className="text-orange-100 mb-8 max-w-xl mx-auto">Register today and join thousands of successful restaurant partners. Start receiving orders within days.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/seller/restaurant/onboarding?country=${selectedCountry}`} className="bg-white text-orange-600 font-black px-8 py-4 rounded-2xl text-lg hover:bg-orange-50 transition-all flex items-center justify-center gap-2 shadow-lg" id="restaurant-cta-register">
              Register Your Restaurant <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/seller/restaurant/login" className="bg-orange-800 hover:bg-orange-900 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all border border-orange-500/30">
              Partner Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer / Support */}
      <section className="bg-white border-t border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">KARTSEEK Restaurant Partner Support</p>
              <p className="text-xs text-slate-400">Available 24/7 for restaurant partner inquiries</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-1.5 bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100"><Mail className="w-3.5 h-3.5" /> restaurants@kartseek.com</button>
            <button className="flex items-center gap-1.5 bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100"><Phone className="w-3.5 h-3.5" /> {regionConfig?.callingCode} Help</button>
            <button className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-600"><Headphones className="w-3.5 h-3.5" /> Live Chat</button>
          </div>
        </div>
      </section>
    </div>
  );
}
