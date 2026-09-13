import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * The platform's amenity catalogue — one list, every market.
 *
 * ── Why a table at all ──────────────────────────────────────────────────────
 *
 * `admin.hotel.createAmenity` had no handler and nowhere to write: the only
 * record of an amenity was `hotels.amenities`, a `simple-array` on each
 * property. An amenity nobody has used yet has no row there, so "add Airport
 * shuttle to the catalogue" could not be expressed at all — and answering the
 * command with `{ success: true }` and no row is the placeholder API this plan
 * exists to remove. Same shape, and the same reasoning, as
 * `restaurant_cuisines` (M4).
 *
 * ── Why no market column ────────────────────────────────────────────────────
 *
 * "Pool", "Spa" and "Airport shuttle" mean the same thing in Doha and in Delhi,
 * so the catalogue is deliberately global: the gateway marks the read
 * `@GlobalEntity` and refuses the WRITE to a region-locked administrator, and
 * `HotelAdminService.createAmenity` refuses it a second time through
 * `refuseUnattributable`. A `countryCode` here would be a market column no
 * reader wanted and every writer would have had to invent a value for — the
 * dead-pair mistake F-35 records.
 *
 * ── `slug` is the identity ──────────────────────────────────────────────────
 *
 * Unique, derived from the name, and what the union in `listAmenities` matches
 * a hotel's own `amenities` entry against. Two rows called "Free Wi-Fi" and
 * "Free WiFi" would otherwise both be catalogued and neither would line up with
 * what the properties actually store.
 */
@Entity({ name: 'hotel_amenities', schema: 'hotel' })
export class HotelAmenity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 128, comment: 'Display name e.g. Airport shuttle' })
  name: string;

  @Index({ unique: true })
  @Column({ length: 128, comment: 'Lower-cased identity, matched against hotels.amenities' })
  slug: string;

  @Column({ type: 'varchar', length: 64, nullable: true, comment: 'Icon key for the console' })
  icon: string | null;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Grouping e.g. Wellness, Connectivity, Transport',
  })
  category: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'The administrator who created it, from the verified token',
  })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
