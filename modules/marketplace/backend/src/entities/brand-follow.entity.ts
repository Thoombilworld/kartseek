import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Brand } from './brand.entity';

@Entity({ name: 'brand_follows', schema: 'marketplace' })
@Index(['userId', 'brandId'], { unique: true })
export class BrandFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'brand_id' })
  brandId: string;

  @ManyToOne(() => Brand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Relation<Brand>;

  @CreateDateColumn()
  createdAt: Date;
}
