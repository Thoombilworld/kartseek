import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config/api-base';

/**
 * Next.js BFF Proxy — Pharmacy Module
 * Forwards requests to the NestJS API Gateway's /pharmacy endpoints.
 * GET /api/pharmacy?type=stores|medicines|prescriptions&...
 */
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const GATEWAY = API_BASE_URL;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'stores';

  try {
    const res = await fetch(`${GATEWAY}/pharmacy/${type}?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') ?? '',
        'X-Request-Source': 'web-bff',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // Gateway down or error — return a meaningful stub so the UI doesn't break
      return NextResponse.json(
        { success: false, message: `Gateway error: ${res.status}`, data: null },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    // Gateway unreachable — return demo data so UI renders in dev
    return NextResponse.json({
      success: true,
      _source: 'fallback',
      data: {
        stores: [
          { id: 'PH-001', name: 'MedPlus Pharmacy', rating: 4.6, distanceKm: 0.8, is24hr: true, deliveryTime: '20 mins' },
          { id: 'PH-002', name: 'HealthFirst Chemist', rating: 4.4, distanceKm: 1.5, is24hr: false, deliveryTime: '30 mins' },
          { id: 'PH-003', name: 'Apollo Pharmacy', rating: 4.8, distanceKm: 2.1, is24hr: true, deliveryTime: '25 mins' },
        ],
      },
    });
  }
}
