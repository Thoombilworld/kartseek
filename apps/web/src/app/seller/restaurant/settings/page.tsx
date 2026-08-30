'use client';
import React, { useState, useEffect } from 'react';
import { Store, Clock, MapPin, Phone, CreditCard, ShieldCheck } from 'lucide-react';
import { vendorRestaurantApi } from '@/lib/api/vendor-restaurant';

export default function RestaurantSettingsPage() {
  const [storeStatus, setStoreStatus] = useState(true);

  return (<div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Store Settings</h1>
        <p className="text-slate-500">Manage your restaurant profile, operating hours, and business details.</p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Top Status Banner */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Restaurant Visibility</h2>
            <p className="text-sm text-slate-500">Toggle whether your restaurant is open and accepting orders.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={storeStatus}
              onChange={() => setStoreStatus(!storeStatus)}
            />
            <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
            <span className="ml-3 text-sm font-bold text-slate-700 uppercase tracking-wider">
              {storeStatus ? 'Open' : 'Closed'}
            </span>
          </label>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Basic Info */}
          <section>
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Store className="w-5 h-5 text-orange-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="restaurant-name">Restaurant Name</label>
                <input id="restaurant-name" type="text" defaultValue="Biryani Blues (Andheri Branch)" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"  aria-label="text"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="cuisine-types">Cuisine Types</label>
                <input id="cuisine-types" type="text" defaultValue="North Indian, Biryani, Mughlai" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"  aria-label="text"/>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="description">Description</label>
                <textarea id="description" rows={3} defaultValue="Authentic dum biryani prepared with aromatic spices and premium basmati rice." className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"></textarea>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Contact & Location */}
          <section>
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-orange-600" />
              Location & Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="complete-address">Complete Address</label>
                <input id="complete-address" type="text" defaultValue="Shop 4, Ground Floor, Vertex Building, Andheri West, Mumbai" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"  aria-label="text"/>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Phone className="w-4 h-4"/> Support Phone</label>
                <input type="text" defaultValue="+91 98765 43210" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"  aria-label="text"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="manager-email">Manager Email</label>
                <input id="manager-email" type="email" defaultValue="manager.andheri@biryaniblues.com" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"  aria-label="email"/>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Business Details */}
          <section>
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              Business & Taxation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="fssai-license-no">FSSAI License No.</label>
                <input id="fssai-license-no" type="text" defaultValue="11520034000321" disabled className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"  aria-label="text"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="gstin">GSTIN</label>
                <input id="gstin" type="text" defaultValue="27AADCB2230M1Z2" disabled className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"  aria-label="text"/>
              </div>
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <button className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-sm transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
