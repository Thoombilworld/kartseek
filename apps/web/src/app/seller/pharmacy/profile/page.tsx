'use client';
import React, { useState, useEffect } from 'react';
import {
  Store, Star, MapPin, Phone, Clock, Edit2, Camera,
  Pill, Heart, Sparkles, Stethoscope, Package, Dumbbell,
  Baby, ShieldCheck, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { vendorPharmacyApi } from '@/lib/api/vendor-pharmacy';

const CATEGORIES_BREAKDOWN = [
  { name: 'Medicines', count: 245, icon: Pill, color: 'bg-blue-100 text-blue-700' },
  { name: 'Beauty & Cosmetics', count: 89, icon: Sparkles, color: 'bg-pink-100 text-pink-700' },
  { name: 'Health & Wellness', count: 67, icon: Heart, color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Medical Devices', count: 34, icon: Stethoscope, color: 'bg-purple-100 text-purple-700' },
  { name: 'Personal Care', count: 56, icon: Package, color: 'bg-amber-100 text-amber-700' },
  { name: 'Fitness & Nutrition', count: 23, icon: Dumbbell, color: 'bg-orange-100 text-orange-700' },
  { name: 'Mother & Baby', count: 41, icon: Baby, color: 'bg-cyan-100 text-cyan-700' },
];

const FEATURED_PRODUCTS = [
  { name: 'CeraVe Moisturizing Cream', cat: 'Beauty', price: '₹299', rating: 4.7, reviews: 156 },
  { name: 'Dolo 650', cat: 'Medicine', price: '₹28', rating: 4.5, reviews: 342 },
  { name: 'Ensure Nutrition Powder', cat: 'Wellness', price: '₹750', rating: 4.6, reviews: 89 },
  { name: 'Omron BP Monitor', cat: 'Device', price: '₹1,800', rating: 4.8, reviews: 67 },
  { name: 'The Ordinary Niacinamide', cat: 'Beauty', price: '₹590', rating: 4.4, reviews: 201 },
  { name: 'MuscleBlaze Protein 1kg', cat: 'Fitness', price: '₹1,499', rating: 4.3, reviews: 128 },
];

const CAT_COLORS: Record<string, string> = {
  Beauty: 'bg-pink-100 text-pink-700',
  Medicine: 'bg-blue-100 text-blue-700',
  Wellness: 'bg-emerald-100 text-emerald-700',
  Device: 'bg-purple-100 text-purple-700',
  Fitness: 'bg-orange-100 text-orange-700',
};

export default function PharmacyProfilePage() {
  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Store Profile</h1>
          <p className="text-sm text-slate-500">Preview how customers see your pharmacy store.</p>
        </div>
        <Link href="/seller/pharmacy/settings"
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-colors">
          <Edit2 className="w-3.5 h-3.5" /> Edit Profile
        </Link>
      </div>

      {/* Store Header Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-40 bg-linear-to-r from-teal-600 via-teal-500 to-emerald-400 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-50" />
          <button className="absolute top-3 right-3 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white font-bold rounded-lg text-xs hover:bg-white/30 flex items-center gap-1.5 transition-colors">
            <Camera className="w-3 h-3" /> Change Banner
          </button>
        </div>

        {/* Store Info */}
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
              <Store className="w-8 h-8 text-teal-600" />
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-slate-900">Apollo Pharmacy</h2>
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Sector 14, Gurugram</span>
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> +91 124 456 7890</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 8:00 AM — 10:00 PM</span>
              </div>
            </div>
          </div>

          {/* Rating & Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-black text-emerald-700 text-lg">4.6</span>
              </div>
              <span className="text-xs text-slate-400">1,245 reviews</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-slate-900">555</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Products</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-slate-900">8.4K</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-emerald-600">98.2%</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Fulfillment</p>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-700">Your trusted neighborhood pharmacy for medicines, wellness, beauty & personal care. Licensed & verified since 2018. Fast delivery. Certified pharmacists on duty.</p>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-black text-slate-900 mb-4">Product Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORIES_BREAKDOWN.map((cat) => (
            <div key={cat.name} className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-teal-300 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.color}`}>
                  <cat.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-800">{cat.name}</span>
              </div>
              <p className="text-xs text-slate-400">{cat.count} products</p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-slate-900">Featured Products</h2>
          <Link href="/seller/pharmacy/products" className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FEATURED_PRODUCTS.map((product) => (
            <div key={product.name} className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all">
              <div className="w-full h-24 bg-white rounded-lg border border-slate-100 flex items-center justify-center mb-3">
                <Package className="w-8 h-8 text-slate-200" />
              </div>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${CAT_COLORS[product.cat] || 'bg-slate-100 text-slate-600'}`}>{product.cat}</span>
              <p className="font-bold text-slate-900 text-sm mt-1 line-clamp-1">{product.name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-black text-teal-700 text-sm">{product.price}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {product.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section Previews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Beauty Section', desc: 'Skin care, hair care, cosmetics', color: 'from-pink-500 to-rose-500', icon: Sparkles },
          { label: 'Wellness Section', desc: 'Vitamins, supplements, nutrition', color: 'from-emerald-500 to-teal-500', icon: Heart },
          { label: 'Health Section', desc: 'Medicines, devices, equipment', color: 'from-blue-500 to-indigo-500', icon: Stethoscope },
        ].map((section) => (
          <div key={section.label} className={`bg-linear-to-br ${section.color} rounded-2xl p-5 text-white relative overflow-hidden shadow-lg`}>
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
            <section.icon className="w-6 h-6 opacity-70 mb-2" />
            <p className="font-black text-lg">{section.label}</p>
            <p className="text-xs opacity-70">{section.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
