import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config/api-base';

/**
 * Next.js BFF Proxy — Loyalty & Rewards Module
 * Forwards to the NestJS API Gateway's /loyalty endpoints.
 * GET  /api/loyalty?type=points|history|tiers&...
 * POST /api/loyalty?type=redeem&...
 */
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const GATEWAY = API_BASE_URL;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'points';

  try {
    const res = await fetch(`${GATEWAY}/loyalty/${type}?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') ?? '',
        'X-Request-Source': 'web-bff',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Gateway error: ${res.status}`, data: null },
        { status: res.status },
      );
    }

    return NextResponse.json(await res.json());
  } catch {
    // Dev fallback — keeps UI operational without a running gateway
    return NextResponse.json({
      success: true,
      _source: 'fallback',
      data: {
        points: 0,
        tier: 'Bronze',
        nextTier: 'Silver',
        pointsToNextTier: 500,
        history: [],
      },
    });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'redeem';

  try {
    const body = await request.json();
    const res = await fetch(`${GATEWAY}/loyalty/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') ?? '',
        'X-Request-Source': 'web-bff',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Gateway error: ${res.status}` },
        { status: res.status },
      );
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ success: false, message: 'Gateway unreachable' }, { status: 503 });
  }
}
