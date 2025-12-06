import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ComplaintLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Complaint', required: true })
  complaintId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actionBy: Types.ObjectId;

  @Prop({ required: true })
  actionType: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  createdAt: Date;
}

export const ComplaintLogSchema = SchemaFactory.createForClass(ComplaintLog);
ComplaintLogSchema.index({ complaintId: 1, createdAt: -1 });
ComplaintLogSchema.index({ actionBy: 1 });
