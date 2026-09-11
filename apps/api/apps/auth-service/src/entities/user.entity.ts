import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  DRIVER = 'DRIVER',
  FRANCHISE = 'FRANCHISE',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({ type: 'varchar', nullable: true, default: '' })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true, default: '' })
  lastName: string | null;

  @Column({ default: true })
  isActive: boolean;

  /** Staff market scope — see the gateway's user entity and market-scope.ts. */
  @Column({ name: 'region_code', type: 'varchar', nullable: true })
  regionCode: string | null;

  @Column({ name: 'region_locked', type: 'boolean', default: false })
  regionLocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
