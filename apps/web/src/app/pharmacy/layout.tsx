import type { Metadata } from 'next';
import { moduleMeta } from '@/lib/seo/metadata';
import PharmacyClientLayout from './pharmacy-layout-client';

// ── SEO: Dynamic Metadata (Server Component) ────────────────────────────────
export const metadata: Metadata = moduleMeta('pharmacy');

// ── Server Layout (exports metadata + wraps client layout) ──────────────────
export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return <PharmacyClientLayout>{children}</PharmacyClientLayout>;
}
