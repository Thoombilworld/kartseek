// Restaurant domain type definitions

export interface Restaurant {
  id: string;
  slug: string; // URL friendly identifier
  name: string;
  imageUrl: string;
  rating: number;
  address: string;
  cuisine: string[];
  serviceModes: ServiceMode[]; // delivery, takeaway, dinein, booking
}

export type ServiceMode = 'delivery' | 'takeaway' | 'dinein' | 'booking';

export interface MenuCategory {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  offerPrice?: number;
  veg: boolean;
  spicy?: boolean;
  prepTime: number; // minutes
  imageUrl: string;
  available: boolean;
}

export interface CartItem {
  restaurantId: string;
  itemId: string;
  quantity: number;
  price: number; // price per unit (offerPrice if present)
}

export interface Order {
  id: string;
  restaurantId: string;
  items: CartItem[];
  totalAmount: number;
  serviceMode: ServiceMode;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  createdAt: string;
  // mode‑specific fields
  deliveryAddress?: string;
  pickupTime?: string;
  tableId?: string;
}

export interface Booking {
  id: string;
  restaurantId: string;
  date: string; // ISO date
  timeSlot: string; // e.g., "19:00-20:30"
  guests: number;
  tableType?: string;
  customerName: string;
  mobile: string;
  specialRequest?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

// Helper API response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
