export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface AuditableEntity extends BaseEntity {
  createdBy?: string;
  updatedBy?: string;
}
