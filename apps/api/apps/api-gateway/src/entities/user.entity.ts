/**
 * Gateway-local User Entity
 *
 * This is the gateway's own copy of the User entity schema.
 * It maps to the same `users` table but is defined here to avoid
 * cross-module imports from auth-service. Both the gateway and
 * auth-service share the same database in dev mode.
 */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole, type SellerType } from '@app/common';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  /**
   * Null for accounts that have never had a password — a phone-first sign-up
   * authenticates by one-time code, not by a credential. The column has always
   * been nullable in the database; declaring it non-null here meant the entity
   * disagreed with the schema, and pushed `/auth/otp/verify` into inventing a
   * placeholder hash derived from the phone number to satisfy the type.
   *
   * `login()` refuses a null hash rather than comparing against it.
   */
  @Column({ nullable: true, type: 'varchar' })
  passwordHash: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  /**
   * Which seller portal this account belongs to, or null for a non-seller.
   *
   * This is the authoritative answer to "which module is this seller?" — the
   * clients used to decide it themselves (a dropdown on the web, a substring
   * match on the email address in the seller app), which made portal isolation
   * unenforceable. `role` cannot carry it: marketplace, hotel and taxi sellers
   * are all plain `seller`.
   */
  @Column({ name: 'seller_type', type: 'varchar', nullable: true })
  sellerType: SellerType | null;

  /**
   * The market a staff account administers and whether it is confined to it.
   * A region-locked ADMIN is the "regional admin": every promotion, banner,
   * coupon and flash deal they touch is forced into this market and anything
   * belonging to another one answers 403. SUPER_ADMIN is global whatever these
   * say. Both ride in the JWT so the gateway enforces them from a signed claim
   * rather than from the admin console's own state — which is where the lock
   * used to live, as a demo table in the login page.
   */
  @Column({ name: 'region_code', type: 'varchar', nullable: true })
  regionCode: string | null;

  @Column({ name: 'region_locked', type: 'boolean', default: false })
  regionLocked: boolean;

  /**
   * The admin role whose permissions this account holds — a row in
   * `admin.admin_roles`, or null for a non-staff account (and for a staff
   * account an operator has not assigned one to yet).
   *
   * `type: 'uuid'` is not optional decoration: a `string | null` property with
   * no explicit type reflects as `Object` and the gateway refuses to boot.
   */
  @Column({ name: 'admin_role_id', type: 'uuid', nullable: true })
  adminRoleId: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  lastName: string | null;

  @Column({ default: true })
  isActive: boolean;

  /**
   * Account lifecycle state. Customers are `active` immediately; a seller who
   * signs themselves up starts `pending` and stays out of the portal until an
   * admin approves them — otherwise anyone could register as, say, a pharmacy
   * seller and walk straight in.
   */
  @Column({ type: 'varchar', default: 'active' })
  status: string;

  /**
   * Why the account was last suspended, and when — written by the moderation
   * action in admin-service and cleared again when the ban is lifted, so
   * "never banned" and "ban lifted" read the same. The account's own state is
   * `status` (`suspended`); these two are the record behind it.
   *
   * `type` is explicit on both: a `string | null` / `Date | null` property with
   * no explicit type reflects as `Object` and the gateway refuses to boot.
   */
  @Column({ name: 'banned_reason', type: 'text', nullable: true })
  bannedReason: string | null;

  @Column({ name: 'banned_at', type: 'timestamptz', nullable: true })
  bannedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
