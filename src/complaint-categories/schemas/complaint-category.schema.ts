import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ComplaintCategory extends Document {
  @Prop({ required: true, unique: true })
  complaintItem: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  createdAt: Date;
}

export const ComplaintCategorySchema = SchemaFactory.createForClass(ComplaintCategory);
ComplaintCategorySchema.index({ complaintItem: 1 });