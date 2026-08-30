import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

// ─── Geo Security Event (Audit Log) ─────────────────────────────────────────

@Entity('geo_security_event')
export class GeoSecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 45 })
  @Index()
  ip: string;

  @Column({ length: 100, nullable: true })
  userId: string;

  @Column({ length: 30 })
  @Index()
  eventType: string; // 'vpn_detected' | 'proxy_detected' | 'tor_detected' | 'location_mismatch' | 'datacenter_ip' | 'blocked' | 'warned'

  @Column({ length: 2, nullable: true })
  ipCountry: string;

  @Column({ length: 100, nullable: true })
  ipCity: string;

  @Column({ length: 2, nullable: true })
  gpsCountry: string;

  @Column({ length: 100, nullable: true })
  gpsCity: string;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  gpsLat: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  gpsLng: number;

  @Column({ default: false })
  isVpn: boolean;

  @Column({ default: false })
  isProxy: boolean;

  @Column({ default: false })
  isTor: boolean;

  @Column({ default: false })
  isDatacenter: boolean;

  @Column({ length: 200, nullable: true })
  isp: string;

  @Column({ length: 100, nullable: true })
  org: string;

  @Column({ length: 20, default: 'blocked' })
  action: string; // 'blocked' | 'warned' | 'allowed' | 'whitelisted'

  @Column({ length: 50, nullable: true })
  userAgent: string;

  @Column({ length: 20, nullable: true })
  platform: string; // 'web' | 'android' | 'ios' | 'partner'

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}

// ─── Geo Security Rule (Admin Config) ────────────────────────────────────────

@Entity('geo_security_rule')
export class GeoSecurityRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  ruleKey: string; // 'vpn_policy', 'proxy_policy', 'tor_policy', 'mismatch_threshold_km'

  @Column({ length: 200 })
  ruleValue: string; // 'block' | 'warn' | 'allow' | numeric

  @Column({ length: 2, nullable: true })
  countryCode: string; // null = global, or country-specific

  @Column({ length: 50, nullable: true })
  role: string; // null = all, or 'admin', 'seller', 'driver'

  @Column({ default: true })
  isActive: boolean;

  @Column('text', { nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}

// ─── Whitelisted IP ──────────────────────────────────────────────────────────

@Entity('geo_whitelisted_ip')
export class GeoWhitelistedIp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 45, unique: true })
  ip: string;

  @Column({ length: 200, nullable: true })
  reason: string;

  @Column({ length: 100, nullable: true })
  addedBy: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
