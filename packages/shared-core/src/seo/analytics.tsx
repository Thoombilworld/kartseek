/// KARTSEEK — Analytics Integration
/// Google Analytics 4, Google Tag Manager, Microsoft Clarity, and AI referral tracking.
/// Renders as a server component in the root layout <head>.

import Script from 'next/script';
import React from 'react';

// ─── Configuration ──────────────────────────────────────────────────────────

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX';
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-XXXXXXX';
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || '';

// ─── Google Analytics 4 ─────────────────────────────────────────────────────

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') return null;

  return (
    <>
      <Script id="ga4-script" strategy="afterInteractive">
        {`
          var s = document.createElement('script');
          s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}';
          s.async = true;
          document.head.appendChild(s);
        `}
      </Script>
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_title: document.title,
            send_page_view: true,
            custom_map: {
              dimension1: 'ai_referral_source',
              dimension2: 'country_code',
              dimension3: 'service_type',
            },
          });

          // Track AI referral sources
          (function(){
            var ref = document.referrer || '';
            var aiSource = '';
            if (ref.includes('chat.openai.com') || ref.includes('chatgpt.com')) aiSource = 'chatgpt';
            else if (ref.includes('gemini.google.com') || ref.includes('bard.google.com')) aiSource = 'gemini';
            else if (ref.includes('claude.ai') || ref.includes('anthropic.com')) aiSource = 'claude';
            else if (ref.includes('perplexity.ai')) aiSource = 'perplexity';
            else if (ref.includes('copilot.microsoft.com')) aiSource = 'copilot';
            if (aiSource) {
              gtag('event', 'ai_referral', { ai_source: aiSource, page_path: location.pathname });
            }
          })();
        `}
      </Script>
    </>
  );
}

// ─── Google Tag Manager ─────────────────────────────────────────────────────

export function GoogleTagManager() {
  if (!GTM_ID || GTM_ID === 'GTM-XXXXXXX') return null;

  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}
      </Script>
    </>
  );
}

export function GoogleTagManagerNoScript() {
  if (!GTM_ID || GTM_ID === 'GTM-XXXXXXX') return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        hidden
        title="Google Tag Manager"
      />
    </noscript>
  );
}

// ─── Microsoft Clarity ──────────────────────────────────────────────────────

export function MicrosoftClarity() {
  if (!CLARITY_ID) return null;

  return (
    <Script id="clarity-init" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window,document,"clarity","script","${CLARITY_ID}");
      `}
    </Script>
  );
}

// ─── Search Console Verification ────────────────────────────────────────────

export function searchConsoleVerification(): Record<string, string> {
  const verification: Record<string, string> = {};
  if (process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION) {
    verification['google-site-verification'] = process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION;
  }
  if (process.env.NEXT_PUBLIC_BING_VERIFICATION) {
    // cspell:disable-next-line
    verification['msvalidate.01'] = process.env.NEXT_PUBLIC_BING_VERIFICATION;
  }
  return verification;
}

// ─── Combined Analytics Component ───────────────────────────────────────────

export function AnalyticsScripts() {
  return (
    <>
      <GoogleAnalytics />
      <GoogleTagManager />
      <MicrosoftClarity />
    </>
  );
}

// ─── Event Tracking Helpers ─────────────────────────────────────────────────

export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
}

export function trackPurchase(transactionId: string, value: number, currency: string, items: { name: string; price: number }[]) {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value,
    currency,
    items: items.map(i => ({ item_name: i.name, price: i.price })),
  });
}

export function trackSearch(searchTerm: string, resultCount: number) {
  trackEvent('search', { search_term: searchTerm, result_count: resultCount });
}

export function trackServiceBooking(service: string, city: string, countryCode: string) {
  trackEvent('service_booking', { service_type: service, city, country_code: countryCode });
}
