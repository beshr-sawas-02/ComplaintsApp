import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Rating extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Complaint', required: true })
  complaintId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ default: null })
  feedback: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);
RatingSchema.index({ complaintId: 1 });
RatingSchema.index({ userId: 1 });
RatingSchema.index({ complaintId: 1, userId: 1 }, { unique: true });