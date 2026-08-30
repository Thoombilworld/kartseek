'use client';

import React, { useState } from 'react';
import {
  Settings, Save, Globe, Bell, Shield, Palette, Users, Mail,
  Clock, CheckCircle, ToggleLeft, ToggleRight, DollarSign,
  MapPin, Key, Smartphone, MessageSquare, ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRegion, REGIONS } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';

// ─── All region currency & timezone options ──────────────────────────────────

const currencyOptions = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'QAR', symbol: '﷼', label: 'Qatari Riyal (﷼)' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham (د.إ)' },
  { code: 'SAR', symbol: '﷼', label: 'Saudi Riyal (﷼)' },
  { code: 'BHD', symbol: 'ب.د', label: 'Bahraini Dinar (ب.د)' },
  { code: 'KWD', symbol: 'د.ك', label: 'Kuwaiti Dinar (د.ك)' },
  { code: 'OMR', symbol: 'ر.ع.', label: 'Omani Rial (ر.ع.)' },

  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
];

const timezoneOptions = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'Asia/Qatar', label: 'Asia/Qatar (AST, UTC+3)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST, UTC+3)' },
  { value: 'Asia/Bahrain', label: 'Asia/Bahrain (AST, UTC+3)' },
  { value: 'Asia/Kuwait', label: 'Asia/Kuwait (AST, UTC+3)' },
  { value: 'Asia/Muscat', label: 'Asia/Muscat (GST, UTC+4)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'UTC', label: 'UTC' },
];

