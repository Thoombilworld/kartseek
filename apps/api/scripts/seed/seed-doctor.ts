/**
 * KARTSEEK — Doctor Module Seed Script
 * ─────────────────────────────────────
 * Populates the doctor-related tables with realistic test data for dev/staging.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-doctor.ts
 *
 * Prerequisites:
 *   - PostgreSQL running (npm run infra:up, from the repository root)
 *   - Database `kartseek_db` exists
 *   - Tables created via TypeORM synchronize or migrations
 */

import { DataSource, type DeepPartial } from 'typeorm';
import { Specialty } from '../../../../modules/doctor/backend/src/entities/specialty.entity';
import { Hospital } from '../../../../modules/doctor/backend/src/entities/hospital.entity';
import { Clinic } from '../../../../modules/doctor/backend/src/entities/clinic.entity';
import { Department } from '../../../../modules/doctor/backend/src/entities/department.entity';
import { Doctor } from '../../../../modules/doctor/backend/src/entities/doctor.entity';
import { DoctorAvailability } from '../../../../modules/doctor/backend/src/entities/doctor-availability.entity';
import { Appointment } from '../../../../modules/doctor/backend/src/entities/appointment.entity';
// Note: Review entity excluded — shares 'reviews' table with marketplace module
import { Document } from '../../../../modules/doctor/backend/src/entities/document.entity';

const ENTITIES = [
  Specialty,
  Hospital,
  Clinic,
  Department,
  Doctor,
  DoctorAvailability,
  Appointment,
  Document,
];

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DOCTOR_DB_HOST || process.env.DB_HOST || 'localhost',
  port: +(process.env.DOCTOR_DB_PORT || process.env.DB_PORT || 5432),
  username: process.env.DOCTOR_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.DOCTOR_DB_PASSWORD || process.env.DB_PASSWORD || 'kartseek123',
  // This vertical owns its own database now. Seeding kartseek_db would write
  // rows the service never reads, and leave the module looking empty.
  database: process.env.DOCTOR_DB_NAME ?? process.env.DB_NAME ?? 'kartseek_doctor',
  // The module keeps its tables in the `doctor` schema. Without this the seed
  // created a second, empty-looking set of tables in `public` and wrote every
  // row there — the service read doctor.specialties and found nothing while
  // public.specialties held all twelve.
  schema: 'doctor',
  entities: ENTITIES,
  synchronize: true, // Doctor tables have no gateway entity — seed creates them
  logging: false,
});

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ── SEED DATA ──────────────────────────────────────────────────────────────────

const SPECIALTIES_DATA = [
  {
    name: 'General Physician',
    icon: '🩺',
    description: 'Primary care and internal medicine',
    sortOrder: 1,
  },
  { name: 'Cardiology', icon: '🫀', description: 'Heart and cardiovascular system', sortOrder: 2 },
  { name: 'Dermatology', icon: '💆', description: 'Skin, hair, and nail care', sortOrder: 3 },
  {
    name: 'Orthopedics',
    icon: '🦴',
    description: 'Bones, joints, and musculoskeletal system',
    sortOrder: 4,
  },
  { name: 'Pediatrics', icon: '👶', description: 'Child and adolescent healthcare', sortOrder: 5 },
  { name: 'Neurology', icon: '🧠', description: 'Brain and nervous system', sortOrder: 6 },
  { name: 'Ophthalmology', icon: '👁️', description: 'Eye care and vision', sortOrder: 7 },
  { name: 'Dental', icon: '🦷', description: 'Teeth and oral health', sortOrder: 8 },
  {
    name: 'Gynecology',
    icon: '🤰',
    description: "Women's health and reproductive care",
    sortOrder: 9,
  },
  { name: 'ENT', icon: '👂', description: 'Ear, nose, and throat', sortOrder: 10 },
  {
    name: 'Urology',
    icon: '💧',
    description: 'Urinary tract and male reproductive health',
    sortOrder: 11,
  },
  { name: 'Oncology', icon: '🎗️', description: 'Cancer diagnosis and treatment', sortOrder: 12 },
];

