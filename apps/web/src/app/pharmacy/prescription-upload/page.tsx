import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata as genMeta } from '@/lib/seo/metadata';

export const metadata: Metadata = genMeta({
  title: 'How to Upload a Prescription on KARTSEEK Pharmacy',
  description: 'Learn how to upload a prescription on KARTSEEK Pharmacy. Upload images, PDFs, or use your phone camera. Get your prescription verified by licensed pharmacists for safe medicine delivery.',
  path: '/pharmacy/prescription-upload',
  keywords: ['prescription upload', 'how to upload prescription', 'pharmacy prescription', 'medicine prescription online'],
});

const STEPS = [
  { num:1, title:'Find Prescription-Required Medicine', desc:'Browse the pharmacy store and look for medicines with the "Rx Required" or "Prescription Required" tag. These medicines cannot be purchased without a valid prescription.', icon:'🔍' },
  { num:2, title:'Click Upload Prescription', desc:'When you try to add an Rx-required medicine, the system will prompt you to upload your prescription. Click the "Upload Prescription" button on the product card or during checkout.', icon:'📤' },
  { num:3, title:'Choose Upload Method', desc:'Select how you want to upload: Image (JPG/PNG), PDF document, or take a photo directly using your phone camera. You can upload multiple files if your prescription has multiple pages.', icon:'📷' },
  { num:4, title:'Add Notes (Optional)', desc:'Add any notes for the pharmacist, such as refill details, doctor instructions, or dosage clarifications. This helps the pharmacist review your prescription faster.', icon:'📝' },
  { num:5, title:'Submit for Verification', desc:'Click "Submit for Verification" to send your prescription to the pharmacy. The pharmacist will review it and verify the medicine names, dosage, and doctor details.', icon:'✅' },
  { num:6, title:'Track Verification Status', desc:'You will receive real-time status updates: Prescription Uploaded → Under Review → Approved or Rejected. If rejected, you can upload a clearer prescription or contact the pharmacy.', icon:'📊' },
];

const STATUSES = [
  { status:'Prescription Required', color:'bg-orange-100 text-orange-700', desc:'The medicine requires a valid prescription before purchase.' },
  { status:'Prescription Uploaded', color:'bg-blue-100 text-blue-700', desc:'Your prescription has been uploaded and is waiting for review.' },
  { status:'Under Review', color:'bg-amber-100 text-amber-700', desc:'A licensed pharmacist is reviewing your prescription.' },
  { status:'Approved', color:'bg-emerald-100 text-emerald-700', desc:'Your prescription is verified. The order will be processed.' },
  { status:'Rejected', color:'bg-red-100 text-red-700', desc:'The prescription was not accepted. You may upload a new one.' },
  { status:'Need More Information', color:'bg-purple-100 text-purple-700', desc:'The pharmacist needs a clearer image or additional details.' },
];

const FAQS = [
  { q:'What file formats are accepted for prescription upload?', a:'We accept JPG, PNG, and PDF files. You can also take a photo directly using your phone camera.' },
  { q:'Can I upload multiple prescription pages?', a:'Yes. You can upload multiple files if your prescription has more than one page or if you have prescriptions from different doctors.' },
  { q:'Who verifies my prescription?', a:'A licensed pharmacist at the pharmacy store verifies your prescription. They check the doctor name, license, medicine names, dosage, and validity date.' },
  { q:'How long does prescription verification take?', a:'Most prescriptions are verified within 15-30 minutes during pharmacy working hours. You will receive a notification when the status changes.' },
  { q:'What happens if my prescription is rejected?', a:'You will see the rejection reason. Common reasons include expired prescription, unclear image, or incorrect medicine name. You can upload a new or clearer prescription.' },
  { q:'Is my prescription data secure?', a:'Yes. Prescription files are encrypted and stored securely. Only authorized pharmacy staff can view your prescription. Files are never made public.' },
  { q:'Can I buy any medicine without a prescription?', a:'OTC (Over-The-Counter) medicines can be purchased without a prescription. Prescription medicines marked with "Rx Required" need a valid prescription as required by law.' },
];

export default function PrescriptionUploadPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How to Upload a Prescription</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">Some medicines require a valid doctor&apos;s prescription. Here&apos;s how to upload and get it verified on KARTSEEK Pharmacy.</p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map(step => (
          <div key={step.num} className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start gap-5 hover:shadow-md transition-all">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-2xl shrink-0 border border-teal-100">{step.icon}</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-teal-600 text-white text-xs font-black px-2 py-0.5 rounded-md">Step {step.num}</span>
                <h2 className="text-lg font-bold text-slate-900">{step.title}</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Verification Statuses */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Verification Status Guide</h2>
        <div className="space-y-3">
          {STATUSES.map(s => (
            <div key={s.status} className="flex items-center gap-3">
              <span className={`${s.color} px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap`}>{s.status}</span>
              <span className="text-sm text-slate-600">{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <details key={i} className="bg-white rounded-xl border border-slate-200 group">
              <summary className="p-4 cursor-pointer font-semibold text-slate-800 text-sm hover:bg-slate-50 transition-colors list-none flex items-center justify-between">{faq.q}<span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span></summary>
              <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{faq.a}</div>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context":"https://schema.org","@type":"FAQPage","mainEntity":FAQS.map(f=>({ "@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}})) }) }} />
      </section>

      {/* Internal Links */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-3">Related Pages</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[{ name:'How It Works', href:'/pharmacy/how-it-works' },{ name:'Pharmacy Homepage', href:'/pharmacy' },{ name:'Compliance Info', href:'/pharmacy/compliance' },{ name:'Nearby Pharmacies', href:'/pharmacy/stores' }].map(l => (
            <Link key={l.href} href={l.href} className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline">{l.name} →</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
