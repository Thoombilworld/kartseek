'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';
import { COUNTRY_COMPLIANCE } from '@/lib/seller/country-compliance';
import { getSellerCountries } from '@/lib/seller/registration';
import type { SellerCountryCode } from '@/lib/seller/types';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  Store, ArrowRight, CheckCircle, Shield, DollarSign, Clock, Users,
  TrendingUp, ChevronDown, Star, Zap, Phone, Mail, Headphones,
  ShoppingCart, Truck, BarChart3, Leaf, Package, Globe,
  BadgeCheck, CreditCard, Boxes, MapPin, Heart, Sparkles,
} from 'lucide-react';

// ─── Country-Specific Grocery Content ───────────────────────────────────────
const GROCERY_CONTENT: Record<string, {
  heroTitle: string; heroSub: string; earningRange: string;
  sellerCount: string; payout: string; payoutFreq: string;
  categories: string[];
  testimonial: { name: string; quote: string; store: string; rating: number };
}> = {
  IN: {
    heroTitle: 'Launch Your Grocery Store Online in India',
    heroSub: 'Join 8,900+ grocery sellers reaching millions of customers across Delhi, Mumbai, Bangalore & 200+ cities.',
    earningRange: '₹1,50,000 – ₹8,00,000/month', sellerCount: '8,900+',
    payout: 'Bank Transfer + UPI', payoutFreq: 'Weekly (Tuesdays)',
    categories: ['Supermarket', 'Fresh Meat & Fish', 'Fruits & Vegetables', 'Organic Grocery', 'Bakery', 'Wholesale', 'Dark Store'],
    testimonial: { name: 'Priya Sharma', quote: 'Our online orders went from 20/day to 200/day in just 4 months. KARTSEEK\'s inventory tools saved us countless hours.', store: 'FreshMart Delhi', rating: 4.9 },
  },
  QA: {
    heroTitle: 'Grow Your Grocery Business Online in Qatar',
    heroSub: 'Reach Doha\'s growing online grocery market. Zero tax, fast delivery, and premium customer base.',
    earningRange: 'QAR 30,000 – 150,000/month', sellerCount: '1,420+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    categories: ['Supermarket', 'Fresh Market', 'Fruits & Vegetables', 'Organic & Health', 'Bakery', 'Wholesale'],
    testimonial: { name: 'Ahmed Al-Mansouri', quote: 'Excellent platform with great Arabic language support and Halal certification features.', store: 'Al Meera Fresh', rating: 4.8 },
  },
  AE: {
    heroTitle: 'Start Your Grocery Business Online in UAE',
    heroSub: 'Serve Dubai, Abu Dhabi, Sharjah — the fastest-growing online grocery market in the Middle East.',
    earningRange: 'AED 40,000 – 200,000/month', sellerCount: '3,200+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    categories: ['Supermarket', 'Fresh Meat & Fish', 'Fruits & Vegetables', 'Organic', 'Bakery', 'Dark Store'],
    testimonial: { name: 'Sara Al-Hashimi', quote: 'KARTSEEK handles VAT compliance, scheduled delivery, and cold chain — we just focus on quality.', store: 'Fresh & Co Dubai', rating: 4.7 },
  },
  SA: {
    heroTitle: 'Launch Your Online Grocery Store in Saudi Arabia',
    heroSub: 'Tap into Vision 2030\'s digital economy across Riyadh, Jeddah, Dammam & 40+ cities.',
    earningRange: 'SAR 35,000 – 180,000/month', sellerCount: '4,100+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    categories: ['Supermarket', 'Fresh Market', 'Fruits & Vegetables', 'Organic', 'Bakery', 'Wholesale'],
    testimonial: { name: 'Fahad Al-Dosari', quote: 'From a small neighborhood store to serving all of Riyadh — KARTSEEK made it possible.', store: 'Tamreez Market', rating: 4.9 },
  },
  BH: {
    heroTitle: 'Start Selling Groceries Online in Bahrain',
    heroSub: 'Reach Manama and beyond with Bahrain\'s leading grocery delivery platform.',
    earningRange: 'BHD 5,000 – 25,000/month', sellerCount: '320+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    categories: ['Supermarket', 'Mini Market', 'Fresh Market', 'Bakery', 'Wholesale'],
    testimonial: { name: 'Yusuf Al-Khalifa', quote: 'Simple onboarding, great support, and my orders doubled within weeks.', store: 'Bahrain Fresh', rating: 4.6 },
  },
  KW: {
    heroTitle: 'Grow Your Grocery Business Online in Kuwait',
    heroSub: 'Join Kuwait\'s digital grocery revolution with zero tax and premium customers.',
    earningRange: 'KWD 3,000 – 15,000/month', sellerCount: '280+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    categories: ['Supermarket', 'Mini Market', 'Fresh Market', 'Bakery', 'Wholesale'],
    testimonial: { name: 'Mariam Al-Sabah', quote: 'KARTSEEK\'s scheduled delivery feature is a game changer for our customers.', store: 'Kuwait Mart', rating: 4.7 },
  },
  OM: {
    heroTitle: 'Launch Your Online Grocery Store in Oman',
    heroSub: 'Serve Muscat and beyond with reliable delivery and full compliance support.',
    earningRange: 'OMR 2,000 – 12,000/month', sellerCount: '180+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    categories: ['Supermarket', 'Mini Market', 'Fresh Market', 'Bakery', 'Wholesale'],
    testimonial: { name: 'Khalid Al-Balushi', quote: 'The platform handles everything — from VAT to cold chain. We just sell great food.', store: 'Muscat Grocery', rating: 4.5 },
  },
  GB: {
    heroTitle: 'Start Your Online Grocery Business in the UK',
    heroSub: 'Join the UK\'s booming online grocery market across London, Manchester, Birmingham & 50+ cities.',
    earningRange: '£8,000 – £45,000/month', sellerCount: '1,800+',
    payout: 'Bank Transfer', payoutFreq: 'Weekly',
    categories: ['Supermarket', 'Fresh Market', 'Organic & Health', 'Bakery', 'Artisan Foods', 'Home-Based Food'],
    testimonial: { name: 'Emily Richardson', quote: 'The allergen tracking and distance selling compliance saved us months of legal work.', store: 'FreshBox London', rating: 4.8 },
  },
  US: {
    heroTitle: 'Launch Your Online Grocery Store in the USA',
    heroSub: 'Reach millions across New York, LA, Chicago & 100+ cities on America\'s fastest-growing platform.',
    earningRange: '$10,000 – $60,000/month', sellerCount: '2,400+',
    payout: 'ACH Transfer', payoutFreq: 'Weekly',
    categories: ['Supermarket', 'Fresh Market', 'Organic & Whole Foods', 'Bakery', 'Specialty Foods', 'Home-Based Food'],
    testimonial: { name: 'Michael Chen', quote: 'FDA compliance, state sales tax — KARTSEEK handles it all. Our focus stays on fresh quality.', store: 'GreenLeaf Grocery NYC', rating: 4.7 },
  },
};

