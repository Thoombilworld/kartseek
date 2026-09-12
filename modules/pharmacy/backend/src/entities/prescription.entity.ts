import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PrescriptionStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED_APPROVED = 'VERIFIED_APPROVED',
  REJECTED_INVALID = 'REJECTED_INVALID',
  REJECTED_EXPIRED = 'REJECTED_EXPIRED',
  REJECTED_UNREADABLE = 'REJECTED_UNREADABLE',
}

@Entity({ name: 'prescriptions', schema: 'pharmacy' })
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  customerId: string;

  @Column({ type: 'varchar', nullable: true, comment: 'Links to PharmacyOrder if order-attached' })
  orderId: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Target pharmacy store' })
  storeId: string | null;

  @Column({ length: 255 })
  patientName: string;

  @Column({ type: 'int', nullable: true })
  patientAge: number | null;

  @Column({ type: 'text', comment: 'S3/GCP Storage URL of the prescription image/PDF' })
  fileUrl: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Medicines detected by OCR or manual entry' })
  extractedMedicines: string[];

  @Column({ default: false })
  containsScheduleHDrugs: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Doctor name if readable' })
  doctorName: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Hospital/clinic name' })
  hospitalName: string | null;

  @Column({ type: 'date', nullable: true, comment: 'Date on the prescription' })
  prescriptionDate: Date | null;

  // ── Verification ────────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.PENDING_VERIFICATION,
  })
  status: PrescriptionStatus;

  @Column({ type: 'varchar', nullable: true, comment: 'Pharmacist/admin who verified' })
  verifiedByAdminId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Pharmacist notes' })
  pharmacistNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
