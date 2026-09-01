import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Hospital } from './hospital.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  hospitalId: string;

  @ManyToOne(() => Hospital)
  @JoinColumn({ name: 'hospitalId' })
  hospital: Relation<Hospital>;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  @Index()
  slug: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  headDoctorId: string | null;

  @Column({ type: 'int', default: 0 })
  doctorCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
