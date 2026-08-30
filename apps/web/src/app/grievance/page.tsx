import React from 'react';
import type { Metadata } from 'next';
import { GrievanceClient } from './grievance-client';

export const metadata: Metadata = {
  title: 'Complaint Redressal — KartSeek',
  description:
    'How to raise and escalate a complaint with KartSeek, under the consumer protection rules of the country you are browsing from.',
};

/**
 * Complaint redressal.
 *
 * Whether a named grievance officer is required, the statutory resolution
 * window, and which authority hears an escalation are all market-specific, so
 * the body renders on the client where the active region is known.
 */
export default function GrievancePage() {
  return <GrievanceClient />;
}
