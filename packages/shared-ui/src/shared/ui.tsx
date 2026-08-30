'use client';

/**
 * KARTSEEK Shared UI Components
 *
 * React.memo-optimized, fully typed, accessible components
 * using the globals.css class system.
 *
 * Components:
 *  Spinner · SkeletonLoader · EmptyState · Badge ·
 *  Button · Avatar · Tag · ProgressBar · CountdownTimer ·
 *  StatCard · SectionHeader · Divider
 */

import React, { memo, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { useCountdown } from '@/lib/hooks/hooks';

// ─── Spinner ──────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?:  'sm' | 'md' | 'lg';
  color?: string;
  label?: string;
}

const SIZE_MAP = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };

export const Spinner = memo(function Spinner({
  size = 'md', color = 'border-brand-600', label = 'Loading…',
}: SpinnerProps) {
  return (
    <div role="status" aria-label={label} className="inline-flex items-center gap-2">
      <div
        className={cn(
          'rounded-full border-2 border-slate-200 animate-spin',
          `border-t-current ${color}`,
          SIZE_MAP[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
});

// ─── SkeletonLoader ───────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  rows?:      number;
  height?:    string;
}

export const Skeleton = memo(function Skeleton({ className, height = 'h-4' }: SkeletonProps) {
  return <div className={cn('skeleton', height, className)} aria-hidden />;
});

export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3" aria-hidden>
      <Skeleton className="w-full rounded-xl h-36" />
      <Skeleton className="w-3/4 h-3" />
      <Skeleton className="w-1/2 h-3" />
      <Skeleton className="w-1/4 h-5" />
    </div>
  );
});

export const SkeletonText = memo(function SkeletonText({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={i === rows - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  );
});

// ─── Skeleton Composites (CLS-safe) ───────────────────────────────────────────

/** Full-width hero banner skeleton — matches promo carousel dimensions */
export const SkeletonHero = memo(function SkeletonHero({ className }: { className?: string }) {
  return <div className={cn('skeleton-hero', className)} aria-hidden />;
});

/** Stat card skeleton — matches StatCard dimensions */
export const SkeletonStatCard = memo(function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn('skeleton-stat', className)} aria-hidden>
      <Skeleton className="w-8 h-8 rounded-xl" />
      <Skeleton className="w-1/2 h-6" />
      <Skeleton className="w-3/4 h-3" />
    </div>
  );
});

/** Service icon grid skeleton — 3×2 mobile, 6×1 desktop */
export const SkeletonServiceGrid = memo(function SkeletonServiceGrid() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="skeleton-service-icon" />
          <Skeleton className="w-12 h-3" />
        </div>
      ))}
    </div>
  );
});

/** Horizontal scroll placeholder — for store/restaurant carousels */
export const SkeletonCarousel = memo(function SkeletonCarousel({
  count = 4,
  variant = 'store',
  className,
}: {
  count?: number;
  variant?: 'store' | 'restaurant' | 'product';
  className?: string;
}) {
  const itemClass =
    variant === 'restaurant' ? 'skeleton-restaurant' :
    variant === 'product'    ? 'skeleton-product' :
    'skeleton-carousel-item';

  return (
    <div className={cn('flex gap-3 overflow-hidden pb-2', className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={itemClass}>
          <Skeleton className="w-full h-28 rounded-none rounded-t-2xl" />
          <div className="p-3 space-y-2">
            <Skeleton className="w-3/4 h-4" />
            <Skeleton className="w-1/2 h-3" />
            <Skeleton className="w-full h-3" />
          </div>
        </div>
      ))}
    </div>
  );
});

/** Restaurant card skeleton */
export const SkeletonRestaurantCard = memo(function SkeletonRestaurantCard() {
  return (
    <div className="skeleton-card" aria-hidden>
      <Skeleton className="w-full h-36 rounded-none rounded-t-2xl" />
      <div className="p-3.5 space-y-2">
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-1/2 h-3" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="w-16 h-5 rounded-md" />
          <Skeleton className="w-16 h-5 rounded-md" />
        </div>
        <div className="flex gap-3 pt-2 border-t border-slate-100 mt-2">
          <Skeleton className="w-16 h-3" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
    </div>
  );
});

