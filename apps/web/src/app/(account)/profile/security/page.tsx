'use client';

import React, { useState } from 'react';
import {
  Shield, Lock, Smartphone, Mail, Eye, EyeOff,
  Key, Fingerprint, LogOut, AlertTriangle, Check,
  ChevronRight, Clock,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

const SESSIONS: Session[] = [
  { id: '1', device: 'Chrome on Windows', location: 'Mumbai, India',     lastActive: 'Now',           isCurrent: true  },
  { id: '2', device: 'Safari on iPhone',  location: 'Mumbai, India',     lastActive: '2 hours ago',   isCurrent: false },
  { id: '3', device: 'Chrome on MacBook', location: 'Delhi, India',     lastActive: '3 days ago',    isCurrent: false },
];

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function SecuritySettingsPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>(SESSIONS);

  const handleRevokeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" /> Security Settings
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage your password, two-factor authentication, and active sessions.
        </p>
      </div>

      {/* ── Change Password ──────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500" /> Change Password
        </h3>
        <p className="text-sm text-slate-500 mb-5">Update your password to keep your account secure.</p>

        <div className="space-y-4 max-w-md">
          <div>
            <label htmlFor="current-pw" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                id="current-pw"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 min-h-[44px] rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-base md:text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="new-pw" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <input
              id="new-pw"
              type="password"
              placeholder="Minimum 8 characters"
              className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-base md:text-sm transition-all"
            />
          </div>

          <div>
            <label htmlFor="confirm-pw" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <input
              id="confirm-pw"
              type="password"
              placeholder="Re-enter new password"
              className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-base md:text-sm transition-all"
            />
          </div>

          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 min-h-[44px] rounded-xl text-sm transition-colors shadow-sm">
            Update Password
          </button>
        </div>
      </section>

      {/* ── Two-Factor Authentication ────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-500" /> Two-Factor Authentication
            </h3>
            <p className="text-sm text-slate-500">
              Add an extra layer of security by requiring a verification code when you sign in.
            </p>
          </div>
          <button
            onClick={() => setTwoFaEnabled(!twoFaEnabled)}
            /* 44px tall and 44px wide, measurably.
               The switch *looks* 48x28 — that is the track, drawn by the inner
               span. Sizing the button itself to the drawn track left a 28px
               target on a control that turns two-factor authentication on and
               off. An `after:` pseudo-element was tried first and does extend
               the clickable area, but nothing that measures `getBoundingClientRect`
               can see it, which makes the fix unverifiable. The button is now
               genuinely 44px with the track centred inside it. */
            className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0 cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            role="switch"
            aria-checked={twoFaEnabled}
            title={twoFaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          >
            {/* The track: what the customer sees, at its designed size. */}
            <span
              className={`pointer-events-none flex h-7 w-12 items-center rounded-full border-2 transition-colors duration-200 ease-in-out ${
                twoFaEnabled ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-200 border-slate-200'
              }`}
            >
              <span
                className={`inline-block w-[22px] h-[22px] rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                  twoFaEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        </div>

        {twoFaEnabled && (
          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Two-factor authentication is enabled</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Verification codes are sent to your registered phone number ending in ****210.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
            <Smartphone className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">SMS Verification</p>
              <p className="text-xs text-slate-500">Codes sent via text message</p>
            </div>
            <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">Active</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
            <Mail className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Email Verification</p>
              <p className="text-xs text-slate-500">Backup codes via email</p>
            </div>
            <span className="ml-auto text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">Off</span>
          </div>
        </div>
      </section>

      {/* ── Biometric Login ──────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-slate-500" /> Biometric Login
            </h3>
            <p className="text-sm text-slate-500">
              Use fingerprint or Face ID on supported devices for faster login.
            </p>
          </div>
          <button
            onClick={() => setBiometricEnabled(!biometricEnabled)}
            /* 44px tall and 44px wide, measurably.
               The switch *looks* 48x28 — that is the track, drawn by the inner
               span. Sizing the button itself to the drawn track left a 28px
               target on a control that turns two-factor authentication on and
               off. An `after:` pseudo-element was tried first and does extend
               the clickable area, but nothing that measures `getBoundingClientRect`
               can see it, which makes the fix unverifiable. The button is now
               genuinely 44px with the track centred inside it. */
            className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0 cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            role="switch"
            aria-checked={biometricEnabled}
            title={biometricEnabled ? 'Disable biometric login' : 'Enable biometric login'}
          >
            <span
              className={`pointer-events-none flex h-7 w-12 items-center rounded-full border-2 transition-colors duration-200 ease-in-out ${
                biometricEnabled ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-200 border-slate-200'
              }`}
            >
              <span
                className={`inline-block w-[22px] h-[22px] rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                  biometricEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        </div>
      </section>

      {/* ── Active Sessions ──────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
            <LogOut className="w-4 h-4 text-slate-500" /> Active Sessions
          </h3>
          <p className="text-sm text-slate-500">
            Devices where your account is currently signed in.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${
                session.isCurrent ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  {session.device}
                  {session.isCurrent && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      THIS DEVICE
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  {session.location}
                  <span className="text-slate-300">•</span>
                  <Clock className="w-3 h-3" /> {session.lastActive}
                </p>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 min-h-[44px] rounded-lg transition-colors shrink-0"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
        {sessions.length > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => setSessions((prev) => prev.filter((s) => s.isCurrent))}
              className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-2 min-h-[44px] px-2 -ml-2"
            >
              <AlertTriangle className="w-4 h-4" /> Sign Out All Other Devices
            </button>
          </div>
        )}
      </section>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      <section className="bg-red-50 rounded-xl border border-red-200 p-6">
        <h3 className="font-bold text-red-800 mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Danger Zone
        </h3>
        <p className="text-sm text-red-600 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button className="text-sm font-semibold text-red-700 bg-white border-2 border-red-300 hover:bg-red-100 px-5 py-2.5 min-h-[44px] rounded-xl transition-colors">
          Delete My Account
        </button>
      </section>
    </div>
  );
}
