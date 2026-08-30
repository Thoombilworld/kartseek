import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('seller_wallets')
export class SellerWallet {
  @PrimaryColumn()
  sellerId: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  availableBalance: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  escrowBalance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
