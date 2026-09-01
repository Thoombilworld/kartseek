import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { PharmacyStore } from './pharmacy-store.entity';

export enum DosageForm {
  TABLET = 'TABLET',
  CAPSULE = 'CAPSULE',
  SYRUP = 'SYRUP',
  INJECTION = 'INJECTION',
  CREAM = 'CREAM',
  OINTMENT = 'OINTMENT',
  DROPS = 'DROPS',
  INHALER = 'INHALER',
  POWDER = 'POWDER',
  GEL = 'GEL',
  SPRAY = 'SPRAY',
  PATCH = 'PATCH',
  SUPPOSITORY = 'SUPPOSITORY',
  OTHER = 'OTHER',
}

@Entity('pharmacy_items')
export class PharmacyItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => PharmacyStore, (s) => s.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Relation<PharmacyStore>;

  @Column({ type: 'varchar', name: 'store_id', nullable: true })
  storeId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: '' })
  name: string | null;

  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true })
  slug: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Generic/salt name e.g. Paracetamol' })
  genericName: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Full composition e.g. Paracetamol 500mg + Caffeine 50mg' })
  composition: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, default: '' })
  manufacturer: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Category ID' })
  categoryId: string | null;

  // ── Pricing ─────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  price: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Maximum Retail Price' })
  mrp: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, comment: 'Tax percentage' })
  taxPercent: number;

  // ── Medicine Info ───────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: DosageForm, default: DosageForm.TABLET })
  dosageForm: DosageForm;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'e.g. 500mg, 250ml' })
  strength: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'e.g. Strip of 10 tablets, Bottle of 100ml' })
  packSize: string | null;

  @Column({ default: false })
  requiresPrescription: boolean;

  @Column({ default: false, comment: 'Schedule H / restricted drug' })
  isScheduleHDrug: boolean;

  @Column({ default: false, comment: 'Requires cold-chain storage/delivery' })
  coldChainRequired: boolean;

  @Column('simple-array', { nullable: true, comment: 'e.g. Lactose, Gluten' })
  allergens: string[];

  @Column({ type: 'text', nullable: true })
  sideEffects: string | null;

  @Column({ type: 'text', nullable: true })
  dosageInstructions: string | null;

  @Column('simple-array', { nullable: true, comment: 'e.g. Bestseller, Generic, Organic' })
  tags: string[];

  // ── Barcode / Product Identification ────────────────────────────────────────

  @Index()
  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'EAN-13 / EAN-8 / UPC-A barcode' })
  barcode: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'Global Trade Item Number' })
  gtin: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, comment: 'Manufacturer SKU / internal code' })
  sku: string | null;

  // ── Images ──────────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  galleryUrls: string[];

  // ── Availability ────────────────────────────────────────────────────────────

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ type: 'int', default: 0, comment: 'Current stock level' })
  stockLevel: number;

  @Column({ type: 'int', default: 10, comment: 'Reorder alert threshold' })
  reorderLevel: number;

  @Column({ type: 'int', default: 10, comment: 'Max qty per order' })
  maxQuantityPerOrder: number;

  // ── Ratings ─────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'int', default: 0 })
  orderCount: number;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
