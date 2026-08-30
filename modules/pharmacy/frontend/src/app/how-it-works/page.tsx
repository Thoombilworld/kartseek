import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as genMeta } from '@/lib/seo/metadata';
import { formatActiveCountryList } from '@/lib/localization/countries';

export const metadata: Metadata = genMeta({
  title: 'How KARTSEEK Pharmacy Works — Order Medicines Online',
  description: 'Learn how to order medicines online on KARTSEEK Pharmacy. Browse categories, select a pharmacy, add medicines to cart, upload prescriptions for Rx medicines, and get fast home delivery.',
  path: '/pharmacy/how-it-works',
  keywords: ['how to order medicines', 'pharmacy delivery', 'prescription upload', 'KARTSEEK pharmacy', 'online medicine order'],
});

const STEPS = [
  { num:1, title:'Browse Pharmacy Categories', desc:'Open the Pharmacy module and browse categories like Medicines, Baby Care, Vitamins, Skin Care, and more. Categories appear at the top of the pharmacy homepage.', icon:'🛒' },
  { num:2, title:'Select a Pharmacy Store', desc:'After choosing a category, browse nearby pharmacies that stock those products. Each pharmacy card shows rating, distance, delivery time, and available offers.', icon:'🏥' },
  { num:3, title:'Browse Products & Add to Cart', desc:'Inside a pharmacy store, browse products by category. Each product card shows name, brand, price, dosage, and stock status. Add items to your cart with one tap.', icon:'💊' },
  { num:4, title:'Upload Prescription (if Required)', desc:'For prescription-required medicines (marked Rx), upload your prescription as an image, PDF, or camera photo. The pharmacy pharmacist will verify your prescription.', icon:'📋' },
  { num:5, title:'Pharmacy Verifies Prescription', desc:'A licensed pharmacist at the pharmacy reviews your uploaded prescription. They check validity, dosage, and doctor details. You receive status updates: Under Review → Approved / Rejected.', icon:'✅' },
  { num:6, title:'Checkout & Payment', desc:'Once verified (or for OTC items), proceed to checkout. Choose delivery address, apply coupons, and pay securely. KARTSEEK supports multiple payment methods.', icon:'💳' },
  { num:7, title:'Fast Home Delivery', desc:'Your pharmacy order is packed and dispatched. Track your order in real-time. Most pharmacy deliveries arrive within 20-45 minutes.', icon:'🚀' },
];

const FAQS = [
  { q:'What is KARTSEEK Pharmacy?', a:'KARTSEEK Pharmacy is an online medicine delivery platform that connects customers with verified local pharmacies. You can order OTC medicines, health products, and prescription medicines with home delivery.' },
  { q:'How does pharmacy ordering work?', a:'Browse pharmacy categories, select a nearby pharmacy, add products to cart, upload prescription if required, and checkout. Your medicines are delivered to your doorstep.' },
  { q:'How does prescription upload work?', a:'For Rx-required medicines, click "Upload Prescription" and attach an image, PDF, or camera photo of your valid prescription. The pharmacy pharmacist verifies it before processing your order.' },
  { q:'How does pharmacy verification work?', a:'A licensed pharmacist at the pharmacy store reviews your uploaded prescription. They verify the doctor details, medicine names, dosage, and validity. You receive status updates throughout the process.' },
  { q:'Which countries are supported?', a:`KARTSEEK Pharmacy operates in ${formatActiveCountryList()}. Pharmacy compliance rules are configured per country.` },
  { q:'How is local pharmacy compliance handled?', a:'KARTSEEK configures pharmacy regulations per country. In India, HSN codes and GST are required. In GCC countries, VAT and medicine registration codes apply. Each country has specific prescription handling rules.' },
  { q:'How do pharmacy sellers list products?', a:'Pharmacy sellers register on KARTSEEK, complete KYC/compliance verification, and list products with required fields including HSN/compliance codes, pricing, images, and prescription flags.' },
  { q:'How do customers find nearby pharmacies?', a:'The pharmacy homepage shows nearby pharmacies based on your location. You can also filter by category, rating, delivery time, and offers.' },
  { q:'How are restricted medicines controlled?', a:'Restricted medicines require prescription upload and pharmacist verification. Schedule X and controlled substances have additional verification steps and cannot be ordered without valid prescriptions.' },
  { q:'How does KARTSEEK protect customer safety?', a:'All pharmacies on KARTSEEK are licensed and verified. Prescription medicines require pharmacist verification. Medicine authenticity is guaranteed. Customer health data is handled securely and never publicly visible.' },
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How KARTSEEK Pharmacy Works</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">Order medicines online from verified pharmacies near you. From browsing categories to prescription verification and fast home delivery — here&apos;s how it works.</p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map(step => (
          <div key={step.num} className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start gap-5 hover:shadow-md transition-all">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-2xl shrink-0 border border-teal-100">{step.icon}</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-teal-600 text-white text-xs font-black px-2 py-0.5 rounded-md">Step {step.num}</span>
                <h2 className="text-lg font-bold text-slate-900">{step.title}</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-linear-to-r from-teal-600 to-cyan-500 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-3">Ready to Order Medicines?</h2>
        <p className="text-white/70 mb-5">Browse verified pharmacies near you and get medicines delivered fast.</p>
        <Link href="/pharmacy" className="bg-white text-teal-700 font-bold px-8 py-3 rounded-xl hover:bg-teal-50 transition-colors inline-block">Browse Pharmacies</Link>
      </div>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <details key={i} className="bg-white rounded-xl border border-slate-200 group">
              <summary className="p-4 cursor-pointer font-semibold text-slate-800 text-sm hover:bg-slate-50 transition-colors list-none flex items-center justify-between">
                {faq.q}
                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{faq.a}</div>
            </details>
          ))}
        </div>

        {/* FAQ Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context":"https://schema.org","@type":"FAQPage",
          "mainEntity": FAQS.map(f => ({ "@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a} }))
        }) }} />
      </section>

      {/* Internal Links (GEO) */}
      <section className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-3">Explore More</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { name:'Pharmacy Homepage', href:'/pharmacy' },
            { name:'Prescription Upload', href:'/pharmacy/prescription-upload' },
            { name:'Nearby Pharmacies', href:'/pharmacy/stores' },
            { name:'Sell on KARTSEEK', href:'/pharmacy/sell-on-kartseek' },
            { name:'Pharmacy Compliance', href:'/pharmacy/compliance' },
            { name:'India Pharmacy', href:'/pharmacy/country/india' },
          ].map(link => (
            <Link key={link.href} href={link.href} className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline">{link.name} →</Link>
          ))}
        </div>
      </section>
    </div>
  );
}
