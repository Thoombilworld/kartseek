import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Hospital } from './hospital.entity';
import { Clinic } from './clinic.entity';

@Entity({ name: 'doctors', schema: 'doctor' })
export class Doctor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 200, unique: true })
  @Index()
  slug: string;

  @Column({ length: 100 })
  @Index()
  specialty: string;

  @Column('simple-json', { nullable: true })
  specialties: string[]; // supports multiple specialties

  @Column('simple-json', { nullable: true })
  qualifications: string[];

  @Column({ type: 'int', default: 0 })
  experience: number;

  @Column({ type: 'text', nullable: true })
  about: string | null;

  @Column('simple-json', { nullable: true })
  languages: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  profileImage: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  videoFee: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'enum', enum: ['in-person', 'video', 'both'], default: 'both' })
  consultMode: 'in-person' | 'video' | 'both';

  @Column({ type: 'varchar', length: 100, nullable: true })
  registrationNo: string | null;

  @Column({ type: 'enum', enum: ['active', 'suspended', 'blocked', 'pending'], default: 'pending' })
  @Index()
  status: 'active' | 'suspended' | 'blocked' | 'pending';

  // ── Hospital/Clinic Relations ─────────────────────────────────
  @Column({ type: 'uuid', nullable: true })
  @Index()
  hospitalId: string | null;

  @ManyToOne(() => Hospital, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hospitalId' })
  hospital: Relation<Hospital>;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  clinicId: string | null;

  @ManyToOne(() => Clinic, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Relation<Clinic>;

  // Keep for backward compat; prefer hospitalId/clinicId
  @Column({ type: 'varchar', length: 200, nullable: true })
  hospitalName: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  hospitalAddress: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  city: string | null;

  @Column({ type: 'enum', enum: ['hospital', 'clinic', 'independent'], default: 'independent' })
  @Index()
  providerType: 'hospital' | 'clinic' | 'independent';

  // ── Market attribution ────────────────────────────────────────────────────

  /**
   * The market this practitioner works in, copied from the CLINIC they are
   * attached to. Denormalised on purpose — see
   * `migrations/1786502800000-DoctorAdminSurfaces.ts`.
   *
   * A practitioner had no market at all, so the admin directory failed closed
   * for every regional administrator: `clinicId` and `hospitalId` are both
   * nullable and `hospitals` carries no market column of its own, and a
   * three-way LEFT JOIN that can produce NULL is not a predicate a reviewer can
   * check.
   *
   * NULL means UNATTRIBUTED, never "every market": a practitioner with no clinic
   * is invisible to a region-locked administrator and refused on detail. It is
   * not widened, because widening is the direction that leaks.
   *
   * The `T | null` union needs the explicit `type:` — TypeScript reflects a
   * union as `Object` and TypeORM cannot infer a column type from it, which is a
   * boot failure (`project_typeorm_nullable_reflection`). Plain `varchar` with
   * no length, matching `clinics.region_code`, the column it is copied from.
   */
  @Column({ type: 'varchar', name: 'region_code', nullable: true })
  @Index()
  regionCode: string | null;

  // ── Credential verification, and who decided ──────────────────────────────
  //
  // `admin.doctor.verifyDoctor` is a decision about a person's licence and this
  // table had nowhere to record it: before M6 a practitioner was verified by
  // moving `status`, which is the same column a suspension moves, so the two
  // decisions overwrote one another and neither left a trace of who took it.

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  verifiedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  verificationNotes: string | null;

  // ── Suspension, and why ───────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true })
  suspendedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  suspendedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  suspensionReason: string | null;

  @Column({ type: 'int', default: 0 })
  complaints: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  gender: string | null;

  @Column({ type: 'varchar', nullable: true })
  userId: string | null; // links to auth user for portal access

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
