import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('franchises')
export class Franchise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ name: 'business_name' })
  businessName: string;

  @Column({ name: 'country_code', length: 2 })
  countryCode: string;

  @Column('jsonb', { name: 'operational_zones', default: [] })
  operationalZones: string[];

  @Column('jsonb', { name: 'commission_rates', default: {} })
  commissionRates: Record<string, number>;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
