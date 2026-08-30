import React from 'react';
import type { Metadata } from 'next';
import { AboutClient } from './about-client';

export const metadata: Metadata = {
  title: 'About Us — KartSeek',
  description: 'Learn about KartSeek — a next-generation super-app marketplace operating across India, the Gulf and beyond.',
};

/**
 * About.
 *
 * The positioning line follows the reader's market; the company story does not
 * — it is history, and rewriting it per reader would be a fabrication. The
 * split renders on the client where the region is known.
 */
export default function AboutPage() {
  return <AboutClient />;
}
