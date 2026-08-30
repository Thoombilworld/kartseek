import React from 'react';
import type { Metadata } from 'next';
import { ContactClient } from './contact-client';

export const metadata: Metadata = {
  title: 'Contact Us — KartSeek',
  description:
    'Get in touch with KartSeek support. Contact details, opening hours and registered office for the country you are browsing from.',
};

/**
 * Contact page.
 *
 * The support line, its hours, the working week and the registered office are
 * market-specific, so the body renders on the client where the active region
 * is known.
 */
export default function ContactPage() {
  return <ContactClient />;
}
