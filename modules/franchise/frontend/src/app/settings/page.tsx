'use client';

import React, { useState } from 'react';
import {
  Settings, User, CreditCard, Bell, Shield, Save, Check,
  Building2, MapPin, Phone, Mail, Globe, Crown, Package,
  Smartphone, BellRing, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { useFranchiseToast } from '@/lib/contexts/franchise-toast-context';
import { DEMO_FRANCHISE, PACKAGE_INFO, ALL_MODULES, MODULE_COLORS } from '@/lib/data/franchise-data';

type SettingsSection = 'profile' | 'package' | 'bank' | 'notifications' | 'danger';

const sectionNav: { key: SettingsSection; label: string; icon: React.ElementType }[] = [
  { key: 'profile',       label: 'Profile & Territory', icon: User },
  { key: 'package',       label: 'Package & Modules',   icon: Package },
  { key: 'bank',          label: 'Bank & Payouts',      icon: CreditCard },
  { key: 'notifications', label: 'Notifications',       icon: Bell },
  { key: 'danger',        label: 'Danger Zone',         icon: AlertTriangle },
];

export default function FranchiseSettingsPage() {
  const { showToast } = useFranchiseToast();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Editable bank details state
  const [bank, setBank] = useState({
    bankName: DEMO_FRANCHISE.bankDetails.bankName,
    accountNumber: DEMO_FRANCHISE.bankDetails.accountNumber,
    ifsc: DEMO_FRANCHISE.bankDetails.ifsc,
    accountHolder: DEMO_FRANCHISE.bankDetails.accountHolder,
  });

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    emailOrders: true, emailPayouts: true, emailMarketing: false,
    smsOrders: true, smsPayouts: false, smsMarketing: false,
    pushOrders: true, pushPayouts: true, pushMarketing: true,
  });

  const [upgradeRequested, setUpgradeRequested] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState('');

  const handleSaveBank = () => {
    showToast('Bank details saved successfully', 'success');
  };

  const handleSaveNotifications = () => {
    showToast('Notification preferences updated', 'success');
  };

  const handleRequestUpgrade = () => {
    setUpgradeRequested(true);
    showToast('Upgrade request submitted to admin', 'info');
  };

  const pkgInfo = PACKAGE_INFO[DEMO_FRANCHISE.package];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Franchise Settings</h1>
        <p className="text-slate-500 text-sm">Manage your franchise profile, banking, notifications, and package.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Section Navigation */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {sectionNav.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-3 ${
                  activeSection === s.key
                    ? 'bg-teal-50 text-teal-700 border-l-teal-500'
                    : 'text-slate-600 border-l-transparent hover:bg-slate-50'
                }`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
                {activeSection === s.key && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Section Content */}
        <div className="flex-1 min-w-0">

          {/* ── Profile & Territory ──────────────────────────── */}
          {activeSection === 'profile' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                <h2 className="font-bold text-slate-900">Profile & Territory</h2>
                <p className="text-xs text-slate-500 mt-0.5">Your franchise identity as registered with KARTSEEK.</p>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field icon={Building2} label="Franchise Name" value={DEMO_FRANCHISE.name} />
                  <Field icon={User} label="Owner Name" value={DEMO_FRANCHISE.owner} />
                  <Field icon={Mail} label="Email" value={DEMO_FRANCHISE.email} />
                  <Field icon={Phone} label="Phone" value={DEMO_FRANCHISE.phone} />
                  <Field icon={MapPin} label="Region / City" value={`${DEMO_FRANCHISE.region}, ${DEMO_FRANCHISE.city}`} />
                  <Field icon={Globe} label="Country" value="India (IN)" />
                  <Field icon={Shield} label="Franchise ID" value={DEMO_FRANCHISE.id} />
                  <Field icon={Settings} label="Joined" value={DEMO_FRANCHISE.joinDate} />
                </div>
                <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  Profile details are managed by the KARTSEEK admin. To update, contact support or use the Support Tickets module.
                </p>
              </div>
            </div>
          )}

          {/* ── Package & Modules ───────────────────────────── */}
          {activeSection === 'package' && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                  <h2 className="font-bold text-slate-900">Current Package</h2>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-xl ${pkgInfo.badgeBg} flex items-center justify-center`}>
                      <Crown className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{pkgInfo.label}</p>
                      <p className="text-sm text-slate-500">Up to {pkgInfo.maxModules} operating modules</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Approved Modules</p>
                    <div className="flex flex-wrap gap-2">
                      {DEMO_FRANCHISE.modules.map((m) => (
                        <span key={m} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${MODULE_COLORS[m] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>{m}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Available Modules (not active)</p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_MODULES.filter((m) => !DEMO_FRANCHISE.modules.includes(m)).map((m) => (
                        <span key={m} className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-slate-50 text-slate-400 border-slate-200">{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                  <h2 className="font-bold text-slate-900">Request Package Upgrade</h2>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-600 mb-4">
                    Upgrading your package unlocks more operating modules and higher revenue potential. Submit a request and our admin team will review within 24 hours.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {(['starter', 'growth', 'premium', 'master'] as const).map((tier) => {
                      const info = PACKAGE_INFO[tier];
                      const isCurrent = tier === DEMO_FRANCHISE.package;
                      return (
                        <div key={tier} className={`p-3 rounded-xl border-2 text-center transition-colors ${isCurrent ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white'}`}>
                          <p className={`text-xs font-bold uppercase ${isCurrent ? 'text-teal-700' : 'text-slate-500'}`}>{tier}</p>
                          <p className="text-lg font-bold text-slate-900 mt-1">{info.maxModules}</p>
                          <p className="text-[10px] text-slate-400">modules</p>
                          {isCurrent && <span className="inline-block mt-1 text-[10px] bg-teal-100 text-teal-700 font-bold px-2 py-0.5 rounded-full">Current</span>}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleRequestUpgrade}
                    disabled={upgradeRequested}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                      upgradeRequested
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                   aria-label="Action">{upgradeRequested ? <><Check className="w-4 h-4" /> Request Submitted</> : <><Crown className="w-4 h-4" /> Request Upgrade</>}</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Bank & Payouts ──────────────────────────────── */}
          {activeSection === 'bank' && (<div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                <h2 className="font-bold text-slate-900">Bank & Payout Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">Your payout settlement account. Changes require admin verification.</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="account-holder-name">Account Holder Name</label>
                    <input id="account-holder-name"
                      value={bank.accountHolder} onChange={(e) => setBank({ ...bank, accountHolder: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="bank-name">Bank Name</label>
                    <input id="bank-name"
                      value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="account-number">Account Number</label>
                    <input id="account-number"
                      value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5" htmlFor="ifsc-code">IFSC Code</label>
                    <input id="ifsc-code"
                      value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                  </div>
                </div>
                <button onClick={handleSaveBank} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors mt-2">
                  <Save className="w-4 h-4" /> Save Bank Details
                </button>
              </div>
            </div>
          )}

          {/* ── Notifications ──────────────────────────────── */}
          {activeSection === 'notifications' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                <h2 className="font-bold text-slate-900">Notification Preferences</h2>
                <p className="text-xs text-slate-500 mt-0.5">Control how you receive alerts about orders, payouts, and marketing.</p>
              </div>
              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                        <th className="text-center py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider"><Mail className="w-3.5 h-3.5 mx-auto" /></th>
                        <th className="text-center py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider"><Smartphone className="w-3.5 h-3.5 mx-auto" /></th>
                        <th className="text-center py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider"><BellRing className="w-3.5 h-3.5 mx-auto" /></th>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-1 px-2 text-[10px] text-slate-400 font-medium"></th>
                        <th className="text-center py-1 px-2 text-[10px] text-slate-400 font-medium">Email</th>
                        <th className="text-center py-1 px-2 text-[10px] text-slate-400 font-medium">SMS</th>
                        <th className="text-center py-1 px-2 text-[10px] text-slate-400 font-medium">Push</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { label: 'New Orders', keys: ['emailOrders', 'smsOrders', 'pushOrders'] },
                        { label: 'Payout Updates', keys: ['emailPayouts', 'smsPayouts', 'pushPayouts'] },
                        { label: 'Marketing & Promos', keys: ['emailMarketing', 'smsMarketing', 'pushMarketing'] },
                      ].map((row) => (
                        <tr key={row.label}>
                          <td className="py-3 px-2 font-medium text-slate-700">{row.label}</td>
                          {row.keys.map((key) => (
                            <td key={key} className="py-3 px-2 text-center">
                              <button
                                onClick={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                                className={`w-10 h-6 rounded-full transition-colors relative ${
                                  notifications[key as keyof typeof notifications] ? 'bg-teal-500' : 'bg-slate-200'
                                }`}
                              >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                  notifications[key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-1'
                                }`} />
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={handleSaveNotifications} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors mt-4">
                  <Save className="w-4 h-4" /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* ── Danger Zone ─────────────────────────────────── */}
          {activeSection === 'danger' && (<div className="bg-white border-2 border-red-200 rounded-xl shadow-sm">
              <div className="p-5 border-b border-red-200 bg-red-50/50">
                <h2 className="font-bold text-red-700 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Danger Zone</h2>
                <p className="text-xs text-red-500 mt-0.5">Actions here are irreversible. Proceed with caution.</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="font-bold text-sm text-red-700 mb-1">Deactivate Franchise</h3>
                  <p className="text-xs text-red-600 mb-3">
                    Deactivating your franchise will immediately suspend all operations, vendor access, and order processing in your region. This action requires admin confirmation.
                  </p>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-red-500 block mb-1.5" htmlFor="type-quot-deactivate-quot-to-confirm">Type &quot;DEACTIVATE&quot; to confirm</label>
                      <input id="type-quot-deactivate-quot-to-confirm"
                        value={deactivateConfirm}
                        onChange={(e) => setDeactivateConfirm(e.target.value)}
                        placeholder="DEACTIVATE"
                        className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-400 bg-white text-red-700"
                      />
                    </div>
                    <button
                      disabled={deactivateConfirm !== 'DEACTIVATE'}
                      onClick={() => showToast('Deactivation request sent to admin for review', 'warning')}
                      className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                        deactivateConfirm === 'DEACTIVATE'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-red-100 text-red-300 cursor-not-allowed'
                      }`}
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Read-only field component ────────────────────────────────────────────────

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
      <p className="text-xs font-semibold text-slate-400 mb-0.5 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
