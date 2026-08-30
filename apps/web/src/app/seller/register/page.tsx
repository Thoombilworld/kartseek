'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Globe, ChevronRight, Store, FileText, CreditCard, User, CheckCircle, ArrowRight, Upload, Shield, Loader2, AlertCircle, LayoutGrid } from 'lucide-react';
import { CountryFlag } from '@/components/shared/country-flag';
import { sellerApi, authApi } from '@/lib/api-endpoints';
import { useAuth, toAuthUser } from '@/lib/contexts/auth-context';
import {
  SELLER_MODULES,
  getSellerCountries,
  getSellerCountry,
  getSellerModule,
  isSellerModuleKey,
  isSellerCountryCode,
  getRequiredDocuments,
  getRegistrationFields,
  getBankFields,
} from '@/lib/seller/registration';

/**
 * Seller registration.
 *
 * Two choices come first and everything after them is derived from the pair:
 * the market decides which registration numbers, bank fields and documents are
 * demanded, and the module decides which additional licences are. Both lists
 * come from `lib/seller/registration.ts` — this file no longer carries a
 * country list of its own, which is what let India appear twice under two
 * different tax labels while Qatar, the home market, was missing entirely.
 *
 * `?module=` and `?country=` preselect the two steps, so a module's own landing
 * page can send an applicant straight into the right form.
 */

/** Legal entity type — what KYC records, and not country-specific in any market. */
const ENTITY_TYPES = ['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited'];

const STEPS = [
  'Country',
  'Module',
  'Business Details',
  'Tax & Registration',
  'Bank Account',
  'Documents',
  'Store Profile',
  'Review & Submit',
];

interface SellerRegistrationForm {
  countryCode: string;
  moduleKey: string;
  legalBusinessName: string;
  ownerFullName: string;
  businessType: string;
  stateRegion: string;
  registeredAddress: string;
  businessPhone: string;
  businessEmail: string;
  /** Country-specific registration numbers, keyed by the config's field key. */
  registrationValues: Record<string, string>;
  /** Country-specific bank fields, keyed the same way. */
  bankValues: Record<string, string>;
  /** Uploaded files keyed by document type. */
  documents: Record<string, File | null>;
  storeDisplayName: string;
  storeDescription: string;
  password: string;
  passwordConfirm: string;
}

const INITIAL_FORM: SellerRegistrationForm = {
  countryCode: '',
  moduleKey: '',
  legalBusinessName: '',
  ownerFullName: '',
  businessType: '',
  stateRegion: '',
  registeredAddress: '',
  businessPhone: '',
  businessEmail: '',
  registrationValues: {},
  bankValues: {},
  documents: {},
  storeDisplayName: '',
  storeDescription: '',
  password: '',
  passwordConfirm: '',
};

// Step indices, named so the validation below reads as intent rather than arithmetic.
const S_COUNTRY = 0;
const S_MODULE = 1;
const S_BUSINESS = 2;
const S_TAX = 3;
const S_BANK = 4;
const S_DOCS = 5;
const S_STORE = 6;
const S_REVIEW = 7;

