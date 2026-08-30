'use client';

import React, { useState, useEffect, use } from 'react';
import {
  Save, Eye, Edit3, Clock, CheckCircle, FileText, Plus, Trash2,
  ChevronDown, ChevronUp, GripVertical, AlertTriangle, Globe,
  ArrowLeft, Settings,
} from 'lucide-react';
import Link from 'next/link';
import apiFetch from '@/lib/api-client';

interface PageSection {
  id: string; title: string; content: string; order: number; isEditing: boolean;
}

interface PageData {
  slug: string; title: string; metaDescription: string;
  heroGradient: string; heroIcon: string;
  sections: PageSection[]; isPublished: boolean; version: number;
  lastEditedBy: string | null; updatedAt?: string;
}

const GRADIENT_OPTIONS = [
  { label: 'Blue → Violet', value: 'from-blue-700 via-indigo-700 to-violet-700' },
  { label: 'Slate Dark', value: 'from-slate-800 via-slate-900 to-slate-800' },
  { label: 'Amber → Rose', value: 'from-amber-600 via-orange-600 to-rose-600' },
  { label: 'Green → Teal', value: 'from-green-700 via-emerald-700 to-teal-700' },
  { label: 'Violet → Fuchsia', value: 'from-violet-700 via-purple-700 to-fuchsia-700' },
  { label: 'Blue → Cyan', value: 'from-blue-600 via-cyan-600 to-teal-600' },
  { label: 'Red → Rose', value: 'from-red-600 via-rose-600 to-pink-600' },
  { label: 'Emerald → Teal', value: 'from-emerald-600 via-teal-600 to-cyan-600' },
];

const ICON_OPTIONS = [
  'Shield', 'FileText', 'Cookie', 'Scale', 'ShoppingBag', 'Briefcase',
  'Newspaper', 'Phone', 'TrendingUp', 'Lock', 'Globe', 'Users', 'Heart', 'Star',
];