const HOSPITALS_DATA = [
  {
    name: 'Mumbai Hospital',
    city: 'Mumbai',
    location: 'Worli, Mumbai',
    address: 'Linking Road, Worli, Mumbai',
    latitude: -1.2961,
    longitude: 36.812,
    rating: 4.9,
    ratingCount: 1250,
    doctorCount: 45,
    specialties: ['Cardiology', 'Orthopedics', 'Neurology', 'General Physician', 'Pediatrics'],
    hospitalType: 'multi-speciality',
    status: 'active',
    phone: '+91 20 284 5000',
    email: 'info@Mumbaihospital.org',
    about: 'Premier healthcare facility in East Africa with world-class medical infrastructure.',
    facilities: ['ICU', 'Emergency', 'Pharmacy', 'Lab', 'Radiology', 'Ambulance'],
    hasEmergency: true,
    hasPharmacy: true,
    hasLab: true,
    hasAmbulance: true,
    bedCount: 350,
    coverImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
  },
  {
    name: 'Aga Khan University Hospital',
    city: 'Mumbai',
    location: 'Bandra, Mumbai',
    address: '3rd Bandra Avenue, Mumbai',
    latitude: -1.258,
    longitude: 36.8176,
    rating: 4.8,
    ratingCount: 980,
    doctorCount: 38,
    specialties: ['General Physician', 'Oncology', 'Neurology', 'Gynecology', 'Dermatology'],
    hospitalType: 'super-speciality',
    status: 'active',
    phone: '+91 20 366 2000',
    email: 'info@aku.edu',
    about: 'Leading teaching and referral hospital offering comprehensive tertiary care services.',
    facilities: ['ICU', 'Emergency', 'Pharmacy', 'Lab', 'Blood Bank', 'Dialysis'],
    hasEmergency: true,
    hasPharmacy: true,
    hasLab: true,
    hasAmbulance: true,
    bedCount: 280,
    coverImage: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&q=80',
  },
  {
    name: 'MP Shah Hospital',
    city: 'Mumbai',
    location: 'Shivachi Rd, Mumbai',
    address: 'Hill Road, Bandra, Mumbai',
    latitude: -1.2615,
    longitude: 36.8162,
    rating: 4.7,
    ratingCount: 720,
    doctorCount: 25,
    specialties: ['General Physician', 'Dental', 'Orthopedics', 'ENT', 'Ophthalmology'],
    hospitalType: 'general',
    status: 'active',
    phone: '+91 20 429 9999',
    email: 'info@mpshah.org',
    about: 'Trusted community hospital providing quality affordable healthcare since 1931.',
    facilities: ['Emergency', 'Pharmacy', 'Lab', 'Radiology'],
    hasEmergency: true,
    hasPharmacy: true,
    hasLab: true,
    hasAmbulance: false,
    bedCount: 180,
    coverImage: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
  },
];

const CLINICS_DATA = [
  {
    name: 'HealthFirst Clinic',
    city: 'Mumbai',
    location: 'Andheri West, Mumbai',
    address: 'SV Road, Andheri West, Mumbai',
    latitude: -1.2636,
    longitude: 36.8028,
    rating: 4.6,
    ratingCount: 320,
    doctorCount: 8,
    specialties: ['General Physician', 'Dermatology', 'Pediatrics'],
    status: 'active',
    phone: '+91 710 123 456',
    email: 'hello@healthfirst.co.in',
    about: 'Modern multi-specialty clinic in the heart of Andheri West.',
    services: ['Consultation', 'Lab Tests', 'Vaccinations', 'Minor Procedures'],
    coverImage: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80',
  },
  {
    name: 'MediCare Plus',
    city: 'Mumbai',
    location: 'Juhu, Mumbai',
    address: 'Bandra West Road, Mumbai',
    latitude: -1.319,
    longitude: 36.711,
    rating: 4.5,
    ratingCount: 210,
    doctorCount: 5,
    specialties: ['Dental', 'Ophthalmology', 'ENT'],
    status: 'active',
    phone: '+91 722 456 789',
    email: 'info@medicareplus.co.in',
    about: 'Specialist dental and eye care clinic with modern equipment.',
    services: ['Dental Care', 'Eye Exams', 'Hearing Tests', 'Minor Surgery'],
    coverImage: 'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800&q=80',
  },
  {
    name: 'City Wellness Hub',
    city: 'Delhi',
    location: 'Colaba, Delhi',
    address: 'Carter Road, Colaba, Delhi',
    latitude: -4.0268,
    longitude: 39.695,
    rating: 4.4,
    ratingCount: 180,
    doctorCount: 6,
    specialties: ['General Physician', 'Gynecology', 'Urology'],
    status: 'active',
    phone: '+91 733 789 012',
    email: 'hello@citywellness.co.in',
    about: 'Your one-stop wellness center on the coast.',
    services: ['Consultation', 'Health Checkups', 'Ultrasound', 'Physiotherapy'],
    coverImage: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&q=80',
  },
];

