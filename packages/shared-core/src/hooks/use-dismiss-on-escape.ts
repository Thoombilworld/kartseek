'use client';

import { useEffect } from 'react';

/**
 * useDismissOnEscape — closes an open overlay when Escape is pressed.
 *
 * Every modal in the module could be dismissed by clicking its backdrop and by
 * no other means. A pointer-only dismissal is not a dismissal for anyone
 * navigating by keyboard: tab into a dialog and there is no way back out except
 * finding a Cancel button, which several of these did not have. Escape is the
 * expected affordance and WAI-ARIA names it as required for `dialog`.
 *
 * The listener is attached only while `open` is true, so a page with four
 * dialogs does not carry four idle keydown handlers.
 *
 * Bound on `keydown` rather than `keyup`: keyup can be missed when the press
 * moves focus, and every native dialog dismisses on the down stroke.
 */
export function useDismissOnEscape(open: boolean, onDismiss: () => void): void {
  useEscapeListener(open, onDismiss);
}

function useEscapeListener(open: boolean, onDismiss: () => void): void {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Let a nested overlay (a select popup, a date picker) take the key first.
      if (e.defaultPrevented) return;
      onDismiss();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // `onDismiss` is usually an inline arrow; re-binding on each render is
    // cheaper than asking every caller to memoise it, and the listener is
    // idempotent.
  }, [open, onDismiss]);
}
