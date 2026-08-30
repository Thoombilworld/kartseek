import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('service_areas')
export class ServiceArea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  moduleType: string; // 'marketplace', 'grocery', 'pharmacy', 'restaurant', 'doctor', 'taxi'

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  polygon: any;

  @Column({ default: true })
  active: boolean;
}
