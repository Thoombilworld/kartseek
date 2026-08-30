import React from 'react';
import Link from 'next/link';
import { Cookie, ChevronRight, Settings, BarChart3, Target, Shield, Mail } from 'lucide-react';

export const metadata = { title: 'Cookie Policy — KartSeek', description: 'Understand how KartSeek uses cookies and similar tracking technologies.' };

const COOKIE_TYPES = [
  {
    name: 'Essential Cookies',
    icon: Shield,
    required: true,
    description: 'These cookies are strictly necessary for the website to function and cannot be disabled. They enable core features like page navigation, secure areas access, and shopping cart functionality.',
    examples: ['Session authentication', 'Shopping cart contents', 'Security tokens (CSRF)', 'Cookie consent preferences', 'Load balancer routing'],
  },
  {
    name: 'Functional Cookies',
    icon: Settings,
    required: false,
    description: 'These cookies enable enhanced functionality and personalization. They remember your preferences and choices to provide a more tailored experience.',
    examples: ['Language & region selection', 'Recently viewed products', 'Dark mode preference', 'Saved delivery location', 'Currency display preference'],
  },
  {
    name: 'Analytics Cookies',
    icon: BarChart3,
    required: false,
    description: 'These cookies help us understand how visitors interact with our website by collecting and reporting anonymous usage data. This helps us improve our Services.',
    examples: ['Page visit counts', 'Time spent on pages', 'Navigation patterns', 'Error reporting', 'Feature usage statistics'],
  },
  {
    name: 'Advertising Cookies',
    icon: Target,
    required: false,
    description: 'These cookies are used to deliver relevant advertisements and measure their effectiveness. They track browsing activity across websites to build a profile of your interests.',
    examples: ['Personalized product recommendations', 'Retargeting campaigns', 'Ad performance measurement', 'Interest-based advertising', 'Social media advertising pixels'],
  },
];

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-amber-50/30">
      <section className="bg-linear-to-r from-amber-600 via-orange-600 to-rose-600 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Cookie className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Cookie Policy</h1>
          <p className="text-white/70 text-sm max-w-2xl mx-auto">How we use cookies and similar tracking technologies</p>
          <p className="text-white/50 text-xs mt-3">Last updated: July 2026</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-8">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Cookie Policy</span>
        </nav>

        {/* Introduction */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-base font-bold text-slate-800 mb-2">What are cookies?</h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Cookies are small text files that are stored on your device (computer, tablet, or smartphone) when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            KartSeek uses cookies and similar technologies (localStorage, sessionStorage, web beacons) to recognize you, remember your preferences, and provide a secure, personalized shopping experience.
          </p>
        </div>

        {/* Cookie Types */}
        <h2 className="text-lg font-bold text-slate-800 mb-4">Types of Cookies We Use</h2>
        <div className="space-y-4 mb-8">
          {COOKIE_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <div key={type.name} className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Icon className="w-5 h-5 text-blue-600" />
                    {type.name}
                  </h3>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                    type.required ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {type.required ? 'Always Active' : 'Optional'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{type.description}</p>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Examples:</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {type.examples.map(ex => (
                      <li key={ex} className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-blue-400 rounded-full shrink-0" /> {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Managing Cookies */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" /> Managing Your Cookie Preferences
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            You can manage your cookie preferences at any time. Most browsers allow you to control cookies through their settings. You can also delete cookies that have already been set.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Disabling essential cookies may prevent you from using certain features of our website, including the shopping cart and checkout process.
            </p>
          </div>
        </div>

        {/* Third-Party Cookies */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-base font-bold text-slate-800 mb-2">Third-Party Cookies</h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Some cookies on our website are set by third-party services that appear on our pages. We do not control these cookies. The following third-party services may set cookies:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Google Analytics', 'Razorpay', 'Stripe', 'Cloudflare'].map(service => (
              <div key={service} className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-slate-700">{service}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <h3 className="font-bold text-slate-800 mb-2">Cookie-related questions?</h3>
          <p className="text-sm text-slate-500 mb-4">Contact our privacy team for more information.</p>
          <a href="mailto:privacy@kartseek.com" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            <Mail className="w-4 h-4" /> privacy@kartseek.com
          </a>
        </div>
      </div>
    </div>
  );
}