const DEFAULT_CONTENT = GROCERY_CONTENT.IN;

const HOW_IT_WORKS = [
  { num: 1, title: 'Register Your Store', desc: 'Create your grocery seller account and select your operating country.' },
  { num: 2, title: 'Choose Store Type', desc: 'Supermarket, mini market, bakery, organic — pick your category.' },
  { num: 3, title: 'Upload Documents', desc: 'Submit country-specific food safety and business registration docs.' },
  { num: 4, title: 'Setup Your Catalog', desc: 'Add products with pricing, inventory, and category management.' },
  { num: 5, title: 'Go Live & Earn', desc: 'Start receiving orders and managing deliveries from your dashboard.' },
];

const PERKS = [
  { icon: ShoppingCart, title: 'Smart Inventory', desc: 'Real-time stock tracking, low-stock alerts, batch management, and expiry date monitoring.' },
  { icon: Truck, title: 'Fast Delivery', desc: 'Same-day delivery with cold chain support for fresh produce and perishables.' },
  { icon: BarChart3, title: 'Powerful Analytics', desc: 'Revenue trends, top sellers, customer insights, and demand forecasting.' },
  { icon: CreditCard, title: 'Flexible Payouts', desc: 'Weekly or bi-weekly payouts via bank transfer, UPI, or mobile money.' },
  { icon: Shield, title: 'Full Compliance', desc: 'Automated tax calculations, food safety compliance, and allergen tracking.' },
];

/**
 * Counted from the compliance registry rather than written down.
 *
 * This perk read "9 Countries — India, UAE, Saudi Arabia, UK, USA, Qatar,
 * Kuwait, Bahrain, Oman" as a hard-coded string, so the marketing claim and the
 * markets the platform can actually onboard a seller in were free to drift
 * apart — and did: the registration form was offering five.
 */
const MARKET_PERK = {
  icon: Globe,
  title: `${getSellerCountries().length} Countries`,
  desc: `Operate anywhere — ${getSellerCountries().map((c) => c.name).join(', ')}.`,
};

