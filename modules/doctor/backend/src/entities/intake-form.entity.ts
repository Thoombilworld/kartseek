import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'intake_forms', schema: 'doctor' })
export class IntakeForm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  appointmentId: string;

  @Column()
  @Index()
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  familyMemberId: string | null;

  /** Current medications as structured JSON */
  @Column({ type: 'jsonb', nullable: true })
  currentMedications: { name: string; dosage: string; frequency: string }[];

  @Column('simple-array', { nullable: true })
  allergies: string[];

  @Column({ type: 'text', nullable: true })
  previousSurgeries: string | null;

  @Column({ type: 'text', nullable: true })
  familyMedicalHistory: string | null;

  @Column({
    type: 'enum',
    enum: ['never', 'former', 'current'],
    default: 'never',
  })
  smokingStatus: 'never' | 'former' | 'current';

  @Column({
    type: 'enum',
    enum: ['none', 'occasional', 'moderate', 'heavy'],
    default: 'none',
  })
  alcoholConsumption: 'none' | 'occasional' | 'moderate' | 'heavy';

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  bloodPressure: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  bloodGroup: string | null;

  @Column({ type: 'text', nullable: true })
  chiefComplaint: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  symptomDuration: string | null;

  @Column({ type: 'text', nullable: true })
  additionalNotes: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
