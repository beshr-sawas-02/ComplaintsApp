import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum UserType {
  CITIZEN = 'citizen',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;


  @Prop({ required: true, unique: true })
  rationalId: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({
    required: true,
    enum: UserType,
    default: UserType.CITIZEN
  })
  userType: UserType;

  @Prop({ type: String, default: null })
  profileImage?: string | null;


  @Prop({ default: true })
  isActive: boolean;


}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ rationalId: 1 });
UserSchema.index({ userType: 1, isActive: 1 });