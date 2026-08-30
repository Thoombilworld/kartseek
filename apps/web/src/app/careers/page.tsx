import React from 'react';
import type { Metadata } from 'next';
import { CareersClient } from './careers-client';

export const metadata: Metadata = {
  title: 'Careers — KartSeek',
  description: 'Open positions at KartSeek in engineering, design, product, commercial and operations.',
};

/**
 * Careers.
 *
 * Roles are ordered so the reader's own market leads; roles elsewhere are shown
 * under a heading that says so. Nothing about a role is rewritten per reader —
 * its location and benefits belong to the employment market, not the browsing
 * one — so the ordering happens on the client where the region is known.
 */
export default function CareersPage() {
  return <CareersClient />;
}
