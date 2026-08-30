import { api } from '@/lib/api-endpoints';

// ── Saved Addresses (user-service, Redis-backed) ─────────────────────────────
export async function getUserAddresses(userId: string) {
  return api.get<any>(`/users/${userId}/addresses`);
}

export async function addUserAddress(userId: string, address: any) {
  return api.post<any>(`/users/${userId}/addresses`, address);
}

export async function updateUserAddress(userId: string, addressId: string, address: any) {
  return api.put<any>(`/users/${userId}/addresses/${addressId}`, address);
}

export async function deleteUserAddress(userId: string, addressId: string) {
  return api.delete<any>(`/users/${userId}/addresses/${addressId}`);
}
