'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { SellerUnavailable } from '@/components/seller/marketplace/data-state';

/**
 * Customer Messages — not implemented on the backend.
 *
 * This page was worse than the other unbuilt ones, because it lost data rather
 * than merely showing none. Its reply box called
 * `POST /sellers/:id/messages/:id/reply`, a route no controller declares, and
 * the failure was swallowed:
 *
 *   try { await sellerApi.sendMessage(sellerId, selected, reply); } catch {}
 *   setConversations(prev => prev.map(c => c.id === selected
 *     ? { ...c, lastMessage: reply, unread: 0 } : c));
 *
 * The reply appeared in the thread, the unread badge cleared, and nothing had
 * been sent. A seller could answer a customer complaint, watch it land in the
 * conversation, and be sure they had replied.
 *
 * The list side was no better: `SellerService.getMessages` reads
 * `seller:<id>:messages` from Redis and nothing anywhere writes that key, so the
 * inbox was permanently empty.
 *
 * There is no messaging store — no thread, participant or read-state tables, no
 * delivery mechanism — so this cannot be wired up, only built. Until it is, the
 * page says so, and `sendMessage` is gone from the client so nothing can
 * silently fail against a route that does not exist.
 */
export default function SellerMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-slate-400" aria-hidden />
          Customer Messages
        </h1>
        <p className="text-sm text-slate-500 mt-1">Questions and messages from your customers</p>
      </div>

      <SellerUnavailable
        feature="Customer Messages"
        description="Messaging has not been built yet — there is no inbox behind this page. Anything you typed here previously was shown in the thread but never sent to the customer. Until this ships, customers reach you through Reviews &amp; Q&amp;A and through support tickets, both of which do deliver."
      />
    </div>
  );
}
