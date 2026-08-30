import React from 'react';
import type { Metadata } from 'next';
import { PrivacyPolicyClient } from './privacy-policy-client';

export const metadata: Metadata = {
  title: 'Privacy Policy — KartSeek',
  description:
    'How KartSeek collects, uses and protects your personal data, under the data-protection law of the country you are browsing from.',
};

/**
 * Privacy policy.
 *
 * The content is region-dependent — the governing law, regulator, retention
 * window and the rights a person can exercise all change with the market — so
 * the body renders on the client, where the detected region is known. The prose
 * itself lives in `@/lib/localization/compliance`, drafted against each regime
 * and pending review by counsel in each market before launch.
 */
export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
