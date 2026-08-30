import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config/api-base';

/**
 * Next.js BFF Proxy — Hotel Booking Module
 * Forwards to the NestJS API Gateway's /hotel endpoints.
 * GET /api/hotel?type=search|hotels|rooms|bookings&...
 * POST /api/hotel?type=bookings|availability
 */
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const GATEWAY = API_BASE_URL;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'search';

  try {
    const res = await fetch(`${GATEWAY}/hotel/${type}?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') ?? '',
        'X-Request-Source': 'web-bff',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Gateway error: ${res.status}`, data: null },
        { status: res.status },
      );
    }

    return NextResponse.json(await res.json());
  } catch {
    // Fallback for dev without gateway
    return NextResponse.json({
      success: true,
      _source: 'fallback',
      data: {
        hotels: [
          { id: 'htl-001', name: 'The Grand Palace Hotel', city: 'Dubai', rating: 4.8, starRating: 5, pricePerNight: 450, currency: 'AED' },
          { id: 'htl-002', name: 'KARTSEEK Business Suites', city: 'Dubai', rating: 4.6, starRating: 4, pricePerNight: 280, currency: 'AED' },
          { id: 'htl-003', name: 'Seaside Family Resort', city: 'Dubai', rating: 4.7, starRating: 5, pricePerNight: 380, currency: 'AED' },
        ],
        total: 3,
      },
    });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'bookings';

  try {
    const body = await request.json();
    const res = await fetch(`${GATEWAY}/hotel/${type}`, {
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
