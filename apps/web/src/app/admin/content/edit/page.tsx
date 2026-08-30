'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import React, { useState, useEffect, Suspense } from 'react';
import { ArrowLeft, Save, Megaphone, Image, Bell, Tag, Globe, Smartphone, CheckCircle, Upload } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const mockContent = [
  { id: 'CNT-001', title: 'Summer Sale — Flat 40% Off Marketplace', type: 'banner', target: 'All Customers', link: 'kartseek://marketplace/sale', start: '2026-05-15T00:00', end: '2026-06-15T23:59' },
  { id: 'CNT-002', title: 'Free Delivery on Grocery Orders > ₹499', type: 'promo', target: 'Mumbai Region', link: 'kartseek://grocery', start: '2026-05-20T00:00', end: '2026-05-31T23:59' },
  { id: 'CNT-003', title: 'New Restaurant Partners Near You!', type: 'push', target: 'Restaurant Users', link: 'kartseek://restaurants', start: '2026-05-28T00:00', end: '2026-06-05T23:59' },
  { id: 'CNT-004', title: 'Doctor Consultation — First Visit Free', type: 'banner', target: 'All Customers', link: 'kartseek://doctor', start: '2026-06-01T00:00', end: '2026-06-30T23:59' },
  { id: 'CNT-005', title: 'Taxi Ride Offer: ₹50 Off First 3 Rides', type: 'promo', target: 'New Users', link: 'kartseek://taxi', start: '2026-05-10T00:00', end: '2026-06-10T23:59' },
  { id: 'CNT-006', title: 'Pharmacy — Flat 20% on OTC Products', type: 'push', target: 'Pharmacy Users', link: 'kartseek://pharmacy', start: '2026-04-15T00:00', end: '2026-05-15T23:59' },
  { id: 'CNT-007', title: 'Featured: Apple iPhone 15 Pro', type: 'featured', target: 'Marketplace', link: 'kartseek://marketplace/product/iphone15', start: '2026-05-01T00:00', end: '2026-05-31T23:59' },
];

function EditForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  
  const campaign = mockContent.find(c => c.id === id) || mockContent[0];

  const [campaignType, setCampaignType] = useState(campaign.type);
  const [targetAudience, setTargetAudience] = useState(campaign.target === 'All Customers' ? 'all' : 'custom');

  const handleSave = () => {
    // Mock save action
    router.push('/admin/content');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/content" className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Campaign</h1>
          <p className="text-sm text-slate-500">Modify an existing promotional campaign or content update.</p>
        </div>
      </div>

      <form className="space-y-6">
        
        {/* Campaign Type Selection */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">1. Campaign Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              onClick={() => setCampaignType('banner')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setCampaignType('banner'))}
              className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${campaignType === 'banner' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'}`}
            >
              <Image className={`w-6 h-6 ${campaignType === 'banner' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="font-bold text-sm">App Banner</span>
            </div>
            <div 
              onClick={() => setCampaignType('push')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setCampaignType('push'))}
              className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${campaignType === 'push' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200'}`}
            >
              <Bell className={`w-6 h-6 ${campaignType === 'push' ? 'text-purple-600' : 'text-slate-400'}`} />
              <span className="font-bold text-sm">Push Notification</span>
            </div>
            <div 
              onClick={() => setCampaignType('promo')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setCampaignType('promo'))}
              className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${campaignType === 'promo' ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200'}`}
            >
              <Tag className={`w-6 h-6 ${campaignType === 'promo' ? 'text-orange-600' : 'text-slate-400'}`} />
              <span className="font-bold text-sm">Promo Code</span>
            </div>
            <div 
              onClick={() => setCampaignType('featured')} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setCampaignType('featured'))}
              className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${campaignType === 'featured' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200'}`}
            >
              <Megaphone className={`w-6 h-6 ${campaignType === 'featured' ? 'text-amber-600' : 'text-slate-400'}`} />
              <span className="font-bold text-sm">Featured Listing</span>
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">2. Content Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Campaign Title / Internal Name <span className="text-red-500">*</span></label>
              <input type="text" defaultValue={campaign.title} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"  aria-label="text"/>
            </div>

            {campaignType === 'push' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Push Notification Message <span className="text-red-500">*</span></label>
                <textarea rows={3} defaultValue={campaign.title} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-sm resize-none"></textarea>
              </div>
            )}

            {campaignType === 'banner' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Upload Banner Image <span className="text-red-500">*</span></label>
                <div className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-emerald-50 flex flex-col items-center justify-center text-emerald-700 transition-colors cursor-pointer relative overflow-hidden">
                  <Image className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm font-bold">campaign_banner_v2.jpg</span>
                  <span className="text-xs mt-1 font-medium opacity-80">Click to replace image</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="action-link-deep-link-optional">Action Link / Deep Link (Optional)</label>
              <input id="action-link-deep-link-optional" type="text" defaultValue={campaign.link} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-sm font-mono text-slate-600"  aria-label="text"/>
            </div>
          </div>
        </div>

        {/* Targeting & Schedule */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">3. Targeting & Schedule</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Target Audience</label>
            <div className="flex flex-wrap gap-3">
              <label className={`cursor-pointer px-4 py-2 rounded-lg border text-sm font-bold flex items-center gap-2 ${targetAudience === 'all' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                <input type="radio" name="target" className="hidden" checked={targetAudience === 'all'} onChange={() => setTargetAudience('all')} />
                <Globe className="w-4 h-4" /> All Users
              </label>
              <label className={`cursor-pointer px-4 py-2 rounded-lg border text-sm font-bold flex items-center gap-2 ${targetAudience === 'mobile' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                <input type="radio" name="target" className="hidden" checked={targetAudience === 'mobile'} onChange={() => setTargetAudience('mobile')} />
                <Smartphone className="w-4 h-4" /> App Users Only
              </label>
              <label className={`cursor-pointer px-4 py-2 rounded-lg border text-sm font-bold flex items-center gap-2 ${targetAudience === 'custom' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                <input type="radio" name="target" className="hidden" checked={targetAudience === 'custom'} onChange={() => setTargetAudience('custom')} />
                Custom Segment...
              </label>
            </div>
            {targetAudience === 'custom' && (
              <select className="mt-3 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700" defaultValue={campaign.target}>
                <option value={campaign.target}>{campaign.target}</option>
                <option value="New Users (Last 30 Days)">New Users (Last 30 Days)</option>
                <option value="Inactive Users (> 60 Days)">Inactive Users ({'>'} 60 Days)</option>
                <option value="Specific City / Region">Specific City / Region</option>
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Start Date & Time <span className="text-red-500">*</span></label>
              <input type="datetime-local" defaultValue={campaign.start} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700"  aria-label="datetime-local"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">End Date & Time <span className="text-red-500">*</span></label>
              <input type="datetime-local" defaultValue={campaign.end} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700"  aria-label="datetime-local"/>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/content" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </Link>
          <button onClick={handleSave} type="button" className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>

      </form>
    </div>
  );
}

export default function EditCampaignPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading Campaign Data...</div>}>
      <EditForm />
    </Suspense>
  );
}
