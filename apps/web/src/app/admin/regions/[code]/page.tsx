'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Globe, ShieldCheck, Store, Package, Image as ImageIcon,
  Check, X, Loader2, Clock, Languages, Wallet, Scale, FileText,
  AlertTriangle, Plus, Trash2, Save, ToggleLeft, ToggleRight, MapPin,
} from 'lucide-react';
import { useRegion, REGIONS } from '@/lib/contexts/region-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  getCountry, isCountryCode, LANGUAGES, getSellerRules,
  getRequiredSellerDocuments, getActiveCountries,
} from '@/lib/localization';

type Tab = 'approvals' | 'content' | 'seller-portal' | 'compliance';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'approvals', label: 'Regional Approvals', icon: ShieldCheck },
  { id: 'content', label: 'Platform Content', icon: ImageIcon },
  { id: 'seller-portal', label: 'Seller Portal', icon: Store },
  { id: 'compliance', label: 'Compliance', icon: Scale },
];

/**
 * Super Admin control surface for a single market.
 *
 * Every decision here is market-specific: who may sell in Qatar is judged on
 * Qatari registrations, which banners run there is a commercial choice for that
 * market alone, and the Seller Portal must ask Qatari sellers for a Commercial
 * Registration rather than a GSTIN. Pooling all markets into one queue makes
 * each of those decisions unreviewable.
 */
export default function RegionControlPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { formatCurrencyValue, formatDateValue, regionNow, timezoneLabel } = useRegion();

  const rawCode = (params?.code ?? '').toString().toUpperCase();
  const [tab, setTab] = useState<Tab>('approvals');

  // An unknown code has no configuration to manage — send the admin back to the
  // list rather than rendering a page bound to the fallback market.
  useEffect(() => {
    if (rawCode && !isCountryCode(rawCode)) router.replace('/admin/regions');
  }, [rawCode, router]);

  const country = getCountry(rawCode);
  const sellerRules = getSellerRules(country.code);
  const localTime = regionNow();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/regions"
            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
            aria-label="Back to regions"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <CountryFlag code={country.code} size="xl" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{country.name}</h1>
            <p className="text-slate-500 text-sm flex items-center gap-2 flex-wrap">
              <span>{country.defaultCity}</span>
              <span className="text-slate-300">·</span>
              <span>{country.currency.code}</span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {String(localTime.hour).padStart(2, '0')}:{String(localTime.minute).padStart(2, '0')} {timezoneLabel}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-full font-bold text-xs">
            <Languages className="w-3.5 h-3.5" />
            {country.languages.map((l) => LANGUAGES[l].name).join(' · ')}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full font-bold text-xs">
            <Scale className="w-3.5 h-3.5" /> {country.compliance.law}
          </span>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-selected={tab === t.id}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'approvals' && <ApprovalsTab countryCode={country.code} adminId={user?.id ?? 'admin'} formatDate={formatDateValue} />}
      {tab === 'content' && <ContentTab countryCode={country.code} />}
      {tab === 'seller-portal' && <SellerPortalTab countryCode={country.code} sellerRules={sellerRules} formatCurrency={formatCurrencyValue} />}
      {tab === 'compliance' && <ComplianceTab countryCode={country.code} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Regional Approvals
// ═══════════════════════════════════════════════════════════════════════════

function ApprovalsTab({
  countryCode, adminId, formatDate,
}: { countryCode: string; adminId: string; formatDate: (d: Date | string) => string }) {
  const [sellers, setSellers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const country = getCountry(countryCode);
  const requiredDocs = getRequiredSellerDocuments(countryCode);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sellerRes, productRes] = await Promise.all([
        adminMarketplaceApi.getSellerApprovals({ country: countryCode }).catch(() => null),
        adminMarketplaceApi.getProductApprovals({ country: countryCode }).catch(() => null),
      ]);
      setSellers(Array.isArray((sellerRes as any)?.data) ? (sellerRes as any).data : []);
      setProducts(Array.isArray((productRes as any)?.data) ? (productRes as any).data : []);
    } catch {
      setError('Could not load the approval queues. The marketplace service may be unavailable.');
    } finally {
      setLoading(false);
    }
  }, [countryCode]);

  useEffect(() => { load(); }, [load]);

  async function act(kind: 'seller' | 'product', id: string, decision: 'approve' | 'reject') {
    setBusy(`${kind}:${id}`);
    setError('');
    try {
      if (kind === 'seller') {
        if (decision === 'approve') await adminMarketplaceApi.approveSeller(id, adminId);
        else await adminMarketplaceApi.rejectSeller(id, adminId, `Does not meet ${country.name} requirements`);
        setSellers((prev) => prev.filter((s) => s.id !== id));
      } else {
        if (decision === 'approve') await adminMarketplaceApi.approveProduct(id, adminId);
        else await adminMarketplaceApi.rejectProduct(id, adminId, `Not permitted for sale in ${country.name}`);
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
      setNotice(`${kind === 'seller' ? 'Seller' : 'Product'} ${decision}d.`);
    } catch (e: any) {
      setError(e?.message || `Could not ${decision} this ${kind}.`);
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading {country.name} approval queues…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">{notice}</p>
      )}

      {/* What "approved" means in this market */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" /> {country.name} approval criteria
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          A seller may only be approved for this market once all of the following are verified.
        </p>
        <div className="flex flex-wrap gap-2">
          {requiredDocs.map((doc) => (
            <span key={doc.key} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> {doc.label}
            </span>
          ))}
        </div>
      </div>

      {/* Seller queue */}
      <ApprovalQueue
        title="Seller applications"
        icon={Store}
        emptyLabel={`No seller applications are waiting for ${country.name}.`}
        rows={sellers}
        busy={busy}
        kind="seller"
        renderRow={(s) => ({
          id: s.id,
          primary: s.businessName || s.name || 'Unnamed seller',
          secondary: [s.email, s.phone].filter(Boolean).join(' · '),
          meta: s.createdAt ? `Applied ${formatDate(s.createdAt)}` : '',
        })}
        onDecision={(id, decision) => act('seller', id, decision)}
      />

      {/* Product queue */}
      <ApprovalQueue
        title="Product listings"
        icon={Package}
        emptyLabel={`No product listings are waiting for ${country.name}.`}
        rows={products}
        busy={busy}
        kind="product"
        renderRow={(p) => ({
          id: p.id,
          primary: p.name || p.title || 'Unnamed product',
          secondary: [p.brand?.name ?? p.brand, p.category?.name].filter(Boolean).join(' · '),
          meta: p.sellerName ? `Seller: ${p.sellerName}` : '',
        })}
        onDecision={(id, decision) => act('product', id, decision)}
      />
    </div>
  );
}

