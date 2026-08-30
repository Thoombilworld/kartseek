'use client';

import { useState } from 'react';
import { useToast } from '@/lib/contexts/toast-context';

/**
 * Share the current page.
 *
 * Uses the Web Share API where the browser offers it (every mobile browser, and
 * Safari on desktop), which is the native sheet customers expect. Everywhere
 * else it copies the URL to the clipboard and says so — a "Share" button that
 * silently did nothing was the previous behaviour, and on the brand page it was
 * the only control in the hero that could not be clicked.
 */
export function ShareButton({
  title,
  text,
  className = '',
  children = 'Share',
}: {
  title?: string;
  text?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    const url = typeof window !== 'undefined' ? window.location.href : '';

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, text, url });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      } else {
        toast.error('Sharing is not supported in this browser.');
      }
    } catch (e: any) {
      // Dismissing the native share sheet rejects with AbortError. That is the
      // customer changing their mind, not a failure worth reporting.
      if (e?.name !== 'AbortError') toast.error('Could not share this page.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={onClick} disabled={busy} className={className}>
      {children}
    </button>
  );
}
