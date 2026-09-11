import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A named set of console permissions, assignable to a staff account.
 *
 * Lives in its own `admin` schema rather than `public`: this is platform
 * identity, not application data, and keeping it separate makes it obvious
 * that a market-scoped query has no business here. The schema is declared on
 * the entity, so the gateway connection's `public` default does not apply.
 *
 * `is_system` marks the six roles the migration seeds. They cannot be deleted
 * and `super_admin` cannot be edited — an operator who could narrow either
 * could lock every administrator out of the platform from a web form.
 */
@Entity({ schema: 'admin', name: 'admin_roles' })
export class AdminRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stable machine name (`regional_admin`). What code and seeds refer to. */
  @Column({ type: 'varchar', length: 40, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  description: string | null;

  /** Keys from `ADMIN_PERMISSIONS`, or the single wildcard `*`. */
  @Column({ type: 'text', array: true, default: '{}' })
  permissions: string[];

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