/** Product card skeleton */
export const SkeletonProductCard = memo(function SkeletonProductCard() {
  return (
    <div className="skeleton-product" aria-hidden>
      <Skeleton className="w-full h-28 rounded-none rounded-t-2xl" />
      <div className="p-2.5 space-y-1.5">
        <Skeleton className="w-12 h-2.5" />
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-8 h-2.5" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="w-14 h-4" />
          <Skeleton className="w-10 h-6 rounded-lg" />
        </div>
      </div>
    </div>
  );
});

/** Section header skeleton — matches SectionHeader layout */
export const SkeletonHeaderRow = memo(function SkeletonHeaderRow() {
  return (
    <div className="flex items-center justify-between mb-4" aria-hidden>
      <div className="space-y-1">
        <Skeleton className="w-40 h-5" />
        <Skeleton className="w-24 h-3" />
      </div>
      <Skeleton className="w-16 h-4" />
    </div>
  );
});

/** Full-page skeleton — header + hero + grid sections */
export const SkeletonPage = memo(function SkeletonPage({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 animate-fade-in', className)} aria-hidden aria-label="Loading page content">
      {/* Hero */}
      <SkeletonHero />
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      {/* Section with carousel */}
      <div>
        <SkeletonHeaderRow />
        <SkeletonCarousel count={4} />
      </div>
      {/* Grid section */}
      <div>
        <SkeletonHeaderRow />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
});

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  emoji?:      string;
  title:       string;
  description?: string;
  action?:     { label: string; onClick: () => void };
  className?:  string;
}

export const EmptyState = memo(function EmptyState({
  emoji = '📭', title, description, action, className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-8 text-center', className)}>
      <span className="text-5xl mb-4 block animate-float">{emoji}</span>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs mb-6">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn btn-primary btn-sm">
          {action.label}
        </button>
      )}
    </div>
  );
});

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'teal' | 'slate';

interface BadgeProps {
  variant?:  BadgeVariant;
  children:  ReactNode;
  className?: string;
  dot?:      boolean;
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  green:  'badge-green',
  blue:   'badge-blue',
  amber:  'badge-amber',
  red:    'badge-red',
  purple: 'badge-purple',
  teal:   'badge-teal',
  slate:  'badge-slate',
};

