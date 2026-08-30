import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { GroceryItem } from './grocery-item.entity';
import { GroceryOrder } from './grocery-order.entity';

@Entity('grocery_stores')
export class GroceryStore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: '' })
  name: string | null;

  @Column({ type: 'varchar', unique: true, length: 128, nullable: true })
  slug: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Localized translations for store name and address' })
  translations: Record<string, any> | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  ownerId: string | null; // Links to Auth Service user

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, default: 0 })
  longitude: number | null;

  @Column('simple-array', { nullable: true })
  storeTypes: string[]; // e.g. Supermarket, Butchery, Organic

  @Column({ default: false })
  isOnline: boolean;

  @Column({ default: true })
  isHyperlocalDeliveryAvailable: boolean; // Flags for 10km radius delivery

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.0, comment: 'Delivery radius in km' })
  deliveryRadius: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Minimum order amount for delivery' })
  minOrderAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'jsonb', nullable: true, comment: '{ mon: { open: "06:00", close: "22:00" }, ... }' })
  openingHours: Record<string, { open: string; close: string }>;

  @Column('simple-array', { nullable: true })
  tags: string[]; // e.g. 'Featured', 'New', '24/7'

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  /**
   * Denormalized catalogue size, kept in step by createProduct/deleteProduct/
   * bulkImport. It did not exist while those three called
   * `storeRepo.increment(…, 'productCount', …)`, so TypeORM threw
   * EntityPropertyNotFoundError *after* the write had already committed and the
   * catch block reported a fabricated result — most damagingly a successful bulk
   * import returning `{ uploaded: 0, errors: <all> }`.
   *
   * The store list needs a count without joining every item, which is why this is
   * a column rather than a derived value; `getStoreById` still reports the exact
   * `inventory.length` so a drifted counter self-corrects on the detail view.
   */
  @Column({ type: 'int', default: 0 })
  productCount: number;

  /**
   * Commercial placement — the "Featured & Sponsored" rail on the storefront.
   *
   * The rail, its crown badge and the `SPONSORED STORE` ribbon were all built,
   * and `railsFor()` gates the trending rail on this flag, but no such column
   * existed on the table, the entity or the API. `isPromoted` was therefore
   * always `undefined`, the filter never matched, and the rail could only ever
   * render demo fixtures.
   *
   * Defaults to false: placement is something an admin grants, not a property a
   * store arrives with.
   */
  @Column({ type: 'boolean', default: false })
  isPromoted: boolean;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  bannerUrl: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @OneToMany(() => GroceryItem, (item) => item.store)
  inventory: GroceryItem[];

  @OneToMany(() => GroceryOrder, (order) => order.store)
  orders: GroceryOrder[];

  @Column({
    type: 'enum',
    enum: ['PENDING_KYC', 'APPROVED', 'SUSPENDED'],
    default: 'PENDING_KYC',
  })
  status: string;

  @Column({ type: 'varchar', name: 'franchise_id', nullable: true })
  franchiseId: string | null;

  /**
   * Indexed because every store listing now filters on it — the region scope
   * added so a shopper who declines the location prompt is not offered shops in
   * another country.
   */
  @Index()
  @Column({ type: 'varchar', name: 'region_code', nullable: true, length: 8 })
  regionCode: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
