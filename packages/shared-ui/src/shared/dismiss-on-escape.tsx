'use client';

import { useDismissOnEscape } from '@/lib/hooks/use-dismiss-on-escape';

/**
 * DismissOnEscape — closes the surrounding overlay when Escape is pressed.
 *
 * Renders nothing. Drop it as the first child of a modal backdrop:
 *
 *     <div className="fixed inset-0 …" onClick={() => setOpen(false)}>
 *       <DismissOnEscape onDismiss={() => setOpen(false)} />
 *       …
 *
 * 118 overlays across this app could be dismissed by clicking their backdrop and
 * by nothing else. For anyone navigating by keyboard that is not a dismissal at
 * all: tab into a dialog and there is no way out unless it happens to have a
 * Cancel button. WAI-ARIA names Escape as required for the `dialog` pattern.
 *
 * Why a component and not a hook at the call sites: a hook has to live at the
 * top of the component and be told whether the modal is open, but these
 * backdrops sit inside `{isOpen && (…)}` blocks where that flag is often not in
 * scope — or the whole component is mounted conditionally by its parent, so
 * there is no flag at all. A child element mounts and unmounts precisely with
 * the overlay, so "mounted" *is* "open" and nothing needs to be passed.
 *
 * Use the hook directly instead when the component owns an `isOpen` prop and
 * returns null while closed.
 */
export function DismissOnEscape({ onDismiss }: { onDismiss: () => void }) {
  useDismissOnEscape(true, onDismiss);
  return null;
}

export default DismissOnEscape;
