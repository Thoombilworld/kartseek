import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config/api-base';

/**
 * Next.js BFF Proxy — Doctor / Health Module
 * Forwards requests to the NestJS API Gateway's /doctor endpoints.
 * GET /api/doctor?type=specialties|doctors|hospitals|appointments&...
 */
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const GATEWAY = API_BASE_URL;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'specialties';

  try {
    const res = await fetch(`${GATEWAY}/doctor/${type}?${searchParams.toString()}`, {
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
    // Gateway unreachable — return dev fallback
    return NextResponse.json({
      success: true,
      _source: 'fallback',
      data: {
        specialties: [
          { id: 'sp-1', name: 'General Medicine', icon: '🩺', doctorCount: 120 },
          { id: 'sp-2', name: 'Dermatology', icon: '🧴', doctorCount: 45 },
          { id: 'sp-3', name: 'Cardiology', icon: '🫀', doctorCount: 38 },
          { id: 'sp-4', name: 'Pediatrics', icon: '👶', doctorCount: 67 },
          { id: 'sp-5', name: 'Orthopedics', icon: '🦴', doctorCount: 29 },
        ],
      },
    });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'appointments';

  try {
    const body = await request.json();
    const res = await fetch(`${GATEWAY}/doctor/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') ?? '',
        'X-Request-Source': 'web-bff',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
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
