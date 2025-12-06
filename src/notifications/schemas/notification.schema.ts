import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationType {
  STATUS_UPDATE = 'status_update',
  NEW_COMMENT = 'new_comment',
}

export enum ComplaintStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Complaint', required: true })
  complaintId: Types.ObjectId;

  @Prop({ default: null })
  file: string;

  @Prop({ required: true })
  message: string;

  @Prop({ 
    required: true, 
    enum: NotificationType 
  })
  type: NotificationType;

  @Prop({ 
    enum: ComplaintStatus,
    default: ComplaintStatus.PENDING 
  })
  oldStatus: ComplaintStatus;

  @Prop({ 
    enum: ComplaintStatus,
    default: ComplaintStatus.PENDING 
  })
  newStatus: ComplaintStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo: Types.ObjectId;

  @Prop({ default: null })
  note: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ complaintId: 1 });
NotificationSchema.index({ assignedTo: 1 });