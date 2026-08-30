import { NextResponse } from 'next/server';
import type { ApiResponse, Restaurant } from '@/lib/types/restaurant';
import { restaurants } from '@/lib/demo-data/restaurants';

// Next.js 15: params is now a Promise — must be awaited before use.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const restaurant = restaurants.find((r) => r.slug === slug);
  if (!restaurant) {
    return NextResponse.json(
      { success: false, data: null, message: 'Restaurant not found' },
      { status: 404 },
    );
  }
  const data: ApiResponse<Restaurant> = { success: true, data: restaurant };
  return NextResponse.json(data);
}
