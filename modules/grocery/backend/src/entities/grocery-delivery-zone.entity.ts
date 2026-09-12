import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A serviceable delivery area for the grocery vertical.
 *
 * The admin console has always had a Delivery Zones screen and the gateway has
 * always exposed `admin.grocery.deliveryZones` / `createDeliveryZone`, but nothing
 * on the service side ever stored one — the screen listed hardcoded rows and the
 * create button posted into a command with no handler. This is the table those two
 * endpoints were written against.
 *
 * Zones are matched to an order by pincode first (exact, cheap) and by radius from
 * the zone centre otherwise, which is why both are held here.
 */
@Entity({ name: 'grocery_delivery_zones', schema: 'grocery' })
export class GroceryDeliveryZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 128 })
  name: string;

  /** ISO-3166 alpha-2, matching `grocery_stores.region_code`. */
  @Index()
  @Column({ type: 'varchar', name: 'region_code', length: 8, nullable: true })
  regionCode: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  city: string | null;

  /** Exact-match pincodes served by this zone. */
  @Column('simple-array', { nullable: true })
  pincodes: string[];

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  centerLat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  centerLng: number | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 10,
    comment: 'Radius in km from the zone centre',
  })
  radiusKm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ type: 'int', default: 45, comment: 'Promised delivery window in minutes' })
  etaMinutes: number;

  @Index()
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
