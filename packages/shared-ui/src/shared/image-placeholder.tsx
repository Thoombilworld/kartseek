'use client';

/**
 * Animated shimmer placeholder for images while they load.
 * Renders a beautiful gradient animation matching the container's aspect ratio.
 */
export function ImagePlaceholder({
  className = '',
  aspectRatio = 'aspect-square',
}: {
  className?: string;
  aspectRatio?: string;
}) {
  return (
    <div
      className={`${aspectRatio} bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-shimmer bg-[length:200%_100%] rounded-lg ${className}`}
      role="img"
      aria-label="Loading image..."
    />
  );
}

/**
 * Inline shimmer for small image slots (thumbnails, icons).
 */
export function ImagePlaceholderInline({
  size = 'w-10 h-10',
  className = '',
}: {
  size?: string;
  className?: string;
}) {
  return (
    <div
      className={`${size} bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-shimmer bg-[length:200%_100%] rounded-xl ${className}`}
      role="img"
      aria-label="Loading..."
    />
  );
}
