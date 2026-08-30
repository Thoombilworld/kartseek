import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('page_layouts')
@Index(['moduleName', 'pageName'], { unique: true })
export class PageLayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  moduleName: string;

  @Column({ type: 'varchar', length: 100 })
  pageName: string;

  @Column({ type: 'jsonb', default: [] })
  sections: any[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
