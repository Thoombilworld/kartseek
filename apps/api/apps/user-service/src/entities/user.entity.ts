import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * User entity — must match the auth-service User entity exactly for shared columns.
 * The auth-service entity is the source of truth for the core `users` table schema.
 *
 * Any extra columns added here MUST be nullable with defaults to prevent
 * ALTER TABLE conflicts during TypeORM synchronize.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  lastName: string | null;

  @Column({ default: true })
  isActive: boolean;

  // ── Extended profile fields (user-service only) ──────────────────────────
  // These are safe to add because they're nullable with defaults.

  @Column({ type: 'varchar', nullable: true, default: 'customer' })
  role: string | null;

  @Column({ type: 'varchar', nullable: true, default: 'IN' })
  country: string | null;

  @Column({ type: 'varchar', nullable: true, default: 'active' })
  status: string | null;

  @Column({ type: 'boolean', nullable: true, default: false })
  isEmailVerified: boolean | null;

  @Column({ type: 'boolean', nullable: true, default: false })
  isPhoneVerified: boolean | null;

  @Column({ type: 'boolean', nullable: true, default: false })
  isKycVerified: boolean | null;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
