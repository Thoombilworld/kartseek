import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'franchises', schema: 'franchise' })
export class Franchise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ name: 'business_name' })
  businessName: string;

  /**
   * MARKET COLUMN — ISO-2, the platform's `region_code` under another name.
   *
   * Franchise predates the convention and calls it `country_code`; every scope
   * check in this module reads THIS column, and a new entity here uses
   * `regionCode` (2026-09-12 audit I7). The register of exceptions lives in
   * `libs/common/src/market/market-scope.ts`, above `normaliseMarket`.
   *
   * It is also the market a franchise's money is FORMATTED in: amounts are
   * shown in the franchise's own country, not the viewer's, and BHD/KWD/OMR are
   * thousandths rather than hundredths.
   */
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
