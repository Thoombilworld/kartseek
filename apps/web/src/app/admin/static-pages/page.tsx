'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText, Shield, Scale, ShoppingBag, Briefcase, Newspaper, Phone, TrendingUp,
  Eye, Edit3, CheckCircle, Clock, Globe, AlertTriangle, Cookie,
} from 'lucide-react';
import Link from 'next/link';
import apiFetch from '@/lib/api-client';

interface StaticPageSummary {
  id: string; slug: string; title: string; isPublished: boolean;
  version: number; lastEditedBy: string | null; updatedAt: string;
  sections: any[];
}

const SLUG_ICONS: Record<string, typeof FileText> = {
  privacy: Shield, terms: FileText, cookies: Cookie, security: Shield,
  grievance: Scale, about: ShoppingBag, careers: Briefcase,
  press: Newspaper, contact: Phone, investors: TrendingUp,
};

const SLUG_CATEGORIES: Record<string, string> = {
  privacy: 'Legal', terms: 'Legal', cookies: 'Legal', security: 'Legal', grievance: 'Legal',
  about: 'Company', careers: 'Company', press: 'Company', contact: 'Company', investors: 'Company',
};

// ── Seed data: matches the actual hardcoded page content ─────────────────
const SEED_PAGES: StaticPageSummary[] = [
  { id: 'privacy', slug: 'privacy', title: 'Privacy Policy', isPublished: true, version: 1, lastEditedBy: 'system', updatedAt: '2026-07-24T00:00:00Z', sections: [
    { id: 'prv-1', title: '1. Information We Collect', order: 1, content: 'Personal Information: Name, email address, phone number, delivery addresses, payment information (processed securely through our payment partners).\n\nAccount Data: Login credentials, order history, wishlist items, saved addresses, and communication preferences.\n\nDevice & Usage Data: IP address, browser type, operating system, device identifiers, pages visited, search queries, click patterns, and session duration.\n\nLocation Data: GPS coordinates (with your consent), delivery addresses, and IP-based approximate location for regional pricing and service availability.' },
    { id: 'prv-2', title: '2. How We Use Your Information', order: 2, content: 'Order Processing: To process, fulfill, and deliver your orders across all our services (Marketplace, Grocery, Restaurant, Pharmacy, Taxi, Hotel, Doctor).\n\nPersonalization: To personalize your shopping experience, show relevant products, and provide tailored recommendations.\n\nCommunication: To send order updates, delivery notifications, promotional offers (with your consent), and customer service responses.\n\nSecurity: To detect and prevent fraud, unauthorized access, and other security threats.\n\nImprovement: To analyze usage patterns, improve our services, and develop new features.' },
    { id: 'prv-3', title: '3. Information Sharing', order: 3, content: 'Service Partners: We share necessary information with delivery partners, sellers, restaurants, and service providers to fulfill your orders.\n\nPayment Processors: Payment data is shared with PCI-DSS compliant payment processors (Razorpay, Stripe) for transaction processing.\n\nLegal Requirements: We may disclose information when required by law, court order, or government regulation.\n\nWe never sell your personal data to third parties for advertising purposes.' },
    { id: 'prv-4', title: '4. Data Security', order: 4, content: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We implement industry-standard security measures including firewalls, intrusion detection systems, and regular security audits. Access to personal data is restricted to authorized personnel on a need-to-know basis.' },
    { id: 'prv-5', title: '5. Your Rights', order: 5, content: 'Access: Request a copy of your personal data at any time.\n\nCorrection: Update or correct inaccurate personal information.\n\nDeletion: Request deletion of your account and associated data.\n\nPortability: Export your data in a machine-readable format.\n\nOpt-out: Unsubscribe from marketing communications at any time.\n\nTo exercise these rights, contact us at privacy@kartseek.com or through your Account Settings.' },
  ]},
  { id: 'terms', slug: 'terms', title: 'Terms of Service', isPublished: true, version: 1, lastEditedBy: 'system', updatedAt: '2026-07-24T00:00:00Z', sections: [
    { id: 'tos-1', title: '1. Account Registration', order: 1, content: 'You must be at least 18 years old to create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for maintaining the confidentiality of your account credentials.' },
    { id: 'tos-2', title: '2. Platform Services', order: 2, content: 'KartSeek provides a multi-service platform including Marketplace (e-commerce), Grocery, Restaurant, Pharmacy, Taxi & Rides, Hotel Booking, Doctor Appointments, and Healthcare services. Each module may have additional specific terms.' },
    { id: 'tos-3', title: '3. Orders & Payments', order: 3, content: 'All orders are subject to acceptance and availability. Prices include applicable taxes unless stated otherwise. We accept UPI, credit/debit cards, net banking, mobile wallets, and cash on delivery (where available). Refunds are processed within 5-7 business days after approval.' },
    { id: 'tos-4', title: '4. Shipping & Delivery', order: 4, content: 'Delivery timelines vary by location and product category. Standard delivery: 3-7 business days. Express delivery: 1-2 business days (where available). Same-day delivery available for grocery and restaurant orders in select cities.' },
    { id: 'tos-5', title: '5. Returns & Refunds', order: 5, content: 'Most marketplace products can be returned within 7-30 days (varies by category). Perishable goods (grocery, restaurant) must be reported within 24 hours. Refunds are processed to the original payment method.' },
    { id: 'tos-6', title: '6. Seller Obligations', order: 6, content: 'Sellers agree to list only genuine products, maintain accurate stock levels, ship within committed timeframes, and comply with all applicable regulations.' },
    { id: 'tos-7', title: '7. Intellectual Property', order: 7, content: 'All content on KartSeek — logos, trademarks, text, images, software — is the property of KartSeek or its licensors and is protected by intellectual property laws.' },
    { id: 'tos-8', title: '8. Limitation of Liability', order: 8, content: 'KartSeek acts as an intermediary platform. We are not liable for the quality, safety, or legality of items sold by third-party sellers, nor for the accuracy of seller listings.' },
    { id: 'tos-9', title: '9. Privacy', order: 9, content: 'Your privacy is important. Our Privacy Policy explains how we collect, use, and protect your personal data. By using our services, you consent to our data practices as described in the Privacy Policy.' },
    { id: 'tos-10', title: '10. Governing Law', order: 10, content: 'These Terms are governed by the laws of India. Disputes shall be resolved through arbitration in Mumbai, India, under the Indian Arbitration and Conciliation Act.' },
  ]},
  { id: 'cookies', slug: 'cookies', title: 'Cookie Policy', isPublished: true, version: 1, lastEditedBy: 'system', updatedAt: '2026-07-24T00:00:00Z', sections: [
    { id: 'ck-1', title: '1. Essential Cookies', order: 1, content: 'Required for the website to function properly. These cookies enable core functionality such as security, session management, and accessibility. They cannot be disabled.\n\nExamples: Session ID, CSRF token, login state, cart contents, region preference.' },
    { id: 'ck-2', title: '2. Analytics Cookies', order: 2, content: 'Help us understand how visitors interact with our website by collecting anonymized usage data.\n\nExamples: Google Analytics (_ga, _gid), page views, scroll depth, click heatmaps, session duration.' },
    { id: 'ck-3', title: '3. Functional Cookies', order: 3, content: 'Enable enhanced functionality and personalization such as remembering your preferences.\n\nExamples: Language preference, recently viewed products, saved search filters, dark/light mode setting.' },
    { id: 'ck-4', title: '4. Marketing Cookies', order: 4, content: 'Used to track visitors across websites and display relevant advertisements.\n\nExamples: Facebook Pixel, Google Ads remarketing, affiliate tracking cookies.\n\nYou can opt out of marketing cookies at any time through your browser settings or our cookie consent banner.' },
  ]},
  { id: 'security', slug: 'security', title: 'Security', isPublished: true, version: 1, lastEditedBy: 'system', updatedAt: '2026-07-24T00:00:00Z', sections: [
    { id: 'sec-1', title: 'Data Encryption', order: 1, content: 'All data in transit is protected with TLS 1.3 encryption. Data at rest is encrypted using AES-256 encryption across all databases and backups.' },
    { id: 'sec-2', title: 'PCI-DSS Compliance', order: 2, content: 'Our payment infrastructure is PCI-DSS Level 1 certified. We partner with Razorpay and Stripe, both PCI-certified payment processors. Card data is tokenized and never stored on our servers.' },
    { id: 'sec-3', title: 'Infrastructure Security', order: 3, content: 'Our cloud infrastructure utilizes multi-region deployment with DDoS protection, WAF (Web Application Firewall), and automatic security patching. All servers are monitored 24/7.' },
    { id: 'sec-4', title: 'Access Controls', order: 4, content: 'We enforce multi-factor authentication (MFA) for all employees, role-based access controls (RBAC), and the principle of least privilege. All access is logged and auditable.' },
    { id: 'sec-5', title: 'Vulnerability Management', order: 5, content: 'We conduct regular penetration testing, automated vulnerability scanning, and code security reviews. We maintain a responsible disclosure program for security researchers.' },
    { id: 'sec-6', title: 'Privacy by Design', order: 6, content: 'Privacy and security are built into every feature from inception. We conduct Data Protection Impact Assessments (DPIA) for all new features that process personal data.' },
    { id: 'sec-7', title: 'Protecting Your Account', order: 7, content: '1. Use a strong, unique password for your KartSeek account\n2. Enable two-factor authentication (2FA) in your account settings\n3. Never share your OTP, password, or login credentials with anyone\n4. Verify you\'re on kartseek.com before entering sensitive information\n5. Be cautious of phishing emails claiming to be from KartSeek\n6. Report suspicious activity through our Help Center immediately\n7. Keep your browser and operating system updated\n8. Log out of your account when using shared or public devices' },
  ]},
  { id: 'grievance', slug: 'grievance', title: 'Grievance Redressal', isPublished: true, version: 1, lastEditedBy: 'system', updatedAt: '2026-07-24T00:00:00Z', sections: [
    { id: 'grv-1', title: 'Grievance Officer', order: 1, content: 'Name: Mr. Rajesh Kumar\nDesignation: Senior Legal Officer\nEmail: grievance@kartseek.com\nPhone: 1800-123-456 (Mon–Sat, 10 AM – 6 PM IST)\nAddress: KartSeek Technologies Pvt. Ltd., 123, Innovation Tower, Koramangala, Bangalore – 560034, Karnataka, India' },
    { id: 'grv-2', title: 'How to File a Grievance', order: 2, content: 'Step 1: Contact Customer Support First — For order-related issues, please use our Help Center. Most issues can be resolved within 24–48 hours.\n\nStep 2: Submit a Formal Grievance — If unresolved, email grievance@kartseek.com with complaint details, order ID, and supporting documents.\n\nStep 3: Acknowledgment — The Grievance Officer will acknowledge your complaint within 48 hours.\n\nStep 4: Resolution — We will investigate and resolve within 30 days, per the Consumer Protection (E-Commerce) Rules, 2020.\n\nStep 5: Escalation — If unsatisfied, escalate to the National Consumer Helpline (NCH) at 1800-11-4000 or consumerhelpline.gov.in.' },
    { id: 'grv-3', title: 'Redressal Timelines', order: 3, content: 'Order-related (wrong item, damaged): Acknowledgment 24h, Resolution 7 days\nRefund not received: Acknowledgment 24h, Resolution 10 business days\nSeller dispute: Acknowledgment 48h, Resolution 15 days\nData privacy concern: Acknowledgment 48h, Resolution 30 days\nFraudulent activity report: Acknowledgment 24h, Resolution 15 days\nContent/listing complaint: Acknowledgment 48h, Resolution 15 days' },
    { id: 'grv-4', title: 'Regulatory Compliance', order: 4, content: 'This grievance redressal mechanism is established in compliance with the Information Technology Act, 2000, the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the Consumer Protection (E-Commerce) Rules, 2020.' },
  ]},
  { id: 'about', slug: 'about', title: 'About Us', isPublished: true, version: 1, lastEditedBy: 'system', updatedAt: '2026-07-24T00:00:00Z', sections: [
    { id: 'abt-1', title: 'Key Numbers', order: 1, content: '100M+ Customers | 50K+ Sellers | 8 Verticals | 500+ Cities' },
    { id: 'abt-2', title: 'Our Mission', order: 2, content: 'To democratize commerce by building a unified platform that empowers small businesses to reach millions of customers, while providing shoppers with the best selection, prices, and convenience — across marketplace, groceries, food delivery, pharmacy, travel, ride-hailing, healthcare, and more.' },
    { id: 'abt-3', title: 'Our Values', order: 3, content: 'Customer First: Every decision starts with "How does this benefit the customer?"\n\nSeller Empowerment: We build tools that help small businesses compete at scale.\n\nTrust & Transparency: Genuine reviews, honest pricing, and clear policies — always.' },
    { id: 'abt-4', title: 'Our Story', order: 4, content: 'Founded in 2024, KartSeek started with a simple observation: Indian consumers were using 8-10 different apps for daily needs — shopping, groceries, food, pharmacy, rides, travel, healthcare. We set out to build a single platform that unifies all these experiences.\n\nToday, KartSeek serves millions of customers across India, the UAE, Saudi Arabia, the UK, and the US, with a growing network of trusted sellers and service providers. We\'re backed by world-class investors and driven by a passionate team of 500+ engineers, designers, and operators.' },
  ]},
  { id: 'careers', slug: 'careers', title: 'Careers', isPublished: true, version: 1, lastEditedBy: 'system', updatedAt: '2026-07-24T00:00:00Z', sections: [
    { id: 'car-1', title: 'Why Join KartSeek?', order: 1, content: 'Health & Wellness: Comprehensive medical, dental & vision insurance for you and family\nLearning Budget: ₹1L annual learning allowance for courses, conferences & books\nRemote Flexibility: Work from anywhere 2 days/week with quarterly team offsites\nESOPs: All full-time employees receive stock options from Day 1' },
    { id: 'car-2', title: 'Open Positions', order: 2, content: 'Engineering: Senior Full-Stack Engineer, Staff Backend Engineer, Mobile Engineer (React Native), DevOps / SRE Engineer\nDesign: Senior Product Designer\nProduct: Product Manager — Marketplace\nData: Data Scientist\nOperations: Customer Success Lead\n\nAll positions are based in Bangalore with remote flexibility.' },
  ]},
  { id: 'press', slug: 'press', title: 'Press & Media', isPublished: true, version: 1, lastEditedBy: 'system', updatedAt: '2026-07-24T00:00:00Z', sections: [
    { id: 'prs-1', title: 'Latest Press Releases', order: 1, content: 'Jul 2026 — KartSeek Launches 8-Vertical Super-App Platform\nJun 2026 — KartSeek Crosses 50,000 Seller Milestone\nMay 2026 — KartSeek Raises Series B Funding ($120M)\nApr 2026 — KartSeek Partners with India Post for Rural Delivery\nMar 2026 — KartSeek Launches AI-Powered Product Recommendations' },
    { id: 'prs-2', title: 'Brand Assets', order: 2, content: 'Download official KartSeek logos, brand guidelines, and media assets from our brand kit.' },
    { id: 'prs-3', title: 'Media Inquiries', order: 3, content: 'For press inquiries, interviews, and media requests, contact press@kartseek.com' },
  ]},
  { id: 'contact', slug: 'contact', title: 'Contact Us', isPublished: true, version: 1, lastEditedBy: 'system', updatedAt: '2026-07-24T00:00:00Z', sections: [
    { id: 'cnt-1', title: 'Support Channels', order: 1, content: 'Call Us: 1800-123-456 (Toll-free, 7 AM – 11 PM IST)\nEmail Us: support@kartseek.com (We respond within 4 hours)\nLive Chat: 24/7 in-app chat support\nHelp Center: FAQs and self-service tools at /marketplace/help' },
    { id: 'cnt-2', title: 'Office Address', order: 2, content: 'KartSeek Technologies Pvt. Ltd.\n123, Innovation Tower, 5th Floor\nKoramangala, Bangalore – 560034\nKarnataka, India\n\nBusiness Hours:\nMon–Fri: 9:00 AM – 6:00 PM IST\nSat: 10:00 AM – 2:00 PM IST\nSun: Closed' },
  ]},
  { id: 'investors', slug: 'investors', title: 'Investor Relations', isPublished: true, version: 1, lastEditedBy: 'system', updatedAt: '2026-07-24T00:00:00Z', sections: [
    { id: 'inv-1', title: 'Financial Highlights', order: 1, content: 'GMV (FY26): $2.4B (+180% YoY)\nActive Users: 100M+ (+120% YoY)\nMarkets: 5 Countries (+3 new)\nRevenue Growth: 3.2x (FY25 → FY26)' },
    { id: 'inv-2', title: 'Key Milestones', order: 2, content: '2024 — Founded in Bangalore. Launched marketplace MVP.\n2024 — Raised $15M Seed round. Expanded to 3 Indian cities.\n2025 — Series A: $45M. Launched grocery, restaurant, and pharmacy verticals.\n2025 — Crossed 10M users. Expanded to UAE and Saudi Arabia.\n2026 — Series B: $120M. Launched hotel, taxi, and healthcare verticals.\n2026 — Crossed 100M users. Expanded to UK and US markets.' },
    { id: 'inv-3', title: 'Why KartSeek?', order: 3, content: '• Super-app model capturing 8 verticals with a single customer acquisition cost\n• India\'s digital commerce TAM projected at $400B by 2030\n• Unified technology platform with shared infrastructure reducing per-vertical costs by 60%\n• Strong network effects: sellers, customers, and delivery partners reinforce each other\n• Proven unit economics with marketplace achieving contribution margin positivity' },
    { id: 'inv-4', title: 'Contact', order: 4, content: 'For investment, partnership, or financial inquiries: investors@kartseek.com' },
  ]},
];

export default function StaticPagesDashboard() {
  const [pages, setPages] = useState<StaticPageSummary[]>(SEED_PAGES);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'legal' | 'company'>('all');

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    try {
      const res = await apiFetch<any>('/admin/static-pages');
      if (res.data && res.data.length > 0) {
        // Merge API data with seeds — prefer API data, fill gaps with seeds
        const apiMap = new Map(res.data.map((p: any) => [p.slug, p]));
        const merged = SEED_PAGES.map(seed => {
          const apiPage = apiMap.get(seed.slug) as StaticPageSummary | undefined;
          if (apiPage && apiPage.sections && apiPage.sections.length > 0) return apiPage;
          return seed;
        });
        setPages(merged);
      }
    } catch {
      // Seeds are already loaded as default state
    }
  }

  const filtered = pages.filter(p => {
    if (filter === 'legal') return SLUG_CATEGORIES[p.slug] === 'Legal';
    if (filter === 'company') return SLUG_CATEGORIES[p.slug] === 'Company';
    return true;
  });

  const publishedCount = pages.filter(p => p.isPublished).length;
  const draftCount = pages.filter(p => !p.isPublished).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Static Pages</h1>
          <p className="text-slate-500 text-sm">Manage legal and company pages content — editable without code deployments.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <FileText className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{pages.length}</p>
          <p className="text-xs text-slate-500 font-medium">Total Pages</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{publishedCount}</p>
          <p className="text-xs text-slate-500 font-medium">Published</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Clock className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{draftCount}</p>
          <p className="text-xs text-slate-500 font-medium">Drafts</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Shield className="w-5 h-5 text-purple-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{pages.filter(p => SLUG_CATEGORIES[p.slug] === 'Legal').length}</p>
          <p className="text-xs text-slate-500 font-medium">Legal Pages</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'legal', 'company'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              filter === f ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'
            }`}>
            {f === 'all' ? `All (${pages.length})` : f === 'legal' ? 'Legal (5)' : 'Company (5)'}
          </button>
        ))}
      </div>

      {/* Pages Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Page</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Category</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Sections</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Version</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Last Updated</th>
              <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(page => {
              const Icon = SLUG_ICONS[page.slug] || FileText;
              const category = SLUG_CATEGORIES[page.slug] || 'Other';
              return (
                <tr key={page.slug} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{page.title}</p>
                        <p className="text-xs text-slate-400 font-mono">/{page.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      category === 'Legal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>{category}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${
                      page.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {page.isPublished ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {page.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600 font-medium">{page.sections?.length || 0}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">v{page.version}</td>
                  <td className="px-5 py-4 text-xs text-slate-400">
                    {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer"
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="View live page">
                        <Eye className="w-4 h-4" />
                      </a>
                      <Link href={`/admin/static-pages/${page.slug}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors">
                        <Edit3 className="w-3 h-3" /> Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
