'use client';

/**
 * Appointment history.
 *
 * Rendered `MOCK_APPOINTMENTS` — four consultations with named doctors, stock
 * photographs, queue positions and estimated waits, all for a patient called
 * "John Doe" — and computed its header counts from that array. Nothing was
 * requested, so a real booking never showed up and a signed-in patient read
 * somebody else's medical appointments as their own.
 *
 * `GET /doctor/appointments/me` returns the customer's own appointments. The
 * route existed the whole time; the page simply never called it. (doctor-service
 * also could not boot until recently — `Hospital.city` was declared
 * `string | null` with no explicit column type, which TypeORM rejects at
 * metadata build.)
 */

import React from 'react';
import { doctorApi } from '@/lib/api/doctor';
import { OrderHistory, type HistoryRow } from '@/components/orders/order-history';
import { isOpen } from '@/lib/modules/profile-data';

function normalise(appointment: any): HistoryRow {
  const type = String(appointment.type ?? 'in-clinic');
  const isVideo = type === 'video';

  const meta: string[] = [];
  if (appointment.timeSlot) meta.push(String(appointment.timeSlot));
  meta.push(isVideo ? 'Video consultation' : 'In clinic');
  // Token and queue position are the two facts a waiting patient actually needs;
  // they are shown only where the appointment records them.
  if (appointment.tokenNumber) meta.push(`Token ${appointment.tokenNumber}`);
  if (typeof appointment.queuePosition === 'number' && appointment.queuePosition > 0) {
    meta.push(`${appointment.queuePosition} ahead of you`);
  }
  if (typeof appointment.estimatedWaitMinutes === 'number' && appointment.estimatedWaitMinutes > 0) {
    meta.push(`~${appointment.estimatedWaitMinutes} min wait`);
  }
  if (appointment.patientName) meta.push(`For ${appointment.patientName}`);

  const doctorName = appointment.doctor?.name ?? appointment.doctorName ?? 'Consultation';
  const specialty = appointment.doctor?.specialty ?? appointment.specialty;
  const place = appointment.doctor?.hospitalName ?? appointment.doctor?.city;

  return {
    id: String(appointment.id ?? ''),
    reference: appointment.tokenNumber ? `Token ${appointment.tokenNumber}` : String(appointment.id ?? ''),
    title: doctorName,
    subtitle: [specialty, place].filter(Boolean).join(' · ') || 'Appointment',
    meta,
    dateISO: appointment.date ?? appointment.createdAt ?? null,
    // `date` is a date column; the time of day is `timeSlot`, shown in `meta`.
    dateOnly: !!appointment.date,
    status: appointment.status,
    amount: appointment.fee !== undefined && appointment.fee !== null ? Number(appointment.fee) : null,
    currency: null,
    icon: isVideo ? '📹' : '🩺',
    kind: isOpen(appointment.status) ? 'upcoming' : 'past',
    // No detail route exists for a single appointment, so the row is not a link
    // rather than a link to a 404.
    searchText: [doctorName, specialty, place, appointment.patientName, appointment.symptoms]
      .filter(Boolean).join(' '),
  };
}

export default function MyAppointmentsPage() {
  return (
    <OrderHistory
      module="doctor"
      heading="My appointments"
      backHref="/doctor"
      searchPlaceholder="Search by doctor, specialty or patient…"
      filters={[
        { key: 'upcoming', label: 'Upcoming', match: (r) => r.kind === 'upcoming' },
        { key: 'past', label: 'Past', match: (r) => r.kind === 'past' },
      ]}
      load={async () => {
        const res: any = await doctorApi.getMyAppointments();
        const rows: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return rows.map(normalise);
      }}
    />
  );
}
