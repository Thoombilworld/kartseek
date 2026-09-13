import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'specialties', schema: 'doctor' })
export class Specialty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index()
  name: string;

  @Column({ length: 100, unique: true })
  @Index()
  slug: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'int', default: 0 })
  doctorCount: number;

  /**
   * The administrator who added this specialty, from the verified token.
   *
   * The taxonomy is GLOBAL — "Hepatology" is the same specialty in every market
   * — so the row carries no market. Who added it is worth keeping precisely
   * because the write changes every market's directory at once, which is why a
   * region-locked administrator is refused on both sides of the wire.
   */
  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
