'use client';

import React from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';

const ITEMS = [
  {
    "title": "Chat with Support",
    "subtitle": "Average response time: 2 minutes",
    "badge": "Online",
    "stats": "Available now"
  }
];

export default function LiveChatSupportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-blue-600" />Live Chat Support
          </h1>
          <p className="text-sm text-slate-500 mt-1">Chat with our support team</p>
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
