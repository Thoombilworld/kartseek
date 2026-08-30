import type { Metadata } from 'next';
import { moduleMeta } from '@/lib/seo/metadata';
import TaxiClientLayout from './taxi-layout-client';

// ── SEO: Dynamic Metadata (Server Component) ────────────────────────────────
export const metadata: Metadata = moduleMeta('taxi');

// ── Server Layout (exports metadata + wraps client layout) ──────────────────
export default function TaxiLayout({ children }: { children: React.ReactNode }) {
  return <TaxiClientLayout>{children}</TaxiClientLayout>;
}
