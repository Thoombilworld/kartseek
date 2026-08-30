'use client';
import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Clock, CheckCircle, AlertCircle, FileText, Store, Phone, Mail, Shield, XCircle,
  Stethoscope, Building2, Hospital, Heart,
} from 'lucide-react';
import { KartseekLoader } from '@/components/kartseek-loader';
import { CountryFlag } from '@/components/shared/country-flag';
import { getRequiredDocuments, getSellerCountry, getSellerModule } from '@/lib/seller/registration';

// ─── Types ──────────────────────────────────────────────────────────────────────
type EntityType = 'doctor' | 'hospital' | 'clinic' | 'seller';

// ─── Country data — same source of truth as registration ────────────────────────
const COUNTRIES: Record<string, { name: string; flag: string; docs: Record<string, string[]> }> = {
  IN: { name: 'India', flag: '🇮🇳', docs: { doctor: ['Medical License (NMC)', 'National ID / Passport', 'GST Registration Certificate', 'Degree Certificates'], hospital: ['NMC Registration', 'State Health License', 'GSTIN', 'CR-12 / Company Registration', 'Fire Safety Certificate'], clinic: ['NMC License', 'Municipal Trade License', 'GSTIN', 'Lease Agreement'], seller: ['Business Registration', 'GSTIN', 'National ID', 'Bank Statement'] } },
  AE: { name: 'UAE', flag: '🇦🇪', docs: { doctor: ['DHA/DOH/MOH License', 'Emirates ID', 'TRN (Tax)', 'Degree Attestation'], hospital: ['DHA/DOH Facility License', 'Trade License', 'TRN', 'Emirates ID (Director)'], clinic: ['DHA/DOH Clinic License', 'Trade License', 'TRN', 'Emirates ID'], seller: ['Trade License', 'TRN', 'Emirates ID', 'Bank Certificate'] } },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦', docs: { doctor: ['SCFHS License', 'Iqama / National ID', 'VAT Registration', 'Degree Certificates'], hospital: ['MOH Facility License', 'Commercial Registration', 'VAT Registration', 'CBAHI Accreditation'], clinic: ['MOH Clinic License', 'Commercial Registration', 'VAT Registration'], seller: ['Commercial Registration', 'VAT Certificate', 'Iqama / National ID', 'Bank Certificate'] } },
  GB: { name: 'United Kingdom', flag: '🇬🇧', docs: { doctor: ['GMC Registration', 'DBS Check', 'Professional Indemnity Insurance', 'Passport / BRP'], hospital: ['CQC Registration', 'Companies House Registration', 'VAT Certificate', 'DPA Registration'], clinic: ['CQC Registration (if required)', 'Companies House', 'VAT Certificate', 'Professional Insurance'], seller: ['Companies House Registration', 'VAT Certificate', 'Passport', 'Bank Statement'] } },
  US: { name: 'United States', flag: '🇺🇸', docs: { doctor: ['State Medical License', 'DEA Registration', 'NPI Number', 'Board Certification', 'Malpractice Insurance'], hospital: ['State Health Facility License', 'Joint Commission Accreditation', 'CMS Certification', 'EIN', 'NPI'], clinic: ['State Clinic License', 'NPI Number', 'EIN', 'Malpractice Insurance'], seller: ['EIN', 'Business License', 'State Tax Registration', 'Bank Statement'] } },
};

// ─── Entity display info ────────────────────────────────────────────────────────
const ENTITY_META: Record<string, { name: string; icon: React.ElementType; emoji: string; gradient: string; accent: string; idPrefix: string }> = {
  doctor:   { name: 'Dr. Amara Okonkwo',   icon: Stethoscope, emoji: '👨‍⚕️', gradient: 'from-violet-600 to-indigo-700', accent: 'violet', idPrefix: 'DOC' },
  hospital: { name: 'Mumbai Hospital',     icon: Hospital,    emoji: '🏥',   gradient: 'from-blue-600 to-indigo-700',   accent: 'blue',   idPrefix: 'HSP' },
  clinic:   { name: 'HealthFirst Clinic',   icon: Building2,   emoji: '🏪',   gradient: 'from-teal-600 to-emerald-700',  accent: 'teal',   idPrefix: 'CLN' },
  seller:   { name: 'Tech Haven Electronics', icon: Store,     emoji: '🏬',   gradient: 'from-blue-600 to-indigo-700',   accent: 'blue',   idPrefix: 'SLR' },
};

