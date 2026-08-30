'use client';
import React, { useState } from 'react';
import { Settings, Globe, Shield, Bell, Zap, Save, ToggleLeft, ToggleRight, Lock, Truck, CreditCard, Package, AlertTriangle, CheckCircle, Clock, Eye, Percent, DollarSign, Users } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

type SettingsState = {
  // Approval Rules
  autoApproveNewSellers: boolean; autoApproveProducts: boolean;
  requireBrandApproval: boolean; requireCampaignApproval: boolean;
  // Visibility
  showOutOfStock: boolean; allowReviewsBeforeApproval: boolean;
  enableNewSellerRegistration: boolean; maintenanceMode: boolean;
  // Platform Limits
  maxProductImagesPerListing: number; defaultCommissionRate: number;
  payoutCycleDays: number; maxReturnDays: number;
  minOrderValueForFreeShipping: number; maxDiscountPercentage: number;
  // Platform Fees
  platformFeeType: 'percentage' | 'flat'; platformFeeValue: number;
  paymentGatewayFee: number; logisticsFee: number;
  // Feature Flags
  enableWishlist: boolean; enableReviews: boolean; enableQA: boolean;
  enableCompareProducts: boolean; enableGiftCards: boolean;
  enableCOD: boolean; enableEMI: boolean; enableBuyNowPayLater: boolean;
  enableReferralProgram: boolean; enableLoyaltyPoints: boolean;
  // Notifications
  notifySellerOnOrder: boolean; notifySellerOnReview: boolean;
  notifyAdminOnDispute: boolean; notifyAdminOnHighRefundRate: boolean;
  // Seller Onboarding
  requireGSTIN: boolean; requirePAN: boolean; requireBankVerification: boolean;
  requireAddressProof: boolean; minSellerRatingToSell: number;
};

