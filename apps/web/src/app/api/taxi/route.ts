import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config/api-base';

/**
 * Next.js BFF Proxy — Taxi / Ride Hailing Module
 * Forwards to the NestJS API Gateway's /taxi endpoints.
 * GET  /api/taxi?type=estimate|rides|drivers&...
 * POST /api/taxi?type=book|cancel&...
 */
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const GATEWAY = API_BASE_URL;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'estimate';

  try {
    const res = await fetch(`${GATEWAY}/taxi/${type}?${searchParams.toString()}`, {
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
    // Dev fallback when NestJS gateway is not running
    return NextResponse.json({
      success: true,
      _source: 'fallback',
      data: {
        vehicles: [
          { type: 'economy',   label: 'Economy',   eta: '3 min', priceKm: 1.2, baseFare: 3.0 },
          { type: 'comfort',   label: 'Comfort',   eta: '5 min', priceKm: 1.8, baseFare: 4.5 },
          { type: 'xl',        label: 'XL / SUV',  eta: '7 min', priceKm: 2.5, baseFare: 6.0 },
          { type: 'premium',   label: 'Premium',   eta: '8 min', priceKm: 3.5, baseFare: 9.0 },
        ],
      },
    });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'book';

  try {
    const body = await request.json();
    const res = await fetch(`${GATEWAY}/taxi/${type}`, {
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
    return NextResponse.json(
      { success: false, message: 'Gateway unreachable' },
      { status: 503 },
    );
  }
}
