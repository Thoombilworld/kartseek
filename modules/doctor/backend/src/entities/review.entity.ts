import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'doctor_reviews', schema: 'doctor' })
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['doctor', 'hospital', 'clinic'], nullable: true })
  @Index()
  targetType: 'doctor' | 'hospital' | 'clinic';

  @Column()
  @Index()
  targetId: string;

  @Column()
  @Index()
  customerId: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  customerName: string | null;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'varchar', nullable: true })
  appointmentId: string | null;

  @Column({ type: 'text', nullable: true })
  adminReply: string | null;

  @Column({ type: 'text', nullable: true })
  providerReply: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
