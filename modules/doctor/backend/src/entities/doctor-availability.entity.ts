import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Doctor } from './doctor.entity';

@Entity({ name: 'doctor_availability', schema: 'doctor' })
export class DoctorAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  doctorId: string;

  @ManyToOne(() => Doctor)
  @JoinColumn({ name: 'doctorId' })
  doctor: Relation<Doctor>;

  @Column({ type: 'int' })
  dayOfWeek: number; // 0=Sunday, 1=Monday ... 6=Saturday

  @Column({ type: 'time' })
  startTime: string; // e.g. '09:00'

  @Column({ type: 'time' })
  endTime: string; // e.g. '17:00'

  @Column({ type: 'int', default: 30 })
  slotDurationMinutes: number;

  @Column({ type: 'int', default: 1 })
  maxPatientsPerSlot: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: ['in-person', 'video', 'both'], default: 'both' })
  consultMode: 'in-person' | 'video' | 'both';

  @Column({ type: 'varchar', nullable: true })
  locationId: string | null; // hospitalId or clinicId where available

  @Column({ type: 'enum', enum: ['hospital', 'clinic', 'independent'], default: 'independent' })
  locationType: 'hospital' | 'clinic' | 'independent';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
