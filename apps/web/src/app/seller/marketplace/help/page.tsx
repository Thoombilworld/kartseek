'use client';

import React, { useState, useEffect } from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';

const ITEMS = [
  {
    "title": "Getting Started",
    "subtitle": "Learn the basics of selling on KARTSEEK",
    "badge": "Guide",
    "stats": "12 articles"
  },
  {
    "title": "Order Management",
    "subtitle": "How to process and ship orders",
    "badge": "Guide",
    "stats": "8 articles"
  },
  {
    "title": "Payments & Payouts",
    "subtitle": "Understanding commissions and payments",
    "badge": "FAQ",
    "stats": "15 articles"
  },
  {
    "title": "Returns & Refunds",
    "subtitle": "Managing customer returns",
    "badge": "FAQ",
    "stats": "10 articles"
  },
  {
    "title": "Contact Support",
    "subtitle": "Chat with our seller support team",
    "badge": "Live",
    "stats": "Available 24/7"
  },
  {
    "title": "Community Forum",
    "subtitle": "Connect with other sellers",
    "badge": "Forum",
    "stats": "5.2K members"
  }
];

export default function HelpSupportPage() {
  const { seller } = useSeller();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getSupportTickets(seller.sellerId)
      .then(res => { if (res?.data) { /* merge API data */ } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-blue-600" />Help & Support
          </h1>
          <p className="text-sm text-slate-500 mt-1">Get help with your seller account</p>
        </div>
        
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ITEMS.map((item, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{item.subtitle}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700">{item.badge}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{item.stats}</span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
