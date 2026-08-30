'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, MessageSquare, Phone, Mail,
  Clock, ChevronRight, CalendarDays, CreditCard,
  Shield, HelpCircle, AlertCircle, FileText, Headphones,
  Send, Bot,
} from 'lucide-react';

const TOPICS = [
  { icon: <CalendarDays className="w-5 h-5" />, label: 'Booking Issues', desc: 'Modify, cancel, or get help with a booking', color: 'bg-rose-50 text-rose-600' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'Payments & Refunds', desc: 'Payment failures, refund status, charges', color: 'bg-blue-50 text-blue-600' },
  { icon: <Shield className="w-5 h-5" />, label: 'Property Complaints', desc: 'Report issues with hotel stay', color: 'bg-amber-50 text-amber-600' },
  { icon: <HelpCircle className="w-5 h-5" />, label: 'Account & Login', desc: 'Account access, profile, loyalty points', color: 'bg-purple-50 text-purple-600' },
  { icon: <FileText className="w-5 h-5" />, label: 'Invoice & Receipts', desc: 'Download invoices and tax receipts', color: 'bg-emerald-50 text-emerald-600' },
  { icon: <AlertCircle className="w-5 h-5" />, label: 'Other Issues', desc: 'Any other questions or feedback', color: 'bg-slate-100 text-slate-600' },
];

export default function HotelSupportPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hello! 👋 I\'m your KARTSEEK hotel support assistant. How can I help you today?' },
  ]);

  const sendMessage = () => {
    if (!chatMessage.trim()) return;
    setMessages(prev => [...prev, { from: 'user', text: chatMessage }]);
    setChatMessage('');
    setTimeout(() => {
      setMessages(prev => [...prev, {
        from: 'bot',
        text: 'Thank you for reaching out. I\'m connecting you with a hotel support agent. Expected wait time is under 2 minutes. In the meantime, could you share your booking ID?',
      }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-linear-to-br from-rose-600 to-rose-800 text-white">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/hotel-booking" className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-bold">Hotel Booking Support</h1>
          </div>
          <div className="flex items-center gap-3">
            <Headphones className="w-8 h-8 text-rose-200" />
            <div>
              <p className="text-lg font-bold">We are here to help</p>
              <p className="text-rose-200 text-sm">Available 24/7 in multiple languages</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setChatOpen(true)}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-rose-200 transition-all group"
          >
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center group-hover:bg-rose-100 transition-colors">
              <MessageSquare className="w-5 h-5 text-rose-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Live Chat</p>
              <p className="text-[10px] text-emerald-500 font-medium">● Online now</p>
            </div>
          </button>
          <a href="tel:+97141234567" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-blue-200 transition-all group">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Call Us</p>
              <p className="text-[10px] text-slate-400">+971 4 123 4567</p>
            </div>
          </a>
          <a href="mailto:hotels@kartseek.com" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-purple-200 transition-all group">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Email</p>
              <p className="text-[10px] text-slate-400">Reply within 2h</p>
            </div>
          </a>
        </div>

        {/* Help Topics */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">How can we help?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOPICS.map(topic => (
              <button
                key={topic.label}
                onClick={() => setChatOpen(true)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${topic.color}`}>
                  {topic.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{topic.label}</p>
                  <p className="text-xs text-slate-400">{topic.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'FAQ', href: '/hotel-booking/faq' },
              { label: 'Cancellation Policy', href: '/hotel-booking/cancellation-policy' },
              { label: 'Terms & Conditions', href: '/hotel-booking/terms' },
              { label: 'My Bookings', href: '/hotel-booking/my-bookings' },
            ].map(link => (
              <Link key={link.label} href={link.href} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-sm text-rose-600 font-medium transition-colors">
                <ChevronRight className="w-3 h-3" /> {link.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Response Time */}
        <div className="bg-slate-100 rounded-2xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-700">Average Response Times</p>
            <p className="text-xs text-slate-400">Live Chat: ~2 min · Phone: ~1 min · Email: ~2 hours</p>
          </div>
        </div>
      </div>

      {/* Live Chat Widget */}
      {chatOpen && (
        <div className="fixed bottom-4 right-4 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col max-h-[500px]">
          {/* Chat Header */}
          <div className="bg-rose-600 text-white rounded-t-2xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <p className="text-sm font-bold">Hotel Support</p>
                <p className="text-[10px] text-rose-200">● Online</p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  msg.from === 'user'
                    ? 'bg-rose-600 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-700 rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 p-3 flex items-center gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={e => setChatMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            />
            <button onClick={sendMessage} aria-label="Send message" className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center text-white hover:bg-rose-700 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
