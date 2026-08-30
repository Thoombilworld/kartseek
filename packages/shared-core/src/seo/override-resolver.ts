/// KARTSEEK — SEO Override Resolver
/// Fetches admin-configured SEO overrides and merges them with auto-generated metadata.
/// Used by page components to allow admin panel to override any SEO field.
///
/// Priority: Admin Override > Dynamic Generation > Module Default

import type { Metadata } from 'next';

import { API_BASE_URL } from '@/lib/config/api-base';

// Gateway origin resolved once in lib/config/api-base.ts. This module used to
// keep its own `NEXT_PUBLIC_API_URL || 'http://localhost:3001'` and then append
// `/api/v1/...` to it — but that variable already ends in `/api/v1`, so every
// request went to `/api/v1/api/v1/admin/seo/...` and 404'd. It only ever worked
// in the branch where the variable was unset.
const API_URL = API_BASE_URL;

// ─── Types ──────────────────────────────────────────────────────────────────

interface SeoOverride {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  ogLocale?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  schemaType?: string;
  schemaData?: Record<string, any>;
  faqItems?: { question: string; answer: string }[];
  countryCode?: string;
  languageCode?: string;
}

// ─── Fetch Override ─────────────────────────────────────────────────────────

export async function fetchSeoOverride(path: string): Promise<SeoOverride | null> {
  try {
    const res = await fetch(`${API_URL}/admin/seo/${encodeURIComponent(path)}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) return null;

    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    // Silently fail — use dynamic generation as fallback
    return null;
  }
}

// ─── Merge Override with Generated Metadata ─────────────────────────────────

export function mergeWithOverride(generated: Metadata, override: SeoOverride | null): Metadata {
  if (!override) return generated;

  return {
    ...generated,

    // Meta tags — override if admin provided values
    ...(override.metaTitle && { title: override.metaTitle }),
    ...(override.metaDescription && { description: override.metaDescription }),
    ...(override.keywords && { keywords: override.keywords }),

    // Robots
    ...(override.robotsIndex !== undefined && {
      robots: {
        index: override.robotsIndex,
        follow: override.robotsFollow ?? true,
      },
    }),

    // Canonical
    ...(override.canonicalUrl && {
      alternates: {
        ...(generated.alternates as any),
        canonical: override.canonicalUrl,
      },
    }),

    // Open Graph — merge with generated OG, override specific fields
    openGraph: {
      ...(generated.openGraph as any),
      ...(override.ogTitle && { title: override.ogTitle }),
      ...(override.ogDescription && { description: override.ogDescription }),
      ...(override.ogImage && {
        images: [{
          url: override.ogImage,
          secureUrl: override.ogImage,
          width: 1200,
          height: 630,
          alt: override.ogTitle || (generated.openGraph as any)?.title || '',
        }],
      }),
      ...(override.ogType && { type: override.ogType }),
      ...(override.ogLocale && { locale: override.ogLocale }),
    },

    // Twitter/X Card
    twitter: {
      ...(generated.twitter as any),
      ...(override.twitterTitle && { title: override.twitterTitle }),
      ...(override.twitterDescription && { description: override.twitterDescription }),
      ...(override.twitterImage && {
        images: { url: override.twitterImage, alt: override.twitterTitle || '' },
      }),
    },
  };
}

// ─── Combined Helper: Fetch + Merge ─────────────────────────────────────────

export async function resolveMetadata(path: string, generatedMeta: Metadata): Promise<Metadata> {
  const override = await fetchSeoOverride(path);
  return mergeWithOverride(generatedMeta, override);
}

// ─── Get FAQ Items (admin or auto-generated) ────────────────────────────────

export async function resolveFaqItems(
  path: string,
  fallbackFaqs: { question: string; answer: string }[]
): Promise<{ question: string; answer: string }[]> {
  const override = await fetchSeoOverride(path);
  return override?.faqItems?.length ? override.faqItems : fallbackFaqs;
}

// ─── Get Schema Override ────────────────────────────────────────────────────

export async function resolveSchemaData(
  path: string,
  fallbackSchema: Record<string, any>
): Promise<Record<string, any>> {
  const override = await fetchSeoOverride(path);
  return override?.schemaData || fallbackSchema;
}
