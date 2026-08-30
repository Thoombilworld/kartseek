import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config/api-base';

/**
 * Next.js BFF Proxy — Digital Wallet Module
 * Forwards to the NestJS API Gateway's /wallet endpoints.
 * GET  /api/wallet?type=balance|transactions&userId=...
 * POST /api/wallet?type=topup|transfer&...
 */
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const GATEWAY = API_BASE_URL;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'balance';
  const userId = searchParams.get('userId') ?? 'me';

  try {
    const res = await fetch(`${GATEWAY}/wallet/${userId}/${type}?${searchParams.toString()}`, {
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
    // Dev fallback
    return NextResponse.json({
      success: true,
      _source: 'fallback',
      data: {
        balance: 0,
        currency: 'USD',
        transactions: [],
      },
    });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'topup';

  try {
    const body = await request.json();
    const res = await fetch(`${GATEWAY}/wallet/${type}`, {
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
