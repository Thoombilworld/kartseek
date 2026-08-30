import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  ownerId: string;

  @Column({ type: 'enum', enum: ['doctor', 'hospital', 'clinic'] })
  @Index()
  ownerType: 'doctor' | 'hospital' | 'clinic';

  @Column({ type: 'enum', enum: ['medical_license', 'registration_certificate', 'id_proof', 'degree_certificate', 'establishment_license', 'insurance', 'tax_certificate', 'other'] })
  documentType: string;

  @Column({ length: 200 })
  documentName: string;

  @Column({ length: 1000 })
  fileUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fileType: string | null; // pdf, jpg, png

  @Column({ type: 'int', nullable: true })
  fileSizeBytes: number | null;

  @Column({ type: 'enum', enum: ['pending', 'verified', 'rejected', 'expired'], default: 'pending' })
  @Index()
  status: 'pending' | 'verified' | 'rejected' | 'expired';

  @Column({ type: 'varchar', nullable: true })
  verifiedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'date', nullable: true })
  expiryDate: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