function ApprovalQueue({
  title, icon: Icon, rows, emptyLabel, busy, kind, renderRow, onDecision,
}: {
  title: string;
  icon: React.ElementType;
  rows: any[];
  emptyLabel: string;
  busy: string | null;
  kind: 'seller' | 'product';
  renderRow: (row: any) => { id: string; primary: string; secondary: string; meta: string };
  onDecision: (id: string, decision: 'approve' | 'reject') => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" /> {title}
        </h3>
        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
          {rows.length} pending
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">{emptyLabel}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((row) => {
            const view = renderRow(row);
            const isBusy = busy === `${kind}:${view.id}`;
            return (
              <div key={view.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{view.primary}</p>
                  {view.secondary && <p className="text-xs text-slate-500 truncate">{view.secondary}</p>}
                  {view.meta && <p className="text-[11px] text-slate-400 mt-0.5">{view.meta}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => onDecision(view.id, 'approve')}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                  </button>
                  <button
                    onClick={() => onDecision(view.id, 'reject')}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 text-xs font-bold rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Platform Content
// ═══════════════════════════════════════════════════════════════════════════

interface BannerDraft {
  id?: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  link: string;
  regions: string[];
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
}

const BANNER_TYPES = ['hero', 'campaign', 'country'] as const;

function ContentTab({ countryCode }: { countryCode: string }) {
  const [type, setType] = useState<(typeof BANNER_TYPES)[number]>('hero');
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<BannerDraft | null>(null);

  const country = getCountry(countryCode);
  const allCountries = useMemo(() => getActiveCountries(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res: any = await adminMarketplaceApi.getBanners({ type, country: countryCode });
      setBanners(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setError('Could not load banners.');
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [type, countryCode]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      await adminMarketplaceApi.createBanner({ ...draft, type });
      setDraft(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not save the banner.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError('');
    try {
      await adminMarketplaceApi.deleteBanner(id);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not delete the banner.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 leading-relaxed">
          Banners listed here run in <strong>{country.name}</strong>. A banner with no market
          selected runs everywhere. A campaign priced in {country.currency.code} should be
          targeted at this market only — running it globally advertises an offer other markets
          cannot honour.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          {BANNER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                type === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setDraft({
            title: '', subtitle: '', imageUrl: '', link: '',
            regions: [countryCode], isActive: true,
          })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New banner
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{error}</p>
      )}

      {draft && (
        <div className="bg-white border border-emerald-200 rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm">New {type} banner</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Title" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
            <Field label="Subtitle" value={draft.subtitle} onChange={(v) => setDraft({ ...draft, subtitle: v })} />
            <Field label="Image URL" value={draft.imageUrl} onChange={(v) => setDraft({ ...draft, imageUrl: v })} />
            <Field label="Link" value={draft.link} onChange={(v) => setDraft({ ...draft, link: v })} />
            <Field label="Starts (ISO date)" value={draft.startsAt ?? ''} onChange={(v) => setDraft({ ...draft, startsAt: v })} />
            <Field label="Ends (ISO date)" value={draft.endsAt ?? ''} onChange={(v) => setDraft({ ...draft, endsAt: v })} />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">Markets</p>
            <div className="flex flex-wrap gap-1.5">
              {allCountries.map((c) => {
                const on = draft.regions.includes(c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => setDraft({
                      ...draft,
                      regions: on ? draft.regions.filter((r) => r !== c.code) : [...draft.regions, c.code],
                    })}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      on
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <CountryFlag code={c.code} size="xs" /> {c.code}
                  </button>
                );
              })}
            </div>
            {draft.regions.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1.5">
                No market selected — this banner will run everywhere.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save banner
            </button>
            <button
              onClick={() => setDraft(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading banners…
          </div>
        ) : banners.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">
            No {type} banners are running in {country.name}.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {banners.map((b: any) => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-16 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                  {b.imageUrl
                    ? /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <ImageIcon className="w-4 h-4 text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{b.title || b.id}</p>
                  <p className="text-xs text-slate-500 truncate">{b.subtitle || b.link || '—'}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {Array.isArray(b.regions) && b.regions.length > 0 ? (
                      b.regions.map((r: string) => (
                        <span key={r} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{r}</span>
                      ))
                    ) : (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">ALL MARKETS</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => remove(b.id)}
                  aria-label={`Delete banner ${b.title || b.id}`}
                  className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 outline-none"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Seller Portal
// ═══════════════════════════════════════════════════════════════════════════

function SellerPortalTab({
  countryCode, sellerRules, formatCurrency,
}: {
  countryCode: string;
  sellerRules: ReturnType<typeof getSellerRules>;
  formatCurrency: (n: number) => string;
}) {
  const country = getCountry(countryCode);
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>(
    () => Object.fromEntries(country.enabledModules.map((m) => [m, true])),
  );

  const allModules = [
    'marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor',
    'taxi', 'delivery', 'hotel-booking',
  ];

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <Store className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 leading-relaxed">
          These settings drive what a seller in {country.name} sees when they open the Seller
          Marketplace Portal — which registrations they are asked for, how they are paid, and
          which verticals they can list against.
        </p>
      </div>

      {/* Onboarding requirements */}
      <Panel title="Onboarding requirements" icon={FileText}>
        <p className="text-xs text-slate-500 mb-3">
          Collected during registration and re-checked at KYC review. Sellers cannot be approved
          for {country.name} until every required document is verified.
        </p>
        <div className="space-y-2">
          {sellerRules.documents.map((doc) => (
            <div key={doc.key} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">{doc.label}</p>
                {doc.helper && <p className="text-xs text-slate-500">{doc.helper}</p>}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                doc.required ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {doc.required ? 'Required' : 'Optional'}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Payouts */}
      <Panel title="Payouts" icon={Wallet}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Stat label="Settlement currency" value={`${country.currency.symbol} · ${country.currency.code}`} />
          <Stat label="Bank identifier" value={sellerRules.bankIdentifierLabel} />
        </div>
        <div className="space-y-2">
          {sellerRules.payoutRails.map((rail) => (
            <div key={rail.key} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
              <p className="text-sm font-bold text-slate-800">
                {rail.label}
                {rail.isDefault && (
                  <span className="ms-2 text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Default</span>
                )}
              </p>
              <span className="text-xs text-slate-500 shrink-0">
                {rail.settlementDays === 0 ? 'Instant' : `T+${rail.settlementDays}`}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Tax */}
      <Panel title="Tax & invoicing" icon={Scale}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Regime" value={country.tax.name} />
          <Stat label="Rate" value={`${country.tax.rate}%`} />
          <Stat label="Filing" value={sellerRules.taxFilingLabel ?? 'Not applicable'} />
        </div>
        {country.tax.rate === 0 && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mt-3">
            {country.name} levies no consumption tax, so the portal hides tax filing and the
            storefront omits the tax line at checkout.
          </p>
        )}
      </Panel>

      {/* Vertical availability */}
      <Panel title="Verticals a seller may list in" icon={Package}>
        <div className="space-y-2">
          {allModules.map((mod) => {
            const on = enabledModules[mod] ?? false;
            return (
              <div key={mod} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                <span className={`text-sm font-bold capitalize ${on ? 'text-slate-800' : 'text-slate-400'}`}>
                  {mod.replace('-', ' ')}
                </span>
                <button
                  onClick={() => setEnabledModules((prev) => ({ ...prev, [mod]: !on }))}
                  aria-label={`${on ? 'Disable' : 'Enable'} ${mod} for ${country.name} sellers`}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {on
                    ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                    : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Changes apply to new seller registrations in {country.name}. Existing sellers keep
          access to verticals they are already approved for.
        </p>
      </Panel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Compliance
// ═══════════════════════════════════════════════════════════════════════════

function ComplianceTab({ countryCode }: { countryCode: string }) {
  const country = getCountry(countryCode);
  const c = country.compliance;

  return (
    <div className="space-y-5">
      <Panel title="Data protection regime" icon={Scale}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Stat label="Law" value={c.law} />
          <Stat label="Citation" value={c.citation} />
          <Stat label="Regulator" value={c.regulator} />
          <Stat label="Breach notification" value={`Within ${c.breachNotificationHours} hours`} />
          <Stat label="Consent basis" value={c.requiresExplicitConsent ? 'Affirmative consent required' : 'Legitimate interest permitted'} />
          <Stat label="Data residency" value={c.dataResidencyRequired ? 'In-region by default' : 'Transfers permitted with safeguards'} />
          <Stat label="Record retention" value={`${Math.round(c.recordRetentionMonths / 12)} years`} />
          <Stat label="Minimum age" value={`${c.minimumConsentAge} years`} />
        </div>
      </Panel>

      <Panel title="Rights the platform must service" icon={ShieldCheck}>
        <ul className="space-y-1.5">
          {c.dataSubjectRights.map((right) => (
            <li key={right} className="text-sm text-slate-600 flex gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {right}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Other regulations in force" icon={FileText}>
        <ul className="space-y-1.5">
          {c.additionalRegulations.map((reg) => (
            <li key={reg} className="text-sm text-slate-600 flex gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> {reg}
            </li>
          ))}
        </ul>
      </Panel>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          These settings drive the customer-facing privacy notice, the consent banner and the
          data-request workflow for {country.name}. The policy text is drafted against this
          regime but is not legal advice — have counsel in this market review it before launch.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared bits
// ═══════════════════════════════════════════════════════════════════════════

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-emerald-600" /> {title}
      </h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-800 leading-snug">{value}</p>
    </div>
  );
}
