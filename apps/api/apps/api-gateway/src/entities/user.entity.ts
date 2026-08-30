/**
 * Gateway-local User Entity
 *
 * This is the gateway's own copy of the User entity schema.
 * It maps to the same `users` table but is defined here to avoid
 * cross-module imports from auth-service. Both the gateway and
 * auth-service share the same database in dev mode.
 */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
