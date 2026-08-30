import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('pharmacy_categories')
export class PharmacyCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 128 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 128 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, comment: 'Emoji icon for UI display' })
  emoji: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Parent category ID for nesting' })
  parentId: string | null;

  @Column({ type: 'int', default: 0, comment: 'Display ordering' })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false, comment: 'Whether items in this category require a prescription' })
  requiresPrescription: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
