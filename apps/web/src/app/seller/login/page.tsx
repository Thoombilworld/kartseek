'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSellerLogin } from '@/lib/hooks/use-seller-login';
import {
  useAuth, type AuthUser, type SellerType,
  SELLER_DASHBOARDS,
} from '@/lib/contexts/auth-context';
import { REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';
import {
  Store, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, Shield,
  ShoppingBag, Truck, Utensils, Pill, Stethoscope, Car, Hotel,
  ChevronDown, Globe, CheckCircle2, X,
} from 'lucide-react';
import { KartseekLoader } from '@/components/kartseek-loader';
import { CountryFlag } from '@/components/shared/country-flag';
import { getSellerCountries, SELLER_COUNTRY_ORDER } from '@/lib/seller/registration';

// ─── Module Definitions ────────────────────────────────────────────────────────

interface PortalModule {
  key: SellerType;
  label: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  textColor: string;
  borderColor: string;
  /** Countries where this module is available */
  enabledCountries: SupportedCountryCode[];
}

/** Reused by every module's availability list, which each spelled it out — with 'IN' twice. */
const ALL_SELLER_MARKETS = SELLER_COUNTRY_ORDER as unknown as SupportedCountryCode[];

const ALL_MODULES: PortalModule[] = [
  {
    key: 'marketplace',
    label: 'Marketplace Seller',
    description: 'Products, orders & inventory',
    icon: ShoppingBag,
    gradient: 'from-blue-50 to-indigo-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    enabledCountries: ALL_SELLER_MARKETS,
  },
  {
    key: 'grocery',
    label: 'Grocery Seller',
    description: 'Grocery store & category management',
    icon: Store,
    gradient: 'from-emerald-50 to-green-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    enabledCountries: ALL_SELLER_MARKETS,
  },
  {
    key: 'restaurant',
    label: 'Restaurant Partner',
    description: 'Menu, orders & kitchen ops',
    icon: Utensils,
    gradient: 'from-orange-50 to-amber-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    enabledCountries: ALL_SELLER_MARKETS,
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy Seller',
    description: 'Medicines, prescriptions & stock',
    icon: Pill,
    gradient: 'from-purple-50 to-violet-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    enabledCountries: ALL_SELLER_MARKETS,
  },
  {
    key: 'doctor',
    label: 'Doctor / Hospital',
    description: 'Appointments, clinic & patients',
    icon: Stethoscope,
    gradient: 'from-red-50 to-rose-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    // Narrower than the rest on purpose — medical practice licensing is not in
    // place in the Gulf markets yet. Deduplicated: this listed 'IN' twice.
    enabledCountries: ['IN', 'AE', 'SA'],
  },
  {
    key: 'hotel',
    label: 'Hotel Owner',
    description: 'Rooms, bookings & housekeeping',
    icon: Hotel,
    gradient: 'from-rose-50 to-pink-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    enabledCountries: ALL_SELLER_MARKETS,
  },
  {
    key: 'taxi',
    label: 'Taxi / Ride Partner',
    description: 'Drivers, trips & complaints',
    icon: Car,
    gradient: 'from-yellow-50 to-amber-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    enabledCountries: ALL_SELLER_MARKETS.filter((c) => c !== 'GB' && c !== 'US'),
  },
  {
    key: 'delivery',
    label: 'Delivery Partner',
    description: 'Delivery fleet & routing',
    icon: Truck,
    gradient: 'from-cyan-50 to-sky-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
    enabledCountries: ALL_SELLER_MARKETS,
  },
];

// ─── Country Options ────────────────────────────────────────────────────────────

/**
 * The markets a seller can actually sign in for.
 *
 * This read `Object.values(REGIONS).filter(r => r.isActive)`, which is the
 * *storefront* registry: ten countries, all flagged active, including Singapore
 * — a market with no seller compliance profile, so nobody can be onboarded
 * there. The portal now offers the same nine markets registration does.
 */
const COUNTRY_OPTIONS = getSellerCountries()
  .map((c) => {
    const region = REGIONS[c.code];
    if (!region) return null;
    // The registration wizard and this page were naming the same market
    // differently — "UAE" on one, "United Arab Emirates" on the other — which
    // reads as two markets to anyone moving between them. Registration's name
    // wins, since that is where the applicant sees it first.
    return { ...region, name: c.name };
  })
  .filter((c): c is NonNullable<typeof c> => c !== null);


// ─── Page Entry ────────────────────────────────────────────────────────────────

export default function SellerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <KartseekLoader size="lg" message="Loading portal..." />
        </div>
      }
    >
      <SellerLoginFlow />
    </Suspense>
  );
}

// ─── Main Flow (3 steps: country → module → credentials) ──────────────────────

function SellerLoginFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isHydrated, user, login } = useAuth();

  // Pre-fill module from query param if linking from a specific module's login
  const preModule = (searchParams.get('module') as SellerType | null) ?? null;
  const redirect  = searchParams.get('redirect') ?? '';

  /**
   * Already signed in — go where this account is actually allowed.
   *
   * This ignored `sellerApproved` and always replaced to the module dashboard.
   * `useSellerLogin` sends an unapproved seller to their application instead,
   * but this effect fires the moment `login()` updates the context and
   * `router.replace` wins the race — so a PENDING seller was dropped on a
   * dashboard that answered "Access Restricted", with nothing explaining why.
   */
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !user?.sellerType) return;
    if (!user.sellerApproved) {
      router.replace('/seller/approval-status');
      return;
    }
    router.replace(redirect || SELLER_DASHBOARDS[user.sellerType]);
  }, [isHydrated, isAuthenticated, user, redirect, router]);

  // ── State ────────────────────────────────────────────────────────────────
  const [step, setStep]               = useState<'country' | 'module' | 'creds'>(
    preModule ? 'creds' : 'country',
  );
  // Defaulted to 'IN'; the home market is Qatar, and it is the first option shown.
  const [country, setCountry]         = useState<SupportedCountryCode>(
    (COUNTRY_OPTIONS[0]?.code ?? 'QA') as SupportedCountryCode,
  );
  const [selectedModule, setSelectedModule] = useState<SellerType | null>(preModule);
  const [method, setMethod]           = useState<'email' | 'phone'>('email');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [phone, setPhone]             = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [error, setError]             = useState('');
  // The same sign-in path every other seller portal uses.
  const { signIn, loading, error: signInError } = useSellerLogin();

  if (!isHydrated || (isAuthenticated && user?.sellerType)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <KartseekLoader size="lg" message="Checking session..." />
      </div>
    );
  }

  // ── Available modules for selected country ────────────────────────────────
  const availableModules = ALL_MODULES.filter(m =>
    m.enabledCountries.includes(country),
  );

  const regionConfig = REGIONS[country as Exclude<SupportedCountryCode, 'ALL'>];
  const moduleConfig = selectedModule
    ? ALL_MODULES.find(m => m.key === selectedModule)
    : null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCountrySelect = (code: SupportedCountryCode) => {
    setCountry(code);
    setSelectedModule(null); // reset module if country changes
    setStep('module');
  };

  const handleModuleSelect = (mod: SellerType) => {
    setSelectedModule(mod);
    setStep('creds');
  };

  /**
   * Sign in against the gateway.
   *
   * This used to fabricate a seller — id, name and, critically, `sellerType` taken
   * straight from the module the visitor picked on the previous step — and hand it
   * to `login()` with a made-up token. Anyone could choose "pharmacy" and be a
   * pharmacy seller. The module now comes from the account's signed claim, so the
   * picker above is branding only and cannot grant access to anything.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (method === 'phone' && !phone) {
      setError('Please enter your phone number.');
      return;
    }
    await signIn(email, password);
  };

  const handlePhoneOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) { setError('Please enter your phone number.'); return; }
    router.push(
      `/seller/otp?phone=${encodeURIComponent(phone)}&module=${selectedModule}&country=${country}&redirect=${encodeURIComponent(redirect)}`,
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex font-sans">
      {/* ── Left Branding Panel ──────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] bg-linear-to-br from-blue-700 via-indigo-700 to-violet-800 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 -left-10 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-10 right-0 w-96 h-96 rounded-full bg-violet-400/20 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
              <span className="text-white font-black text-lg">K</span>
            </div>
            <span className="text-2xl font-black tracking-tight">KARTSEEK</span>
          </Link>

          <h2 className="text-4xl font-black leading-tight mb-4">
            Seller Portal<span className="text-blue-200">.</span>
          </h2>
          <p className="text-blue-200 text-base max-w-sm leading-relaxed">
            One platform for all business types. Log in to your country-specific
            portal to manage your store, bookings, or fleet.
          </p>
        </div>

        {/* Step indicator */}
        <div className="relative z-10 space-y-4">
          {[
            { n: 1, label: 'Select your country' },
            { n: 2, label: 'Choose your module' },
            { n: 3, label: 'Sign in securely' },
          ].map(s => {
            const done = (s.n === 1 && (step === 'module' || step === 'creds'))
              || (s.n === 2 && step === 'creds');
            const active = (s.n === 1 && step === 'country')
              || (s.n === 2 && step === 'module')
              || (s.n === 3 && step === 'creds');
            return (
              <div key={s.n} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                  ${done ? 'bg-green-400 border-green-400 text-white' : active ? 'bg-white border-white text-blue-700' : 'border-white/40 text-white/50'}`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                </div>
                <span className={`text-sm font-semibold ${active ? 'text-white' : done ? 'text-green-300' : 'text-white/50'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Country badge */}
        {step !== 'country' && (
          <div className="relative z-10 mt-6 flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 w-fit">
            <Globe className="w-4 h-4 text-blue-200" />
            <span className="text-sm font-bold text-white">
              <CountryFlag code={regionConfig?.code ?? ""} size="sm" /> {regionConfig?.name} · {regionConfig?.currencyCode}
            </span>
          </div>
        )}
      </div>

      {/* ── Right Content Panel ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-lg">

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">K</span>
            </div>
            <span className="text-xl font-black tracking-tight text-blue-700">
              KART<span className="text-slate-900">SEEK</span>
            </span>
            <span className="ml-1 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">SELLER</span>
          </Link>

          {/* Error banner — local validation, or whatever the gateway said */}
          {(error || signInError) && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              <X className="w-4 h-4 shrink-0" />
              {error || signInError}
            </div>
          )}

          {/* ── STEP 1: Country Selection ──────────────────────────────── */}
          {step === 'country' && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Select Your Country</h1>
              <p className="text-sm text-slate-500 mb-6">
                Your portal and data are country-specific.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {COUNTRY_OPTIONS.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c.code as SupportedCountryCode)}
                    className="flex flex-col items-center gap-1.5 p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <CountryFlag code={c.code} size="xl" />
                    <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700">{c.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{c.currencyCode}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center mt-4">
                More countries coming soon · Available in {COUNTRY_OPTIONS.length} markets
              </p>
            </div>
          )}

          {/* ── STEP 2: Module Selection ───────────────────────────────── */}
          {step === 'module' && (
            <div>
              <button
                type="button"
                onClick={() => setStep('country')}
                className="text-xs text-blue-600 font-semibold mb-4 flex items-center gap-1 hover:underline"
              >
                <ChevronDown className="w-3 h-3 rotate-90" /> Change country
              </button>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Choose Your Module</h1>
              <p className="text-sm text-slate-500 mb-6">
                Available modules for{' '}
                <span className="font-semibold text-slate-700">
                  <CountryFlag code={regionConfig?.code ?? ""} size="sm" /> {regionConfig?.name}
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableModules.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handleModuleSelect(m.key)}
                      className={`flex items-start gap-3 p-4 bg-linear-to-br ${m.gradient} border-2 ${m.borderColor} rounded-xl text-left hover:shadow-md transition-all hover:scale-[1.02] group`}
                    >
                      <div className={`w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${m.textColor}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${m.textColor}`}>{m.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3: Credentials ────────────────────────────────────── */}
          {step === 'creds' && moduleConfig && (
            <div>
              <button
                type="button"
                onClick={() => { setStep('module'); setError(''); }}
                className="text-xs text-blue-600 font-semibold mb-4 flex items-center gap-1 hover:underline"
              >
                <ChevronDown className="w-3 h-3 rotate-90" /> Change module
              </button>

              {/* Module badge */}
              <div className={`inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-linear-to-r ${moduleConfig.gradient} border ${moduleConfig.borderColor} rounded-xl`}>
                <moduleConfig.icon className={`w-4 h-4 ${moduleConfig.textColor}`} />
                <span className={`text-sm font-bold ${moduleConfig.textColor}`}>{moduleConfig.label}</span>
                <span className="text-slate-400 text-xs mx-1">·</span>
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500">{regionConfig?.name}</span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mb-1">Sign In</h1>
              <p className="text-sm text-slate-500 mb-6">
                New seller?{' '}
                <Link href="/seller/register" className="text-blue-600 font-semibold hover:underline">
                  Register here
                </Link>
              </p>

              {/* Method toggle */}
              <div className="flex gap-2 mb-5 bg-slate-100 p-1 rounded-xl">
                {(['email', 'phone'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMethod(m); setError(''); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${method === m ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}
                  >
                    {m === 'email' ? <><Mail className="w-4 h-4" /> Email</> : <><Phone className="w-4 h-4" /> Phone OTP</>}
                  </button>
                ))}
              </div>

              {method === 'email' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="s-email" className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        id="s-email" type="email" value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="seller@company.com"
                        className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        required autoComplete="email"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="s-password" className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        id="s-password" type={showPwd ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        required autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(p => !p)}
                        className="absolute right-3 top-3.5"
                        aria-label={showPwd ? 'Hide password' : 'Show password'}
                      >
                        {showPwd ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600"  aria-label="checkbox"/>
                        <span className="text-xs text-slate-500">Remember me</span>
                      </label>
                      <Link href="#" className="text-xs text-blue-600 font-bold hover:underline">Forgot password?</Link>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                   aria-label="Kartseek Loader">
                    {loading ? <KartseekLoader size="sm" /> : <><ArrowRight className="w-4 h-4" /> Sign In to {moduleConfig.label}</>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePhoneOTP} className="space-y-4">
                  <div>
                    <label htmlFor="s-phone" className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Phone Number</label>
                    <div className="flex gap-2">
                      <div className="border-2 border-slate-200 rounded-xl px-3 py-3 text-sm bg-white flex items-center gap-1 font-medium text-slate-700 min-w-[80px]">
                        <CountryFlag code={regionConfig?.code ?? ""} size="sm" /> {regionConfig?.callingCode}
                      </div>
                      <div className="relative flex-1">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <input
                          id="s-phone" type="tel" value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="Phone number"
                          className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    Send OTP <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
                <Shield className="w-3.5 h-3.5" />
                <span>256-bit SSL · Secure Seller Login · {regionConfig?.name} Portal</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
