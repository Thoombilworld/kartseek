'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, MessageCircle, Phone, Mail, Package, Truck, CreditCard, RotateCcw, Search, ExternalLink } from 'lucide-react';
import { useGroceryLocale, GROCERY_COUNTRIES } from '@/i18n/grocery-locale';
import { getPaymentMethods, getPaymentLabel } from '@/lib/localization';

/**
 * Built per market rather than declared once.
 *
 * The payment and delivery-fee answers are the two that cannot be written in
 * advance: what a shopper can pay with, and what delivery costs, are properties
 * of the country. Everything else here is true everywhere.
 */
function buildFaqSections(countryCode: string, formatPrice: (n: number) => string) {
  const methods = getPaymentMethods({ country: countryCode });
  const methodNames = methods.map((m) => getPaymentLabel(m, 'en'));
  const PAYMENT_ANSWER = methodNames.length > 0
    ? `We accept ${methodNames.slice(0, -1).join(', ')}${methodNames.length > 1 ? ' and ' : ''}${methodNames[methodNames.length - 1]}. The options shown at checkout are the ones available in your country.`
    : 'Available payment methods are shown at checkout for your country.';

  const spec = GROCERY_COUNTRIES[countryCode as keyof typeof GROCERY_COUNTRIES];
  const DELIVERY_FEE_ANSWER = spec
    ? `A delivery fee of ${formatPrice(spec.delivery.baseFee)} applies below ${formatPrice(spec.delivery.freeThreshold)}. Orders above ${formatPrice(spec.delivery.freeThreshold)} qualify for free delivery. Express delivery carries a small additional fee, shown before you confirm.`
    : 'Delivery fees vary by store and basket size, and are shown before you confirm.';

  return [
  {
    title: 'Orders & Delivery',
    icon: Package,
    items: [
      { q: 'How do I track my order?', a: 'Once your order is confirmed, go to Orders → select your order → Track Order. You\'ll see real-time updates including packing status, delivery partner info, and live location tracking.' },
      { q: 'What are the delivery hours?', a: 'We deliver from 6:00 AM to 10:00 PM daily. Express delivery (30 minutes) is available in select areas between 8:00 AM and 8:00 PM.' },
      { q: 'Can I schedule a delivery?', a: 'Yes! During checkout, tap "Choose Delivery Slot" to select your preferred 2-hour window up to 7 days in advance.' },
      { q: 'What if an item is out of stock?', a: 'Your delivery partner will contact you if an item is unavailable. You can choose a substitute or get a refund for that item.' },
    ],
  },
  {
    title: 'Payments & Pricing',
    icon: CreditCard,
    items: [
      // Answered from the region registry rather than written out. These two
      // used to name UPI, Google Pay, PhonePe, Paytm and net banking, and quote
      // a "₹29 below ₹499" fee — none of which exists in Qatar, on a page a
      // shopper opens precisely because they are unsure how to pay.
      { q: 'What payment methods are accepted?', a: PAYMENT_ANSWER },
      { q: 'Is there a delivery fee?', a: DELIVERY_FEE_ANSWER },
      { q: 'How do coupons work?', a: 'Apply coupon codes at checkout. Each coupon has specific terms (minimum order, category restrictions, expiry date). Only one coupon can be used per order.' },
    ],
  },
  {
    title: 'Returns & Refunds',
    icon: RotateCcw,
    items: [
      { q: 'What is the return policy?', a: 'Fresh items (fruits, vegetables, meat, dairy) can be returned within 24 hours of delivery. Packaged goods can be returned within 7 days if unopened and undamaged.' },
      { q: 'How long do refunds take?', a: 'Refunds are processed within 24 hours of return approval. KARTSEEK Wallet refunds are instant; bank/card refunds take 5-7 business days.' },
      { q: 'What if I received a damaged item?', a: 'Report it within 24 hours via Orders → Order Detail → Report Issue. Upload a photo and we\'ll process a refund or replacement immediately.' },
    ],
  },
  {
    title: 'Delivery Issues',
    icon: Truck,
    items: [
      { q: 'My delivery is late. What should I do?', a: 'Check real-time tracking in the app. If the delay exceeds the estimated time by 15+ minutes, you\'ll automatically receive a delivery fee waiver.' },
      { q: 'Can I change my delivery address?', a: 'You can change the address before the order is picked up by the delivery partner. Go to Orders → Order Detail → Change Address.' },
      { q: 'I missed my delivery. What happens?', a: 'If you\'re unavailable, the delivery partner will call you. After 2 attempts, the order will be cancelled and refunded to your wallet.' },
    ],
  },
  ];
}

// The support line was a placeholder Indian toll-free number
// ("+91 1800-XXX-XXXX") with a `tel:` href to match, so tapping Call Us on a
// Qatari handset dialled a non-existent Indian number.
const CONTACT_OPTIONS = [
  { icon: MessageCircle, label: 'Live Chat', desc: 'Typically responds in 2 min', color: 'green', action: '#' },
  { icon: Phone, label: 'Call Us', desc: '+974 4000 1234', color: 'blue', action: 'tel:+97440001234' },
  { icon: Mail, label: 'Email Support', desc: 'support@kartseek.com', color: 'purple', action: 'mailto:support@kartseek.com' },
];

export default function HelpPage() {
  const { config, formatPrice, tr } = useGroceryLocale();
  const FAQ_SECTIONS = useMemo(
    () => buildFaqSections(config.code, formatPrice),
    [config.code, formatPrice],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allFaqs = FAQ_SECTIONS.flatMap(s => s.items.map(i => ({ ...i, section: s.title })));
  const filteredFaqs = searchQuery
    ? allFaqs.filter(f => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/grocery" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" />{tr('Back to Grocery')}</Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center"><HelpCircle className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{tr('Help Center')}</h1>
              <p className="text-sm text-white/80">{tr('How can we help you today?')}</p>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={tr('Search for help...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Contact Options */}
        <div className="grid grid-cols-3 gap-3">
          {CONTACT_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const colors: Record<string, string> = { green: 'bg-green-100 text-green-600', blue: 'bg-blue-100 text-blue-600', purple: 'bg-purple-100 text-purple-600' };
            return (
              <a key={opt.label} href={opt.action} className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-md transition-all group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${colors[opt.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{opt.label}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
              </a>
            );
          })}
        </div>

        {/* Search Results */}
        {filteredFaqs && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-700">{filteredFaqs.length} results for &quot;{searchQuery}&quot;</p>
            {filteredFaqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">{faq.section}</p>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{faq.q}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        )}

        {/* FAQ Sections */}
        {!filteredFaqs && FAQ_SECTIONS.map(section => {
          const SIcon = section.icon;
          return (
            <div key={section.title} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center"><SIcon className="w-4 h-4 text-slate-500" /></div>
                <h2 className="text-sm font-black text-slate-800">{section.title}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {section.items.map((item, i) => {
                  const key = `${section.title}-${i}`;
                  const isOpen = openItems.has(key);
                  return (
                    <div key={i}>
                      <button onClick={() => toggleItem(key)} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors">
                        <span className="text-sm font-semibold text-slate-700 pr-4">{item.q}</span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
