import { Entity, PrimaryGeneratedColumn, Column, Tree, TreeChildren, TreeParent, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('categories')
@Tree("closure-table")
// Tree descent and the roots lookup (`parent IS NULL`) both filter on this.
@Index(['parent'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Localized translations for category name and SEO metadata' })
  translations: Record<string, any> | null;

  @Column({ type: 'varchar', nullable: true })
  icon: string | null;

  @Column({ type: 'varchar', nullable: true })
  image: string | null;

  @Column({ default: 0 })
  sort_order: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'varchar', nullable: true })
  seo_title: string | null;

  @Column({ type: 'varchar', nullable: true })
  seo_description: string | null;

  @TreeParent()
  @JoinColumn({ name: 'parent_id' })
  parent: Category;

  @TreeChildren()
  children: Category[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
