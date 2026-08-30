import type { Metadata } from 'next';
import { moduleMeta } from '@/lib/seo/metadata';
import MarketplaceClientLayout from './marketplace-layout-client';

// ── SEO: Dynamic Metadata (Server Component) ────────────────────────────────
export const metadata: Metadata = moduleMeta('marketplace');

// ── Server Layout (exports metadata + wraps client layout) ──────────────────
export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <MarketplaceClientLayout>{children}</MarketplaceClientLayout>;
}
