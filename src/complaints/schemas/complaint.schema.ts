import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ComplaintStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum ComplaintPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({ timestamps: true })
export class Complaint extends Document {
  declare _id: Types.ObjectId;
  @Prop({ required: true, unique: true })
  complaintId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ComplaintCategory', default: null })
categoryId: Types.ObjectId | string;


  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: null })
  location: string;

  @Prop({ 
    enum: ComplaintStatus, 
    default: ComplaintStatus.PENDING 
  })
  status: ComplaintStatus;

  @Prop({ 
    enum: ComplaintPriority, 
    default: ComplaintPriority.MEDIUM 
  })
  priority: ComplaintPriority;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo: Types.ObjectId;

  @Prop({ default: null })
  resolvedAt: Date;

  @Prop({ default: null })
  closedAt: Date;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ComplaintSchema = SchemaFactory.createForClass(Complaint);

ComplaintSchema.index({ userId: 1, createdAt: -1 });
ComplaintSchema.index({ complaintId: 1 });
ComplaintSchema.index({ status: 1 });
ComplaintSchema.index({ priority: 1 });
ComplaintSchema.index({ categoryId: 1 });
