import React from 'react';
import Link from 'next/link';
import { Shield, ChevronRight, Lock, Server, Eye, UserCheck, AlertTriangle, Bug, Mail, Phone } from 'lucide-react';

export const metadata = { title: 'Security — KartSeek', description: 'Learn about KartSeek\'s security practices and how we keep your data safe.' };

const MEASURES = [
  {
    title: 'Data Encryption',
    icon: Lock,
    description: 'All data in transit is protected with TLS 1.3 encryption. Data at rest is encrypted using AES-256 encryption across all databases and backups.',
  },
  {
    title: 'PCI-DSS Compliance',
    icon: Shield,
    description: 'Our payment infrastructure is PCI-DSS Level 1 certified. We partner with Razorpay and Stripe, both PCI-certified payment processors. Card data is tokenized and never stored on our servers.',
  },
  {
    title: 'Infrastructure Security',
    icon: Server,
    description: 'Our cloud infrastructure utilizes multi-region deployment with DDoS protection, WAF (Web Application Firewall), and automatic security patching. All servers are monitored 24/7.',
  },
  {
    title: 'Access Controls',
    icon: UserCheck,
    description: 'We enforce multi-factor authentication (MFA) for all employees, role-based access controls (RBAC), and the principle of least privilege. All access is logged and auditable.',
  },
  {
    title: 'Vulnerability Management',
    icon: Bug,
    description: 'We conduct regular penetration testing, automated vulnerability scanning, and code security reviews. We maintain a responsible disclosure program for security researchers.',
  },
  {
    title: 'Privacy by Design',
    icon: Eye,
    description: 'Privacy and security are built into every feature from inception. We conduct Data Protection Impact Assessments (DPIA) for all new features that process personal data.',
  },
];

const USER_TIPS = [
  'Use a strong, unique password for your KartSeek account',
  'Enable two-factor authentication (2FA) in your account settings',
  'Never share your OTP, password, or login credentials with anyone',
  'Verify you\'re on kartseek.com before entering sensitive information',
  'Be cautious of phishing emails claiming to be from KartSeek',
  'Report suspicious activity through our Help Center immediately',
  'Keep your browser and operating system updated',
  'Log out of your account when using shared or public devices',
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50/30">
      <section className="bg-gradient-to-r from-green-700 via-emerald-700 to-teal-700 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Security</h1>
          <p className="text-white/70 max-w-2xl mx-auto">How we protect your data and keep your account safe</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-8">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Security</span>
        </nav>

        {/* Security Measures */}
        <h2 className="text-xl font-bold text-slate-800 mb-4">Our Security Measures</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {MEASURES.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.title} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{m.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{m.description}</p>
              </div>
            );
          })}
        </div>

        {/* User Tips */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Protecting Your Account
          </h2>
          <ul className="space-y-2">
            {USER_TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Report Vulnerability */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Report a Security Vulnerability
          </h2>
          <p className="text-sm text-amber-800 mb-3">
            If you discover a security vulnerability, please report it responsibly. We value the security community and will acknowledge all valid reports.
          </p>
          <a href="mailto:security@kartseek.com" className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors text-sm">
            <Mail className="w-4 h-4" /> security@kartseek.com
          </a>
        </div>

        {/* Contact */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
          <h3 className="font-bold text-slate-800 mb-2">Security concerns?</h3>
          <p className="text-sm text-slate-500 mb-4">Our security team is available 24/7.</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a href="mailto:security@kartseek.com" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm">
              <Mail className="w-4 h-4" /> security@kartseek.com
            </a>
            <a href="tel:+911800123456" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors text-sm">
              <Phone className="w-4 h-4" /> 1800-123-456
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
