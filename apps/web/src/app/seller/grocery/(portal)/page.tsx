import { redirect } from 'next/navigation';
export default function SellerRootRedirect() {
  redirect('/seller/grocery/dashboard');
}