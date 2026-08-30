import React from 'react';
import type { Metadata } from 'next';
import { TermsClient } from './terms-client';

export const metadata: Metadata = {
  title: 'Terms of Service — KartSeek',
  description:
    'The terms and conditions governing your use of the KartSeek marketplace, for the country you are browsing from.',
};

/**
 * Terms of Service.
 *
 * Region-dependent — the contracting entity, governing law, court, tax
 * treatment and consumer-protection regime all change with the market — so the
 * body renders on the client, where the detected or selected region is known.
 * The clause text lives in `@/lib/localization/terms`, composed from each
 * market's legal record. Drafted prose pending review by counsel per market.
 */
export default function TermsPage() {
  return <TermsClient />;
}