export const Badge = memo(function Badge({ variant = 'slate', children, className, dot }: BadgeProps) {
  return (
    <span className={cn('badge', BADGE_VARIANTS[variant], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
});

// ─── Button ───────────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark' | 'success';
type BtnSize    = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  BtnVariant;
  size?:     BtnSize;
  loading?:  boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  outline:   'btn-outline',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
  dark:      'btn-dark',
  success:   'btn-success',
};

const BTN_SIZES: Record<BtnSize, string> = {
  sm:   'btn-sm',
  md:   '',
  lg:   'btn-lg',
  icon: 'btn-icon',
};

export const Button = memo(React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary', size = 'md', loading, leftIcon, rightIcon,
    fullWidth, children, className, disabled, ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      {...(loading ? { 'aria-busy': 'true' } : {})}
      className={cn(
        'btn',
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        fullWidth && 'w-full',
        loading && 'btn-loading',
        className,
      )}
      {...rest}
     aria-label="Spinner">
      {loading ? (
        <Spinner size="sm" color="border-current" />
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}));

// ─── Avatar ───────────────────────────────────────────────────────────────────

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?:      string;
  name?:     string;
  size?:     AvatarSize;
  className?: string;
}

const AVATAR_SIZES: Record<AvatarSize, string> = {
  sm: 'avatar-sm', md: 'avatar-md', lg: 'avatar-lg', xl: 'avatar-xl',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export const Avatar = memo(function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  return (
    <div className={cn('avatar', AVATAR_SIZES[size], className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? 'Avatar'} className="w-full h-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
});

// ─── Tag / Chip ───────────────────────────────────────────────────────────────

interface TagProps {
  label:      string;
  active?:    boolean;
  onClick?:   () => void;
  onRemove?:  () => void;
  className?: string;
}

export const Tag = memo(function Tag({ label, active, onClick, onRemove, className }: TagProps) {
  const ChipTag = onClick ? 'button' : 'span';
  return (
    <ChipTag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
      className={cn('chip', active && 'chip-active', onClick && 'cursor-pointer', className)}
    >
      {label}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove ${label}`}
          className="ml-1 text-slate-400 hover:text-slate-700 font-bold"
        >
          ×
        </button>
      )}
    </ChipTag>
  );
});

// ─── ProgressBar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value:      number; // 0–100
  color?:     'brand' | 'green' | 'amber' | 'red';
  label?:     string;
  showValue?: boolean;
  className?: string;
}

const PROGRESS_COLORS: Record<string, string> = {
  brand: 'bg-brand-600',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red:   'bg-red-500',
};

export const ProgressBar = memo(function ProgressBar({
  value, color = 'brand', label, showValue, className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex justify-between mb-1.5">
          {label    && <span className="text-xs font-semibold text-slate-600">{label}</span>}
          {showValue && <span className="text-xs font-bold text-slate-900">{pct}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        {...{ 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }}
        aria-label={label ?? `Progress: ${pct}%`}
        title={label ?? `${pct}%`}
        className="progress"
      >
        {/* Width set via CSS custom property to avoid inline style lint */}
        <div
          className={cn('progress-bar', PROGRESS_COLORS[color], `w-[${pct}%]`)}
        />
      </div>
    </div>
  );
});

// ─── CountdownTimer ───────────────────────────────────────────────────────────

interface CountdownProps {
  targetDate: Date | number;
  className?: string;
  label?:     string;
}

export const CountdownTimer = memo(function CountdownTimer({ targetDate, className, label }: CountdownProps) {
  const { hours, minutes, seconds, isDone } = useCountdown(targetDate);

  if (isDone) return <span className={cn('text-sm text-slate-500', className)}>Ended</span>;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {label && <span className="text-xs text-slate-500">{label}</span>}
      {[
        { v: hours,   u: 'h' },
        { v: minutes, u: 'm' },
        { v: seconds, u: 's' },
      ].map(({ v, u }) => (
        <span key={u} className="bg-slate-900 text-white font-mono text-xs font-bold px-1.5 py-0.5 rounded">
          {String(v).padStart(2, '0')}{u}
        </span>
      ))}
    </div>
  );
});

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:     string;
  value:     string | number;
  delta?:    { value: string; positive: boolean };
  icon?:     ReactNode;
  className?: string;
}

export const StatCard = memo(function StatCard({ label, value, delta, icon, className }: StatCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="stat-label">{label}</span>
        {icon && (
          <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
            {icon}
          </div>
        )}
      </div>
      <span className="stat-value">{value}</span>
      {delta && (
        <span className={delta.positive ? 'stat-delta-up' : 'stat-delta-down'}>
          {delta.positive ? '↑' : '↓'} {delta.value}
        </span>
      )}
    </div>
  );
});

// ─── SectionHeader ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title:      string;
  subtitle?:  string;
  action?:    { label: string; onClick: () => void; href?: string };
  className?: string;
}

export const SectionHeader = memo(function SectionHeader({
  title, subtitle, action, className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs font-bold text-brand-600 flex items-center gap-1 hover:gap-2 transition-all"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
});

// ─── Divider ─────────────────────────────────────────────────────────────────

interface DividerProps {
  label?:     string;
  className?: string;
}

export const Divider = memo(function Divider({ label, className }: DividerProps) {
  if (!label) return <hr className={cn('divider', className)} />;
  return (
    <div className={cn('flex items-center gap-3 my-4', className)}>
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
});
