import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { GroceryItem } from './grocery-item.entity';
import { GroceryStore } from './grocery-store.entity';

/**
 * A saved product, tied to the product and shop it names.
 *
 * `productId` and `storeId` were plain `varchar` columns with no foreign key,
 * unlike every sibling table — `grocery_reviews` and `grocery_flash_deals` both
 * constrain theirs. So deleting a product left its wishlist rows behind
 * pointing at nothing, and the column type would not even have stopped a
 * non-uuid being written. The relations below give the database the same
 * cascade the rest of the schema has.
 *
 * `customerId` stays `varchar`: user ids come from auth-service and are not
 * uuids, which is also why the service validates it with `requireId` rather
 * than `requireUuid`.
 */
@Entity({ name: 'grocery_wishlists', schema: 'grocery' })
@Unique(['customerId', 'productId'])
export class GroceryWishlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  customerId: string;

  @ManyToOne(() => GroceryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Relation<GroceryItem>;

  @Column({ type: 'uuid' })
  @Index()
  productId: string;

  @ManyToOne(() => GroceryStore, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<GroceryStore>;

  @Column({ type: 'uuid' })
  storeId: string;

  @Column({ nullable: true })
  productName?: string;

  @CreateDateColumn()
  createdAt: Date;
}
