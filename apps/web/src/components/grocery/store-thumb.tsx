'use client';

import React, { useState } from 'react';

/**
 * The image well for a grocery store card.
 *
 * Store cards rendered `store.emoji` at whatever font size each call site chose
 * — `text-5xl` on the promoted card, `text-2xl` on the compact one — so a real
 * `logoUrl` had nowhere to go and the "image" never matched the card. Stores
 * carry a `logoUrl` column that was only ever read as an emoji fallback.
 *
 * One component owns the well, so every card gets the same frame and a real
 * logo fills it edge to edge. `object-contain` rather than `cover`: a shop's
 * mark is usually lettering on a padded canvas and cropping it to fill would
 * cut the name off. A store with no logo keeps its emoji, centred in the same
 * box, so mixed data does not produce ragged rows.
 */
export const STORE_THUMB = {
  sm: 'w-12 h-12 text-2xl rounded-lg',
  md: 'w-16 h-16 text-3xl rounded-xl',
  lg: 'w-full aspect-[16/9] text-5xl rounded-t-2xl',
} as const;

export type StoreThumbSize = keyof typeof STORE_THUMB;

export function StoreThumb({
  logoUrl,
  emoji,
  name,
  size = 'md',
  className = '',
}: {
  logoUrl?: string | null;
  emoji?: string | null;
  name: string;
  size?: StoreThumbSize;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  // `logoUrl` has historically held an emoji rather than a URL, so anything
  // that is not clearly a URL is treated as the emoji it actually is.
  const isUrl = !!logoUrl && /^(https?:|\/)/.test(logoUrl);
  const glyph = (!isUrl && logoUrl) || emoji || '🛒';

  return (
    <div
      className={
        `${STORE_THUMB[size]} shrink-0 overflow-hidden bg-linear-to-br from-slate-50 to-slate-100 `
        + `flex items-center justify-center ${className}`
      }
    >
      {isUrl && !failed ? (
        <img
          src={logoUrl!}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="w-full h-full object-contain p-1.5"
        />
      ) : (
        <span aria-hidden="true" className="leading-none">{glyph}</span>
      )}
    </div>
  );
}
