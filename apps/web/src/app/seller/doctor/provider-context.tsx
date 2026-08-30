'use client';

import { createContext, useContext } from 'react';

export type ProviderType = 'hospital' | 'clinic' | 'doctor';

export const MOCK_PROVIDER: Record<ProviderType, { name: string; subtitle: string; image: string; initials: string }> = {
  hospital: {
    name: 'Mumbai Hospital',
    subtitle: 'Multi-Speciality Hospital · Mumbai',
    image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=100&q=80',
    initials: 'NH',
  },
  clinic: {
    name: 'HealthFirst Clinic',
    subtitle: 'Multi-Speciality Clinic · Westlands',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=100&q=80',
    initials: 'HC',
  },
  doctor: {
    name: 'Dr. Amara Okonkwo',
    subtitle: 'General Physician · Mumbai Hospital',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&q=80',
    initials: 'AO',
  },
};

export interface ProviderCtx {
  providerType: ProviderType;
  setProviderType: (t: ProviderType) => void;
  provider: typeof MOCK_PROVIDER.hospital;
}

export const ProviderContext = createContext<ProviderCtx>({
  providerType: 'hospital',
  setProviderType: () => {},
  provider: MOCK_PROVIDER.hospital,
});

export const useProvider = () => useContext(ProviderContext);
