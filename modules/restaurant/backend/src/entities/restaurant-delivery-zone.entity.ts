import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A serviceable delivery area for the restaurant vertical.
 *
 * `admin.restaurant.zones` and `admin.restaurant.createZone` have been routed by
 * the gateway since it was written and nothing on the service side ever stored a
 * zone — the console's Delivery Zones screen listed ten hardcoded rows and its
 * "Add Zone" button posted into a command with no handler. This is the table
 * those two endpoints were written against, and it is deliberately the same
 * shape grocery already uses (`grocery_delivery_zones`): a zone is matched to an
 * order by pincode first (exact, cheap) and by radius from the zone centre
 * otherwise, so both are held here.
 *
 * ── The market is the zone's OWN column ─────────────────────────────────────
 *
 * Unlike orders, menu items and complaints — which are attributed through the
 * restaurant they belong to — a zone belongs to a market directly and to no
 * restaurant, so it carries `region_code` itself. `length: 8` matches
 * `restaurants.region_code`, and every predicate over it narrows with
 * `LEFT(region_code, 2)` for the same reason that column does: this module
 * stores sub-regions ('QA-DOH') and the caller's scope is always ISO-2.
 *
 * A zone with no market would be unattributable — nobody's to edit and
 * everybody's to see — so `createZone` requires one: a locked administrator's
 * own, or a market a global administrator names explicitly.
 */
@Entity({ name: 'restaurant_delivery_zones', schema: 'restaurant' })
export class RestaurantDeliveryZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 128 })
  name: string;

  /** ISO-2 market (or a sub-region of one), matching `restaurants.region_code`. */
  @Index()
  @Column({ type: 'varchar', name: 'region_code', length: 8 })
  regionCode: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  city: string | null;

  /** Exact-match pincodes served by this zone. */
  @Column('simple-array', { nullable: true })
  pincodes: string[];

  @Column({ type: 'decimal', name: 'center_lat', precision: 10, scale: 7, nullable: true })
  centerLat: number | null;

  @Column({ type: 'decimal', name: 'center_lng', precision: 10, scale: 7, nullable: true })
  centerLng: number | null;

  @Column({
    type: 'decimal',
    name: 'radius_km',
    precision: 5,
    scale: 2,
    default: 10,
    comment: 'Radius in km from the zone centre',
  })
  radiusKm: number;

  @Column({ type: 'decimal', name: 'delivery_fee', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', name: 'min_order_amount', precision: 10, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({
    type: 'int',
    name: 'eta_minutes',
    default: 40,
    comment: 'Promised delivery window in minutes',
  })
  etaMinutes: number;

  @Index()
  @Column({ default: true })
  isActive: boolean;

  /** The administrator who created it — every write in this module records one. */
  @Column({ type: 'varchar', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
