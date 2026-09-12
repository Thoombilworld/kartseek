import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Hotel } from './hotel.entity';
import { HotelRoom } from './hotel-room.entity';

@Entity({ name: 'hotel_seasonal_pricing', schema: 'hotel' })
export class HotelSeasonalPricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Hotel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hotel_id' })
  hotel: Relation<Hotel>;

  @Column({ name: 'hotel_id' })
  hotelId: string;

  @Index()
  @ManyToOne(() => HotelRoom, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Relation<HotelRoom>;

  @Column({
    type: 'varchar',
    name: 'room_id',
    nullable: true,
    comment: 'Null = applies to all rooms',
  })
  roomId: string | null;

  @Column({ length: 128, comment: 'e.g. Summer Peak, Eid Holiday, Winter Special' })
  name: string;

  @Index()
  @Column({ type: 'date' })
  startDate: string;

  @Index()
  @Column({ type: 'date' })
  endDate: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Multiplier (1.25 = 25% increase)',
  })
  multiplier: number | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: 'Fixed price override (takes priority over multiplier)',
  })
  fixedPrice: number | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Day-of-week overrides: { "friday": 1.3, "saturday": 1.3 }',
  })
  dayOfWeekMultipliers: Record<string, number>;

  @Column({ type: 'int', default: 0, comment: 'Higher priority wins conflicts' })
  priority: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