const STORE_TYPES = [
  { emoji: '🏪', label: 'Supermarket' },
  { emoji: '🏬', label: 'Mini Market' },
  { emoji: '🥩', label: 'Fresh Meat' },
  { emoji: '🐟', label: 'Fish & Seafood' },
  { emoji: '🥬', label: 'Fruits & Veggies' },
  { emoji: '🌿', label: 'Organic' },
  { emoji: '🍞', label: 'Bakery' },
  { emoji: '📦', label: 'Wholesale' },
  { emoji: '🏴', label: 'Dark Store' },
  { emoji: '🏠', label: 'Home-Based' },
];

export default function GrocerySellerLandingPage() {
  const { selectedRegion } = useRegion();

  // Map region to grocery-supported country (fallback to IN)
  const getInitialCountry = (): string => {
    if (selectedRegion !== 'ALL' && selectedRegion in GROCERY_CONTENT) return selectedRegion;
    return 'IN';
  };

  const [selectedCountry, setSelectedCountry] = useState<string>(getInitialCountry());
  const [animatedStats, setAnimatedStats] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStats(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const content = GROCERY_CONTENT[selectedCountry] || DEFAULT_CONTENT;
  const compliance = COUNTRY_COMPLIANCE[selectedCountry as SellerCountryCode];
  const regionConfig = REGIONS[selectedCountry as Exclude<SupportedCountryCode, 'ALL'>];

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black text-slate-900">KARTSEEK <span className="text-emerald-600">GROCERY</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Country Selector */}
            <div className="relative">
              <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}
                className="appearance-none bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 pr-8 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
                aria-label="Select country" id="grocery-landing-country">
                {Object.keys(GROCERY_CONTENT).map(code => (
                  <option key={code} value={code}>
                    <CountryFlag code={code as Exclude<SupportedCountryCode, 'ALL'>} size="sm" /> {REGIONS[code as Exclude<SupportedCountryCode, 'ALL'>]?.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <Link href="/seller/grocery/login" className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors" id="grocery-landing-login">
              Seller Login
            </Link>
            <Link href={`/seller/register?module=grocery&country=${selectedCountry}`} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-md" id="grocery-landing-register">
              Start Selling
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-emerald-50 via-white to-green-50">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-20 w-96 h-96 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-green-100/40 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-bold px-4 py-2 rounded-full mb-6">
                <Sparkles className="w-4 h-4" /> <CountryFlag code={regionConfig?.code ?? ""} size="sm" /> Grocery Seller Program — {regionConfig?.name || selectedCountry}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-black text-slate-900 leading-tight mb-6">
                {content.heroTitle.split(' ').map((word, i) => {
                  const highlights = ['India', 'Qatar', 'UAE', 'Saudi', 'Arabia', 'Bahrain', 'Kuwait', 'Oman', 'UK', 'USA'];
                  if (highlights.includes(word)) return <span key={i} className="text-emerald-600">{word} </span>;
                  return <span key={i}>{word} </span>;
                })}
              </h1>
              <p className="text-lg text-slate-500 mb-8 max-w-lg">{content.heroSub}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href={`/seller/register?module=grocery&country=${selectedCountry}`} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200" id="grocery-hero-register">
                  Register Your Store <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/seller/grocery/login" className="bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 font-bold px-8 py-4 rounded-2xl text-lg transition-all flex items-center justify-center gap-2">
                  Seller Login
                </Link>
              </div>
            </div>

            {/* Right: Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`bg-white border border-emerald-100 rounded-2xl p-5 shadow-lg shadow-emerald-100/50 transition-all duration-700 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-3xl font-black text-slate-900">{content.sellerCount}</p>
                <p className="text-xs text-slate-400 mt-1">Active Grocery Sellers</p>
              </div>
              <div className={`bg-white border border-emerald-100 rounded-2xl p-5 shadow-lg shadow-emerald-100/50 transition-all duration-700 delay-100 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-black text-slate-900">{content.earningRange.split('–')[0].trim()}<span className="text-emerald-500">+</span></p>
                <p className="text-xs text-slate-400 mt-1">Monthly Earnings Potential</p>
              </div>
              <div className={`bg-white border border-emerald-100 rounded-2xl p-5 shadow-lg shadow-emerald-100/50 transition-all duration-700 delay-200 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-xl font-black text-slate-900">{content.payout}</p>
                <p className="text-xs text-slate-400 mt-1">Payout Methods</p>
              </div>
              <div className={`bg-white border border-emerald-100 rounded-2xl p-5 shadow-lg shadow-emerald-100/50 transition-all duration-700 delay-300 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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

      {/* Store Types Marquee */}
      <section className="bg-emerald-600 py-5 overflow-hidden">
        <div className="flex animate-marquee gap-8 whitespace-nowrap">
          {[...STORE_TYPES, ...STORE_TYPES].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-white/90">
              <span className="text-2xl">{t.emoji}</span>
              <span className="text-sm font-bold">{t.label}</span>
              <span className="text-emerald-300 mx-2">•</span>
            </div>
          ))}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .animate-marquee { animation: marquee 30s linear infinite; display: flex; width: max-content; }
        ` }} />
      </section>

      {/* Why KARTSEEK */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
            <Zap className="w-3 h-3" /> WHY CHOOSE US
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">Everything You Need to Sell Groceries Online</h2>
          <p className="text-slate-500 max-w-xl mx-auto">From inventory management to cold chain delivery — we handle the technology so you can focus on quality.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...PERKS, MARKET_PERK].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all group">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                <Icon className="w-6 h-6 text-emerald-600" />
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
                {i < HOW_IT_WORKS.length - 1 && <div className="hidden md:block absolute top-7 left-1/2 w-full h-px bg-emerald-200" />}
                <div className="w-14 h-14 bg-emerald-600 text-white font-black text-lg rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10 shadow-md shadow-emerald-200">{s.num}</div>
                <h3 className="font-bold text-slate-900 mb-2 text-sm">{s.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Country-Specific Requirements */}
      {compliance && (
        <section className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-3"><CountryFlag code={regionConfig?.code ?? ""} size="sm" /> Requirements in {compliance.name}</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Country-specific documentation and compliance requirements for grocery sellers.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Required Documents */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <BadgeCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-900">Required Documents</h3>
              </div>
              <ul className="space-y-2.5">
                {compliance.requiredDocuments.map(doc => (
                  <li key={doc.type} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{doc.label}</p>
                      <p className="text-[11px] text-slate-400">{doc.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tax & Compliance */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900">Tax & Compliance</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Tax System</p>
                  <p className="text-sm font-bold text-slate-900">{compliance.taxLabel} {compliance.taxRate > 0 ? `(${compliance.taxRate}%)` : '(No Tax)'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Food Safety</p>
                  <p className="text-sm font-bold text-slate-900">{compliance.foodSafetyLicenceLabel}</p>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Allergen Info Required', val: compliance.allergenInfoRequired },
                    { label: 'Expiry Date Required', val: compliance.expiryDateRequired },
                    { label: 'Cold Chain Required', val: compliance.coldChainProofRequired },
                    { label: 'COD Supported', val: compliance.codSupported },
                    { label: 'Halal Certification', val: compliance.halalCertificationSupport },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{item.label}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.val ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {item.val ? '✓ Yes' : '— No'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Earnings & Payout */}
            <div className="bg-linear-to-br from-emerald-600 to-emerald-800 border border-emerald-500 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold">Earnings Potential</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-xs text-emerald-200">Monthly Revenue</p>
                  <p className="text-xl font-black">{content.earningRange}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-[10px] text-emerald-200">Payout</p>
                    <p className="text-sm font-bold">{content.payout}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-[10px] text-emerald-200">Frequency</p>
                    <p className="text-sm font-bold">{content.payoutFreq}</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-[10px] text-emerald-200">Supported Categories</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {content.categories.map(c => (
                      <span key={c} className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

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
              <div className="w-12 h-12 bg-linear-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-black text-sm">
                {content.testimonial.name.split(' ').map(w => w[0]).join('')}
              </div>
              <div>
                <p className="font-bold text-slate-900">{content.testimonial.name}</p>
                <p className="text-xs text-slate-400">{content.testimonial.store} · <CountryFlag code={regionConfig?.code ?? ""} size="sm" /> {regionConfig?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-linear-to-r from-emerald-600 via-emerald-700 to-green-700 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-full mb-6">
            <Leaf className="w-4 h-4" /> Join {Object.keys(GROCERY_CONTENT).length} Countries
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Ready to Start Selling Groceries Online?</h2>
          <p className="text-emerald-100 mb-8 max-w-xl mx-auto">Register today and join thousands of successful grocery sellers. Start receiving orders within days.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/seller/register?module=grocery&country=${selectedCountry}`} className="bg-white text-emerald-700 font-black px-8 py-4 rounded-2xl text-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-lg" id="grocery-cta-register">
              Start Selling Now <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/seller/grocery/login" className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all border border-emerald-500/30">
              Seller Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer / Support */}
      <section className="bg-white border-t border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">KARTSEEK Grocery Seller Support</p>
              <p className="text-xs text-slate-400">Available 24/7 for grocery seller inquiries</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-1.5 bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100"><Mail className="w-3.5 h-3.5" /> grocery@kartseek.com</button>
            <button className="flex items-center gap-1.5 bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100"><Phone className="w-3.5 h-3.5" /> {regionConfig?.callingCode} Help</button>
            <button className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700"><Headphones className="w-3.5 h-3.5" /> Live Chat</button>
          </div>
        </div>
      </section>
    </div>
  );
}
