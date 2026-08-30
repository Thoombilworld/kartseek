import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { MenuCategory } from './menu-category.entity';

export enum DietaryType {
  VEG = 'VEG',
  NON_VEG = 'NON_VEG',
  VEGAN = 'VEGAN',
  EGG = 'EGG',
}

export enum FoodType {
  APPETIZER = 'APPETIZER',
  MAIN_COURSE = 'MAIN_COURSE',
  DESSERT = 'DESSERT',
  BEVERAGE = 'BEVERAGE',
  SIDE = 'SIDE',
  COMBO = 'COMBO',
  OTHER = 'OTHER',
}

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => MenuCategory, (cat) => cat.items, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: MenuCategory;

  @Column({ type: 'varchar', name: 'category_id', nullable: true })
  categoryId: string | null;

  @Index()
  @Column({ comment: 'Denormalized for fast queries' })
  restaurantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  slug: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Original price before discount' })
  originalPrice: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, comment: 'Tax percentage on this item' })
  taxPercent: number;

  // ── Food Info ───────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: DietaryType, default: DietaryType.NON_VEG })
  dietaryType: DietaryType;

  @Column({ type: 'enum', enum: FoodType, default: FoodType.MAIN_COURSE })
  foodType: FoodType;

  @Column('simple-array', { nullable: true, comment: 'e.g. Gluten, Peanuts, Dairy' })
  allergens: string[];

  @Column({ type: 'jsonb', nullable: true, comment: '{ calories, protein, carbs, fat }' })
  nutritionInfo: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };

  @Column('simple-array', { nullable: true, comment: 'e.g. Bestseller, New, Chefs Special' })
  tags: string[];

  @Column({ type: 'int', default: 15, comment: 'Preparation time in minutes' })
  prepTime: number;

  // ── Images ──────────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  galleryUrls: string[];

  // ── Customization Options ───────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true, comment: 'Add-on groups with options and pricing' })
  customizations: Array<{
    groupName: string;
    required: boolean;
    multiSelect: boolean;
    minSelect?: number;
    maxSelect?: number;
    options: Array<{
      name: string;
      price: number;
      isDefault?: boolean;
    }>;
  }>;

  // ── Portion Sizes ───────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true, comment: 'Size variants with different prices' })
  sizeVariants: Array<{
    name: string;
    price: number;
    isDefault?: boolean;
  }>;

  // ── Availability ────────────────────────────────────────────────────────────

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ default: false, comment: 'Admin must approve menu changes' })
  isPendingApproval: boolean;

  @Column({ type: 'int', nullable: true, comment: 'Null = unlimited' })
  stockQuantity: number | null;

  @Column({ type: 'int', default: 20, comment: 'Max qty per order' })
  maxQuantityPerOrder: number;

  @Column({ type: 'jsonb', nullable: true, comment: 'Time-based availability' })
  availableHours: { startTime: string; endTime: string } | null;

  // ── Ratings ─────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'int', default: 0 })
  orderCount: number;

  // ── Sort ────────────────────────────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
