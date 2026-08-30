import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('static_pages')
@Index(['slug'], { unique: true })
export class StaticPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  metaDescription: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  heroGradient: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  heroIcon: string | null;

  @Column({ type: 'jsonb', default: [] })
  sections: any[];

  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  lastEditedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