// ── Seed data for each page (matches actual customer-facing content) ──────
const SEED_DATA: Record<string, PageData> = {
  privacy: {
    slug: 'privacy', title: 'Privacy Policy', metaDescription: 'How KartSeek collects, uses, and protects your personal information.',
    heroGradient: 'from-blue-700 via-indigo-700 to-violet-700', heroIcon: 'Shield', isPublished: true, version: 1, lastEditedBy: 'system',
    sections: [
      { id: 'prv-1', title: '1. Information We Collect', order: 1, content: 'Personal Information: Name, email address, phone number, delivery addresses, payment information (processed securely through our payment partners).\n\nAccount Data: Login credentials, order history, wishlist items, saved addresses, and communication preferences.\n\nDevice & Usage Data: IP address, browser type, operating system, device identifiers, pages visited, search queries, click patterns, and session duration.\n\nLocation Data: GPS coordinates (with your consent), delivery addresses, and IP-based approximate location for regional pricing and service availability.', isEditing: false },
      { id: 'prv-2', title: '2. How We Use Your Information', order: 2, content: 'Order Processing: To process, fulfill, and deliver your orders across all our services.\n\nPersonalization: To personalize your shopping experience, show relevant products, and provide tailored recommendations.\n\nCommunication: To send order updates, delivery notifications, promotional offers (with your consent), and customer service responses.\n\nSecurity: To detect and prevent fraud, unauthorized access, and other security threats.\n\nImprovement: To analyze usage patterns, improve our services, and develop new features.', isEditing: false },
      { id: 'prv-3', title: '3. Information Sharing', order: 3, content: 'Service Partners: We share necessary information with delivery partners, sellers, restaurants, and service providers to fulfill your orders.\n\nPayment Processors: Payment data is shared with PCI-DSS compliant payment processors (Razorpay, Stripe) for transaction processing.\n\nLegal Requirements: We may disclose information when required by law, court order, or government regulation.\n\nWe never sell your personal data to third parties for advertising purposes.', isEditing: false },
      { id: 'prv-4', title: '4. Data Security', order: 4, content: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We implement industry-standard security measures including firewalls, intrusion detection systems, and regular security audits. Access to personal data is restricted to authorized personnel on a need-to-know basis.', isEditing: false },
      { id: 'prv-5', title: '5. Your Rights', order: 5, content: 'Access: Request a copy of your personal data at any time.\nCorrection: Update or correct inaccurate personal information.\nDeletion: Request deletion of your account and associated data.\nPortability: Export your data in a machine-readable format.\nOpt-out: Unsubscribe from marketing communications at any time.\n\nTo exercise these rights, contact us at privacy@kartseek.com or through your Account Settings.', isEditing: false },
    ],
  },
  terms: {
    slug: 'terms', title: 'Terms of Service', metaDescription: 'Terms and conditions governing your use of KartSeek.',
    heroGradient: 'from-slate-800 via-slate-900 to-slate-800', heroIcon: 'FileText', isPublished: true, version: 1, lastEditedBy: 'system',
    sections: [
      { id: 'tos-1', title: '1. Account Registration', order: 1, content: 'You must be at least 18 years old to create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for maintaining the confidentiality of your account credentials.', isEditing: false },
      { id: 'tos-2', title: '2. Platform Services', order: 2, content: 'KartSeek provides a multi-service platform including Marketplace (e-commerce), Grocery, Restaurant, Pharmacy, Taxi & Rides, Hotel Booking, Doctor Appointments, and Healthcare services. Each module may have additional specific terms.', isEditing: false },
      { id: 'tos-3', title: '3. Orders & Payments', order: 3, content: 'All orders are subject to acceptance and availability. Prices include applicable taxes unless stated otherwise. We accept UPI, credit/debit cards, net banking, mobile wallets, and cash on delivery (where available). Refunds are processed within 5-7 business days after approval.', isEditing: false },
      { id: 'tos-4', title: '4. Shipping & Delivery', order: 4, content: 'Delivery timelines vary by location and product category. Standard delivery: 3-7 business days. Express delivery: 1-2 business days (where available). Same-day delivery available for grocery and restaurant orders in select cities.', isEditing: false },
      { id: 'tos-5', title: '5. Returns & Refunds', order: 5, content: 'Most marketplace products can be returned within 7-30 days (varies by category). Perishable goods (grocery, restaurant) must be reported within 24 hours. Refunds are processed to the original payment method.', isEditing: false },
      { id: 'tos-6', title: '6. Seller Obligations', order: 6, content: 'Sellers agree to list only genuine products, maintain accurate stock levels, ship within committed timeframes, and comply with all applicable regulations.', isEditing: false },
      { id: 'tos-7', title: '7. Intellectual Property', order: 7, content: 'All content on KartSeek — logos, trademarks, text, images, software — is the property of KartSeek or its licensors and is protected by intellectual property laws.', isEditing: false },
      { id: 'tos-8', title: '8. Limitation of Liability', order: 8, content: 'KartSeek acts as an intermediary platform. We are not liable for the quality, safety, or legality of items sold by third-party sellers, nor for the accuracy of seller listings.', isEditing: false },
      { id: 'tos-9', title: '9. Privacy', order: 9, content: 'Your privacy is important. Our Privacy Policy explains how we collect, use, and protect your personal data.', isEditing: false },
      { id: 'tos-10', title: '10. Governing Law', order: 10, content: 'These Terms are governed by the laws of India. Disputes shall be resolved through arbitration in Mumbai, India, under the Indian Arbitration and Conciliation Act.', isEditing: false },
    ],
  },
  cookies: {
    slug: 'cookies', title: 'Cookie Policy', metaDescription: 'How KartSeek uses cookies and similar tracking technologies.',
    heroGradient: 'from-amber-600 via-orange-600 to-rose-600', heroIcon: 'Cookie', isPublished: true, version: 1, lastEditedBy: 'system',
    sections: [
      { id: 'ck-1', title: '1. Essential Cookies', order: 1, content: 'Required for the website to function properly. These cookies enable core functionality such as security, session management, and accessibility. They cannot be disabled.\n\nExamples: Session ID, CSRF token, login state, cart contents, region preference.', isEditing: false },
      { id: 'ck-2', title: '2. Analytics Cookies', order: 2, content: 'Help us understand how visitors interact with our website by collecting anonymized usage data.\n\nExamples: Google Analytics (_ga, _gid), page views, scroll depth, click heatmaps, session duration.', isEditing: false },
      { id: 'ck-3', title: '3. Functional Cookies', order: 3, content: 'Enable enhanced functionality and personalization such as remembering your preferences.\n\nExamples: Language preference, recently viewed products, saved search filters, dark/light mode setting.', isEditing: false },
      { id: 'ck-4', title: '4. Marketing Cookies', order: 4, content: 'Used to track visitors across websites and display relevant advertisements.\n\nExamples: Facebook Pixel, Google Ads remarketing, affiliate tracking cookies.\n\nYou can opt out of marketing cookies at any time through your browser settings or our cookie consent banner.', isEditing: false },
    ],
  },
  security: {
    slug: 'security', title: 'Security', metaDescription: 'How KartSeek protects your data and keeps your account safe.',
    heroGradient: 'from-green-700 via-emerald-700 to-teal-700', heroIcon: 'Shield', isPublished: true, version: 1, lastEditedBy: 'system',
    sections: [
      { id: 'sec-1', title: 'Data Encryption', order: 1, content: 'All data in transit is protected with TLS 1.3 encryption. Data at rest is encrypted using AES-256 encryption across all databases and backups.', isEditing: false },
      { id: 'sec-2', title: 'PCI-DSS Compliance', order: 2, content: 'Our payment infrastructure is PCI-DSS Level 1 certified. We partner with Razorpay and Stripe, both PCI-certified payment processors. Card data is tokenized and never stored on our servers.', isEditing: false },
      { id: 'sec-3', title: 'Infrastructure Security', order: 3, content: 'Our cloud infrastructure utilizes multi-region deployment with DDoS protection, WAF (Web Application Firewall), and automatic security patching. All servers are monitored 24/7.', isEditing: false },
      { id: 'sec-4', title: 'Access Controls', order: 4, content: 'We enforce multi-factor authentication (MFA) for all employees, role-based access controls (RBAC), and the principle of least privilege. All access is logged and auditable.', isEditing: false },
      { id: 'sec-5', title: 'Vulnerability Management', order: 5, content: 'We conduct regular penetration testing, automated vulnerability scanning, and code security reviews. We maintain a responsible disclosure program for security researchers.', isEditing: false },
      { id: 'sec-6', title: 'Privacy by Design', order: 6, content: 'Privacy and security are built into every feature from inception. We conduct Data Protection Impact Assessments (DPIA) for all new features that process personal data.', isEditing: false },
      { id: 'sec-7', title: 'Protecting Your Account', order: 7, content: '1. Use a strong, unique password for your KartSeek account\n2. Enable two-factor authentication (2FA) in your account settings\n3. Never share your OTP, password, or login credentials with anyone\n4. Verify you\'re on kartseek.com before entering sensitive information\n5. Be cautious of phishing emails claiming to be from KartSeek\n6. Report suspicious activity through our Help Center immediately\n7. Keep your browser and operating system updated\n8. Log out of your account when using shared or public devices', isEditing: false },
    ],
  },
  grievance: {
    slug: 'grievance', title: 'Grievance Redressal', metaDescription: 'Contact KartSeek Grievance Officer for complaint redressal.',
    heroGradient: 'from-slate-700 via-slate-800 to-slate-900', heroIcon: 'Scale', isPublished: true, version: 1, lastEditedBy: 'system',
    sections: [
      { id: 'grv-1', title: 'Grievance Officer', order: 1, content: 'Name: Mr. Rajesh Kumar\nDesignation: Senior Legal Officer\nEmail: grievance@kartseek.com\nPhone: 1800-123-456 (Mon–Sat, 10 AM – 6 PM IST)\nAddress: KartSeek Technologies Pvt. Ltd., 123, Innovation Tower, Koramangala, Bangalore – 560034, Karnataka, India', isEditing: false },
      { id: 'grv-2', title: 'How to File a Grievance', order: 2, content: 'Step 1: Contact Customer Support First — For order-related issues, please use our Help Center.\n\nStep 2: Submit a Formal Grievance — Email grievance@kartseek.com with complaint details and order ID.\n\nStep 3: Acknowledgment — Within 48 hours of receipt.\n\nStep 4: Resolution — Within 30 days, per the Consumer Protection (E-Commerce) Rules, 2020.\n\nStep 5: Escalation — National Consumer Helpline (NCH) at 1800-11-4000 or consumerhelpline.gov.in.', isEditing: false },
      { id: 'grv-3', title: 'Redressal Timelines', order: 3, content: 'Order-related (wrong item, damaged): Acknowledgment 24h, Resolution 7 days\nRefund not received: Acknowledgment 24h, Resolution 10 business days\nSeller dispute: Acknowledgment 48h, Resolution 15 days\nData privacy concern: Acknowledgment 48h, Resolution 30 days\nFraudulent activity report: Acknowledgment 24h, Resolution 15 days\nContent/listing complaint: Acknowledgment 48h, Resolution 15 days', isEditing: false },
      { id: 'grv-4', title: 'Regulatory Compliance', order: 4, content: 'This grievance redressal mechanism is established in compliance with the Information Technology Act, 2000, the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the Consumer Protection (E-Commerce) Rules, 2020.', isEditing: false },
    ],
  },
  about: {
    slug: 'about', title: 'About Us', metaDescription: 'Learn about KartSeek — India\'s next-generation super-app marketplace.',
    heroGradient: 'from-blue-700 via-indigo-700 to-violet-700', heroIcon: 'ShoppingBag', isPublished: true, version: 1, lastEditedBy: 'system',
    sections: [
      { id: 'abt-1', title: 'Key Numbers', order: 1, content: '100M+ Customers | 50K+ Sellers | 8 Verticals | 500+ Cities', isEditing: false },
      { id: 'abt-2', title: 'Our Mission', order: 2, content: 'To democratize commerce by building a unified platform that empowers small businesses to reach millions of customers, while providing shoppers with the best selection, prices, and convenience — across marketplace, groceries, food delivery, pharmacy, travel, ride-hailing, healthcare, and more.', isEditing: false },
      { id: 'abt-3', title: 'Our Values', order: 3, content: 'Customer First: Every decision starts with "How does this benefit the customer?"\n\nSeller Empowerment: We build tools that help small businesses compete at scale.\n\nTrust & Transparency: Genuine reviews, honest pricing, and clear policies — always.', isEditing: false },
      { id: 'abt-4', title: 'Our Story', order: 4, content: 'Founded in 2024, KartSeek started with a simple observation: Indian consumers were using 8-10 different apps for daily needs. We set out to build a single platform that unifies all these experiences.\n\nToday, KartSeek serves millions of customers across India, the UAE, Saudi Arabia, the UK, and the US, with a growing network of trusted sellers and service providers.', isEditing: false },
    ],
  },
  careers: {
    slug: 'careers', title: 'Careers', metaDescription: 'Join KartSeek and help build India\'s largest super-app.',
    heroGradient: 'from-violet-700 via-purple-700 to-fuchsia-700', heroIcon: 'Briefcase', isPublished: true, version: 1, lastEditedBy: 'system',
    sections: [
      { id: 'car-1', title: 'Why Join KartSeek?', order: 1, content: 'Health & Wellness: Comprehensive medical, dental & vision insurance for you and family\nLearning Budget: ₹1L annual learning allowance for courses, conferences & books\nRemote Flexibility: Work from anywhere 2 days/week with quarterly team offsites\nESOPs: All full-time employees receive stock options from Day 1', isEditing: false },
      { id: 'car-2', title: 'Open Positions', order: 2, content: 'Engineering: Senior Full-Stack Engineer, Staff Backend Engineer, Mobile Engineer (React Native), DevOps / SRE Engineer\nDesign: Senior Product Designer\nProduct: Product Manager — Marketplace\nData: Data Scientist\nOperations: Customer Success Lead\n\nAll positions are based in Bangalore with remote flexibility.', isEditing: false },
    ],
  },
  press: {
    slug: 'press', title: 'Press & Media', metaDescription: 'KartSeek press releases, media resources, and brand assets.',
    heroGradient: 'from-slate-800 via-slate-900 to-slate-800', heroIcon: 'Newspaper', isPublished: true, version: 1, lastEditedBy: 'system',
    sections: [
      { id: 'prs-1', title: 'Latest Press Releases', order: 1, content: 'Jul 2026 — KartSeek Launches 8-Vertical Super-App Platform\nJun 2026 — KartSeek Crosses 50,000 Seller Milestone\nMay 2026 — KartSeek Raises Series B Funding ($120M)\nApr 2026 — KartSeek Partners with India Post for Rural Delivery\nMar 2026 — KartSeek Launches AI-Powered Product Recommendations', isEditing: false },
      { id: 'prs-2', title: 'Brand Assets', order: 2, content: 'Download official KartSeek logos, brand guidelines, and media assets from our brand kit.', isEditing: false },
      { id: 'prs-3', title: 'Media Inquiries', order: 3, content: 'For press inquiries, interviews, and media requests, contact press@kartseek.com', isEditing: false },
    ],
  },
  contact: {
    slug: 'contact', title: 'Contact Us', metaDescription: 'Get in touch with KartSeek support.',
    heroGradient: 'from-blue-600 via-cyan-600 to-teal-600', heroIcon: 'Phone', isPublished: true, version: 1, lastEditedBy: 'system',
    sections: [
      { id: 'cnt-1', title: 'Support Channels', order: 1, content: 'Call Us: 1800-123-456 (Toll-free, 7 AM – 11 PM IST)\nEmail Us: support@kartseek.com (We respond within 4 hours)\nLive Chat: 24/7 in-app chat support\nHelp Center: FAQs and self-service tools at /marketplace/help', isEditing: false },
      { id: 'cnt-2', title: 'Office Address', order: 2, content: 'KartSeek Technologies Pvt. Ltd.\n123, Innovation Tower, 5th Floor\nKoramangala, Bangalore – 560034\nKarnataka, India\n\nBusiness Hours:\nMon–Fri: 9:00 AM – 6:00 PM IST\nSat: 10:00 AM – 2:00 PM IST\nSun: Closed', isEditing: false },
    ],
  },
  investors: {
    slug: 'investors', title: 'Investor Relations', metaDescription: 'KartSeek investor information and financial highlights.',
    heroGradient: 'from-slate-800 via-slate-900 to-slate-800', heroIcon: 'TrendingUp', isPublished: true, version: 1, lastEditedBy: 'system',
    sections: [
      { id: 'inv-1', title: 'Financial Highlights', order: 1, content: 'GMV (FY26): $2.4B (+180% YoY)\nActive Users: 100M+ (+120% YoY)\nMarkets: 5 Countries (+3 new)\nRevenue Growth: 3.2x (FY25 → FY26)', isEditing: false },
      { id: 'inv-2', title: 'Key Milestones', order: 2, content: '2024 — Founded in Bangalore. Launched marketplace MVP.\n2024 — Raised $15M Seed round. Expanded to 3 Indian cities.\n2025 — Series A: $45M. Launched grocery, restaurant, and pharmacy verticals.\n2025 — Crossed 10M users. Expanded to UAE and Saudi Arabia.\n2026 — Series B: $120M. Launched hotel, taxi, and healthcare verticals.\n2026 — Crossed 100M users. Expanded to UK and US markets.', isEditing: false },
      { id: 'inv-3', title: 'Why KartSeek?', order: 3, content: '• Super-app model capturing 8 verticals with a single customer acquisition cost\n• India\'s digital commerce TAM projected at $400B by 2030\n• Unified technology platform reducing per-vertical costs by 60%\n• Strong network effects: sellers, customers, and delivery partners reinforce each other\n• Proven unit economics with marketplace achieving contribution margin positivity', isEditing: false },
      { id: 'inv-4', title: 'Contact', order: 4, content: 'For investment, partnership, or financial inquiries: investors@kartseek.com', isEditing: false },
    ],
  },
};

export default function StaticPageEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadPage();
  }, [slug]);

  async function loadPage() {
    setLoading(true);
    // Try API first, fall back to seed data
    try {
      const data = await apiFetch<any>(`/admin/static-pages/${slug}`);
      if (data && data.sections && data.sections.length > 0) {
        setPage({
          ...data,
          sections: data.sections.map((s: any, i: number) => ({
            ...s, id: s.id || `sec-${Date.now()}-${i}`, order: s.order || i + 1, isEditing: false,
          })),
        });
        setLoading(false);
        return;
      }
    } catch {
      // API unavailable — use seed
    }
    // Use seed data
    const seed = SEED_DATA[slug];
    if (seed) {
      setPage({ ...seed });
    } else {
      setPage({
        slug, title: slug.charAt(0).toUpperCase() + slug.slice(1),
        metaDescription: '', heroGradient: 'from-blue-700 via-indigo-700 to-violet-700',
        heroIcon: 'FileText', sections: [], isPublished: true, version: 0, lastEditedBy: null,
      });
    }
    setLoading(false);
  }

  if (!page || loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full mx-auto mb-3" />
        Loading page editor...
      </div>
    );
  }

  const toggleEdit = (id: string) => {
    setPage(prev => prev ? { ...prev, sections: prev.sections.map(s => s.id === id ? { ...s, isEditing: !s.isEditing } : s) } : prev);
  };

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setPage(prev => prev ? { ...prev, sections: prev.sections.map(s => s.id === id ? { ...s, [field]: value } : s) } : prev);
  };

  const addSection = () => {
    const newId = `sec-${Date.now()}`;
    const newOrder = (page.sections?.length || 0) + 1;
    setPage(prev => prev ? {
      ...prev, sections: [...prev.sections, { id: newId, title: `${newOrder}. New Section`, content: 'Enter section content here...', order: newOrder, isEditing: true }],
    } : prev);
  };

  const removeSection = (id: string) => {
    setPage(prev => prev ? { ...prev, sections: prev.sections.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })) } : prev);
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    setPage(prev => {
      if (!prev) return prev;
      const idx = prev.sections.findIndex(s => s.id === id);
      if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === prev.sections.length - 1)) return prev;
      const next = [...prev.sections];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return { ...prev, sections: next.map((s, i) => ({ ...s, order: i + 1 })) };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saveData = {
        title: page.title,
        metaDescription: page.metaDescription,
        heroGradient: page.heroGradient,
        heroIcon: page.heroIcon,
        sections: page.sections.map(({ isEditing, ...s }) => s),
        isPublished: page.isPublished,
        adminId: 'admin-user',
      };
      const res = await apiFetch<any>(`/admin/static-pages/${slug}`, { method: 'PUT', body: JSON.stringify(saveData) });
      if (res.page) {
        setPage(prev => prev ? { ...prev, version: res.page.version, updatedAt: res.page.updatedAt } : prev);
      }
      setSuccessMsg('Page saved successfully! Changes are live on the website.');
      setPage(prev => prev ? { ...prev, sections: prev.sections.map(s => ({ ...s, isEditing: false })) } : prev);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      // Simulate save success for offline/demo mode
      setPage(prev => prev ? { ...prev, version: (prev.version || 0) + 1, sections: prev.sections.map(s => ({ ...s, isEditing: false })) } : prev);
      setSuccessMsg('Page saved (local mode). Connect database to persist changes.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublish = () => {
    setPage(prev => prev ? { ...prev, isPublished: !prev.isPublished } : prev);
  };

  // ── Preview Mode ──────────────────────────────────────────────────────────
  if (previewMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{page.title} — Preview</h1>
          <button onClick={() => setPreviewMode(false)} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors">
            <Edit3 className="w-4 h-4" /> Back to Editor
          </button>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden max-w-3xl mx-auto">
          <div className={`bg-gradient-to-r ${page.heroGradient} text-white py-10 px-8 text-center`}>
            <h1 className="text-3xl font-extrabold mb-2">{page.title}</h1>
            <p className="text-white/70">{page.metaDescription}</p>
          </div>
          <div className="p-8 space-y-6">
            {page.sections.map(section => (
              <div key={section.id}>
                <h2 className="text-lg font-bold text-slate-900 mb-2">{section.title}</h2>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{section.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Editor Mode ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/static-pages" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{page.title}</h1>
            <p className="text-sm text-slate-500">/{slug} — Edit page content</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button onClick={() => setPreviewMode(true)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button onClick={togglePublish} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${page.isPublished ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
            <Globe className="w-4 h-4" /> {page.isPublished ? 'Published' : 'Unpublished'}
          </button>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Success */}
      {successMsg && (
        <div className={`border rounded-xl p-3 flex items-center gap-2 text-sm font-medium ${
          successMsg.includes('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> v{page.version}</span>
        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {page.sections.length} sections</span>
        <span className={`flex items-center gap-1 font-semibold ${page.isPublished ? 'text-emerald-600' : 'text-amber-600'}`}>
          {page.isPublished ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {page.isPublished ? 'Live on website' : 'Draft — not published'}
        </span>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-slate-800">Page Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="page-title">Page Title</label>
              <input id="page-title" value={page.title} onChange={e => setPage({ ...page, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="hero-icon">Hero Icon</label>
              <select id="hero-icon" value={page.heroIcon} onChange={e => setPage({ ...page, heroIcon: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none bg-white">
                {ICON_OPTIONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1" htmlFor="meta-description-seo">Meta Description (SEO)</label>
              <input id="meta-description-seo" value={page.metaDescription} onChange={e => setPage({ ...page, metaDescription: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Hero Gradient</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {GRADIENT_OPTIONS.map(g => (
                  <button key={g.value} onClick={() => setPage({ ...page, heroGradient: g.value })}
                    className={`p-2 rounded-xl text-xs font-medium transition-all ${page.heroGradient === g.value ? 'ring-2 ring-blue-500' : 'border border-slate-200'}`}>
                    <div className={`h-6 rounded-lg bg-gradient-to-r ${g.value} mb-1`} />
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {page.sections.map((section, idx) => (
          <div key={section.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                <span className="text-xs text-slate-400 font-mono">#{section.order}</span>
                {section.isEditing ? (
                  <input value={section.title} onChange={e => updateSection(section.id, 'title', e.target.value)}
                    className="font-bold text-slate-900 text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                ) : (
                  <h3 className="font-bold text-slate-900 text-sm">{section.title}</h3>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => moveSection(section.id, 'up')} disabled={idx === 0} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30" title="Move up">
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button onClick={() => moveSection(section.id, 'down')} disabled={idx === page.sections.length - 1} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30" title="Move down">
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button onClick={() => toggleEdit(section.id)} className={`p-1.5 rounded-lg transition-colors ${section.isEditing ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-400'}`} title="Edit">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => removeSection(section.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Delete section">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              {section.isEditing ? (
                <textarea value={section.content} onChange={e => updateSection(section.id, 'content', e.target.value)}
                  rows={8} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-y font-mono" />
              ) : (
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{section.content}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Section */}
      <button onClick={addSection}
        className="w-full border-2 border-dashed border-slate-300 rounded-xl py-4 text-sm font-semibold text-slate-500 hover:text-green-600 hover:border-green-400 transition-colors flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Add New Section
      </button>
    </div>
  );
}
