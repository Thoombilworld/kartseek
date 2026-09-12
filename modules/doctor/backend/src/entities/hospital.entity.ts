import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

@Entity({ name: 'hospitals', schema: 'doctor' })
export class Hospital {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 200, unique: true })
  @Index()
  slug: string;

  @Column('simple-json', { nullable: true })
  specialties: string[];

  @Column({ length: 500 })
  location: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  city: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'boolean', default: true })
  isOpen: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  openHours: string | null;

  @Column({ type: 'text', nullable: true })
  about: string | null;

  @Column('simple-json', { nullable: true })
  facilities: string[];

  @Column('simple-json', { nullable: true })
  images: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage: string | null;

  @Column({ type: 'int', default: 0 })
  doctorCount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'suspended', 'blocked', 'rejected'],
    default: 'pending',
  })
  @Index()
  status: 'pending' | 'active' | 'suspended' | 'blocked' | 'rejected';

  @Column({ type: 'varchar', nullable: true })
  ownerId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  website: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  registrationNo: string | null;

  @Column({
    type: 'enum',
    enum: [
      'multi-speciality',
      'super-speciality',
      'general',
      'eye',
      'dental',
      'maternity',
      'children',
      'other',
    ],
    default: 'general',
  })
  hospitalType: string;

  @Column({ type: 'int', nullable: true })
  bedCount: number | null;

  @Column({ type: 'boolean', default: false })
  hasEmergency: boolean;

  @Column({ type: 'boolean', default: false })
  hasAmbulance: boolean;

  @Column({ type: 'boolean', default: false })
  hasPharmacy: boolean;

  @Column({ type: 'boolean', default: false })
  hasLab: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