export default function MarketplaceSettingsPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [activeTab, setActiveTab] = useState('approvals');
  const [hasChanges, setHasChanges] = useState(false);

  const [settings, setSettings] = useState<SettingsState>({
    autoApproveNewSellers: false, autoApproveProducts: false,
    requireBrandApproval: true, requireCampaignApproval: true,
    showOutOfStock: true, allowReviewsBeforeApproval: false,
    enableNewSellerRegistration: true, maintenanceMode: false,
    maxProductImagesPerListing: 10, defaultCommissionRate: 8,
    payoutCycleDays: 14, maxReturnDays: 7,
    minOrderValueForFreeShipping: 499, maxDiscountPercentage: 80,
    platformFeeType: 'percentage', platformFeeValue: 2,
    paymentGatewayFee: 2.5, logisticsFee: 0,
    enableWishlist: true, enableReviews: true, enableQA: true,
    enableCompareProducts: false, enableGiftCards: false,
    enableCOD: true, enableEMI: true, enableBuyNowPayLater: false,
    enableReferralProgram: false, enableLoyaltyPoints: false,
    notifySellerOnOrder: true, notifySellerOnReview: true,
    notifyAdminOnDispute: true, notifyAdminOnHighRefundRate: true,
    requireGSTIN: true, requirePAN: true, requireBankVerification: true,
    requireAddressProof: true, minSellerRatingToSell: 3.0,
  });

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getSettings(), []);
  const { execute } = useAdminAction(showToast);

  const toggle = (key: keyof SettingsState) => { setSettings(s => ({ ...s, [key]: !s[key] })); setHasChanges(true); };
  const setNum = (key: keyof SettingsState, v: number) => { setSettings(s => ({ ...s, [key]: v })); setHasChanges(true); };

  const handleSave = () => { execute(() => adminMarketplaceApi.updateSettings(settings), 'Settings saved successfully', () => { refetch(); setHasChanges(false); }); };

  const ToggleRow = ({ label, desc, settingKey, danger }: { label: string; desc: string; settingKey: keyof SettingsState; danger?: boolean }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div><p className={`text-sm font-bold ${danger ? 'text-red-600' : 'text-slate-900'}`}>{label}</p><p className="text-xs text-slate-400 mt-0.5 max-w-md">{desc}</p></div>
      <button onClick={() => toggle(settingKey)} className="ml-4 shrink-0">{settings[settingKey] ? <ToggleRight className={`w-10 h-10 ${danger ? 'text-red-500' : 'text-emerald-600'}`} /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}</button>
    </div>
  );

  const NumberInput = ({ label, desc, settingKey, suffix, min, max }: { label: string; desc: string; settingKey: keyof SettingsState; suffix?: string; min?: number; max?: number }) => (
    <div className="py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between">
        <div><p className="text-sm font-bold text-slate-900">{label}</p><p className="text-xs text-slate-400 mt-0.5">{desc}</p></div>
        <div className="flex items-center gap-1 ml-4"><input type="number" value={settings[settingKey] as number} min={min} max={max} onChange={e => setNum(settingKey, Number(e.target.value))} className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-right outline-none focus:ring-2 focus:ring-blue-200" />{suffix && <span className="text-xs text-slate-400 font-bold">{suffix}</span>}</div>
      </div>
    </div>
  );

  const TABS = [
    { id: 'approvals', label: 'Approvals', icon: Shield },
    { id: 'visibility', label: 'Visibility', icon: Globe },
    { id: 'fees', label: 'Fees & Limits', icon: DollarSign },
    { id: 'features', label: 'Features', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'onboarding', label: 'Onboarding', icon: Users },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Marketplace Settings</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Global configuration — approvals, fees, features, notifications</p></div>
        <button onClick={handleSave} disabled={!hasChanges} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${hasChanges ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}><Save className="w-4 h-4" /> Save Changes</button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span><strong>Admin Only:</strong> These settings control the entire marketplace. Changes take effect immediately and are logged in the Audit Trail.</span></div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">{TABS.map(t => (<button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><t.icon className="w-3.5 h-3.5" />{t.label}</button>))}</div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {activeTab === 'approvals' && <>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /><h3 className="font-bold text-slate-900">Approval Rules</h3></div>
            <div className="px-5">
              <ToggleRow label="Auto-Approve New Sellers" desc="Skip manual KYC review for new seller applications (not recommended for regulated markets)" settingKey="autoApproveNewSellers" />
              <ToggleRow label="Auto-Approve Products" desc="Skip product listing review — products go live immediately" settingKey="autoApproveProducts" />
              <ToggleRow label="Require Brand Approval" desc="New brand listings must be verified before sellers can use them" settingKey="requireBrandApproval" />
              <ToggleRow label="Require Campaign Approval" desc="Seller marketing campaigns must be approved before going live" settingKey="requireCampaignApproval" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><Lock className="w-4 h-4 text-red-500" /><h3 className="font-bold text-slate-900">Danger Zone</h3></div>
            <div className="px-5">
              <ToggleRow label="Maintenance Mode" desc="Take the entire marketplace offline for all customers. Active orders continue to process." settingKey="maintenanceMode" danger />
              <ToggleRow label="Pause New Registrations" desc="Temporarily stop new seller registrations" settingKey="enableNewSellerRegistration" />
            </div>
          </div>
        </>}

        {activeTab === 'visibility' && <>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-500" /><h3 className="font-bold text-slate-900">Customer Visibility</h3></div>
            <div className="px-5">
              <ToggleRow label="Show Out-of-Stock Products" desc="Display products with zero stock, showing 'Out of Stock' badge" settingKey="showOutOfStock" />
              <ToggleRow label="Allow Reviews Before Approval" desc="Show customer reviews before admin moderation" settingKey="allowReviewsBeforeApproval" />
            </div>
          </div>
        </>}

        {activeTab === 'fees' && <>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /><h3 className="font-bold text-slate-900">Platform Fees</h3></div>
            <div className="px-5">
              <div className="py-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2"><p className="text-sm font-bold text-slate-900">Platform Fee Type</p>
                  <div className="flex gap-2">{(['percentage', 'flat'] as const).map(t => (<button key={t} onClick={() => { setSettings(s => ({ ...s, platformFeeType: t })); setHasChanges(true); }} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors capitalize ${settings.platformFeeType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>{t}</button>))}</div>
                </div>
                <p className="text-xs text-slate-400">Applied per transaction on every order</p>
              </div>
              <NumberInput label="Platform Fee Value" desc={settings.platformFeeType === 'percentage' ? 'Percentage deducted from each transaction' : 'Fixed amount deducted per order'} settingKey="platformFeeValue" suffix={settings.platformFeeType === 'percentage' ? '%' : '₹'} min={0} max={100} />
              <NumberInput label="Payment Gateway Fee" desc="Fee charged by payment processor (for reference)" settingKey="paymentGatewayFee" suffix="%" min={0} max={10} />
              <NumberInput label="Logistics Commission" desc="Platform logistics handling fee per order (0 = no charge)" settingKey="logisticsFee" suffix="₹" min={0} />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><Package className="w-4 h-4 text-amber-500" /><h3 className="font-bold text-slate-900">Platform Limits</h3></div>
            <div className="px-5">
              <NumberInput label="Default Commission Rate" desc="Applied when no specific category rule exists" settingKey="defaultCommissionRate" suffix="%" min={0} max={100} />
              <NumberInput label="Payout Cycle" desc="Days after order delivery before payout is released" settingKey="payoutCycleDays" suffix="days" min={1} max={90} />
              <NumberInput label="Max Return Window" desc="Maximum days a customer can request a return" settingKey="maxReturnDays" suffix="days" min={0} max={30} />
              <NumberInput label="Max Product Images" desc="Maximum number of images per product listing" settingKey="maxProductImagesPerListing" min={1} max={20} />
              <NumberInput label="Free Shipping Threshold" desc="Minimum order value for free shipping" settingKey="minOrderValueForFreeShipping" suffix="₹" min={0} />
              <NumberInput label="Max Discount" desc="Maximum allowed discount percentage on any product" settingKey="maxDiscountPercentage" suffix="%" min={0} max={100} />
            </div>
          </div>
        </>}

        {activeTab === 'features' && <>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /><h3 className="font-bold text-slate-900">Shopping Features</h3></div>
            <div className="px-5">
              <ToggleRow label="Wishlist" desc="Allow customers to save products to wishlist" settingKey="enableWishlist" />
              <ToggleRow label="Reviews & Ratings" desc="Enable product reviews and star ratings" settingKey="enableReviews" />
              <ToggleRow label="Questions & Answers" desc="Enable Q&A section on product pages" settingKey="enableQA" />
              <ToggleRow label="Compare Products" desc="Allow customers to compare up to 4 products side-by-side" settingKey="enableCompareProducts" />
              <ToggleRow label="Gift Cards" desc="Enable gift card purchase and redemption" settingKey="enableGiftCards" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-500" /><h3 className="font-bold text-slate-900">Payment & Rewards</h3></div>
            <div className="px-5">
              <ToggleRow label="Cash on Delivery (COD)" desc="Allow customers to pay on delivery" settingKey="enableCOD" />
              <ToggleRow label="EMI Options" desc="Enable no-cost and low-cost EMI on eligible products" settingKey="enableEMI" />
              <ToggleRow label="Buy Now, Pay Later" desc="Enable BNPL payment options via partner providers" settingKey="enableBuyNowPayLater" />
              <ToggleRow label="Referral Program" desc="Reward customers for referring new users" settingKey="enableReferralProgram" />
              <ToggleRow label="Loyalty Points" desc="Earn points on purchases, redeem as discount" settingKey="enableLoyaltyPoints" />
            </div>
          </div>
        </>}

        {activeTab === 'notifications' && <>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden lg:col-span-2">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><Bell className="w-4 h-4 text-purple-500" /><h3 className="font-bold text-slate-900">Notification Preferences</h3></div>
            <div className="px-5 grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <ToggleRow label="Notify Seller on New Order" desc="Send notification when an order is placed" settingKey="notifySellerOnOrder" />
              <ToggleRow label="Notify Seller on New Review" desc="Alert sellers when new reviews are posted" settingKey="notifySellerOnReview" />
              <ToggleRow label="Notify Admin on Dispute" desc="Alert admin team when a dispute is opened" settingKey="notifyAdminOnDispute" />
              <ToggleRow label="Alert on High Refund Rate" desc="Flag sellers with refund rate above 10%" settingKey="notifyAdminOnHighRefundRate" />
            </div>
          </div>
        </>}

        {activeTab === 'onboarding' && <>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /><h3 className="font-bold text-slate-900">Seller Onboarding Requirements</h3></div>
            <div className="px-5">
              <ToggleRow label="Require GSTIN" desc="Mandatory GST registration number for Indian sellers" settingKey="requireGSTIN" />
              <ToggleRow label="Require PAN" desc="Mandatory PAN card for tax verification" settingKey="requirePAN" />
              <ToggleRow label="Bank Verification" desc="Verify bank account via penny drop before first payout" settingKey="requireBankVerification" />
              <ToggleRow label="Address Proof" desc="Require business address proof document" settingKey="requireAddressProof" />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><Shield className="w-4 h-4 text-amber-500" /><h3 className="font-bold text-slate-900">Quality Gates</h3></div>
            <div className="px-5">
              <NumberInput label="Min Seller Rating to Sell" desc="Sellers below this rating are suspended from new listings" settingKey="minSellerRatingToSell" suffix="★" min={1} max={5} />
            </div>
          </div>
        </>}
      </div>

      {/* Floating save bar */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-bounce-in">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold">You have unsaved changes</span>
          <button onClick={() => setHasChanges(false)} className="text-xs text-slate-400 hover:text-white">Discard</button>
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save</button>
        </div>
      )}

      <AdminToast toast={toast} />
    </div>
  );
}
