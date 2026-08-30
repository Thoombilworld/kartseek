'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState, useEffect, useRef } from 'react';
import {
  HeadphonesIcon, Search, Clock, CheckCircle, AlertTriangle,
  MessageSquare, ArrowRight, Eye, Send, X, Wifi, WifiOff, Loader2,
} from 'lucide-react';
import { useChat, useAdminOrderFeed, ConnectionStatus } from '@/lib/hooks/use-socket';

// ─── Static seed data ────────────────────────────────────────────────────────

const tickets = [
  { id: 'TKT-4821', customer: 'Rahul K.', subject: 'Wrong item delivered', module: 'Grocery', priority: 'high', status: 'open', assignee: 'Anita M.', created: '15 min ago', orderId: 'KS-78432' },
  { id: 'TKT-4820', customer: 'Priya S.', subject: 'Driver was rude', module: 'Taxi', priority: 'high', status: 'open', assignee: 'Unassigned', created: '32 min ago', orderId: 'KS-78410' },
  { id: 'TKT-4819', customer: 'Anil M.', subject: 'Refund not received', module: 'Marketplace', priority: 'critical', status: 'escalated', assignee: 'Super Admin', created: '1 hr ago', orderId: 'KS-78395' },
  { id: 'TKT-4818', customer: 'Sneha R.', subject: 'Order delayed by 45 min', module: 'Restaurant', priority: 'medium', status: 'in-progress', assignee: 'Rahul V.', created: '2 hr ago', orderId: 'KS-78380' },
  { id: 'TKT-4817', customer: 'Vikram T.', subject: 'Wrong prescription delivered', module: 'Pharmacy', priority: 'critical', status: 'escalated', assignee: 'Super Admin', created: '3 hr ago', orderId: 'KS-78365' },
  { id: 'TKT-4816', customer: 'Deepa N.', subject: 'Doctor cancelled appointment', module: 'Doctor', priority: 'medium', status: 'in-progress', assignee: 'Priya K.', created: '4 hr ago', orderId: 'KS-78350' },
  { id: 'TKT-4815', customer: 'Meera P.', subject: 'Coupon code not working', module: 'Grocery', priority: 'low', status: 'resolved', assignee: 'Anita M.', created: '5 hr ago', orderId: 'KS-78340' },
  { id: 'TKT-4814', customer: 'Rajesh K.', subject: 'App crashing on checkout', module: 'Marketplace', priority: 'high', status: 'resolved', assignee: 'Tech Team', created: '6 hr ago', orderId: '—' },
];

const statusConfig: Record<string, { bg: string; icon: React.ReactNode }> = {
  open: { bg: 'bg-blue-100 text-blue-700', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  'in-progress': { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  escalated: { bg: 'bg-red-100 text-red-700', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  resolved: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700',
};

const moduleColors: Record<string, string> = {
  Marketplace: 'bg-blue-50 text-blue-600', Grocery: 'bg-green-50 text-green-600',
  Restaurant: 'bg-orange-50 text-orange-600', Pharmacy: 'bg-cyan-50 text-cyan-600',
  Doctor: 'bg-purple-50 text-purple-600', Taxi: 'bg-yellow-50 text-yellow-600',
};

// ─── Connection indicator ─────────────────────────────────────────────────────

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live
      </span>
    );
  }
  if (status === 'connecting') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
        <Loader2 className="w-3 h-3 animate-spin" />
        Connecting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold border border-slate-200">
      <WifiOff className="w-3 h-3" />
      Offline
    </span>
  );
}

// ─── Live Chat Panel ──────────────────────────────────────────────────────────

interface LiveChatPanelProps {
  ticketId: string;
  customerName: string;
  onClose: () => void;
}

