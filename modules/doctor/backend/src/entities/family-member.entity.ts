import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('family_members')
export class FamilyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The Kartseek user who owns this family profile. */
  @Column()
  @Index()
  userId: string;

  @Column({ length: 200 })
  name: string;

  @Column({
    type: 'enum',
    enum: ['self', 'spouse', 'child', 'parent', 'sibling', 'other'],
    default: 'other',
  })
  relation: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other';

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  bloodGroup: string | null;

  @Column('simple-array', { nullable: true })
  allergies: string[];

  @Column('simple-array', { nullable: true })
  medicalConditions: string[];

  @Column({ type: 'varchar', length: 200, nullable: true })
  insuranceProvider: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  insurancePolicyNo: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
