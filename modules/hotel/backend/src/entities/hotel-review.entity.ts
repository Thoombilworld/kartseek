import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Hotel } from './hotel.entity';

@Entity({ name: 'hotel_reviews', schema: 'hotel' })
export class HotelReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Hotel, (hotel) => hotel.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hotel_id' })
  hotel: Relation<Hotel>;

  @Column({ name: 'hotel_id' })
  hotelId: string;

  @Index()
  @Column()
  customerId: string;

  @Column({ length: 128 })
  customerName: string;

  @Column({ type: 'varchar', nullable: true })
  customerAvatar: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Links to the booking being reviewed' })
  bookingId: string | null;

  // ── Ratings ─────────────────────────────────────────────────────────────────

  @Column({ type: 'smallint', comment: 'Overall 1-5 star rating' })
  rating: number;

  @Column({ type: 'smallint', nullable: true, comment: 'Cleanliness 1-5' })
  cleanlinessRating: number | null;

  @Column({ type: 'smallint', nullable: true, comment: 'Service 1-5' })
  serviceRating: number | null;

  @Column({ type: 'smallint', nullable: true, comment: 'Location 1-5' })
  locationRating: number | null;

  @Column({ type: 'smallint', nullable: true, comment: 'Value for money 1-5' })
  valueRating: number | null;

  @Column({ type: 'smallint', nullable: true, comment: 'Amenities 1-5' })
  amenitiesRating: number | null;

  // ── Content ─────────────────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photos: string[];

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'e.g. Solo, Couple, Family, Business, Group',
  })
  stayType: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Room type the guest stayed in',
  })
  roomType: string | null;

  @Column({ type: 'date', nullable: true, comment: 'When the guest stayed' })
  stayDate: string | null;

  // ── Hotel Response ──────────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  hotelReply: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  repliedAt: Date | null;

  // ── Helpfulness ─────────────────────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  helpfulCount: number;

  @Column({ type: 'int', default: 0 })
  notHelpfulCount: number;

  // ── Moderation ──────────────────────────────────────────────────────────────

  @Column({ default: false })
  isFlagged: boolean;

  @Column({ type: 'text', nullable: true })
  flagReason: string | null;

  @Column({ default: true })
  isVisible: boolean;

  /**
   * Who moderated this review, and why.
   *
   * `isFlagged`/`isVisible` recorded the OUTCOME of a moderation decision and
   * nothing about the decision itself, so a review that had been hidden was
   * indistinguishable from one that had never been looked at, and no operator
   * could say who hid it. `admin_hotel_moderate_review` writes all three, from
   * the verified token — `flagReason` stays what it has always been, the reason
   * a review was FLAGGED, which is not the same sentence as the reason an
   * administrator acted on it.
   */
  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'The administrator who last moderated this review',
  })
  moderatedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  moderatedAt: Date | null;

  @Column({ type: 'text', nullable: true, comment: 'Why the administrator approved or removed it' })
  moderationReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
