import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as genMeta } from '@/lib/seo/metadata';

export const metadata: Metadata = genMeta({
  title: 'Sell Pharmacy Products on KARTSEEK — Pharmacy Seller Registration',
  description: 'Register as a pharmacy seller on KARTSEEK. List medicines, health products, and OTC items. Manage orders, prescriptions, inventory, and compliance. Reach customers across multiple countries.',
  path: '/pharmacy/sell-on-kartseek',
  keywords: ['sell pharmacy products', 'pharmacy seller registration', 'list medicines online', 'KARTSEEK pharmacy seller'],
});

const STEPS = [
  { num:1, title:'Register Your Pharmacy', desc:'Create your seller account and provide pharmacy details including name, address, license number, and contact information.', icon:'📝' },
  { num:2, title:'Complete KYC & Compliance', desc:'Upload your drug license, business registration, GST/VAT certificate, and pharmacist credentials for verification.', icon:'🛡️' },
  { num:3, title:'List Your Products', desc:'Add products with images, prices, stock quantities, HSN codes (India), prescription-required flags, and compliance details.', icon:'📦' },
  { num:4, title:'Admin Approval', desc:'KARTSEEK admin reviews your store and products. Approved products go live on the customer app and website.', icon:'✅' },
  { num:5, title:'Manage Orders', desc:'Receive orders, verify prescriptions, pack medicines, and hand over to delivery. Track everything from your seller dashboard.', icon:'📋' },
  { num:6, title:'Get Paid', desc:'Receive weekly settlements after commission deduction. Track payments, commissions, and revenue from your wallet dashboard.', icon:'💰' },
];

const FEATURES = [
  { title:'Product Management', items:['Upload product images','Set prices and MRP','Manage stock quantities','Add HSN/compliance codes','Flag prescription-required medicines','Set dosage, form, manufacturer details'] },
  { title:'Order Management', items:['Accept/reject orders','View prescription uploads','Verify prescriptions','Pack and dispatch','Track delivery status','Handle refunds'] },
  { title:'Compliance Tools', items:['Drug license management','KYC verification status','Country-wise compliance codes','Restricted medicine controls','Prescription audit trail','Expiry date tracking'] },
  { title:'Business Analytics', items:['Revenue dashboard','Order analytics','Top selling products','Customer insights','Commission reports','Settlement tracking'] },
];

export default function SellOnKartseekPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Sell Pharmacy Products on KARTSEEK</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">Register your pharmacy, list products, manage orders, and reach thousands of customers. KARTSEEK handles delivery, payments, and compliance.</p>
        <Link href="/seller/pharmacy/register" className="mt-6 inline-block bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 py-3 rounded-xl transition-colors">Register as Seller</Link>
      </div>

      {/* Steps */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">How to Get Started</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map(step => (
            <div key={step.num} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{step.icon}</span>
                <span className="bg-teal-600 text-white text-xs font-black px-2 py-0.5 rounded-md">Step {step.num}</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Seller Portal Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map(feat => (
            <div key={feat.title} className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-3 text-lg">{feat.title}</h3>
              <ul className="space-y-1.5">
                {feat.items.map(item => (
                  <li key={item} className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="bg-linear-to-r from-teal-600 to-cyan-500 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-3">Start Selling Today</h2>
        <p className="text-white/70 mb-5">Join hundreds of pharmacies already serving customers on KARTSEEK.</p>
        <Link href="/seller/pharmacy/register" className="bg-white text-teal-700 font-bold px-8 py-3 rounded-xl hover:bg-teal-50 transition-colors inline-block">Register Now</Link>
      </div>

      {/* FAQ Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        { "@type":"Question","name":"How do pharmacy sellers list products?","acceptedAnswer":{"@type":"Answer","text":"Register your pharmacy, complete KYC verification, and add products with required fields including images, prices, HSN codes, and prescription flags. Products go live after admin approval."}},
        { "@type":"Question","name":"What compliance codes are needed?","acceptedAnswer":{"@type":"Answer","text":"In India, HSN codes and GST slab are mandatory. In GCC countries, medicine registration codes apply. In UK/USA, relevant regional codes are required. The system is configurable per country."}},
        { "@type":"Question","name":"How are prescription verifications handled?","acceptedAnswer":{"@type":"Answer","text":"When a customer uploads a prescription, the seller pharmacy receives it in the Prescription Management panel. A licensed pharmacist reviews, approves, or rejects the prescription with full audit trail."}}
      ]}) }} />
    </div>
  );
}