function LiveChatPanel({ ticketId, customerName, onClose }: LiveChatPanelProps) {
  const SUPPORT_AGENT_ID = 'admin-001';
  const roomId = `support:${ticketId}`;

  const { messages, typingUsers, status, sendMessage, sendTyping } = useChat(
    roomId,
    SUPPORT_AGENT_ID,
    'support',
  );

  const [input, setInput] = useState('');
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
    sendTyping(false);
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    sendTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md z-50 flex flex-col bg-white border-l border-slate-200 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-linear-to-r from-slate-900 to-slate-800">
        <div>
          <p className="text-white font-bold">{customerName}</p>
          <p className="text-slate-400 text-xs">{ticketId}</p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge status={status} />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700" aria-label="Close">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 && status === 'connected' && (
          <div className="text-center text-slate-400 text-sm mt-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No messages yet. Start the conversation.
          </div>
        )}
        {messages.map((msg) => {
          const isSupport = msg.senderType === 'support';
          const isSystem = msg.type === 'system';
          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isSupport
                  ? 'bg-emerald-600 text-white rounded-br-sm'
                  : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm shadow-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-xs mt-1 ${isSupport ? 'text-emerald-200' : 'text-slate-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={status === 'connected' ? 'Type a message…' : 'Connecting…'}
            disabled={status !== 'connected'}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || status !== 'connected'}
            className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
           aria-label="Send"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeChat, setActiveChat] = useState<{ ticketId: string; customer: string } | null>(null);

  // Live admin order feed (shows new incoming order events)
  const { recentEvents, status: feedStatus } = useAdminOrderFeed('admin-001');

  const filtered = tickets.filter((t) => {
    const matchSearch =
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const escalatedCount = tickets.filter((t) => t.status === 'escalated').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-slate-500 text-sm">Manage customer support across all modules — Marketplace, Grocery, Restaurant, Pharmacy, Doctor &amp; Taxi.</p>
        </div>
        <ConnectionBadge status={feedStatus} />
      </div>

      {/* Live order event banner */}
      {recentEvents.length > 0 && (
        <div className="bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">
            Live: Order <span className="font-mono font-bold">{recentEvents[0]?.orderId}</span> → <span className="capitalize">{recentEvents[0]?.status}</span>
          </p>
          <span className="ml-auto text-xs text-emerald-600">{recentEvents.length} events today</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-rose-500 to-rose-600 p-4 rounded-xl shadow-md text-white">
          <HeadphonesIcon className="w-5 h-5 opacity-80" />
          <p className="text-2xl font-black mt-2">{tickets.length}</p>
          <p className="text-xs font-medium opacity-80">Total Tickets Today</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{openCount}</p>
          <p className="text-xs text-slate-500 font-medium">Open</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{escalatedCount}</p>
          <p className="text-xs text-slate-500 font-medium">Escalated</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{resolvedCount}</p>
          <p className="text-xs text-slate-500 font-medium">Resolved</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
        >
          <option value="All">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Ticket</th>
                <th className="px-5 py-3.5 font-semibold">Module</th>
                <th className="px-5 py-3.5 font-semibold text-center">Priority</th>
                <th className="px-5 py-3.5 font-semibold">Assignee</th>
                <th className="px-5 py-3.5 font-semibold">Order</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{t.subject}</p>
                    <p className="text-xs text-slate-400">{t.id} • {t.customer} • {t.created}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`${moduleColors[t.module]} px-2.5 py-1 rounded-md text-xs font-bold`}>{t.module}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`${priorityColors[t.priority]} px-2.5 py-1 rounded-md text-xs font-bold capitalize`}>{t.priority}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600">{t.assignee}</td>
                  <td className="px-5 py-4 text-xs font-mono text-slate-500">{t.orderId}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`${statusConfig[t.status].bg} px-2.5 py-1 rounded-full text-xs font-bold capitalize inline-flex items-center gap-1`}>
                      {statusConfig[t.status].icon}
                      {t.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        id={`chat-btn-${t.id}`}
                        onClick={() => setActiveChat({ ticketId: t.id, customer: t.customer })}
                        className="p-1.5 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
                        title="Open live chat"
                      >
                        <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                      </button>
                      <button className="p-1.5 hover:bg-slate-100 rounded-lg" title="View details">
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Chat Sidebar */}
      {activeChat && (
        <LiveChatPanel
          ticketId={activeChat.ticketId}
          customerName={activeChat.customer}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
}
