'use client';

/**
 * My doctors — the practitioners this customer has actually consulted.
 *
 * This rendered a `MY_DOCTORS` constant: five named practitioners with stock
 * photographs, ratings, review counts, "next available" slots and `₹` fees, plus
 * a favourite toggle that flipped local state and forgot it on reload. It made
 * no request, so every customer saw the same five doctors described as *theirs*.
 *
 * There is no "saved doctors" endpoint to wire it to — doctor-service has no
 * such concept. But the page's own title is the answer: the doctors a customer
 * has seen are exactly the distinct doctors on their appointments, which
 * `GET /doctor/appointments/me` returns with the doctor relation attached. Visit
 * counts, last visit and next upcoming appointment all fall out of the same
 * data.
 *
 * Favourites are gone rather than faked. They need somewhere to persist, and
 * nothing offers that.
 *
 * (That endpoint returned an empty list for everyone until recently: the gateway
 * sent `patientId` while the service read `customerId`, so it queried the
 * literal string `'me'` and matched nothing.)
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Stethoscope, Calendar, CalendarDays, MapPin,
  AlertCircle, RefreshCw, ChevronRight,
} from 'lucide-react';

import { AuthGate } from '@/components/shared/auth-gate';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { doctorApi } from '@/lib/api/doctor';
import { isOpen } from '@/lib/modules/profile-data';

interface SeenDoctor {
  id: string;
  name: string;
  specialty: string | null;
  place: string | null;
  visits: number;
  /** ISO date of the most recent past visit, if any. */
  lastVisit: string | null;
  /** ISO date of the next appointment still ahead, if any. */
  nextVisit: string | null;
  /** What the customer last paid this doctor. */
  lastFee: number | null;
}

/** Collapse an appointment list into one row per doctor. */
function toDoctors(appointments: any[]): SeenDoctor[] {
  const byDoctor = new Map<string, SeenDoctor>();

  for (const appointment of appointments) {
    const id = appointment.doctorId ?? appointment.doctor?.id;
    if (!id) continue;

    const date: string | null = appointment.date ?? null;
    const upcoming = isOpen(appointment.status);
    const existing = byDoctor.get(id);

    const row: SeenDoctor = existing ?? {
      id,
      name: appointment.doctor?.name ?? 'Doctor',
      specialty: appointment.doctor?.specialty ?? null,
      place: appointment.doctor?.hospitalName ?? appointment.doctor?.city ?? null,
      visits: 0,
      lastVisit: null,
      nextVisit: null,
      lastFee: null,
    };

    row.visits += 1;
    if (upcoming) {
      // Soonest upcoming wins.
      if (date && (!row.nextVisit || date < row.nextVisit)) row.nextVisit = date;
    } else if (date && (!row.lastVisit || date > row.lastVisit)) {
      // Most recent completed visit wins, and its fee is the one to show.
      row.lastVisit = date;
      row.lastFee = appointment.fee !== undefined && appointment.fee !== null ? Number(appointment.fee) : null;
    }
    if (row.lastFee === null && appointment.fee !== undefined && appointment.fee !== null) {
      row.lastFee = Number(appointment.fee);
    }

    byDoctor.set(id, row);
  }

  // Most-seen first, then by name so the order is stable.
  return [...byDoctor.values()].sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));
}

export default function MyDoctorsPage() {
  return (
    <AuthGate reason="Sign in to see the doctors you have consulted.">
      <MyDoctorsContent />
    </AuthGate>
  );
}

function MyDoctorsContent() {
  const { user } = useAuth();
  const { formatCurrencyValue, formatDateValue } = useRegion();
  const [search, setSearch] = useState('');

  const { data, loading, error, reload } = useAsyncData<SeenDoctor[]>(
    async () => {
      const res: any = await doctorApi.getMyAppointments();
      const rows: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return toDoctors(rows);
    },
    [user?.id],
    { enabled: !!user?.id },
  );

  const doctors = useMemo(() => data ?? [], [data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) =>
      d.name.toLowerCase().includes(q)
      || (d.specialty ?? '').toLowerCase().includes(q)
      || (d.place ?? '').toLowerCase().includes(q));
  }, [doctors, search]);

  const upcomingCount = doctors.filter((d) => d.nextVisit).length;

  return (
    <div className="min-h-screen bg-linear-to-b from-indigo-50/40 via-white to-slate-50 pb-20">
      <div className="bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 text-white px-3 xs:px-4 pt-6 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12 blur-2xl" aria-hidden="true" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Link
            href="/my-profile"
            className="inline-flex items-center gap-1 min-h-[44px] -ml-2 px-2 text-indigo-200 hover:text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Profile
          </Link>
          <h1 className="text-2xl font-black mb-1">My doctors</h1>
          <p className="text-indigo-200 text-sm">Everyone you have consulted through KARTSEEK</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 xs:px-4 -mt-10 relative z-10 space-y-5">

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-indigo-600 tabular-nums">{doctors.length}</p>
            <p className="text-xs text-slate-500 font-medium">Doctors seen</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-emerald-600 tabular-nums">{upcomingCount}</p>
            <p className="text-xs text-slate-500 font-medium">With an upcoming visit</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm text-red-800 break-words">
              <span className="font-bold">We could not load your doctors.</span> {error}
            </p>
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors shrink-0"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again
            </button>
          </div>
        )}

        {doctors.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, specialty or place…"
              aria-label="Search your doctors"
              /* 16px below `md`, or iOS Safari zooms on focus and stays zoomed. */
              className="w-full pl-10 pr-4 py-3 min-h-[44px] bg-white border border-slate-200 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
            />
          </div>
        )}

        {loading && !data ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          !error && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8" aria-hidden="true" />
              </div>
              <h2 className="font-bold text-slate-900">
                {search.trim() ? 'No doctors match that' : 'You have not seen a doctor yet'}
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
                {search.trim()
                  ? 'Try a different name or specialty.'
                  : 'Doctors you consult appear here, with your visit history and any upcoming appointment.'}
              </p>
              {!search.trim() && (
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 mt-5 px-5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  Find a doctor
                </Link>
              )}
            </div>
          )
        ) : (
          <ul className="space-y-3">
            {visible.map((doctor) => (
              <li key={doctor.id}>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 xs:p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 xs:gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{doctor.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {[doctor.specialty, doctor.place].filter(Boolean).join(' · ') || 'Consultation'}
                      </p>

                      <div className="flex items-center gap-x-3 gap-y-1 mt-2.5 flex-wrap text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                          {doctor.visits} {doctor.visits === 1 ? 'visit' : 'visits'}
                        </span>
                        {doctor.lastVisit && <span>Last {formatDateValue(doctor.lastVisit)}</span>}
                        {doctor.lastFee !== null && <span>{formatCurrencyValue(doctor.lastFee)}</span>}
                      </div>

                      {doctor.nextVisit && (
                        <p className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          Next visit {formatDateValue(doctor.nextVisit)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3.5 pt-3.5 border-t border-slate-100">
                    <Link
                      href={`/book/${encodeURIComponent(doctor.id)}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-indigo-600 text-white px-4 min-h-[44px] rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" /> Book again
                    </Link>
                    <Link
                      href="/my-appointments"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-4 min-h-[44px] rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                    >
                      Appointments <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
