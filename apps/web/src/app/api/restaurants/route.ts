import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types/restaurant';
import type { Restaurant } from '@/lib/types/restaurant';


// Simple in‑memory seed for demonstration – reads the same restaurant list used in UI.
// In a real app this would query a database.

const restaurants: Restaurant[] = [
  {
    id: 'r1',
    slug: 'delicious-dhaba',
    name: 'Delicious Dhaba',
    imageUrl: '/assets/restaurants/dhabaa.jpg',
    rating: 4.5,
    address: '123 Main St, Mumbai',
    cuisine: ['Indian', 'Asian'],
    serviceModes: ['delivery', 'takeaway', 'dinein', 'booking'],
  },
  {
    id: 'r2',
    slug: 'sushi-sensei',
    name: 'Sushi Sensei',
    imageUrl: '/assets/restaurants/sushi.jpg',
    rating: 4.8,
    address: '45 Ocean Drive, Dubai',
    cuisine: ['Japanese'],
    serviceModes: ['delivery', 'takeaway', 'booking'],
  },
];

export async function GET() {
  const data: ApiResponse<Restaurant[]> = {
    success: true,
    data: restaurants,
  };
  return NextResponse.json(data);
}
