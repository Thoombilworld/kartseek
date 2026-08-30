// ─── Unified Doctor Registry ──────────────────────────────────────────────────
// Central source of truth for all doctors across standalone, hospital, and clinic contexts.
// Each doctor entry includes their provider type and location details.

export type ProviderType = 'individual' | 'hospital' | 'clinic';

export interface UnifiedDoctor {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  rating: number;
  fee: number;
  videoFee: number;
  image: string;
  experience: string;
  reviewCount: number;
  providerType: ProviderType;
  providerName: string;   // Hospital/Clinic name, or "Independent Practice"
  providerLocation: string;
}

// ─── Standalone / Individual Doctors ────────────────────────────────────────────
const STANDALONE_DOCTORS: UnifiedDoctor[] = [
  { id: 'dr-amara-okonkwo', name: 'Dr. Amara Okonkwo', specialty: 'General Physician', qualification: 'MBBS, MD', rating: 4.8, fee: 1500, videoFee: 800, image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&q=80', experience: '12 years', reviewCount: 240, providerType: 'individual', providerName: 'Mumbai Hospital', providerLocation: 'Mumbai, India' },
  { id: 'dr-zara-ahmed', name: 'Dr. Zara Ahmed', specialty: 'Pediatrician', qualification: 'MBBS, DCH', rating: 4.9, fee: 2000, videoFee: 1200, image: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=100&q=80', experience: '10 years', reviewCount: 180, providerType: 'individual', providerName: 'Mumbai Hospital', providerLocation: 'Mumbai, India' },
  { id: 'dr-james-ochieng', name: 'Dr. Suresh Nair', specialty: 'Senior Cardiologist', qualification: 'MBBS, DM (Cardiology)', rating: 4.9, fee: 3000, videoFee: 2000, image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&q=80', experience: '20 years', reviewCount: 520, providerType: 'individual', providerName: 'Aga Khan University Hospital', providerLocation: 'Mumbai, India' },
  { id: 'dr-grace-wanjiku', name: 'Dr. Grace Wanjiku', specialty: 'Dermatologist', qualification: 'MBBS, MD (Dermatology)', rating: 4.7, fee: 1200, videoFee: 700, image: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=100&q=80', experience: '8 years', reviewCount: 310, providerType: 'individual', providerName: 'HealthFirst Clinic', providerLocation: 'Mumbai, India' },
  { id: 'dr-raj-patel', name: 'Dr. Raj Patel', specialty: 'Orthopedic Surgeon', qualification: 'MBBS, MS (Ortho)', rating: 4.6, fee: 2500, videoFee: 1500, image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&q=80', experience: '15 years', reviewCount: 290, providerType: 'individual', providerName: 'MP Shah Hospital', providerLocation: 'Mumbai, India' },
  { id: 'dr-fatima-hassan', name: 'Dr. Fatima Hassan', specialty: 'Gynecologist & Obstetrician', qualification: 'MBBS, MS (OB/GYN)', rating: 4.8, fee: 1800, videoFee: 1000, image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&q=80', experience: '14 years', reviewCount: 410, providerType: 'individual', providerName: 'Independent Practice', providerLocation: 'Mumbai, India' },
];

// ─── Hospital Doctors ───────────────────────────────────────────────────────────
const HOSPITAL_DOCTORS: UnifiedDoctor[] = [
  // hsp-001 – Apollo Heart & Multi-Speciality Hospital (Mumbai)
  { id: 'h1-d1', name: 'Dr. Sunil Kapoor', specialty: 'Cardiologist', qualification: 'MBBS, DM (Cardiology)', rating: 4.9, fee: 1500, videoFee: 0, image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', experience: '22 years', reviewCount: 680, providerType: 'hospital', providerName: 'Apollo Heart & Multi-Speciality Hospital', providerLocation: 'Andheri, Mumbai' },
  { id: 'h1-d2', name: 'Dr. Neha Joshi', specialty: 'Neurologist', qualification: 'MBBS, DM (Neurology)', rating: 4.8, fee: 1200, videoFee: 800, image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', experience: '16 years', reviewCount: 420, providerType: 'hospital', providerName: 'Apollo Heart & Multi-Speciality Hospital', providerLocation: 'Andheri, Mumbai' },
  { id: 'h1-d3', name: 'Dr. Rajesh Verma', specialty: 'Orthopedic', qualification: 'MBBS, MS (Ortho)', rating: 4.7, fee: 1000, videoFee: 0, image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', experience: '14 years', reviewCount: 310, providerType: 'hospital', providerName: 'Apollo Heart & Multi-Speciality Hospital', providerLocation: 'Andheri, Mumbai' },
  { id: 'h1-d4', name: 'Dr. Preeti Sharma', specialty: 'Gynecologist', qualification: 'MBBS, MS (OB/GYN)', rating: 4.9, fee: 1200, videoFee: 700, image: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=400&q=80', experience: '18 years', reviewCount: 560, providerType: 'hospital', providerName: 'Apollo Heart & Multi-Speciality Hospital', providerLocation: 'Andheri, Mumbai' },
  // hsp-002 – Fortis Memorial Research Institute (Delhi)
  { id: 'h2-d1', name: 'Dr. Vikram Singh', specialty: 'Oncologist', qualification: 'MBBS, DM (Oncology)', rating: 4.9, fee: 2000, videoFee: 1200, image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80', experience: '24 years', reviewCount: 720, providerType: 'hospital', providerName: 'Fortis Memorial Research Institute', providerLocation: 'Gurgaon, Delhi NCR' },
  { id: 'h2-d2', name: 'Dr. Priya Menon', specialty: 'Nephrologist', qualification: 'MBBS, DM (Nephrology)', rating: 4.8, fee: 1500, videoFee: 900, image: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80', experience: '15 years', reviewCount: 380, providerType: 'hospital', providerName: 'Fortis Memorial Research Institute', providerLocation: 'Gurgaon, Delhi NCR' },
  { id: 'h2-d3', name: 'Dr. Rahul Gupta', specialty: 'Urologist', qualification: 'MBBS, MCh (Urology)', rating: 4.7, fee: 1800, videoFee: 0, image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80', experience: '12 years', reviewCount: 290, providerType: 'hospital', providerName: 'Fortis Memorial Research Institute', providerLocation: 'Gurgaon, Delhi NCR' },
  // hsp-003 – Manipal Hospitals (Bangalore)
  { id: 'h3-d1', name: 'Dr. Anand Kumar', specialty: 'Gastroenterologist', qualification: 'MBBS, DM (Gastro)', rating: 4.8, fee: 1300, videoFee: 800, image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', experience: '17 years', reviewCount: 410, providerType: 'hospital', providerName: 'Manipal Hospitals', providerLocation: 'Old Airport Road, Bangalore' },
  // hsp-004 – AIIMS Wellness Center (Delhi)
  { id: 'h4-d1', name: 'Dr. Sanjay Malhotra', specialty: 'Pulmonologist', qualification: 'MBBS, DM (Pulmonology)', rating: 4.9, fee: 1000, videoFee: 600, image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80', experience: '25 years', reviewCount: 890, providerType: 'hospital', providerName: 'AIIMS Wellness Center', providerLocation: 'Ansari Nagar, New Delhi' },
];

// ─── Clinic Doctors ─────────────────────────────────────────────────────────────
const CLINIC_DOCTORS: UnifiedDoctor[] = [
  // cln-001 – SmileCare Dental Clinic (Bangalore)
  { id: 'c1-d1', name: 'Dr. Priya Desai', specialty: 'Orthodontist', qualification: 'BDS, MDS (Orthodontics)', rating: 4.8, fee: 600, videoFee: 0, image: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=400&q=80', experience: '10 years', reviewCount: 356, providerType: 'clinic', providerName: 'SmileCare Dental Clinic', providerLocation: 'Koramangala, Bangalore' },
  { id: 'c1-d2', name: 'Dr. Karan Mehta', specialty: 'Dentist', qualification: 'BDS, MDS (Prosthodontics)', rating: 4.7, fee: 500, videoFee: 0, image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', experience: '8 years', reviewCount: 240, providerType: 'clinic', providerName: 'SmileCare Dental Clinic', providerLocation: 'Koramangala, Bangalore' },
  // cln-002 – SkinFirst Dermatology Center (Mumbai)
  { id: 'c2-d1', name: 'Dr. Meera Reddy', specialty: 'Dermatologist', qualification: 'MBBS, MD (Dermatology)', rating: 4.9, fee: 700, videoFee: 400, image: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80', experience: '8 years', reviewCount: 394, providerType: 'clinic', providerName: 'SkinFirst Dermatology Center', providerLocation: 'Andheri West, Mumbai' },
  // cln-004 – Little Stars Pediatric Clinic (Bangalore)
  { id: 'c4-d1', name: 'Dr. Vikram Patel', specialty: 'Pediatrician', qualification: 'MBBS, MD (Pediatrics)', rating: 4.9, fee: 650, videoFee: 350, image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80', experience: '11 years', reviewCount: 310, providerType: 'clinic', providerName: 'Little Stars Pediatric Clinic', providerLocation: 'Indiranagar, Bangalore' },
  // cln-005 – HeartBeat Cardiology Clinic (Mumbai)
  { id: 'c5-d1', name: 'Dr. Rahul Sharma', specialty: 'Cardiologist', qualification: 'MBBS, MD, DM (Cardiology)', rating: 4.9, fee: 1200, videoFee: 700, image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80', experience: '18 years', reviewCount: 612, providerType: 'clinic', providerName: 'HeartBeat Cardiology Clinic', providerLocation: 'Bandra West, Mumbai' },
  // cln-006 – FemCare Women's Health Clinic (Bangalore)
  { id: 'c6-d1', name: 'Dr. Kavita Gupta', specialty: 'Gynecologist', qualification: 'MBBS, MD (Gynecology)', rating: 4.9, fee: 800, videoFee: 450, image: 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&q=80', experience: '14 years', reviewCount: 490, providerType: 'clinic', providerName: "FemCare Women's Health Clinic", providerLocation: 'JP Nagar, Bangalore' },
];

// ─── Combined Registry ──────────────────────────────────────────────────────────
const ALL_DOCTORS = [...STANDALONE_DOCTORS, ...HOSPITAL_DOCTORS, ...CLINIC_DOCTORS];

const DOCTOR_MAP = new Map<string, UnifiedDoctor>();
ALL_DOCTORS.forEach(d => DOCTOR_MAP.set(d.id, d));

/**
 * Look up any doctor by ID — works for standalone, hospital, and clinic doctors.
 * Returns a fallback if not found.
 */
export function getDoctor(id: string): UnifiedDoctor {
  return DOCTOR_MAP.get(id) || {
    id,
    name: 'Dr. Rahul Sharma',
    specialty: 'Senior Cardiologist',
    qualification: 'MBBS, DM (Cardiology)',
    rating: 4.9,
    fee: 800,
    videoFee: 500,
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&q=80',
    experience: '18 years',
    reviewCount: 612,
    providerType: 'individual',
    providerName: 'Apollo Heart Center',
    providerLocation: 'Mumbai, India',
  };
}

/**
 * Provider type display helpers
 */
export function getProviderLabel(type: ProviderType): string {
  return type === 'hospital' ? '🏥 Hospital' : type === 'clinic' ? '🏪 Clinic' : '👨‍⚕️ Independent';
}

export function getProviderColor(type: ProviderType): string {
  return type === 'hospital' ? 'bg-blue-50 text-blue-700 border-blue-200' :
         type === 'clinic' ? 'bg-teal-50 text-teal-700 border-teal-200' :
         'bg-violet-50 text-violet-700 border-violet-200';
}
