'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { SellerUnavailable } from '@/components/seller/marketplace/data-state';

/**
 * Account Health — not implemented on the backend.
 *
 * This page used to render hard-coded rows as though they were the seller's own
 * figures. There is no `GET /sellers/:id/performance/health` on the gateway, so nothing here was ever
 * real, and a seller reading it could not tell. Until the endpoint exists the
 * page says so rather than inventing an answer.
 */
export default function AccountHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Activity className="w-6 h-6 text-slate-400" aria-hidden />
          Account Health
        </h1>
        <p className="text-sm text-slate-500 mt-1">Policy compliance and standing</p>
      </div>

      <SellerUnavailable
        feature="Account Health"
        description="This part of Seller Central has no data behind it yet. It is not hidden and nothing is missing from your account — the feature simply has not been built. Anything you saw here before was placeholder content, not your figures."
      />
    </div>
  );
}