/**
 * The documents this application actually owes, and one honest status for them.
 *
 * This used to invent per-document progress: the first two entries were marked
 * "verified", the middle "under review", the last "pending", and each was given
 * a plausible filename like `gstin.pdf`. None of it came from anywhere —
 * applicants who had uploaded nothing were shown documents already verified.
 *
 * Nothing tracks per-document review state yet, so every document reports the
 * one state that is real: the application's `kycStatus`.
 */
function documentStatusFor(kycStatus: string): 'verified' | 'under_review' | 'pending' | 'rejected' {
  switch (kycStatus.toUpperCase()) {
    case 'APPROVED':
    case 'VERIFIED':
      return 'verified';
    case 'REJECTED':
      return 'rejected';
    case 'IN_REVIEW':
    case 'UNDER_REVIEW':
      return 'under_review';
    default:
      return 'pending';
  }
}

// ─── Build review steps from live API data ──────────────────────────────────
function buildLiveReviewSteps(
  approvalStatus: string,
  entityType: string,
  countryCode: string,
  profile: any,
): { label: string; status: 'done' | 'in_progress' | 'pending'; date: string }[] {
  const statusMap: Record<string, number> = {
    SUBMITTED: 0, PENDING: 0,
    IDENTITY_VERIFIED: 1,
    DOCUMENTS_REVIEW: 2,
    BANK_VERIFICATION: 3,
    APPROVED: 5, VERIFIED: 5,
    REJECTED: -1, SUSPENDED: -1,
  };
  const currentStep = statusMap[approvalStatus] ?? 0;

  const submitted = profile?.submittedAt
    ? new Date(profile.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Submitted';

  const allSteps = [
    { label: 'Registration Submitted', date: submitted },
    { label: `${entityType === 'doctor' ? 'Identity' : 'Facility Details'} Verified`, date: '' },
    { label: 'Document Review', date: '' },
    { label: 'Bank Account Verification', date: '' },
    { label: 'Final Admin Approval', date: '' },
  ];

  return allSteps.map((s, i) => ({
    ...s,
    status: i < currentStep ? 'done' as const
      : i === currentStep ? 'in_progress' as const
      : 'pending' as const,
    date: i < currentStep ? 'Completed'
      : i === currentStep ? 'In progress'
      : s.date || 'Pending',
  }));
}

// ─── Build document statuses from country docs ──────────────────────────────────
const DOC_STYLES: Record<string, { bg: string; icon: React.ElementType }> = {
  verified: { bg: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
  under_review: { bg: 'bg-amber-50 text-amber-700', icon: Clock },
  pending: { bg: 'bg-slate-100 text-slate-500', icon: AlertCircle },
  rejected: { bg: 'bg-red-50 text-red-700', icon: XCircle },
};

export default function ApprovalStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><KartseekLoader size="lg" message="Loading..." /></div>}>
      <ApprovalStatusContent />
    </Suspense>
  );
}

