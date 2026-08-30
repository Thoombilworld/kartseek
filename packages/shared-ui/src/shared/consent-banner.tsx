'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ZoneLink } from '../zone-link';
import { Cookie, Shield, ChevronDown, Check } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import {
  getDefaultConsent, buildConsentRecord, isConsentValid,
  type ConsentRecord, type ConsentState, type ConsentCategory,
} from '@/lib/localization';

const STORAGE_KEY = 'kartseek_consent';

function readConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsentRecord) : null;
  } catch {
    return null;
  }
}

function writeConsent(record: ConsentRecord) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Private-browsing quota errors must not block the page.
  }
  // Mirrored to a cookie so the edge and the analytics loader can read it
  // before any JavaScript module has hydrated.
  document.cookie = `kartseek_consent=${encodeURIComponent(
    Object.entries(record.state).filter(([, on]) => on).map(([k]) => k).join(','),
  )}; path=/; max-age=15552000; SameSite=Lax`;
}

/**
 * Cookie and processing consent, on the terms the customer's own law requires.
 *
 * Where the regime demands affirmative consent — Qatar's PDPPL among them —
 * every optional category starts switched **off** and "Accept all" is not the
 * only way out: "Reject non-essential" is given equal weight. A banner that
 * pre-ticks analytics and offers only an accept button does not collect valid
 * consent under those regimes, and the record it stores would not stand up as
 * the demonstration of consent the controller is required to hold.
 *
 * The stored record carries the region and policy version in force when it was
 * given, so consent is re-asked when either changes rather than being silently
 * carried across markets.
 */
export function ConsentBanner() {
  const { selectedRegion, country, compliance, consentCategories } = useRegion();
  const regionCode = selectedRegion === 'ALL' ? country.code : selectedRegion;

  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<ConsentState>(() => getDefaultConsent(regionCode));
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = readConsent();
    if (isConsentValid(stored, regionCode)) {
      setVisible(false);
      return;
    }
    // No valid record for this region and policy version — ask again, starting
    // from this region's defaults rather than whatever the last one was.
    setState(getDefaultConsent(regionCode));
    setVisible(true);
  }, [regionCode]);

  // Reserve space for the banner at the foot of the page while it is up.
  //
  // It is `fixed bottom-0` and not modal, so it silently covered whatever sat at
  // the bottom of the page and swallowed clicks meant for it — the sign-up terms
  // checkbox, the account sidebar's Log Out button and the reset-password submit
  // were each unreachable on a first visit, which is exactly when every visitor
  // sees this banner.
  //
  // Body padding only moves content in normal flow. Anything `position: fixed`
  // ignores it, so the height is also published as `--consent-banner-height` for
  // fixed panels to reserve their own space — see the marketplace seller portal's
  // sidebar, whose last three nav links sat under this banner and could not be
  // clicked at all.
  useEffect(() => {
    if (!visible || typeof document === 'undefined') return;
    const previous = document.body.style.paddingBottom;
    const root = document.documentElement;
    const apply = () => {
      const height = bannerRef.current?.offsetHeight ?? 0;
      document.body.style.paddingBottom = height ? `${height}px` : previous;
      root.style.setProperty('--consent-banner-height', `${height}px`);
    };
    apply();
    // The banner reflows on its own (font loading, text wrapping at narrow
    // widths), not just on window resize, so observe the element itself.
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    if (observer && bannerRef.current) observer.observe(bannerRef.current);
    window.addEventListener('resize', apply);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', apply);
      document.body.style.paddingBottom = previous;
      root.style.removeProperty('--consent-banner-height');
    };
    // `expanded` changes the banner's height, so the reserved space must follow it.
  }, [visible, expanded]);

  if (!visible) return null;

  const save = (next: ConsentState, source: ConsentRecord['source']) => {
    writeConsent(buildConsentRecord(next, regionCode, source));
    setVisible(false);
  };

  const acceptAll = () => save(
    consentCategories.reduce((acc, c) => ({ ...acc, [c.id]: true }), {} as ConsentState),
    'banner',
  );

  const rejectOptional = () => save(
    consentCategories.reduce((acc, c) => ({ ...acc, [c.id]: c.required }), {} as ConsentState),
    'banner',
  );

  const toggle = (id: ConsentCategory) =>
    setState((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-label="Privacy and cookie preferences"
      className="fixed bottom-0 inset-x-0 z-[70] p-2 xs:p-3 sm:p-4"
    >
      {/* Capped, and scrollable past the cap.
          Collapsed, this measured 358px on an 812px handset — 44% of the screen
          before the customer has expanded anything, and `body` padding of the
          same size is reserved beneath it, so nearly half the viewport was the
          banner and its shadow. Expanded, with four categories, it is taller
          still and the action buttons went off the bottom of a small screen with
          no way to reach them. The cap keeps the page usable; the overflow keeps
          every control reachable. */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[70vh] flex flex-col">
        <div className="p-4 sm:p-5 overflow-y-auto">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm">Your privacy choices</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                We use cookies to keep you signed in and secure your checkout. With your consent we
                also measure how the site is used and personalise what you see.
                {' '}Your data is handled under <strong>{compliance.law}</strong> in {country.name}.{' '}
                <ZoneLink href="/privacy" className="text-blue-600 hover:underline font-semibold">
                  Read the policy
                </ZoneLink>
              </p>
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 mt-1 min-h-[44px] transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Hide' : 'Customise'} categories
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              {consentCategories.map((category) => (
                <label
                  key={category.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    category.required
                      ? 'border-slate-100 bg-slate-50 cursor-default'
                      : 'border-slate-200 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={category.required ? true : state[category.id]}
                    disabled={category.required}
                    onChange={() => toggle(category.id)}
                    className="accent-blue-600 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                      {category.label}
                      {category.required && (
                        <span className="text-[9px] font-bold uppercase bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          Always on
                        </span>
                      )}
                      {category.optIn && (
                        <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          Opt-in
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{category.description}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Side by side on every width, not stacked below `sm`.
            Three full-width buttons were the bulk of a 363px collapsed banner on
            an 812px handset, and the same height is reserved as body padding
            underneath — so nearly half the screen was consent UI before the
            visitor had read anything. Equal prominence is preserved: both
            choices are the same size and weight, side by side, which is what the
            regimes require. `flex-wrap` lets the third button drop to its own
            row when "Manage preferences" is open. */}
        <div className="flex flex-wrap gap-2 px-4 sm:px-5 pb-4 sm:pb-5 pt-2 shrink-0 bg-white border-t border-slate-100">
          {/* Equal prominence: a reject option buried or styled as secondary is
              not a free choice, which is what these regimes require. */}
          <button
            onClick={rejectOptional}
            className="flex-1 basis-[45%] px-2 py-2.5 min-h-[44px] border-2 border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-bold rounded-xl transition-colors"
          >
            Reject non-essential
          </button>
          {expanded && (
            <button
              onClick={() => save(state, 'preferences')}
              className="flex-1 basis-full px-2 py-2.5 min-h-[44px] border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save my choices
            </button>
          )}
          <button
            onClick={acceptAll}
            className="flex-1 basis-[45%] px-2 py-2.5 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Shield className="w-4 h-4" /> Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConsentBanner;