const DOCTORS_DATA = [
  {
    name: 'Dr. Amara Okonkwo',
    specialty: 'General Physician',
    qualifications: ['MBBS', 'MD'],
    rating: 4.8,
    ratingCount: 342,
    experience: 12,
    fee: 1500,
    videoFee: 800,
    consultMode: 'both',
    languages: ['English', 'Hindi'],
    hospitalIndex: 0,
    providerType: 'hospital',
    city: 'Mumbai',
    about: 'Specialist in internal medicine and preventive healthcare.',
    profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
    gender: 'female',
  },
  {
    name: 'Dr. Zara Ahmed',
    specialty: 'Pediatrics',
    qualifications: ['MBBS', 'DCH'],
    rating: 4.9,
    ratingCount: 289,
    experience: 8,
    fee: 2000,
    videoFee: 1200,
    consultMode: 'both',
    languages: ['English', 'Arabic'],
    hospitalIndex: 0,
    providerType: 'hospital',
    city: 'Mumbai',
    about: 'Child health specialist with focus on developmental pediatrics.',
    profileImage: 'https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=400&q=80',
    gender: 'female',
  },
  {
    name: 'Dr. James Ochieng',
    specialty: 'Cardiology',
    qualifications: ['MBBS', 'MD', 'DM Cardiology'],
    rating: 4.9,
    ratingCount: 456,
    experience: 15,
    fee: 3000,
    videoFee: 2000,
    consultMode: 'both',
    languages: ['English', 'Hindi'],
    hospitalIndex: 1,
    providerType: 'hospital',
    city: 'Mumbai',
    about: 'Senior interventional cardiologist with 15 years of experience.',
    profileImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80',
    gender: 'male',
  },
  {
    name: 'Dr. Grace Wanjiku',
    specialty: 'Dermatology',
    qualifications: ['MBBS', 'MD Dermatology'],
    rating: 4.7,
    ratingCount: 198,
    experience: 6,
    fee: 1200,
    videoFee: 700,
    consultMode: 'both',
    languages: ['English', 'Hindi'],
    clinicIndex: 0,
    providerType: 'clinic',
    city: 'Mumbai',
    about: 'Skin care specialist focused on cosmetic and medical dermatology.',
    profileImage: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80',
    gender: 'female',
  },
  {
    name: 'Dr. Raj Patel',
    specialty: 'Orthopedics',
    qualifications: ['MBBS', 'MS Ortho'],
    rating: 4.6,
    ratingCount: 178,
    experience: 10,
    fee: 2500,
    videoFee: 1500,
    consultMode: 'in-person',
    languages: ['English', 'Hindi', 'Hindi'],
    hospitalIndex: 2,
    providerType: 'hospital',
    city: 'Mumbai',
    about: 'Sports medicine and joint replacement specialist.',
    profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80',
    gender: 'male',
  },
  {
    name: 'Dr. Fatima Hassan',
    specialty: 'Gynecology',
    qualifications: ['MBBS', 'MD OB/GYN'],
    rating: 4.8,
    ratingCount: 267,
    experience: 9,
    fee: 1800,
    videoFee: 1000,
    consultMode: 'both',
    languages: ['English', 'Arabic', 'Hindi'],
    providerType: 'independent',
    city: 'Mumbai',
    about: "Women's health specialist with expertise in high-risk pregnancies.",
    profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
    gender: 'female',
  },
];

