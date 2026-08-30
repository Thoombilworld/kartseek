'use client';

import React, { useState, useEffect } from 'react';
import { useProvider } from '../provider-context';
import HospitalDashboard from '@/components/seller/doctor/dashboard/hospital-dashboard';
import ClinicDashboard from '@/components/seller/doctor/dashboard/clinic-dashboard';
import DoctorDashboard from '@/components/seller/doctor/dashboard/doctor-dashboard';
import { vendorDoctorApi } from '@/lib/api/vendor-doctor';

export default function DashboardPage() {
  const { providerType } = useProvider();

  if (providerType === 'hospital') return <HospitalDashboard />;
  if (providerType === 'clinic') return <ClinicDashboard />;
  return <DoctorDashboard />;
}
