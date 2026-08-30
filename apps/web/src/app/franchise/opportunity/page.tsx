import React from 'react';
import Link from 'next/link';
import { MapPin, TrendingUp, ShieldCheck, DollarSign, ArrowRight, CheckCircle, Globe } from 'lucide-react';

export default function FranchiseOpportunityPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-slate-900 text-white pt-24 pb-20 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 bg-[url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
        <div className="max-w-7xl mx-auto relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block py-1 px-3 rounded-full bg-teal-500/20 text-teal-400 font-bold text-xs tracking-wider uppercase mb-4">
              KARTSEEK Global Expansion
            </span>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
              Own a Digital <br /><span className="text-teal-400">Super App Territory</span>
            </h1>
            <p className="text-lg text-slate-400 mb-8 max-w-xl">
              Become a KARTSEEK Franchise Partner and control the e-commerce, grocery, taxi, and pharmacy operations in your designated city or region.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/franchise/opportunity/apply" className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold text-lg px-8 py-4 rounded-xl text-center transition-colors flex items-center justify-center gap-2">
                Apply for Franchise <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="#investment" className="bg-white/10 hover:bg-white/20 text-white font-bold text-lg px-8 py-4 rounded-xl text-center transition-colors">
                View Investment Details
              </Link>
            </div>
          </div>
          <div className="hidden md:block relative">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">Your Potential Revenue</h3>
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">+28% YoY Growth</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-slate-700 pb-3">
                  <div><p className="text-slate-400 text-sm">Marketplace & Grocery</p><p className="text-2xl font-black mt-1">10% - 15%</p></div>
                  <p className="text-emerald-400 font-bold text-sm">Commission</p>
                </div>
                <div className="flex justify-between items-end border-b border-slate-700 pb-3">
                  <div><p className="text-slate-400 text-sm">Taxi & Logistics</p><p className="text-2xl font-black mt-1">5% - 8%</p></div>
                  <p className="text-emerald-400 font-bold text-sm">Commission</p>
                </div>
                <div className="flex justify-between items-end pb-3">
                  <div><p className="text-slate-400 text-sm">Vendor Onboarding</p><p className="text-2xl font-black mt-1">₹500 - ₹2000</p></div>
                  <p className="text-emerald-400 font-bold text-sm">Per Vendor</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 w-full h-full bg-teal-500/20 rounded-2xl blur-xl -z-10" />
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-slate-900 mb-4">Why Partner With KARTSEEK?</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">We provide the technology, branding, and operational blueprint. You provide the local leadership and business network.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-6"><Globe className="w-7 h-7" /></div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Exclusive Territory</h3>
            <p className="text-slate-500">Gain exclusive rights to operate the KARTSEEK Super App in your designated city or district. No internal competition.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6"><TrendingUp className="w-7 h-7" /></div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Multiple Revenue Streams</h3>
            <p className="text-slate-500">Earn from grocery deliveries, taxi rides, restaurant orders, pharmacy sales, and vendor onboarding subscriptions.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6"><ShieldCheck className="w-7 h-7" /></div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Zero Tech Maintenance</h3>
            <p className="text-slate-500">We handle all app development, server hosting, payment gateways, and technical support. You focus entirely on local operations.</p>
          </div>
        </div>
      </div>

      {/* Investment Details */}
      <div id="investment" className="bg-white py-20 px-4 md:px-8 border-y border-slate-200">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-6">Investment & Requirements</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <CheckCircle className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Franchise Fee</h4>
                  <p className="text-slate-500 text-sm mt-1">One-time setup fee based on territory size (City/District/Zone).</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <CheckCircle className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Working Capital</h4>
                  <p className="text-slate-500 text-sm mt-1">Sufficient funds to manage initial local marketing, office space, and ground staff.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <CheckCircle className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Office Setup</h4>
                  <p className="text-slate-500 text-sm mt-1">A minimum 500 sq.ft commercial space in a prime location within your territory.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Estimated Initial Investment</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Tier 1 City (e.g., Mumbai, Delhi)</span>
                <span className="font-black text-slate-900">₹15L - ₹25L</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Tier 2 City (e.g., Pune, Jaipur)</span>
                <span className="font-black text-slate-900">₹8L - ₹15L</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Tier 3 City / District</span>
                <span className="font-black text-slate-900">₹5L - ₹8L</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-slate-600 font-medium">Zonal / Master Franchise</span>
                <span className="font-black text-teal-600">Contact Us</span>
              </div>
            </div>
            <Link href="/franchise/opportunity/apply" className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
              Start Application <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