function ApprovalStatusContent() {
  const searchParams = useSearchParams();
  const entityType = (searchParams.get('entity') || searchParams.get('type') || 'seller') as EntityType;
  const countryCode = searchParams.get('country') || (entityType === 'seller' ? 'IN' : 'IN');
  const sellerIdParam = searchParams.get('id') || '';

  const moduleKey = searchParams.get('module') || '';
  const meta = ENTITY_META[entityType] || ENTITY_META.seller;
  // A seller application resolves its market against the nine-market
  // registration registry. `COUNTRIES` below only describes five and used to
  // fall back to India, so a Qatari applicant was shown India's paperwork.
  const sellerCountry = getSellerCountry(countryCode);
  const country = sellerCountry ?? COUNTRIES[countryCode] ?? null;
  const Icon = meta.icon;
  const isHealthEntity = entityType !== 'seller';
  const signInLink = isHealthEntity ? '/seller/doctor/login' : '/seller/login';
  const headerLabel = isHealthEntity ? 'KARTSEEK Health' : 'KARTSEEK Seller Center';

  // ─── API Polling for real status ────────────────────────────────────────────
  const [sellerProfile, setSellerProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [pollError, setPollError] = React.useState(false);
  /** Signed in, but this account has not registered a business yet. */
  const [noApplication, setNoApplication] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const { sellerApi } = await import('@/lib/api-endpoints');
        // `getProfile` sits behind `SellerApprovalGuard` and answers 403 to
        // anyone not yet APPROVED — i.e. everyone reading this page. It failed
        // on every load and the catch below rendered invented content instead.
        //
        // With no id in the URL, fall back to the signed-in user's own
        // application: sign-in routes an unapproved seller here and has no
        // seller id to pass, because the JWT carries the user id instead.
        const profile = sellerIdParam
          ? await sellerApi.getApplicationStatus(sellerIdParam)
          : (await sellerApi.getMyApplicationStatus()).application;
        if (!profile) {
          if (!cancelled) { setLoading(false); setNoApplication(true); }
          return;
        }
        if (!cancelled) {
          setSellerProfile(profile);
          setLoading(false);
          setPollError(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
          setPollError(true);
        }
      }
    };

    fetchProfile();
    const interval = setInterval(fetchProfile, 30_000); // Poll every 30s
    return () => { cancelled = true; clearInterval(interval); };
  }, [sellerIdParam]);

  // Everything below is what the API actually returned. The previous version
  // filled each of these in when the request failed — a random `SLR-1234`
  // application id, the business name "Tech Haven Electronics", and a timeline
  // of completed checks — so a failed load was indistinguishable from a real
  // application under review.
  const approvalStatus: string = String(sellerProfile?.verificationStatus ?? '').toUpperCase();
  const kycStatus: string = String(sellerProfile?.kycStatus ?? '').toUpperCase();
  const sellerId = sellerProfile?.id || sellerIdParam;
  const sellerName = sellerProfile?.businessName || null;
  const submittedAt = sellerProfile?.submittedAt
    ? new Date(sellerProfile.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const steps = sellerProfile
    ? buildLiveReviewSteps(approvalStatus, entityType, countryCode, sellerProfile)
    : [];

  // The documents this market and module actually require.
  const documents = sellerCountry
    ? getRequiredDocuments(countryCode, moduleKey).map((d) => ({
        name: d.label,
        status: documentStatusFor(kycStatus),
        file: '',
      }))
    : (COUNTRIES[countryCode]?.docs[entityType] ?? []).map((name) => ({
        name,
        status: documentStatusFor(kycStatus),
        file: '',
      }));

  const moduleLabel = getSellerModule(moduleKey)?.label ?? null;

  const BANNERS: Record<string, { title: string; body: string; tone: string; icon: React.ElementType }> = {
    APPROVED: { title: 'Application Approved', body: 'Your account is approved. You can sign in and start trading.', tone: 'emerald', icon: CheckCircle },
    REJECTED: { title: 'Application Not Approved', body: 'Your application was not approved. Contact support to find out what is missing.', tone: 'red', icon: XCircle },
    SUSPENDED: { title: 'Account Suspended', body: 'This seller account is suspended. Contact seller support.', tone: 'red', icon: XCircle },
  };
  const banner = BANNERS[approvalStatus] ?? {
    title: 'Application Under Review',
    body: `Your ${moduleLabel ? moduleLabel.toLowerCase() : entityType} application is being reviewed by the KARTSEEK ${isHealthEntity ? 'Health ' : ''}admin team.`,
    tone: 'amber',
    icon: Clock,
  };
  const TONES: Record<string, { wrap: string; chip: string; head: string; body: string; meta: string }> = {
    amber:   { wrap: 'bg-amber-50 border-amber-200',     chip: 'bg-amber-100 text-amber-600',     head: 'text-amber-900',   body: 'text-amber-700',   meta: 'text-amber-600' },
    emerald: { wrap: 'bg-emerald-50 border-emerald-200', chip: 'bg-emerald-100 text-emerald-600', head: 'text-emerald-900', body: 'text-emerald-700', meta: 'text-emerald-600' },
    red:     { wrap: 'bg-red-50 border-red-200',         chip: 'bg-red-100 text-red-600',         head: 'text-red-900',     body: 'text-red-700',     meta: 'text-red-600' },
  };
  const tone = TONES[banner.tone];
  const BannerIcon = banner.icon;


  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${meta.gradient} flex items-center justify-center`}>
            {isHealthEntity ? <Heart className="w-4 h-4 text-white" /> : <Store className="w-4 h-4 text-white" />}
          </div>
          <div><p className="font-black text-slate-900">{headerLabel}</p><p className="text-xs text-slate-400">Application Status</p></div>
        </div>
        <Link href={signInLink} className="text-sm text-blue-600 font-bold hover:underline">Sign Out</Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Could not load — said plainly rather than filled in */}
        {pollError && !sellerProfile && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-red-900">We could not load your application</h1>
              <p className="text-sm text-red-700 mt-1">
                Your application has not been lost — this page could not read its status. Try
                again shortly, or contact seller support with your reference below.
              </p>
              {sellerId && <p className="text-xs text-red-600 mt-2">Reference: {sellerId}</p>}
            </div>
          </div>
        )}

        {/* Signed in, but no business registered — nothing to look up, and nothing invented. */}
        {noApplication && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">No seller application yet</h1>
              <p className="text-sm text-slate-500 mt-1">
                This account has not registered a business. Start a registration to apply.
              </p>
              <Link href="/seller/register" className="text-sm text-blue-600 font-bold hover:underline mt-2 inline-flex items-center min-h-11">
                Register your business
              </Link>
            </div>
          </div>
        )}

        {loading && !sellerProfile && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4">
            <KartseekLoader size="sm" message="" />
            <p className="text-sm text-slate-500">Loading your application status…</p>
          </div>
        )}

        {/* Status Banner */}
        {sellerProfile && (
          <div className={`${tone.wrap} border rounded-2xl p-6 flex items-start gap-4`}>
            <div className={`w-14 h-14 ${tone.chip} rounded-xl flex items-center justify-center shrink-0`}>
              <BannerIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className={`text-xl font-black ${tone.head}`}>{banner.title}</h1>
              <p className={`text-sm ${tone.body} mt-1`}>{banner.body}</p>
              <p className={`text-xs ${tone.meta} mt-2`}>
                {submittedAt ? `Submitted: ${submittedAt}` : 'Submitted'}
                {approvalStatus === 'PENDING' && ' · Estimated: 1–3 business days'}
                {sellerId && ` · ID: ${sellerId}`}
              </p>
            </div>
          </div>
        )}

        {/* Entity Info Card */}
        {sellerProfile && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg bg-linear-to-br ${meta.gradient} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900">{sellerName ?? 'Your application'}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                entityType === 'doctor' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                entityType === 'hospital' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                entityType === 'clinic' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {meta.emoji} {moduleLabel ?? entityType.charAt(0).toUpperCase() + entityType.slice(1)}
              </span>
            </div>
            <p className="text-xs text-slate-400">{sellerId} · <CountryFlag code={countryCode} size="sm" /> {country?.name ?? countryCode}</p>
          </div>
        </div>
        )}

        {/* Review Timeline */}
        {steps.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500" />Review Progress</h2>
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${step.status === 'done' ? 'bg-emerald-500' : step.status === 'in_progress' ? 'bg-amber-400 animate-pulse' : 'bg-slate-200'}`}>
                    {step.status === 'done' ? <CheckCircle className="w-4 h-4 text-white" /> : step.status === 'in_progress' ? <Clock className="w-3.5 h-3.5 text-white" /> : <div className="w-2 h-2 bg-slate-300 rounded-full" />}
                  </div>
                  {i < steps.length - 1 && <div className={`w-0.5 h-10 ${step.status === 'done' ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                </div>
                <div className="pb-8">
                  <p className={`text-sm font-bold ${step.status === 'done' ? 'text-slate-900' : step.status === 'in_progress' ? 'text-amber-800' : 'text-slate-400'}`}>{step.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{step.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Documents Status */}
        {sellerProfile && documents.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-violet-500" />Required Documents — <CountryFlag code={countryCode} size="sm" /> {country?.name ?? countryCode}</h2>
          <p className="text-xs text-slate-400 mb-4">
            Every document carries the application&apos;s overall KYC state; individual
            documents are not reviewed separately yet.
          </p>
          <div className="space-y-3">
            {documents.map(doc => {
              const style = DOC_STYLES[doc.status];
              const DocIcon = style.icon;
              return (
                <div key={doc.name} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{doc.name}</p>
                      {doc.file && <p className="text-xs text-slate-400">{doc.file}</p>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 ${style.bg}`}>
                    <DocIcon className="w-3 h-3" />{doc.status.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Support */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-slate-900">Need help with your application?</p>
            <p className="text-xs text-slate-400 mt-0.5">Contact {isHealthEntity ? 'health partner' : 'seller'} support for application status inquiries</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold"><Mail className="w-3.5 h-3.5" />Email</button>
            <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold"><Phone className="w-3.5 h-3.5" />Call</button>
          </div>
        </div>
      </div>
    </div>
  );
}
