import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { City } from './city.entity';

@Entity('delivery_zones')
export class DeliveryZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => City)
  @JoinColumn({ name: 'city_id' })
  city: City;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  polygon: any;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  feePerKm: number;

  @Column({ default: true })
  active: boolean;
}
