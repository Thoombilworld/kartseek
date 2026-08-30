'use client';

/**
 * KARTSEEK Field — label/control binding primitive
 *
 * Owns the one thing that is easy to get wrong by hand and impossible to get
 * wrong here: the `htmlFor` ↔ `id` pair that makes a visible label the control's
 * accessible name (WCAG 1.3.1 Info and Relationships, 4.1.2 Name Role Value).
 *
 * The id comes from React's `useId()`, not from the label text, so a label whose
 * content is dynamic — `{form.type === 'percentage' ? 'Percentage' : 'Amount'}` —
 * binds exactly as reliably as a literal one. The control never has to be a
 * sibling of the label either, which is what defeated the mechanical pass.
 *
 * Wraps a single form control and injects, without overwriting anything the
 * caller set explicitly:
 *   id                — bound to the label's htmlFor
 *   aria-describedby  — hint and/or error text, when present
 *   aria-invalid      — when `error` is set
 *   aria-required     — when `required` is set
 *
 * Usage:
 *   <Field label="Coupon Code" required>
 *     <input className="input input-bordered" value={code} onChange={…} />
 *   </Field>
 *
 *   <Field label={isPercent ? 'Percentage' : 'Amount'} hint="Excludes tax" size="sm">
 *     <select className="input input-bordered">…</select>
 *   </Field>
 */

import React, { memo, useId, isValidElement, cloneElement, type ReactNode, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  /** Visible label. Any node — dynamic expressions bind as reliably as literals. */
  label: ReactNode;
  /** Exactly one form control: input, select, textarea, or a component forwarding them. */
  children: ReactNode;
  /** Helper text rendered under the control and wired to aria-describedby. */
  hint?: ReactNode;
  /** Error text. Sets aria-invalid and takes visual precedence over `hint`. */
  error?: ReactNode;
  /** Marks the field required — adds a visual asterisk and aria-required. */
  required?: boolean;
  /** `md` uses the `.label` class, `sm` uses the smaller uppercase `.label-sm`. */
  size?: 'md' | 'sm';
  /** Extra classes for the wrapper element. */
  className?: string;
  /** Extra classes for the label element. */
  labelClassName?: string;
}

/** Attributes Field injects; kept loose because the child may be any control. */
type Injectable = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
};

export const Field = memo(function Field({
  label,
  children,
  hint,
  error,
  required,
  size = 'md',
  className,
  labelClassName,
}: FieldProps) {
  const reactId = useId();

  // A caller-supplied id always wins — migrating a screen must never break an
  // existing label, test selector, or scrollIntoView target.
  const childId =
    isValidElement(children) && (children.props as Injectable)?.id
      ? (children.props as Injectable).id!
      : `field-${reactId}`;

  const hintId = hint ? `${childId}-hint` : undefined;
  const errorId = error ? `${childId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Injectable>, {
        id: childId,
        // Preserve anything the caller already wired up.
        'aria-describedby':
          (children.props as Injectable)['aria-describedby'] ?? describedBy,
        'aria-invalid': (children.props as Injectable)['aria-invalid'] ?? (error ? true : undefined),
        'aria-required': (children.props as Injectable)['aria-required'] ?? (required || undefined),
      })
    : children;

  return (
    <div className={cn('flex flex-col', className)}>
      <label
        htmlFor={childId}
        className={cn(size === 'sm' ? 'label-sm' : 'label', labelClassName)}
      >
        {label}
        {required && (
          <>
            {' '}
            <span aria-hidden="true" className="text-red-500">
              *
            </span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>

      {control}

      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
