/// KARTSEEK — Dynamic Open Graph Image Generator
/// Generates 1200×630 social sharing images on-the-fly.
///
/// Usage: /api/og?title=iPhone+17+Pro&subtitle=by+Apple&badge=Product&price=QAR+4999&rating=4.8
///
/// Compatible with:
/// - Facebook app browser & Sharing Debugger
/// - WhatsApp link preview
/// - Instagram DM preview
/// - Telegram link preview
/// - X/Twitter card preview
/// - LinkedIn post preview
/// - Google Discover
///
/// NOTE: next/og (Satori) only supports inline style objects.
/// This file uses React.createElement to avoid JSX style-prop linter warnings.

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import React, { type CSSProperties } from 'react';

export const runtime = 'edge';

// ─── Dimensions ─────────────────────────────────────────────────────────────

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// ─── Color Palette by Type ──────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; accent: string; badge: string }> = {
  product:    { bg: '#0f172a', accent: '#6366f1', badge: '#818cf8' },
  restaurant: { bg: '#1a0f0a', accent: '#f97316', badge: '#fb923c' },
  doctor:     { bg: '#0a1628', accent: '#06b6d4', badge: '#22d3ee' },
  pharmacy:   { bg: '#0f1f0f', accent: '#22c55e', badge: '#4ade80' },
  grocery:    { bg: '#1a1a0a', accent: '#eab308', badge: '#facc15' },
  taxi:       { bg: '#1a1a0a', accent: '#f59e0b', badge: '#fbbf24' },
  category:   { bg: '#18181b', accent: '#a855f7', badge: '#c084fc' },
  city:       { bg: '#0c1222', accent: '#3b82f6', badge: '#60a5fa' },
  default:    { bg: '#0f172a', accent: '#6366f1', badge: '#818cf8' },
};

// ─── Element Builder ────────────────────────────────────────────────────────

const h = React.createElement;

function el(tag: string, style: CSSProperties, ...children: React.ReactNode[]) {
  return h(tag, { style }, ...children);
}

// ─── OG Image Builder ───────────────────────────────────────────────────────

function buildOgImage(
  title: string, subtitle: string, badge: string,
  price: string, rating: string, colors: { bg: string; accent: string; badge: string },
) {
  // Background orb styles
  const orbTop: CSSProperties = {
    position: 'absolute', top: '-100px', right: '-100px',
    width: '400px', height: '400px', borderRadius: '50%',
    background: `radial-gradient(circle, ${colors.accent}22 0%, transparent 70%)`,
  };

  const orbBottom: CSSProperties = {
    position: 'absolute', bottom: '-80px', left: '-80px',
    width: '300px', height: '300px', borderRadius: '50%',
    background: `radial-gradient(circle, ${colors.accent}15 0%, transparent 70%)`,
  };

  // Badge chip
  const badgeEl = badge ? el('div', {
    padding: '6px 16px', borderRadius: '8px',
    background: `${colors.badge}20`, border: `1px solid ${colors.badge}40`,
    color: colors.badge, fontSize: '14px', fontWeight: 700,
    letterSpacing: '0.5px', textTransform: 'uppercase',
  }, badge) : null;

  // Rating chip
  const ratingEl = rating ? el('div', {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '6px 14px', borderRadius: '8px',
    background: '#fbbf2420', border: '1px solid #fbbf2440',
    color: '#fbbf24', fontSize: '14px', fontWeight: 700,
  }, `★ ${rating}`) : null;

  // Price
  const priceEl = price ? el('div', {
    fontSize: '32px', fontWeight: 800, marginTop: '8px', color: colors.accent,
  }, price) : null;

  // Logo box
  const logoBox = el('div', {
    width: '40px', height: '40px', borderRadius: '10px',
    background: colors.accent, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '20px', fontWeight: 900, color: '#fff',
  }, 'K');

  // Build the full image
  return el('div', {
    width: `${OG_WIDTH}px`, height: `${OG_HEIGHT}px`,
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    padding: '60px 72px', background: colors.bg,
    fontFamily: 'Inter, system-ui, sans-serif',
    position: 'relative', overflow: 'hidden',
  },
    // Background orbs
    el('div', orbTop),
    el('div', orbBottom),

    // Top row: Badge + Rating
    el('div', { display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 },
      badgeEl, ratingEl,
    ),

    // Middle: Title + Subtitle + Price
    el('div', { display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1 },
      el('div', {
        fontSize: title.length > 40 ? '42px' : '52px',
        fontWeight: 800, color: '#ffffff',
        lineHeight: 1.15, letterSpacing: '-1px', maxWidth: '900px',
      }, title),
      el('div', { fontSize: '22px', color: '#94a3b8', fontWeight: 500, maxWidth: '700px' }, subtitle),
      priceEl,
    ),

    // Bottom: Logo + Domain
    el('div', {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1,
    },
      el('div', { display: 'flex', alignItems: 'center', gap: '12px' },
        logoBox,
        el('div', { fontSize: '20px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '1px' }, 'KARTSEEK'),
      ),
      el('div', { fontSize: '14px', color: '#64748b', fontWeight: 500 }, 'kartseek.com'),
    ),

    // Bottom accent bar
    el('div', {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px',
      background: `linear-gradient(to right, ${colors.accent}, ${colors.badge}, transparent)`,
    }),
  );
}

// ─── GET Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const title = searchParams.get('title') || 'KARTSEEK';
  const subtitle = searchParams.get('subtitle') || 'The Ultimate Super App';
  const badge = searchParams.get('badge') || '';
  const type = searchParams.get('type') || 'default';
  const price = searchParams.get('price') || '';
  const rating = searchParams.get('rating') || '';

  const colors = TYPE_COLORS[type] || TYPE_COLORS.default;

  return new ImageResponse(
    buildOgImage(title, subtitle, badge, price, rating, colors),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
        'Content-Type': 'image/png',
      },
    }
  );
}
