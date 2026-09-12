import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Product } from './product.entity';

/**
 * ProductQuestion — Customer questions on product detail pages.
 *
 * Industry Reference:
 *   Amazon: "Customer Questions & Answers" — anyone can ask, seller/community answers
 *   Flipkart: "Questions & Answers" section with voting
 */
@Entity({ name: 'product_questions', schema: 'marketplace' })
@Index(['productId', 'createdAt'])
@Index(['customerId'])
export class ProductQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', nullable: true })
  customerName: string | null;

  @Column({ type: 'text', comment: 'The question text' })
  questionText: string;

  @Column({ type: 'int', default: 0, comment: 'Number of upvotes on the question' })
  upvoteCount: number;

  @Column({ default: 'PUBLISHED', comment: 'PUBLISHED, HIDDEN, FLAGGED, PENDING' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * ProductAnswer — Answers to product questions, from sellers, customers, or admins.
 */
@Entity({ name: 'product_answers', schema: 'marketplace' })
@Index(['questionId', 'createdAt'])
export class ProductAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'question_id' })
  questionId: string;

  @ManyToOne(() => ProductQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Relation<ProductQuestion>;

  @Column({ name: 'author_id', comment: 'User ID of the person who answered' })
  authorId: string;

  @Column({ type: 'varchar', nullable: true })
  authorName: string | null;

  @Column({
    type: 'enum',
    enum: ['SELLER', 'CUSTOMER', 'ADMIN'],
    default: 'CUSTOMER',
    comment: 'Role of the answer author',
  })
  authorRole: string;

  @Column({ type: 'text', comment: 'The answer text' })
  answerText: string;

  @Column({ type: 'int', default: 0, comment: 'Helpful votes' })
  helpfulCount: number;

  @Column({ default: false, comment: 'Marked as the official/accepted answer by seller' })
  isAccepted: boolean;

  @Column({ default: 'PUBLISHED', comment: 'PUBLISHED, HIDDEN, FLAGGED, PENDING' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
