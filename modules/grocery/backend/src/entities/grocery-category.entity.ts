import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

@Entity({ name: 'grocery_categories', schema: 'grocery' })
export class GroceryCategory {
  /**
   * Slug, namespaced by ancestors — e.g.
   * `international-and-specialty-foods--indian-foods--masalas`.
   *
   * 128, not 64: a three-rung id runs past 64 and silently truncated, which
   * collides siblings whose names share a prefix. Category ids stay well inside
   * 64 because `grocery_items.category` is that wide; sub-category ids may be
   * longer because products store a sub-category by *name*, never by id.
   */
  @PrimaryColumn({ type: 'varchar', length: 128 })
  id: string;

  @Column({ length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  emoji: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  gradient: string | null; // Tailwind gradient class, e.g. 'from-green-600 to-emerald-500'

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Localized translations: { ar: { name, description }, ... }',
  })
  translations: Record<string, { name?: string; description?: string }>;

  // ── Self-referencing catalogue tree ────────────────────────────────────────
  /**
   * Which rung of the catalogue this row sits on.
   *
   * The tree columns existed but nothing used them: all 23 rows were top-level
   * with `parentId` NULL, each carrying a `subcategoryCount` of 2–6 for
   * subcategories that had no rows at all. Products referenced their
   * subcategory as free text (`grocery_items.subCategory = 'Leafy Greens'`),
   * so there was nothing to browse, validate or map against.
   *
   * Depth alone could imply the level, but naming it makes the queries and the
   * validation direct — "give me the departments" is a filter, not a recursion.
   */
  @Column({ type: 'varchar', length: 16, default: 'category' })
  level: 'department' | 'category' | 'subcategory';

  @Column({ type: 'varchar', nullable: true })
  parentId: string | null;

  /**
   * Markets this node is offered in. NULL means every market.
   *
   * The taxonomy is shared across India, the GCC, the UK and the USA, but not
   * every branch travels — beef is not in the Indian catalogue, ghee and
   * traditional sweets have no mainstream aisle in the UK or the US. Scoping
   * the node rather than forking the taxonomy keeps one tree with local
   * differences, instead of four trees that drift.
   */
  @Column({ type: 'jsonb', nullable: true })
  countries: string[] | null;

  @ManyToOne(() => GroceryCategory, (cat) => cat.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent: Relation<GroceryCategory>;

  @OneToMany(() => GroceryCategory, (cat) => cat.parent)
  children: Relation<GroceryCategory[]>;

  // ── Display & filtering ───────────────────────────────────────────────────
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0, comment: 'Denormalized product count for fast display' })
  productCount: number;

  @Column({ type: 'int', default: 0 })
  subcategoryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