// ─── Page Component ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { selectedRegion, currencyCode: currentCurrencyCode } = useRegion();
  const regionConfig = selectedRegion !== 'ALL' ? REGIONS[selectedRegion] : null;

  const [settings, setSettings] = useState({
    siteName: 'KARTSEEK',
    tagline: 'Everything Delivered',
    supportEmail: 'support@kartseek.com',
    supportPhone: '+91 1800 123 4567',
    currency: regionConfig?.currencyCode || currentCurrencyCode || 'INR',
    timezone: regionConfig?.timezone || 'Asia/Kolkata',
    maintenanceMode: false,
    newUserRegistration: true,
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    twoFactorAuth: true,
    twoFactorEnforcement: 'admins',
    twoFactorGraceDays: '7',
    twoFactorAllowAuthenticator: true,
    twoFactorAllowSms: true,
    twoFactorAllowEmail: false,
    twoFactorRememberDays: '7',
    autoApproveKyc: false,
    maxLoginAttempts: '5',
    sessionTimeout: '30',
    primaryColor: '#16A34A',
    darkMode: false,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) => (
    <button onClick={onChange} aria-label={label || 'Toggle'} title={label || 'Toggle'} className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );

  const regionLabel = regionConfig
    ? `${regionConfig.name}`
    : '🌍 All Regions';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm">Configure platform-wide settings and preferences.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Active region indicator */}
          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-bold text-xs border border-slate-200">
            <Globe className="w-3.5 h-3.5 text-emerald-600" /> {regionLabel}
          </span>
          <button
            onClick={handleSave}
            id="save-settings-btn"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
           aria-label="Action">{saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}</button>
        </div>
      </div>

      {/* General */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-600" /> General</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="site-name">Site Name</label>
            <input id="site-name" type="text" value={settings.siteName} onChange={e => setSettings(s => ({ ...s, siteName: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label="Site Name" title="Site Name" placeholder="Enter site name" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="tagline">Tagline</label>
            <input id="tagline" type="text" value={settings.tagline} onChange={e => setSettings(s => ({ ...s, tagline: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label="Tagline" title="Tagline" placeholder="Enter tagline" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Default Currency</span>
            </label>
            <select
              value={settings.currency}
              onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              id="currency-select"
              aria-label="Default Currency"
              title="Default Currency"
            >
              {currencyOptions.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-500" /> Timezone</span>
            </label>
            <select
              value={settings.timezone}
              onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              id="timezone-select"
              aria-label="Timezone"
              title="Timezone"
            >
              {timezoneOptions.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div><p className="text-sm font-bold text-slate-700">Maintenance Mode</p><p className="text-xs text-slate-400">Temporarily disable the platform for all users</p></div>
          <Toggle checked={settings.maintenanceMode} onChange={() => setSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))} />
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><Mail className="w-4 h-4 text-emerald-600" /> Support Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="support-email">Support Email</label><input id="support-email" type="email" value={settings.supportEmail} onChange={e => setSettings(s => ({ ...s, supportEmail: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label="Support Email" title="Support Email" placeholder="e.g. support@kartseek.com" /></div>
          <div><label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="support-phone">Support Phone</label><input id="support-phone" type="tel" value={settings.supportPhone} onChange={e => setSettings(s => ({ ...s, supportPhone: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label="Support Phone" title="Support Phone" placeholder="e.g. +974 5500 0000" /></div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><Bell className="w-4 h-4 text-emerald-600" /> Notifications</h3>
        {[
          { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send order updates and alerts via email' },
          { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Send SMS for OTP and critical alerts' },
          { key: 'pushNotifications', label: 'Push Notifications', desc: 'Mobile push notifications for orders' },
        ].map(n => (
          <div key={n.key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div><p className="text-sm font-bold text-slate-700">{n.label}</p><p className="text-xs text-slate-400">{n.desc}</p></div>
            <Toggle checked={(settings as any)[n.key]} onChange={() => setSettings(s => ({ ...s, [n.key]: !(s as any)[n.key] }))} />
          </div>
        ))}
      </div>

      {/* Security */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-600" /> Security</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="max-login-attempts">Max Login Attempts</label><input id="max-login-attempts" type="number" value={settings.maxLoginAttempts} onChange={e => setSettings(s => ({ ...s, maxLoginAttempts: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label="Max Login Attempts" title="Max Login Attempts" placeholder="5" /></div>
          <div><label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="session-timeout-min">Session Timeout (min)</label><input id="session-timeout-min" type="number" value={settings.sessionTimeout} onChange={e => setSettings(s => ({ ...s, sessionTimeout: e.target.value }))} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" aria-label="Session Timeout" title="Session Timeout" placeholder="30" /></div>
        </div>
        {[
          { key: 'newUserRegistration', label: 'Allow New Registrations', desc: 'Enable public user sign-ups' },
          { key: 'autoApproveKyc', label: 'Auto-Approve KYC', desc: 'Automatically approve vendor KYC documents' },
        ].map(n => (
          <div key={n.key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div><p className="text-sm font-bold text-slate-700">{n.label}</p><p className="text-xs text-slate-400">{n.desc}</p></div>
            <Toggle checked={(settings as any)[n.key]} onChange={() => setSettings(s => ({ ...s, [n.key]: !(s as any)[n.key] }))} />
          </div>
        ))}
      </div>

      {/* 2FA Policy */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5" id="twofa-policy-section">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><Key className="w-4 h-4 text-emerald-600" /> Two-Factor Authentication Policy</h3>
          <Link href="/admin/two-factor" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Manage 2FA
          </Link>
        </div>

        {/* Compliance Meter */}
        <div className="bg-linear-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-emerald-800">Staff 2FA Compliance</p>
            <span className="text-sm font-black text-emerald-700">7 / 12 staff (58%)</span>
          </div>
          <div className="h-2.5 bg-emerald-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all admin-progress-fill" ref={el => { if (el) el.style.setProperty('--fill-w', '58%'); }} />
          </div>
          <p className="text-[10px] text-emerald-600 mt-1.5">5 staff members still need to set up two-factor authentication</p>
        </div>

        {/* Enforcement Level */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="2fa-enforcement-select">Global Enforcement Level</label>
          <select
            value={settings.twoFactorEnforcement}
            onChange={e => setSettings(s => ({ ...s, twoFactorEnforcement: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            id="2fa-enforcement-select"
            aria-label="Global Enforcement Level"
            title="Global Enforcement Level"
          >
            <option value="optional">Optional — Staff can choose to enable 2FA</option>
            <option value="admins">Required for Admins — Super Admin and Admin roles must use 2FA</option>
            <option value="all">Required for All Staff — Every staff member must use 2FA</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Grace Period */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="2fa-grace-period">Grace Period (days)</label>
            <input
              type="number"
              value={settings.twoFactorGraceDays}
              onChange={e => setSettings(s => ({ ...s, twoFactorGraceDays: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              min="1"
              max="30"
              id="2fa-grace-period"
              aria-label="Grace Period in days"
              title="Grace Period in days"
              placeholder="7"
            />
            <p className="text-[10px] text-slate-400 mt-1">Days before non-compliant accounts are locked</p>
          </div>

          {/* Remember Device Duration */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="2fa-remember-duration">Remember Device Duration</label>
            <select
              value={settings.twoFactorRememberDays}
              onChange={e => setSettings(s => ({ ...s, twoFactorRememberDays: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              id="2fa-remember-duration"
              aria-label="Remember Device Duration"
              title="Remember Device Duration"
            >
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="0">Never — Always require OTP</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">How long trusted devices skip 2FA</p>
          </div>
        </div>

        {/* Allowed Methods */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Allowed Verification Methods</label>
          <div className="space-y-2">
            {[
              { key: 'twoFactorAllowAuthenticator', icon: Smartphone, label: 'Authenticator App (TOTP)', desc: 'Google Authenticator, Authy, etc.' },
              { key: 'twoFactorAllowSms', icon: MessageSquare, label: 'SMS OTP', desc: 'Text message verification codes' },
              { key: 'twoFactorAllowEmail', icon: Mail, label: 'Email OTP', desc: 'Email-based verification codes' },
            ].map(method => (
              <label key={method.key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={(settings as any)[method.key]}
                  onChange={() => setSettings(s => ({ ...s, [method.key]: !(s as any)[method.key] }))}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <method.icon className="w-4 h-4 text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{method.label}</p>
                  <p className="text-[10px] text-slate-400">{method.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center justify-between py-2 border-t border-slate-100">
          <div><p className="text-sm font-bold text-slate-700">Enable 2FA System</p><p className="text-xs text-slate-400">Master switch for all 2FA features</p></div>
          <Toggle checked={settings.twoFactorAuth} onChange={() => setSettings(s => ({ ...s, twoFactorAuth: !s.twoFactorAuth }))} />
        </div>
      </div>
    </div>
  );
}
