import type { Metadata } from 'next';
import { moduleMeta } from '@/lib/seo/metadata';
import HotelClientLayout from './hotel-layout-client';

// ── SEO: Dynamic Metadata (Server Component) ────────────────────────────────
export const metadata: Metadata = moduleMeta('hotel-booking');

// ── Server Layout (exports metadata + wraps client layout) ──────────────────
export default function HotelBookingLayout({ children }: { children: React.ReactNode }) {
  return <HotelClientLayout>{children}</HotelClientLayout>;
}
