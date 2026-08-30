import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ collection: 'audit_logs', timestamps: true, versionKey: false })
export class AuditLog {
  @Prop({ required: true }) actionType: string;       // e.g. 'seller.approved'
  @Prop({ required: true }) actorId: string;           // admin/user ID
  @Prop() actorEmail: string;
  @Prop() actorRole: string;
  @Prop() actorIp: string;
  @Prop() entityType: string;                          // 'Seller' | 'Product' | etc.
  @Prop() entityId: string;
  @Prop({ type: Object }) oldValue: Record<string, unknown>;
  @Prop({ type: Object }) newValue: Record<string, unknown>;
  @Prop() reason: string;
  @Prop({ type: Object }) metadata: Record<string, unknown>;
  @Prop({ default: false }) isSensitive: boolean;      // medical/financial actions
  @Prop({ required: true }) country: string;
  @Prop({ required: true }) service: string;           // originating microservice
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
// Immutability: disable update and delete
AuditLogSchema.pre('findOneAndUpdate', function () { throw new Error('AuditLog is immutable'); });
AuditLogSchema.pre('deleteOne', function () { throw new Error('AuditLog cannot be deleted'); });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ actionType: 1 });
