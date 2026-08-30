'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Store, Package, Tag, Percent, Users,
  Megaphone, Image, Star, ShoppingCart, RotateCcw, CreditCard, Wallet,
  BarChart3, ScrollText, CheckSquare, Layers, Globe, Zap, Crown,
  Bell, Settings, Target, Activity, MessageSquare,
  AlertTriangle, Search as SearchIcon, LayoutTemplate, MapPin,
  Landmark, ArrowLeftRight, Boxes, Truck, Scale, Ticket, UserCog,
  ShoppingBasket, Send, FileText, Gift, ShieldAlert, Users2,
  HeartPulse, Plug, Languages,
} from 'lucide-react';
import { MarketplaceProvider } from '@/lib/contexts/marketplace-context';
import { useRegion, REGIONS } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';

const NAV_ITEMS = [
  { href: '/admin/marketplace', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/marketplace/india-ops', label: '🇮🇳 India Ops', icon: MapPin, highlight: true },
  { href: '/admin/marketplace/page-builder', label: 'Page Builder', icon: LayoutTemplate },
  { href: '/admin/marketplace/flash-deals', label: 'Flash Deals', icon: Zap },

  // People
  { href: '/admin/marketplace/sellers', label: 'Sellers', icon: Store },
  { href: '/admin/marketplace/seller-approvals', label: 'Approvals', icon: CheckSquare },
  { href: '/admin/marketplace/seller-health', label: 'Health', icon: Activity },
  { href: '/admin/marketplace/customers', label: 'Customers', icon: Users },
  { href: '/admin/marketplace/customer-segments', label: 'Segments', icon: Users2 },
  { href: '/admin/marketplace/admin-users', label: 'Admin Users', icon: UserCog },
  // Catalog
  { href: '/admin/marketplace/products', label: 'Products', icon: Package },
  { href: '/admin/marketplace/product-approvals', label: 'Product Review', icon: CheckSquare },
  // Its own queue, necessarily: an offer on an existing product creates no
  // `products` row and so never appears under Product Review.
  { href: '/admin/marketplace/listing-approvals', label: 'Offer Review', icon: Tag },
  { href: '/admin/marketplace/listing-quality', label: 'Quality', icon: BarChart3 },
  { href: '/admin/marketplace/categories', label: 'Categories', icon: Layers },
  { href: '/admin/marketplace/subcategories', label: 'Subcategories', icon: Tag },
  { href: '/admin/marketplace/attributes', label: 'Attributes', icon: Tag },
  { href: '/admin/marketplace/hsn-tax-master', label: 'HSN / Tax', icon: Percent },
  { href: '/admin/marketplace/ip-violations', label: 'IP Violations', icon: ShieldAlert },
  // Brands & Marketing
  { href: '/admin/marketplace/brand-center', label: 'Brand Center', icon: Crown },
  { href: '/admin/marketplace/brands', label: 'Brands', icon: Star },
  { href: '/admin/marketplace/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/admin/marketplace/bank-offers', label: 'Bank Offers', icon: Landmark },
  { href: '/admin/marketplace/exchange-offers', label: 'Exchange Offers', icon: ArrowLeftRight },
  { href: '/admin/marketplace/promotions', label: 'Promos', icon: Tag },
  { href: '/admin/marketplace/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/marketplace/gift-cards', label: 'Gift Cards', icon: Gift },
  { href: '/admin/marketplace/sponsored-products', label: 'Sponsored', icon: Target },
  { href: '/admin/marketplace/banners', label: 'Banners', icon: Image },
  { href: '/admin/marketplace/featured-products', label: 'Featured', icon: Zap },
  // Orders & Finance
  { href: '/admin/marketplace/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/marketplace/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/marketplace/returns', label: 'Returns', icon: RotateCcw },
  { href: '/admin/marketplace/refunds', label: 'Refunds', icon: CreditCard },
  { href: '/admin/marketplace/commissions', label: 'Commissions', icon: Percent },
  { href: '/admin/marketplace/seller-wallets', label: 'Wallets', icon: Wallet },
  { href: '/admin/marketplace/payouts', label: 'Payouts', icon: Wallet },
  { href: '/admin/marketplace/gst-invoicing', label: 'GST Invoices', icon: FileText },
  { href: '/admin/marketplace/abandoned-carts', label: 'Abandoned', icon: ShoppingBasket },
  // Operations
  { href: '/admin/marketplace/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/marketplace/logistics', label: 'Logistics', icon: Truck },
  { href: '/admin/marketplace/delivery-partners', label: 'Delivery Partners', icon: Users },
  { href: '/admin/marketplace/delivery-zones', label: 'Delivery Zones', icon: MapPin },
  { href: '/admin/marketplace/shipping-rates', label: 'Shipping Rates', icon: Truck },
  { href: '/admin/marketplace/return-policies', label: 'Return Policies', icon: RotateCcw },
  { href: '/admin/marketplace/disputes', label: 'Disputes', icon: Scale },
  // Content & Reviews
  { href: '/admin/marketplace/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/marketplace/qa-moderation', label: 'Q&A', icon: MessageSquare },
  { href: '/admin/marketplace/complaints', label: 'Complaints', icon: AlertTriangle },
  { href: '/admin/marketplace/messaging', label: 'Messaging', icon: Send },
  // Analytics & Infrastructure
  { href: '/admin/marketplace/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/marketplace/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/admin/marketplace/system-health', label: 'System Health', icon: HeartPulse },
  // Config
  { href: '/admin/marketplace/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/marketplace/integrations', label: 'Integrations', icon: Plug },
  { href: '/admin/marketplace/translations', label: 'Translations', icon: Languages },
  { href: '/admin/marketplace/seo-settings', label: 'SEO', icon: SearchIcon },
  { href: '/admin/marketplace/settings', label: 'Settings', icon: Settings },
  { href: '/admin/marketplace/compliance/countries', label: 'Compliance', icon: Globe },
];

import { AdminGuard } from '@/components/guards/admin-guard';

export default function AdminMarketplaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { selectedRegion } = useRegion();
  const isFiltered = selectedRegion !== 'ALL';
  const regionConfig = isFiltered ? REGIONS[selectedRegion] : null;

  // Filter nav items — hide India Ops when non-India region is selected
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.href === '/admin/marketplace/india-ops') {
      return selectedRegion === 'ALL' || selectedRegion === 'IN';
    }
    return true;
  });

  return (
    <AdminGuard>
      <div className="flex flex-col">
        {/* Sub-Navigation — Pharmacy-style horizontal tabs */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4">
            <nav
              className="flex gap-0.5 overflow-x-auto py-1 scrollbar-thin"
            >
              {visibleNavItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href
                  || (item.href !== '/admin/marketplace' && pathname.startsWith(item.href + '/'));
                const isHighlight = (item as { highlight?: boolean }).highlight;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                      isActive
                        ? isHighlight ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' : 'bg-blue-50 text-blue-700'
                        : isHighlight ? 'text-orange-600 hover:bg-orange-50 hover:text-orange-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}

            </nav>
          </div>
        </div>

        {/* Region Indicator Bar */}
        {isFiltered && regionConfig && (
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-200/60">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
              <CountryFlag code={selectedRegion} size="md" />
              <span className="text-xs font-bold text-blue-800">
                Marketplace filtered to {regionConfig.name}
              </span>
              <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-bold">
                {regionConfig.currencyCode}
              </span>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto w-full px-4 py-6">
          <MarketplaceProvider>
            {children}
          </MarketplaceProvider>
        </div>
      </div>
    </AdminGuard>
  );
}
