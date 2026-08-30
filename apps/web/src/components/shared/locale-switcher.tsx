'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LANGUAGES, getCountry, getActiveCountries, getDirection,
  type LanguageCode,
} from '@/lib/localization';
import { useRegion } from '@/lib/contexts/region-context';
import styles from './locale-switcher.module.css';
import { CountryFlag } from './country-flag';

interface LocaleSwitcherProps {
  /** Omit to bind to the active region — the usual case. */
  currentLocale?: LanguageCode;
  currentCountry?: string;
  onLocaleChange?: (locale: LanguageCode) => void;
  onCountryChange?: (countryCode: string) => void;
  variant?: 'dropdown' | 'inline';
  showFlags?: boolean;
  /** Hide the country tab where switching market makes no sense (seller portal). */
  showCountryTab?: boolean;
  className?: string;
}

/**
 * Language and country switcher.
 *
 * The language list is *derived from the active country*, never hard-coded:
 * `getCountry(code).languages` is the single rule, so Qatar offers Arabic and
 * English and nothing else, while India offers its regional languages. Adding a
 * language to a market in the registry surfaces it here, in the seller portal
 * and in the admin panel at once.
 *
 * Uncontrolled by default — it reads and writes the region context directly, so
 * dropping `<LocaleSwitcher />` into a header is all that is required. Pass the
 * `current*`/`on*Change` props to drive it from elsewhere (the admin panel does
 * this to preview a market without leaving its own locale).
 */
export function LocaleSwitcher({
  currentLocale,
  currentCountry,
  onLocaleChange,
  onCountryChange,
  variant = 'dropdown',
  showFlags = true,
  showCountryTab = true,
  className = '',
}: LocaleSwitcherProps) {
  const region = useRegion();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'language' | 'country'>('language');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Controlled when props are supplied, bound to the region context otherwise.
  const locale = currentLocale ?? region.currentLanguage;
  const countryCode = currentCountry
    ?? (region.selectedRegion === 'ALL' ? region.country.code : region.selectedRegion);

  const selectLocale = onLocaleChange ?? region.setCurrentLanguage;
  const selectCountry = onCountryChange ?? ((code: string) => region.setSelectedRegion(code as never, 'manual'));

  const country = getCountry(countryCode);
  const currentLangInfo = LANGUAGES[locale] ?? LANGUAGES.en;

  /**
   * The languages this market serves. Filtering the global language list by the
   * country — rather than listing every language the platform can render —
   * is what makes the section dynamic.
   */
  const availableLanguages = country.languages;

  const countries = getActiveCountries();

  if (variant === 'inline') {
    // A market with a single language has nothing to switch between; rendering
    // one dead button reads as a broken control.
    if (availableLanguages.length < 2) return null;

    return (
      <div className={`${styles.inlineContainer} ${className}`} role="group" aria-label="Select language">
        {availableLanguages.map(lang => {
          const info = LANGUAGES[lang];
          const isActive = lang === locale;
          return (
            <button
              key={lang}
              onClick={() => selectLocale(lang)}
              title={`Switch to ${info.name}`}
              lang={lang}
              dir={getDirection(lang)}
              aria-pressed={isActive}
              className={`${styles.inlineBtn} ${isActive ? styles.inlineBtnActive : ''}`}
            >
              {showFlags && <CountryFlag code={info.flagCountry} size="xs" />} {info.nativeName}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`${styles.wrapper} ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Change language or country"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={styles.trigger}
      >
        <CountryFlag code={country.code} size="sm" />
        <span lang={locale} dir={getDirection(locale)}>{currentLangInfo.nativeName}</span>
        <span className={styles.arrow} aria-hidden="true">▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="menu">
          {showCountryTab && (
            <div className={styles.tabs}>
              {(['language', 'country'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  title={`Switch ${tab}`}
                  aria-selected={activeTab === tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                >
                  {tab === 'language' ? '🌐 Language' : '🗺️ Country'}
                </button>
              ))}
            </div>
          )}

          {(activeTab === 'language' || !showCountryTab) && (
            <div className={styles.list}>
              {availableLanguages.map(lang => {
                const info = LANGUAGES[lang];
                const isActive = lang === locale;
                return (
                  <button
                    key={lang}
                    onClick={() => { selectLocale(lang); setIsOpen(false); }}
                    title={`Switch to ${info.name}`}
                    role="menuitemradio"
                    aria-checked={isActive}
                    className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                  >
                    <span className={styles.itemFlag}><CountryFlag code={info.flagCountry} size="sm" /></span>
                    <div>
                      <div
                        className={`${styles.itemName} ${isActive ? styles.itemNameActive : ''}`}
                        lang={lang}
                        dir={getDirection(lang)}
                      >
                        {info.nativeName}
                      </div>
                      <div className={styles.itemSub}>
                        {info.name}{info.rtl ? ' (RTL)' : ''}
                      </div>
                    </div>
                    {isActive && <span className={styles.checkmark}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {showCountryTab && activeTab === 'country' && (
            <div className={`${styles.list} ${styles.listScrollable}`}>
              {countries.map(c => {
                const isActive = c.code === countryCode;
                return (
                  <button
                    key={c.code}
                    onClick={() => { selectCountry(c.code); setIsOpen(false); }}
                    title={`Switch to ${c.name}`}
                    role="menuitemradio"
                    aria-checked={isActive}
                    className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                  >
                    <span className={styles.countryFlag}><CountryFlag code={c.code} size="sm" /></span>
                    <div>
                      <div className={`${styles.itemName} ${isActive ? styles.itemNameActive : ''}`}>
                        {c.name}
                      </div>
                      <div className={styles.itemSub}>
                        {c.currency.symbol} · {c.currency.code} · {c.languages.map(l => LANGUAGES[l].name).join(', ')}
                      </div>
                    </div>
                    {isActive && <span className={styles.checkmark}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LocaleSwitcher;
