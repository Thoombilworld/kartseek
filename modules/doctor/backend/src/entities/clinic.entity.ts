import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('clinics')
export class Clinic {
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

  @Column({ type: 'int', default: 0 })
  doctorCount: number;

  @Column({ type: 'int', default: 0 })
  todaySlots: number;

  @Column({ type: 'text', nullable: true })
  about: string | null;

  @Column('simple-json', { nullable: true })
  services: string[];

  @Column('simple-json', { nullable: true })
  workingHours: { day: string; time: string; active: boolean }[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage: string | null;

  @Column('simple-json', { nullable: true })
  images: string[];

  @Column({ type: 'enum', enum: ['pending', 'active', 'suspended', 'blocked', 'rejected'], default: 'pending' })
  @Index()
  status: 'pending' | 'active' | 'suspended' | 'blocked' | 'rejected';

  @Column({ type: 'varchar', nullable: true })
  ownerId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  registrationNo: string | null;

  @Column({ type: 'varchar', name: 'franchise_id', nullable: true })
  franchiseId: string | null;

  @Column({ type: 'varchar', name: 'region_code', nullable: true })
  regionCode: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
