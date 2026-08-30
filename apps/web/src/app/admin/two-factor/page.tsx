'use client';

import React, { useState } from 'react';
import {
  Key, Shield, Smartphone, Mail, MessageSquare, Check, ChevronRight,
  Copy, Download, RefreshCw, Trash2, Monitor, Globe, Clock,
  AlertTriangle, CheckCircle2, Lock, QrCode, ArrowLeft,
  ShieldCheck, Eye, EyeOff,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type SetupStep = 'choose-method' | 'scan-qr' | 'verify' | 'complete';
type TwoFAMethod = 'authenticator' | 'sms' | 'email';

interface TrustedDevice {
  id: string;
  name: string;
  browser: string;
  os: string;
  ip: string;
  lastUsed: string;
  location: string;
  isCurrent: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SECRET = 'KART-SEEK-2FA-DEMO-KEY';

const MOCK_BACKUP_CODES = [
  'BACKUP-A7K2-M9P1', 'BACKUP-R3T8-N6W4', 'BACKUP-D5H1-Q2X9',
  'BACKUP-F8L3-V7Y6', 'BACKUP-J4B9-K1Z3', 'BACKUP-G6C2-S5T8',
  'BACKUP-W1M7-P4R2', 'BACKUP-E9N5-H3L6',
];

const MOCK_DEVICES: TrustedDevice[] = [
  { id: 'dev-1', name: 'Chrome on Windows', browser: 'Chrome 126', os: 'Windows 11', ip: '192.168.1.45', lastUsed: '2 min ago', location: 'Doha, Qatar', isCurrent: true },
  { id: 'dev-2', name: 'Safari on MacBook', browser: 'Safari 18', os: 'macOS 15', ip: '10.0.0.12', lastUsed: '3 days ago', location: 'Dubai, UAE', isCurrent: false },
  { id: 'dev-3', name: 'Firefox on Ubuntu', browser: 'Firefox 130', os: 'Ubuntu 24.04', ip: '172.16.0.88', lastUsed: '1 week ago', location: 'New Delhi, India', isCurrent: false },
];

// ─── OTP Input Component ──────────────────────────────────────────────────────

function OtpInput({ length, value, onChange, disabled }: {
  length: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  const handleChange = (idx: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const newDigits = [...digits];
    newDigits[idx] = char;
    onChange(newDigits.join('').slice(0, length));
    if (char && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          className={`w-12 h-14 text-center text-xl font-black rounded-xl border-2 outline-none transition-all ${
            disabled ? 'bg-slate-100 border-slate-200 text-slate-400'
            : digits[i] ? 'bg-white border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
            : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
          }`}
          title={`Digit ${i + 1}`}
          aria-label={`OTP digit ${i + 1} of ${length}`}
          placeholder="·"
        />
      ))}
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function TwoFactorPage() {
  // 2FA status. Defaulted to `true`, so the page opened claiming the account was
  // already protected by an authenticator app — the single most misleading thing
  // on the screen, since no 2FA service exists. False until one does.
  const [isEnabled, setIsEnabled] = useState(false);
  const [activeMethod, setActiveMethod] = useState<TwoFAMethod>('authenticator');
  const [lastVerified] = useState('2026-06-18 09:42 AM');

  // Setup wizard
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>('choose-method');
  const [selectedMethod, setSelectedMethod] = useState<TwoFAMethod>('authenticator');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Backup codes
  const [backupCodes, setBackupCodes] = useState(MOCK_BACKUP_CODES);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Trusted devices
  const [devices, setDevices] = useState(MOCK_DEVICES);

  // Disable flow
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableOtp, setDisableOtp] = useState('');
  const [showDisablePw, setShowDisablePw] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleVerifySetup = async () => {
    setVerifyError('');
    setVerifyLoading(true);
    await new Promise(r => setTimeout(r, 800));
    // Refuses rather than pretending. This compared the entered code against the
    // literal '123456' and then set `isEnabled` in local state — so the UI
    // reported "two-factor is on" while the account had no second factor at all,
    // and the error message printed the accepted code as a hint. Restore the real
    // verification here once a 2FA service exists to call.
    setVerifyLoading(false);
    setVerifyError(
      'Two-factor authentication is not available yet — this screen is not connected to a service. Your account is secured by its password only.',
    );
  };

  const handleDisable = async () => {
    if (!disablePassword || !disableOtp) return;
    await new Promise(r => setTimeout(r, 500));
    setIsEnabled(false);
    setShowDisable(false);
    setDisablePassword('');
    setDisableOtp('');
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    const blob = new Blob([
      '# KARTSEEK — 2FA Backup Recovery Codes\n',
      `# Generated: ${new Date().toISOString()}\n`,
      '# Each code can only be used once.\n\n',
      backupCodes.join('\n'),
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kartseek-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = () => {
    const newCodes = Array.from({ length: 8 }, () => {
      const seg1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const seg2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `BACKUP-${seg1}-${seg2}`;
    });
    setBackupCodes(newCodes);
  };

  const removeDevice = (id: string) => setDevices(d => d.filter(dev => dev.id !== id));

  const startSetup = () => {
    setShowSetup(true);
    setSetupStep('choose-method');
    setVerifyOtp('');
    setVerifyError('');
    setSelectedMethod('authenticator');
  };

  // Auto-submit OTP when 6 digits entered during setup
  React.useEffect(() => {
    if (verifyOtp.length === 6 && setupStep === 'verify' && !verifyLoading) {
      handleVerifySetup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyOtp]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/*
        This screen has no backend. There is no 2FA route on the API gateway, the
        secret and backup codes below are hardcoded constants, and the verify step
        compares against the literal '123456'. Completing the flow therefore
        protects nothing — it only sets React state, and on the next page load the
        account is exactly as unprotected as before.

        A security screen that looks like it worked is worse than no screen at
        all, because an admin stops looking for the real control. Until the
        service exists this says so plainly and the enrolment controls are inert.
      */}
      <div
        role="alert"
        className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <p className="font-semibold">Two-factor authentication is not available yet.</p>
        <p className="mt-1">
          This screen is a design preview. Nothing on it is connected to a service,
          so enrolling here does <strong>not</strong> protect your account and the
          codes shown are not real. Your account is secured by its password only.
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-6 h-6 text-emerald-600" />
            Two-Factor Authentication
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Secure your admin account with an additional verification layer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold text-xs border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" /> 2FA Enabled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold text-xs border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5" /> 2FA Disabled
            </span>
          )}
        </div>
      </div>

      {/* ─── Status Card ──────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-6 shadow-sm ${isEnabled ? 'bg-linear-to-br from-emerald-50 to-green-50 border-emerald-200' : 'bg-linear-to-br from-red-50 to-orange-50 border-red-200'}`}>
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isEnabled ? 'bg-emerald-100' : 'bg-red-100'}`}>
            {isEnabled ? <ShieldCheck className="w-7 h-7 text-emerald-600" /> : <AlertTriangle className="w-7 h-7 text-red-600" />}
          </div>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${isEnabled ? 'text-emerald-900' : 'text-red-900'}`}>
              {isEnabled ? 'Two-Factor Authentication is Active' : 'Two-Factor Authentication is Disabled'}
            </h2>
            <p className={`text-sm mt-1 ${isEnabled ? 'text-emerald-700' : 'text-red-700'}`}>
              {isEnabled
                ? `Your account is protected with ${activeMethod === 'authenticator' ? 'an authenticator app (TOTP)' : activeMethod === 'sms' ? 'SMS OTP' : 'email OTP'}. Last verified: ${lastVerified}`
                : 'Your account is vulnerable. We strongly recommend enabling 2FA for admin accounts.'
              }
            </p>
          </div>
          <div className="flex gap-2">
            {isEnabled ? (
              <button onClick={() => setShowDisable(true)} className="px-4 py-2 text-sm font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors" id="disable-2fa-btn">
                Disable 2FA
              </button>
            ) : (
              <button onClick={startSetup} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm" id="enable-2fa-btn">
                Enable 2FA
              </button>
            )}
          </div>
        </div>

        {/* Method info grid */}
        {isEnabled && (
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-emerald-200/50">
            <div className="text-center">
              <p className="text-xs text-emerald-600 font-medium">Method</p>
              <p className="text-sm font-bold text-emerald-900 mt-1 capitalize flex items-center justify-center gap-1.5">
                {activeMethod === 'authenticator' ? <Smartphone className="w-3.5 h-3.5" /> : activeMethod === 'sms' ? <MessageSquare className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                {activeMethod === 'authenticator' ? 'Authenticator App' : activeMethod === 'sms' ? 'SMS OTP' : 'Email OTP'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-emerald-600 font-medium">Backup Codes</p>
              <p className="text-sm font-bold text-emerald-900 mt-1">{backupCodes.length} remaining</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-emerald-600 font-medium">Trusted Devices</p>
              <p className="text-sm font-bold text-emerald-900 mt-1">{devices.length} devices</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Setup Wizard (modal-style) ───────────────────────────────────── */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">

            {/* Wizard Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-black text-slate-900">Set Up Two-Factor Authentication</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Step {setupStep === 'choose-method' ? '1' : setupStep === 'scan-qr' ? '2' : setupStep === 'verify' ? '3' : '✓'} of 3
                </p>
              </div>
              <button onClick={() => setShowSetup(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-100">
              <div className={`h-full bg-emerald-500 transition-all ${
                setupStep === 'choose-method' ? 'w-1/3' : setupStep === 'scan-qr' ? 'w-2/3' : 'w-full'
              }`} />
            </div>

            {/* Step 1: Choose Method */}
            {setupStep === 'choose-method' && (
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">Select how you want to receive verification codes:</p>
                {([
                  { id: 'authenticator', icon: Smartphone, label: 'Authenticator App', desc: 'Use Google Authenticator, Authy, or similar app. Most secure option.', recommended: true },
                  { id: 'sms', icon: MessageSquare, label: 'SMS OTP', desc: 'Receive codes via text message to your phone number.' },
                  { id: 'email', icon: Mail, label: 'Email OTP', desc: 'Receive codes via email. Convenient but less secure.' },
                ] as const).map(method => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedMethod === method.id
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                    id={`method-${method.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedMethod === method.id ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <method.icon className={`w-5 h-5 ${selectedMethod === method.id ? 'text-emerald-600' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          {method.label}
                          {'recommended' in method && method.recommended && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">RECOMMENDED</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{method.desc}</p>
                      </div>
                      {selectedMethod === method.id && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setSetupStep('scan-qr')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  id="setup-next-btn"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Scan QR / Configure */}
            {setupStep === 'scan-qr' && (
              <div className="p-6 space-y-5">
                {selectedMethod === 'authenticator' ? (
                  <>
                    <p className="text-sm text-slate-600">Scan this QR code with your authenticator app, or enter the secret key manually:</p>

                    {/* Mock QR Code */}
                    <div className="flex justify-center">
                      <div className="w-48 h-48 bg-white border-2 border-slate-200 rounded-2xl p-4 flex items-center justify-center shadow-inner">
                        <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center relative overflow-hidden">
                          {/* Simulated QR pattern */}
                          <div className="grid grid-cols-8 gap-0.5 w-32 h-32">
                            {Array.from({ length: 64 }).map((_, i) => (
                              <div key={i} className={`w-full aspect-square rounded-[1px] ${
                                // Create a QR-like pattern
                                (i < 24 && (i % 8 < 3 || i < 3)) ||
                                (i >= 40 && i % 8 < 3) ||
                                (i % 8 >= 5 && i < 24) ||
                                (i * 7) % 10 > 4
                                  ? 'bg-white'
                                  : 'bg-slate-900'
                              }`} />
                            ))}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                              <Key className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Manual Secret Key */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Manual Entry Key</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white px-3 py-2 rounded-lg font-mono text-sm text-slate-900 border border-slate-200 tracking-wider">
                          {MOCK_SECRET}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(MOCK_SECRET)}
                          className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Copy secret key"
                        >
                          <Copy className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">
                      {selectedMethod === 'sms'
                        ? 'We\'ll send verification codes to your registered phone number.'
                        : 'We\'ll send verification codes to your registered email address.'}
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                      {selectedMethod === 'sms' ? <MessageSquare className="w-5 h-5 text-blue-500" /> : <Mail className="w-5 h-5 text-blue-500" />}
                      <div>
                        <p className="text-sm font-bold text-slate-900">{selectedMethod === 'sms' ? '+974 5500 ••••' : 'admin@kart••••.com'}</p>
                        <p className="text-xs text-slate-500">A test code has been sent. Check your {selectedMethod === 'sms' ? 'messages' : 'inbox'}.</p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setSetupStep('choose-method')} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors">
                    Back
                  </button>
                  <button onClick={() => setSetupStep('verify')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    Next: Verify <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Verify */}
            {setupStep === 'verify' && (
              <div className="p-6 space-y-5">
                <p className="text-sm text-slate-600 text-center">
                  Enter the 6-digit code from your {selectedMethod === 'authenticator' ? 'authenticator app' : selectedMethod === 'sms' ? 'SMS' : 'email'} to confirm setup:
                </p>

                <OtpInput length={6} value={verifyOtp} onChange={setVerifyOtp} disabled={verifyLoading} />

                {verifyError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <p className="text-center text-xs text-slate-400">
                  Demo hint: Enter <span className="font-mono font-bold text-slate-600">123456</span> to verify
                </p>

                <div className="flex gap-3">
                  <button onClick={() => { setSetupStep('scan-qr'); setVerifyOtp(''); setVerifyError(''); }} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handleVerifySetup}
                    disabled={verifyOtp.length < 6 || verifyLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                    id="verify-setup-btn"
                   aria-label="Action">{verifyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Verify &amp; Activate</>}</button>
                </div>
              </div>
            )}

            {/* Step Complete */}
            {setupStep === 'complete' && (
              <div className="p-6 space-y-5 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">2FA Successfully Enabled!</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Your account is now protected with two-factor authentication.
                    Make sure to save your backup codes below.
                  </p>
                </div>

                {/* Backup codes preview */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                  <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> Save Your Backup Recovery Codes
                  </p>
                  <p className="text-xs text-amber-600 mb-3">
                    Store these codes in a safe place. Each can be used once if you lose access to your authenticator.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {backupCodes.slice(0, 4).map(code => (
                      <code key={code} className="bg-white px-2 py-1.5 rounded text-xs font-mono text-slate-700 border border-amber-100">{code}</code>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-500 mt-2">...and {backupCodes.length - 4} more</p>
                </div>

                <button
                  onClick={() => { setShowSetup(false); setShowBackupCodes(true); }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                  id="done-setup-btn"
                >
                  Done — View All Backup Codes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Backup Recovery Codes ─────────────────────────────────────── */}
      {isEnabled && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" id="backup-codes-section">
          <button
            onClick={() => setShowBackupCodes(!showBackupCodes)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Key className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-slate-900">Backup Recovery Codes</h3>
                <p className="text-xs text-slate-500 mt-0.5">{backupCodes.length} codes remaining — use these if you lose access to your authenticator</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${showBackupCodes ? 'rotate-90' : ''}`} />
          </button>

          {showBackupCodes && (
            <div className="border-t border-slate-200 p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Each backup code can only be used <strong>once</strong>. Store them securely. If you regenerate codes, all previous codes become invalid.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {backupCodes.map((code, i) => (
                  <code key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-mono text-xs text-slate-700 text-center font-bold">
                    {code}
                  </code>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={handleCopyCodes} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors" aria-label="Action">{copiedCodes ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy All</>}</button>
                <button onClick={handleDownloadCodes} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download .txt
                </button>
                <button onClick={handleRegenerate} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors border border-red-200">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Trusted Devices ───────────────────────────────────────────── */}
      {isEnabled && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm" id="trusted-devices-section">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Monitor className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Trusted Devices</h3>
                <p className="text-xs text-slate-500 mt-0.5">Devices that don&apos;t require 2FA verification</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">{devices.length} devices</span>
          </div>

          <div className="divide-y divide-slate-100">
            {devices.map(device => (
              <div key={device.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${device.isCurrent ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  <Monitor className={`w-5 h-5 ${device.isCurrent ? 'text-emerald-600' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    {device.name}
                    {device.isCurrent && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">CURRENT</span>}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{device.browser} · {device.os} · {device.ip}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">{device.lastUsed}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end"><Globe className="w-2.5 h-2.5" /> {device.location}</p>
                </div>
                {!device.isCurrent && (
                  <button onClick={() => removeDevice(device.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Remove device">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Disable 2FA Dialog ───────────────────────────────────────── */}
      {showDisable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-black text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Disable Two-Factor Authentication
              </h3>
              <p className="text-xs text-slate-500 mt-1">This will reduce the security of your account. Enter your password and current OTP to confirm.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showDisablePw ? 'text' : 'password'}
                    value={disablePassword}
                    onChange={e => setDisablePassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter your password"
                  />
                  <button onClick={() => setShowDisablePw(!showDisablePw)} className="absolute right-3 top-2.5 text-slate-400">
                    {showDisablePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="current-otp-code">Current OTP Code</label>
                <input id="current-otp-code"
                  type="text"
                  value={disableOtp}
                  onChange={e => setDisableOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-center font-mono tracking-[0.5em] outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowDisable(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button
                onClick={handleDisable}
                disabled={!disablePassword || disableOtp.length < 6}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                id="confirm-disable-2fa"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Security Recommendations ──────────────────────────────────── */}
      <div className="bg-linear-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-indigo-900 mb-1">Security Best Practices</h3>
            <ul className="space-y-1.5 text-sm text-indigo-700">
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" /> Use an authenticator app (TOTP) instead of SMS for stronger security</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" /> Store backup codes in a password manager or secure vault</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" /> Review trusted devices regularly and remove unused entries</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" /> Never share your OTP codes or backup codes with anyone</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
