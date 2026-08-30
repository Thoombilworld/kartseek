import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  url: string;

  @Column({ type: 'varchar', nullable: true })
  altText: string | null;

  @Column({ default: 0, comment: 'Display order — lower is first' })
  sortOrder: number;

  @Column({ default: false, comment: 'True if this is the primary display image' })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