// ── Seed Logic ─────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Connecting to database...');
  await AppDataSource.initialize();
  console.log('✅ Connected.\n');

  const specialtyRepo = AppDataSource.getRepository(Specialty);
  const hospitalRepo = AppDataSource.getRepository(Hospital);
  const clinicRepo = AppDataSource.getRepository(Clinic);
  const departmentRepo = AppDataSource.getRepository(Department);
  const doctorRepo = AppDataSource.getRepository(Doctor);
  const availabilityRepo = AppDataSource.getRepository(DoctorAvailability);
  const appointmentRepo = AppDataSource.getRepository(Appointment);
  // reviewRepo removed — Review entity conflicts with marketplace

  // ── 1. Seed Specialties ──────────────────────────────────────────────────
  console.log('🏷️  Seeding specialties...');
  const specialties = specialtyRepo.create(
    SPECIALTIES_DATA.map((s) => ({ ...s, slug: slug(s.name), isActive: true, doctorCount: 0 })),
  );
  const savedSpecialties = await specialtyRepo.save(specialties);
  console.log(`   ✅ ${savedSpecialties.length} specialties seeded.\n`);

  // ── 2. Seed Hospitals ────────────────────────────────────────────────────
  console.log('🏥 Seeding hospitals...');
  const hospitals = hospitalRepo.create(
    HOSPITALS_DATA.map(
      (h) => ({ ...h, slug: slug(h.name), isOpen: true }) as DeepPartial<Hospital>,
    ),
  );
  const savedHospitals = await hospitalRepo.save(hospitals);
  console.log(`   ✅ ${savedHospitals.length} hospitals seeded.\n`);

  // ── 3. Seed Clinics ──────────────────────────────────────────────────────
  console.log('🏪 Seeding clinics...');
  const clinics = clinicRepo.create(
    CLINICS_DATA.map((c) => ({ ...c, slug: slug(c.name) }) as DeepPartial<Clinic>),
  );
  const savedClinics = await clinicRepo.save(clinics);
  console.log(`   ✅ ${savedClinics.length} clinics seeded.\n`);

  // ── 4. Seed Departments ──────────────────────────────────────────────────
  console.log('🏢 Seeding departments...');
  const deptNames = ['Emergency', 'Outpatient', 'Surgery', 'Pharmacy', 'Diagnostics'];
  let totalDepts = 0;
  for (const hospital of savedHospitals) {
    const depts = departmentRepo.create(
      deptNames.map((name, i) => ({
        hospitalId: hospital.id,
        name,
        slug: slug(`${hospital.name}-${name}`),
        description: `${name} department at ${hospital.name}`,
        isActive: true,
        sortOrder: i + 1,
      })),
    );
    await departmentRepo.save(depts);
    totalDepts += depts.length;
  }
  console.log(
    `   ✅ ${totalDepts} departments seeded across ${savedHospitals.length} hospitals.\n`,
  );

  // ── 5. Seed Doctors ──────────────────────────────────────────────────────
  console.log('👨‍⚕️ Seeding doctors...');
  const doctorEntities = doctorRepo.create(
    DOCTORS_DATA.map((d) => {
      const hospitalId =
        d.hospitalIndex !== undefined ? savedHospitals[d.hospitalIndex].id : undefined;
      const clinicId =
        (d as { clinicIndex?: number }).clinicIndex !== undefined
          ? savedClinics[(d as { clinicIndex?: number }).clinicIndex].id
          : undefined;
      const hospital = hospitalId ? savedHospitals[d.hospitalIndex!] : undefined;
      const clinic = clinicId
        ? savedClinics[(d as { clinicIndex?: number }).clinicIndex]
        : undefined;
      return {
        name: d.name,
        slug: slug(d.name),
        specialty: d.specialty,
        specialties: [d.specialty],
        qualifications: d.qualifications,
        experience: d.experience,
        about: d.about,
        languages: d.languages,
        profileImage: d.profileImage,
        fee: d.fee,
        videoFee: d.videoFee,
        rating: d.rating,
        ratingCount: d.ratingCount,
        isAvailable: true,
        consultMode: d.consultMode as Doctor['consultMode'],
        status: 'active' as const,
        providerType: d.providerType as Doctor['providerType'],
        city: d.city,
        gender: d.gender,
        hospitalId,
        clinicId,
        hospitalName: hospital?.name,
        hospitalAddress: hospital?.location || clinic?.location,
      };
    }),
  );
  const savedDoctors = await doctorRepo.save(doctorEntities);
  console.log(`   ✅ ${savedDoctors.length} doctors seeded.\n`);

  // ── 6. Seed Availability (weekly schedules) ──────────────────────────────
  console.log('📅 Seeding availability...');
  let totalSlots = 0;
  for (const doctor of savedDoctors) {
    // Mon-Fri: 09:00-13:00 & 14:00-17:00
    for (let day = 1; day <= 5; day++) {
      const morningSlot = availabilityRepo.create({
        doctorId: doctor.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '13:00',
        slotDurationMinutes: 30,
        maxPatientsPerSlot: 1,
        isActive: true,
        consultMode: doctor.consultMode as DoctorAvailability['consultMode'],
        locationType: doctor.providerType as DoctorAvailability['locationType'],
        locationId: doctor.hospitalId || doctor.clinicId || undefined,
      });
      const afternoonSlot = availabilityRepo.create({
        doctorId: doctor.id,
        dayOfWeek: day,
        startTime: '14:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        maxPatientsPerSlot: 1,
        isActive: true,
        consultMode: doctor.consultMode as DoctorAvailability['consultMode'],
        locationType: doctor.providerType as DoctorAvailability['locationType'],
        locationId: doctor.hospitalId || doctor.clinicId || undefined,
      });
      await availabilityRepo.save([morningSlot, afternoonSlot]);
      totalSlots += 2;
    }
    // Saturday: 09:00-12:00 (half-day)
    const satSlot = availabilityRepo.create({
      doctorId: doctor.id,
      dayOfWeek: 6,
      startTime: '09:00',
      endTime: '12:00',
      slotDurationMinutes: 30,
      maxPatientsPerSlot: 1,
      isActive: true,
      consultMode: doctor.consultMode as DoctorAvailability['consultMode'],
      locationType: doctor.providerType as DoctorAvailability['locationType'],
      locationId: doctor.hospitalId || doctor.clinicId || undefined,
    });
    await availabilityRepo.save(satSlot);
    totalSlots += 1;
  }
  console.log(
    `   ✅ ${totalSlots} availability slots seeded across ${savedDoctors.length} doctors.\n`,
  );

  // ── 7. Seed Sample Appointments ──────────────────────────────────────────
  console.log('📋 Seeding appointments...');
  const appointmentsData = [
    {
      doctorIdx: 0,
      customerId: 'CUST-001',
      patientName: 'John Sharma',
      date: '2026-07-15',
      timeSlot: '09:00',
      type: 'in-clinic' as const,
      status: 'CONFIRMED' as const,
      symptoms: 'Recurring headaches',
    },
    {
      doctorIdx: 2,
      customerId: 'CUST-002',
      patientName: 'Mary Wambui',
      date: '2026-07-15',
      timeSlot: '10:30',
      type: 'in-clinic' as const,
      status: 'CONFIRMED' as const,
      symptoms: 'Chest pain during exercise',
    },
    {
      doctorIdx: 1,
      customerId: 'CUST-003',
      patientName: 'Ali Mohamed',
      date: '2026-07-14',
      timeSlot: '14:00',
      type: 'video' as const,
      status: 'COMPLETED' as const,
      symptoms: 'Child fever',
    },
    {
      doctorIdx: 3,
      customerId: 'CUST-004',
      patientName: 'Sarah Njeri',
      date: '2026-07-16',
      timeSlot: '11:00',
      type: 'in-clinic' as const,
      status: 'PENDING' as const,
      symptoms: 'Skin rash on arms',
    },
    {
      doctorIdx: 5,
      customerId: 'CUST-005',
      patientName: 'Amina Ali',
      date: '2026-07-17',
      timeSlot: '09:30',
      type: 'video' as const,
      status: 'CONFIRMED' as const,
      symptoms: 'Prenatal checkup',
    },
  ];
  const appointments = appointmentRepo.create(
    appointmentsData.map((a) => ({
      doctorId: savedDoctors[a.doctorIdx].id,
      customerId: a.customerId,
      patientName: a.patientName,
      date: a.date,
      timeSlot: a.timeSlot,
      type: a.type,
      status: a.status,
      symptoms: a.symptoms,
      fee: savedDoctors[a.doctorIdx].fee,
      platformFee: 25,
    })),
  );
  const savedAppointments = await appointmentRepo.save(appointments);
  console.log(`   ✅ ${savedAppointments.length} appointments seeded.\n`);

  // Reviews section removed — doctor Review entity shares 'reviews' table with marketplace

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('🩺  Doctor Module Seed Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Specialties:     ${savedSpecialties.length}`);
  console.log(`   Hospitals:       ${savedHospitals.length}`);
  console.log(`   Clinics:         ${savedClinics.length}`);
  console.log(`   Departments:     ${totalDepts}`);
  console.log(`   Doctors:         ${savedDoctors.length}`);
  console.log(`   Availability:    ${totalSlots} schedule slots`);
  console.log(`   Appointments:    ${savedAppointments.length}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 Doctor module seeding complete!\n');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
