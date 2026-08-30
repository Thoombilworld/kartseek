'use client';
import { useState } from 'react';

const savedAddresses = [
  { label: 'Home', icon: '🏠', line: '45/2, 100 Feet Road, HAL 2nd Stage, Bengaluru 560008', isDefault: true },
  { label: 'Office', icon: '🏢', line: 'WeWork Galaxy, #43, Residency Road, Bengaluru 560025', isDefault: false },
];

export default function RestaurantAddressesPage() {
  const [addresses, setAddresses] = useState(savedAddresses);
  return (
    <div className="max-w-[700px] mx-auto p-6">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-black">📍 Delivery Addresses</h1>
        <button className="bg-[#EA580C] text-white border-none rounded-[10px] px-[18px] py-2.5 font-bold cursor-pointer">+ Add Address</button>
      </div>
      {addresses.map((a, i) => (
        <div key={i} className={`flex items-center gap-3.5 p-4 bg-white rounded-[14px] mb-2.5 ${a.isDefault ? 'border-2 border-[#EA580C]' : 'border border-gray-100'}`}>
          <span className="text-3xl">{a.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <strong>{a.label}</strong>
              {a.isDefault && <span className="text-[9px] font-extrabold text-[#EA580C] bg-[rgba(234,88,12,0.1)] px-1.5 py-0.5 rounded">DEFAULT</span>}
            </div>
            <p className="text-gray-500 text-[13px] mt-0.5">{a.line}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
