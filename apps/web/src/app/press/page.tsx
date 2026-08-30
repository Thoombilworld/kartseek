import React from 'react';
import type { Metadata } from 'next';
import { PressClient } from './press-client';

export const metadata: Metadata = {
  title: 'Press & Media — KartSeek',
  description: 'KartSeek press releases, media resources and brand assets.',
};

/**
 * Press & media.
 *
 * Releases are dated facts, so none are rewritten or hidden — they are ordered
 * by relevance to the reader's market and badged with the market they concern,
 * which needs the region and so renders on the client.
 */
export default function PressPage() {
  return <PressClient />;
}
