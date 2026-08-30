'use client';

import React, { useState, useCallback } from 'react';
import { MapPin, Plus, Edit2, Trash2, Home, Briefcase, Star, Check, X } from 'lucide-react';
import { usePincodeSearchLog } from '@/lib/contexts/pincode-search-log';

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface Address {
  id: string;
  label: string;
  type: 'home' | 'work' | 'other';
  fullAddress: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

type AddressFormData = Omit<Address, 'id' | 'isDefault'>;

const EMPTY_FORM: AddressFormData = {
  label: '',
  type: 'home',
  fullAddress: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
};

/* ── Mock Data ──────────────────────────────────────────────────────────────── */
const MOCK_ADDRESSES: Address[] = [
  {
    id: '1',
    label: 'Home',
    type: 'home',
    fullAddress: 'Apt 4B, Signature Towers, Main Road, Sector 14',
    city: 'Gurgaon',
    state: 'Haryana',
    pincode: '122001',
    phone: '+91 98765 43210',
    isDefault: true,
  },
  {
    id: '2',
    label: 'Office',
    type: 'work',
    fullAddress: '5th Floor, WeWork Galaxy, Residency Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560025',
    phone: '+91 98765 43210',
    isDefault: false,
  },
  {
    id: '3',
    label: "Mom's House",
    type: 'other',
    fullAddress: '12-A, Lakeview Apartments, Carter Road, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    phone: '+91 91234 56789',
    isDefault: false,
  },
];

/* ── Helpers ────────────────────────────────────────────────────────────────── */
const typeIcon = (type: Address['type']) => {
  switch (type) {
    case 'home':  return <Home className="w-5 h-5" />;
    case 'work':  return <Briefcase className="w-5 h-5" />;
    default:      return <Star className="w-5 h-5" />;
  }
};

const typeColor = (type: Address['type']) => {
  switch (type) {
    case 'home':  return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'work':  return 'bg-amber-50 text-amber-600 border-amber-100';
    default:      return 'bg-purple-50 text-purple-600 border-purple-100';
  }
};

let nextId = 4;

/* ── Address Form Modal ─────────────────────────────────────────────────────── */
function AddressFormModal({
  initial,
  onSave,
  onClose,
  isEditing,
}: {
  initial: AddressFormData;
  onSave: (data: AddressFormData) => void;
  onClose: () => void;
  isEditing: boolean;
}) {
  const [form, setForm] = useState<AddressFormData>(initial);

  const update = (field: keyof AddressFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.fullAddress || !form.city || !form.state || !form.pincode || !form.phone) return;
    onSave(form);
  };

  const typeOptions: { value: Address['type']; label: string; icon: React.ReactNode }[] = [
    { value: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { value: 'work', label: 'Work', icon: <Briefcase className="w-4 h-4" /> },
    { value: 'other', label: 'Other', icon: <Star className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">
            {isEditing ? 'Edit Address' : 'Add New Address'}
          </h3>
          <button
            onClick={onClose}
            title="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Address Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Address Type
            </label>
            <div className="flex gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('type', opt.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.type === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div>
            <label htmlFor="addr-label" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Label / Name
            </label>
            <input
              id="addr-label"
              type="text"
              value={form.label}
              onChange={(e) => update('label', e.target.value)}
              placeholder="e.g. Home, Office, Mom's House"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
              required
            />
          </div>

          {/* Full Address */}
          <div>
            <label htmlFor="addr-full" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Full Address
            </label>
            <textarea
              id="addr-full"
              value={form.fullAddress}
              onChange={(e) => update('fullAddress', e.target.value)}
              placeholder="House/Flat No., Building, Street, Area"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all resize-none"
              required
            />
          </div>

          {/* City + State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="addr-city" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                City
              </label>
              <input
                id="addr-city"
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="City"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                required
              />
            </div>
            <div>
              <label htmlFor="addr-state" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                State
              </label>
              <input
                id="addr-state"
                type="text"
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
                placeholder="State"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                required
              />
            </div>
          </div>

          {/* Pincode + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="addr-pincode" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Pincode
              </label>
              <input
                id="addr-pincode"
                type="text"
                value={form.pincode}
                onChange={(e) => update('pincode', e.target.value)}
                placeholder="e.g. 110001"
                maxLength={6}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                required
              />
            </div>
            <div>
              <label htmlFor="addr-phone" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                id="addr-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
            >
              {isEditing ? 'Save Changes' : 'Add Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Page Component ─────────────────────────────────────────────────────────── */
export default function ProfileAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  const { logPincodeSearch } = usePincodeSearchLog();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSetDefault = useCallback((id: string) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (id: string) => {
    setEditingId(id);
    setShowModal(true);
  };

  const handleSave = (data: AddressFormData) => {
    if (editingId) {
      // Edit existing
      setAddresses((prev) =>
        prev.map((a) => (a.id === editingId ? { ...a, ...data } : a)),
      );
    } else {
      // Add new
      const newAddr: Address = {
        ...data,
        id: String(nextId++),
        isDefault: addresses.length === 0,
      };
      setAddresses((prev) => [...prev, newAddr]);
    }
    // Log the pincode
    if (data.pincode && data.pincode.length >= 5) {
      try { logPincodeSearch({ pincode: data.pincode, source: 'address_form', serviceable: true, city: data.city, state: data.state, regionCode: 'IN', module: 'account' }); } catch {}
    }
    setShowModal(false);
    setEditingId(null);
  };

  const editingAddress = editingId ? addresses.find((a) => a.id === editingId) : null;
  const formInitial: AddressFormData = editingAddress
    ? { label: editingAddress.label, type: editingAddress.type, fullAddress: editingAddress.fullAddress, city: editingAddress.city, state: editingAddress.state, pincode: editingAddress.pincode, phone: editingAddress.phone }
    : EMPTY_FORM;

  return (
    <div className="space-y-6">
      {/* Modal */}
      {showModal && (
        <AddressFormModal
          initial={formInitial}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingId(null); }}
          isEditing={!!editingId}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Saved Addresses</h2>
          <p className="text-sm text-slate-500">
            Manage your delivery addresses for faster checkout.
          </p>
        </div>
        <button
          id="add-address-btn"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2.5 rounded-xl shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add New Address
        </button>
      </div>

      {/* Address Grid */}
      {addresses.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No saved addresses yet.</p>
          <p className="text-sm text-slate-400 mt-1">
            Add an address to get started with faster deliveries.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Your First Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`relative rounded-xl border-2 p-5 transition-all duration-200 ${
                address.isDefault
                  ? 'border-blue-200 bg-blue-50/30 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Default badge */}
              {address.isDefault && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-emerald-200">
                  <Check className="w-3 h-3" /> DEFAULT
                </div>
              )}

              {/* Type & Label */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${typeColor(address.type)}`}>
                  {typeIcon(address.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{address.label}</h3>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                    {address.type}
                  </p>
                </div>
              </div>

              {/* Address Details */}
              <p className="text-sm text-slate-600 leading-relaxed mb-1">{address.fullAddress}</p>
              <p className="text-sm text-slate-600">
                {address.city}, {address.state} — {address.pincode}
              </p>
              <p className="text-xs text-slate-400 mt-2">📞 {address.phone}</p>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 min-h-[44px] rounded-lg transition-colors"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => handleOpenEdit(address.id)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 min-h-[44px] rounded-lg transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 min-h-[44px] rounded-lg transition-colors flex items-center gap-1 ml-auto"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-500">
          Your default address will be pre-selected during checkout across all services — grocery,
          restaurant, pharmacy, and marketplace orders.
        </p>
      </div>
    </div>
  );
}
