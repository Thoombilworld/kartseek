import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { GroceryItem } from './grocery-item.entity';
import { GroceryStore } from './grocery-store.entity';

@Entity('grocery_reviews')
export class GroceryReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  productId: string;

  @Column()
  @Index()
  storeId: string;

  @Column()
  @Index()
  customerId: string;

  @Column({ nullable: true })
  customerName?: string;

  @Column('int')
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ default: false })
  isVerifiedPurchase: boolean;

  @ManyToOne(() => GroceryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId', referencedColumnName: 'id' })
  product?: Relation<GroceryItem>;

  @ManyToOne(() => GroceryStore, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId', referencedColumnName: 'id' })
  store?: Relation<GroceryStore>;

  @CreateDateColumn()
  createdAt: Date;
}
