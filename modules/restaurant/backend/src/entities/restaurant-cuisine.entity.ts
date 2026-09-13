import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * The platform's cuisine catalogue — one list for every market.
 *
 * ── Why this table exists ───────────────────────────────────────────────────
 *
 * `admin.restaurant.cuisines` answered from an aggregate over
 * `restaurants.cuisines` (a `simple-array` of free text), and
 * `admin.restaurant.createCuisine` had no handler at all. That pair cannot be
 * completed without storage: an aggregate over the restaurants that already use
 * a cuisine has nowhere to put a cuisine no restaurant uses yet, so the Cuisines
 * screen's "Add" button either writes nothing (the placeholder API this plan
 * exists to remove) or the read has to invent a row it did not store.
 *
 * So the catalogue is a table and the read is the UNION of the two: every
 * catalogued cuisine, plus every cuisine a restaurant actually names that has
 * not been catalogued yet, each with its live restaurant count. A cuisine an
 * operator adds is visible immediately with a count of zero; a cuisine typed
 * into a restaurant's profile still appears, because hiding it would make the
 * admin list disagree with the storefront's — which is the class of bug audit
 * I4 recorded for this module's market filter.
 *
 * ── No market column, deliberately ──────────────────────────────────────────
 *
 * "Levantine" is the same cuisine in Doha and in Mumbai. The gateway already
 * treats this taxonomy as global — `@GlobalEntity('restaurant taxonomy is
 * shared by every market')` on the read, `refuseLockedAdmin` on the write — and
 * a `region_code` here would make a regional admin's addition invisible to
 * every other market while still competing for the same name. The write is
 * withheld from a locked administrator instead (`refuseUnattributable`), which
 * is the same ruling pharmacy's categories take.
 */
@Entity({ name: 'restaurant_cuisines', schema: 'restaurant' })
export class RestaurantCuisine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The display name, and the value that has to match `restaurants.cuisines`.
   *
   * Unique, because two rows named "Italian" would be counted twice by the
   * read and the console would offer the operator a choice between two
   * identical entries.
   */
  @Index({ unique: true })
  @Column({ length: 128 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 128 })
  slug: string;

  /** An emoji or short glyph the console shows beside the name. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  icon: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  /**
   * A retired cuisine stays in the table rather than being deleted: the
   * restaurants that already name it keep their profile, and the count on the
   * admin screen keeps telling the operator how many would be affected.
   */
  @Column({ default: true })
  isActive: boolean;

  /** The administrator who added it — every write in this module records one. */
  @Column({ type: 'varchar', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
