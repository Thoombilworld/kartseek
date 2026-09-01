import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Prescription } from './prescription.entity';

@Entity('prescription_items')
export class PrescriptionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  prescriptionId: string;

  @ManyToOne(() => Prescription, (p) => p.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prescriptionId' })
  prescription: Relation<Prescription>;

  @Column({ length: 300 })
  drugName: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  genericName: string | null;

  @Column({ length: 100 })
  dosage: string;

  @Column({ length: 100 })
  frequency: string;

  @Column({ length: 100 })
  duration: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  /** Sort order within the prescription */
  @Column({ type: 'int', default: 0 })
  order: number;
}