export default function SellerRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, login } = useAuth();
  const [step, setStep] = useState(S_COUNTRY);
  const [form, setForm] = useState<SellerRegistrationForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const countries = useMemo(() => getSellerCountries(), []);
  const country = getSellerCountry(form.countryCode);
  const selectedModule = getSellerModule(form.moduleKey);

  const registrationFields = useMemo(() => getRegistrationFields(form.countryCode), [form.countryCode]);
  const bankFields = useMemo(() => getBankFields(form.countryCode), [form.countryCode]);
  const requiredDocuments = useMemo(
    () => getRequiredDocuments(form.countryCode, form.moduleKey),
    [form.countryCode, form.moduleKey],
  );

  /**
   * Preselect from the query string, so a module landing page can link straight
   * in. Both values are validated against the registries rather than trusted —
   * `?country=ZZ` must not put the applicant into a market with no compliance
   * profile, which would leave the form with nothing to ask for.
   */
  useEffect(() => {
    const qModule = searchParams.get('module');
    const qCountry = searchParams.get('country')?.toUpperCase();
    const validModule = isSellerModuleKey(qModule) ? qModule : '';
    const validCountry = isSellerCountryCode(qCountry) ? qCountry : '';
    if (!validModule && !validCountry) return;

    setForm((prev) => ({
      ...prev,
      moduleKey: validModule || prev.moduleKey,
      countryCode: validCountry || prev.countryCode,
    }));
    // Skip only the steps actually answered, and never past the module step.
    if (validCountry && validModule) setStep(S_BUSINESS);
    else if (validCountry) setStep(S_MODULE);
  }, [searchParams]);

  const updateField = useCallback(
    <K extends keyof SellerRegistrationForm>(key: K, value: SellerRegistrationForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => {
        const n = { ...prev };
        delete n[key as string];
        return n;
      });
    },
    [],
  );

  const updateKeyed = useCallback(
    (bucket: 'registrationValues' | 'bankValues', key: string, value: string) => {
      setForm((prev) => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } }));
      setFieldErrors((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    },
    [],
  );

  const validateStep = useCallback(
    (s: number): boolean => {
      const errs: Record<string, string> = {};

      if (s === S_COUNTRY && !form.countryCode) errs.countryCode = 'Select a country';
      if (s === S_MODULE && !form.moduleKey) errs.moduleKey = 'Select a module';

      if (s === S_BUSINESS) {
        if (!form.legalBusinessName.trim()) errs.legalBusinessName = 'Required';
        if (!form.ownerFullName.trim()) errs.ownerFullName = 'Required';
        if (!form.businessType) errs.businessType = 'Required';
        if (!form.stateRegion.trim()) errs.stateRegion = 'Required';
        if (!form.registeredAddress.trim()) errs.registeredAddress = 'Required';
        if (!form.businessPhone.trim()) errs.businessPhone = 'Required';
        if (!form.businessEmail.trim()) errs.businessEmail = 'Required';
        else if (!/\S+@\S+\.\S+/.test(form.businessEmail)) errs.businessEmail = 'Invalid email';
      }

      // Both of these are driven by the country's own profile, so a market that
      // asks for three numbers validates three, not a fixed "taxId".
      if (s === S_TAX) {
        for (const f of registrationFields) {
          if (f.required && !form.registrationValues[f.key]?.trim()) errs[f.key] = 'Required';
        }
      }

      if (s === S_BANK) {
        for (const f of bankFields) {
          if (f.required && !form.bankValues[f.key]?.trim()) errs[f.key] = 'Required';
        }
        const acc = form.bankValues.accountNumber;
        const confirm = form.bankValues.accountNumberConfirm;
        if (acc && confirm !== undefined && acc !== confirm) {
          errs.accountNumberConfirm = 'Account numbers do not match';
        }
      }

      if (s === S_STORE && !form.storeDisplayName.trim()) errs.storeDisplayName = 'Required';

      if (s === S_REVIEW && !isAuthenticated) {
        if (!form.password) errs.password = 'Required';
        else if (form.password.length < 8) errs.password = 'Use at least 8 characters';
        if (!form.passwordConfirm) errs.passwordConfirm = 'Required';
        else if (form.password !== form.passwordConfirm) errs.passwordConfirm = 'Passwords do not match';
      }

      setFieldErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [form, isAuthenticated, registrationFields, bankFields],
  );

  const next = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, S_REVIEW));
  };
  const prev = () => setStep((s) => Math.max(s - 1, S_COUNTRY));

  /**
   * Two calls, in order, because a seller row must belong to somebody.
   *
   * `POST /sellers/register` binds the new business to the signed-in user's id,
   * so the account is created (or reused) first and the ownership comes from the
   * token. `sellerType` is the module chosen in step 2 — it used to be hardcoded
   * `'marketplace'`, which filed every grocery and pharmacy application into the
   * marketplace approval queue.
   */
  const handleSubmit = async () => {
    if (submitting) return;
    setError(null);
    if (!isAuthenticated && !validateStep(S_REVIEW)) return;
    if (!country || !selectedModule) {
      setError('Select a country and a module before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      if (!isAuthenticated) {
        const session = (await authApi.registerSeller({
          name: form.ownerFullName,
          email: form.businessEmail.trim().toLowerCase(),
          phone: form.businessPhone || undefined,
          password: form.password,
          sellerType: selectedModule.key,
        })) as { user: any; accessToken: string; refreshToken?: string };

        login(toAuthUser(session.user, form.countryCode), session.accessToken, session.refreshToken);
      }

      const payload = {
        countryCode: form.countryCode,
        sellerType: selectedModule.key,
        businessName: form.legalBusinessName,
        // `seller_kyc.ownerFullName` is a KYC field: it must be the natural
        // person who owns the business. It used to fall back to the bank account
        // holder and then to the trading name, so a company that banked under
        // its own name filed KYC with no human named on it at all.
        ownerName: form.ownerFullName,
        businessType: form.businessType,
        stateRegion: form.stateRegion,
        registeredAddress: form.registeredAddress,
        businessPhone: form.businessPhone,
        businessEmail: form.businessEmail,
        // The first required registration number is this market's primary tax
        // id — GSTIN in India, the CR in Qatar — which is what `taxId` means to
        // the service. The rest travel alongside it rather than being dropped.
        taxId: form.registrationValues[registrationFields[0]?.key] || '',
        registrationNumbers: form.registrationValues,
        bankDetails: form.bankValues,
        storeDisplayName: form.storeDisplayName,
        storeDescription: form.storeDescription || undefined,
        documentCount: Object.values(form.documents).filter(Boolean).length,
      };

      const result = (await sellerApi.register(payload)) as { seller?: { id?: string } };
      const sellerId = result?.seller?.id;
      router.push(
        `/seller/approval-status?id=${sellerId || ''}&country=${form.countryCode}&module=${selectedModule.key}&entity=seller`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (field: string) =>
    `w-full border ${fieldErrors[field] ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500`;

  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? <p className="text-xs text-red-500 mt-1">{fieldErrors[field]}</p> : null;

  const uploadedCount = Object.values(form.documents).filter(Boolean).length;

  const navButtons = (onNext: () => void, nextLabel = 'Continue') => (
    <div className="flex gap-3 pt-2">
      <button onClick={prev} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm min-h-11">
        ← Back
      </button>
      <button
        onClick={onNext}
        className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 min-h-11"
      >
        {nextLabel} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const cardCls = 'bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5';

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-black text-slate-900">KARTSEEK Seller Center</p>
            <p className="text-xs text-slate-400">Start selling to millions of customers</p>
          </div>
        </div>
        <Link
          href="/seller/login"
          className="text-sm text-blue-600 font-bold hover:underline min-h-11 flex items-center"
        >
          Already a seller? Sign in
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 shrink-0 ${i <= step ? 'text-blue-600' : 'text-slate-300'}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 ${i < step ? 'bg-blue-600 border-blue-600 text-white' : i === step ? 'border-blue-600 text-blue-600' : 'border-slate-200 text-slate-300'}`}
                >
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-xs font-bold whitespace-nowrap ${i === step ? 'text-blue-700' : i < step ? 'text-blue-600' : 'text-slate-300'}`}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-6 mx-1 shrink-0 ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Chosen context, once both answers exist */}
        {step > S_MODULE && country && selectedModule && (
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
            <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 font-bold text-slate-700">
              <CountryFlag code={country.code} size="sm" /> {country.name}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 font-bold text-slate-700">
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" /> {selectedModule.label}
            </span>
            <button onClick={() => setStep(S_COUNTRY)} className="text-blue-600 font-bold hover:underline px-1 min-h-11">
              Change
            </button>
          </div>
        )}

        {/* ── Step 0: Country ───────────────────────────────────────────── */}
        {step === S_COUNTRY && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-black text-slate-900">Select Your Country</h1>
              <p className="text-slate-500 mt-2">
                We operate in {countries.length} countries. Your market decides which registration
                details and documents are required.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {countries.map((c) => {
                const selected = form.countryCode === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => {
                      updateField('countryCode', c.code);
                      setStep(S_MODULE);
                    }}
                    aria-pressed={selected}
                    className={`flex items-center gap-4 bg-white border rounded-2xl p-4 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all group text-left min-h-11 ${selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
                  >
                    <CountryFlag code={c.code} size="xl" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 group-hover:text-blue-700">{c.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {c.taxSystem === 'none' ? 'No sales tax' : `${c.taxLabel} ${c.taxRate}%`} ·{' '}
                        {c.currency} · {c.requiredDocuments.length} documents
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                  </button>
                );
              })}
            </div>
            <FieldError field="countryCode" />
          </div>
        )}

        {/* ── Step 1: Module ────────────────────────────────────────────── */}
        {step === S_MODULE && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LayoutGrid className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-black text-slate-900">Choose Your Module</h1>
              <p className="text-slate-500 mt-2">
                What does your business sell? This decides which licences we ask for
                {country ? ` in ${country.name}` : ''}.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SELLER_MODULES.map((m) => {
                const selected = form.moduleKey === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => {
                      updateField('moduleKey', m.key);
                      setStep(S_BUSINESS);
                    }}
                    aria-pressed={selected}
                    className={`flex items-start gap-3 bg-white border rounded-2xl p-4 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all group text-left min-h-11 ${selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
                  >
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 group-hover:text-blue-700">{m.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.blurb}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 mt-1" />
                  </button>
                );
              })}
            </div>
            <FieldError field="moduleKey" />
            <button onClick={prev} className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm min-h-11">
              ← Back
            </button>
          </div>
        )}

        {/* ── Step 2: Business Details ──────────────────────────────────── */}
        {step === S_BUSINESS && country && (
          <div className={cardCls}>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <CountryFlag code={country.code} size="xl" />
              <div>
                <h2 className="text-xl font-black text-slate-900">Business Details — {country.name}</h2>
                <p className="text-sm text-slate-500">Enter your legally registered business information</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="legal-business-name">
                  Legal Business Name *
                </label>
                <input
                  id="legal-business-name"
                  className={inputCls('legalBusinessName')}
                  placeholder="As per business registration"
                  maxLength={200}
                  value={form.legalBusinessName}
                  onChange={(e) => updateField('legalBusinessName', e.target.value)}
                />
                <FieldError field="legalBusinessName" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="owner-full-name">
                  Owner Full Name *
                </label>
                <input
                  id="owner-full-name"
                  className={inputCls('ownerFullName')}
                  placeholder="The person who owns this business"
                  maxLength={150}
                  value={form.ownerFullName}
                  onChange={(e) => updateField('ownerFullName', e.target.value)}
                />
                <FieldError field="ownerFullName" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="business-type">
                  Business Type *
                </label>
                <select
                  id="business-type"
                  value={form.businessType}
                  onChange={(e) => updateField('businessType', e.target.value)}
                  aria-label="Business type"
                  className={inputCls('businessType')}
                >
                  <option value="">Select type...</option>
                  {ENTITY_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <FieldError field="businessType" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="state-region">
                  State / Region *
                </label>
                <input
                  id="state-region"
                  className={inputCls('stateRegion')}
                  maxLength={120}
                  value={form.stateRegion}
                  onChange={(e) => updateField('stateRegion', e.target.value)}
                />
                <FieldError field="stateRegion" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="registered-address">
                  Registered Address *
                </label>
                <input
                  id="registered-address"
                  className={inputCls('registeredAddress')}
                  placeholder="Full registered business address"
                  maxLength={300}
                  value={form.registeredAddress}
                  onChange={(e) => updateField('registeredAddress', e.target.value)}
                />
                <FieldError field="registeredAddress" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="business-phone">
                  Business Phone *
                </label>
                <input
                  id="business-phone"
                  type="tel"
                  className={inputCls('businessPhone')}
                  maxLength={30}
                  value={form.businessPhone}
                  onChange={(e) => updateField('businessPhone', e.target.value)}
                />
                <FieldError field="businessPhone" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="business-email">
                  Business Email *
                </label>
                <input
                  id="business-email"
                  type="email"
                  className={inputCls('businessEmail')}
                  placeholder="business@company.com"
                  maxLength={254}
                  value={form.businessEmail}
                  onChange={(e) => updateField('businessEmail', e.target.value)}
                />
                <FieldError field="businessEmail" />
              </div>
            </div>
            {navButtons(next)}
          </div>
        )}

        {/* ── Step 3: Tax & Registration ────────────────────────────────── */}
        {step === S_TAX && country && (
          <div className={cardCls}>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-black text-slate-900">
                {country.name} Registration Numbers
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {registrationFields.map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor={`reg-${f.key}`}>
                    {f.label} {f.required && '*'}
                  </label>
                  <input
                    id={`reg-${f.key}`}
                    className={inputCls(f.key)}
                    placeholder={f.placeholder}
                    maxLength={64}
                    value={form.registrationValues[f.key] ?? ''}
                    onChange={(e) => updateKeyed('registrationValues', f.key, e.target.value)}
                  />
                  <FieldError field={f.key} />
                </div>
              ))}
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-bold text-amber-800">{country.name} compliance</p>
              <p className="text-xs text-amber-700 mt-1">
                {country.taxSystem === 'none'
                  ? `${country.name} applies no sales tax to marketplace sales. These registration numbers are still required to trade.`
                  : `${country.taxLabel} is charged at ${country.taxRate}%${country.stateTaxSupport ? ', with state-level rates applied per destination' : ''}.`}
              </p>
            </div>
            {navButtons(next)}
          </div>
        )}

        {/* ── Step 4: Bank ──────────────────────────────────────────────── */}
        {step === S_BANK && country && (
          <div className={cardCls}>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-black text-slate-900">Bank & Payout Details</h2>
            </div>
            <p className="text-sm text-slate-500">
              Payouts are made in {country.currency} ({country.currencySymbol}) to this account.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankFields.map((f) => (
                <div key={f.key} className={f.key === 'accountHolderName' ? 'md:col-span-2' : ''}>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor={`bank-${f.key}`}>
                    {f.label} {f.required && '*'}
                  </label>
                  <input
                    id={`bank-${f.key}`}
                    className={inputCls(f.key)}
                    placeholder={f.placeholder}
                    maxLength={64}
                    value={form.bankValues[f.key] ?? ''}
                    onChange={(e) => updateKeyed('bankValues', f.key, e.target.value)}
                  />
                  <FieldError field={f.key} />
                </div>
              ))}
              {/* Confirmation for the one field a typo silently misroutes money on. */}
              {bankFields.some((f) => f.key === 'accountNumber') && (
                <div>
                  <label
                    className="text-xs font-bold text-slate-500 uppercase block mb-1.5"
                    htmlFor="bank-accountNumberConfirm"
                  >
                    Confirm Account Number *
                  </label>
                  <input
                    id="bank-accountNumberConfirm"
                    className={inputCls('accountNumberConfirm')}
                    maxLength={64}
                    value={form.bankValues.accountNumberConfirm ?? ''}
                    onChange={(e) => updateKeyed('bankValues', 'accountNumberConfirm', e.target.value)}
                  />
                  <FieldError field="accountNumberConfirm" />
                </div>
              )}
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-700">
                <Shield className="w-3.5 h-3.5 inline mr-1" />
                Bank details are encrypted. Payouts will be credited to this account.
              </p>
            </div>
            {navButtons(next)}
          </div>
        )}

        {/* ── Step 5: Documents ─────────────────────────────────────────── */}
        {step === S_DOCS && country && selectedModule && (
          <div className={cardCls}>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Upload className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-black text-slate-900">Required Documents</h2>
            </div>
            <p className="text-sm text-slate-500">
              {requiredDocuments.length} documents for a {selectedModule.label.toLowerCase()} business in{' '}
              {country.name}. Accepted: PDF, JPG, PNG. Max 5MB each.
            </p>
            <div className="space-y-3">
              {requiredDocuments.map((doc) => {
                const uploaded = !!form.documents[doc.type];
                return (
                  <div
                    key={doc.type}
                    className={`flex items-center justify-between gap-3 px-4 py-4 rounded-xl border ${uploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {uploaded ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${uploaded ? 'text-emerald-800' : 'text-slate-800'}`}>
                          {doc.label}
                          {doc.source === 'module' && (
                            <span className="ml-2 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                              {selectedModule.label}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {uploaded ? (form.documents[doc.type] as File).name : doc.description}
                        </p>
                      </div>
                    </div>
                    <label className="shrink-0 cursor-pointer text-xs font-bold text-blue-600 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 min-h-11 flex items-center">
                      {uploaded ? 'Replace' : 'Upload'}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        aria-label={`Upload ${doc.label}`}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            documents: { ...prev.documents, [doc.type]: e.target.files?.[0] ?? null },
                          }))
                        }
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">
              {uploadedCount} of {requiredDocuments.length} uploaded. You can submit now and finish
              uploading from your dashboard — approval requires all of them.
            </p>
            {navButtons(next)}
          </div>
        )}

        {/* ── Step 6: Store Profile ─────────────────────────────────────── */}
        {step === S_STORE && (
          <div className={cardCls}>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Store className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-black text-slate-900">Store Profile</h2>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="store-display-name">
                Store Display Name *
              </label>
              <input
                id="store-display-name"
                className={inputCls('storeDisplayName')}
                placeholder="The name customers will see"
                maxLength={120}
                value={form.storeDisplayName}
                onChange={(e) => updateField('storeDisplayName', e.target.value)}
              />
              <FieldError field="storeDisplayName" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="store-description">
                Store Description
              </label>
              <textarea
                id="store-description"
                rows={4}
                className={inputCls('storeDescription')}
                placeholder="Tell customers what you sell"
                maxLength={1000}
                value={form.storeDescription}
                onChange={(e) => updateField('storeDescription', e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">{form.storeDescription.length}/1000</p>
            </div>
            {navButtons(next)}
          </div>
        )}

        {/* ── Step 7: Review ────────────────────────────────────────────── */}
        {step === S_REVIEW && country && selectedModule && (
          <div className={cardCls}>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-black text-slate-900">Review & Submit</h2>
            </div>

            <dl className="text-sm divide-y divide-slate-100">
              {[
                ['Country', country.name],
                ['Module', selectedModule.label],
                ['Legal Business Name', form.legalBusinessName],
                ['Owner Full Name', form.ownerFullName],
                ['Business Type', form.businessType],
                ['Store Name', form.storeDisplayName],
                ['Business Email', form.businessEmail],
                ['Business Phone', form.businessPhone],
                ...registrationFields.map((f) => [f.label, form.registrationValues[f.key] || '—'] as const),
                ['Documents Uploaded', `${uploadedCount} of ${requiredDocuments.length}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-semibold text-slate-900 text-right break-words">{v || '—'}</dd>
                </div>
              ))}
            </dl>

            {!isAuthenticated && (
              <div className="pt-2 space-y-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-bold text-slate-800">Create your seller sign-in</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="password">
                      Password *
                    </label>
                    <input
                      id="password"
                      type="password"
                      className={inputCls('password')}
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                    />
                    <FieldError field="password" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="password-confirm">
                      Confirm Password *
                    </label>
                    <input
                      id="password-confirm"
                      type="password"
                      className={inputCls('passwordConfirm')}
                      value={form.passwordConfirm}
                      onChange={(e) => updateField('passwordConfirm', e.target.value)}
                    />
                    <FieldError field="passwordConfirm" />
                  </div>
                </div>
              </div>
            )}

            {isAuthenticated && user?.email && (
              <p className="text-xs text-slate-500">
                This business will be registered to <span className="font-bold">{user.email}</span>.
              </p>
            )}

            {error && (
              <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={prev} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm min-h-11">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 min-h-11"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit Application <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
