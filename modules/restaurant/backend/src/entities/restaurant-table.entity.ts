import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Restaurant } from './restaurant.entity';

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  CLEANING = 'CLEANING',
  BLOCKED = 'BLOCKED',
}

@Entity('restaurant_tables')
export class RestaurantTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Restaurant, (r) => r.tables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Relation<Restaurant>;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Column({ length: 20, comment: 'e.g. T-01, A5, Patio-3' })
  tableNumber: string;

  @Column({ type: 'int', comment: 'Maximum seating capacity' })
  capacity: number;

  @Column({ length: 50, default: 'main', comment: 'e.g. main, rooftop, outdoor, private, patio' })
  area: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'e.g. round, square, booth' })
  shape: string | null;

  @Column({ type: 'enum', enum: TableStatus, default: TableStatus.AVAILABLE })
  status: TableStatus;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
