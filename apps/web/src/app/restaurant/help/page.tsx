'use client';

const faqs = [
  { q: 'How do I track my food order?', a: 'Go to Orders > Active Orders and click your order to see real-time tracking.' },
  { q: 'Can I cancel my order?', a: 'You can cancel within 60 seconds. After the restaurant starts preparing, cancellation may incur charges.' },
  { q: 'How does table booking work?', a: 'Select a restaurant, click "Book Table", choose date/time/guests. You\'ll receive confirmation with a QR code.' },
  { q: 'What is Dine-In ordering?', a: 'Scan the QR code at your table to browse the menu and order directly. Pay online when done.' },
  { q: 'How do I apply a coupon?', a: 'During checkout, click "Apply Coupon" and enter your code.' },
];

export default function RestaurantHelpPage() {
  return (
    <div className="max-w-[700px] mx-auto p-6">
      <h1 className="text-2xl font-black mb-5">❓ Help & Support</h1>
      <div className="flex gap-2.5 mb-6">
        {[{ icon: '💬', label: 'Live Chat', color: '#2563EB' }, { icon: '📞', label: 'Call Us', color: '#16a34a' }, { icon: '📧', label: 'Email', color: '#7c3aed' }].map((a, i) => (
          <button key={i} className="flex-1 p-4 bg-white rounded-[14px] border border-gray-100 cursor-pointer text-center">
            <div className="text-3xl">{a.icon}</div>
            <strong className="text-xs">{a.label}</strong>
          </button>
        ))}
      </div>
      <h3 className="font-extrabold mb-3">Frequently Asked Questions</h3>
      {faqs.map((f, i) => (
        <details key={i} className="bg-white rounded-[14px] border border-gray-100 mb-2 px-4 py-3.5">
          <summary className="font-bold cursor-pointer text-sm">{f.q}</summary>
          <p className="text-gray-500 text-[13px] leading-relaxed mt-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
