import { 
  IsString, 
  IsNotEmpty, 
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  IsMongoId
} from 'class-validator';
import { ComplaintStatus, NotificationType } from '../schemas/notification.schema';


export class CreateNotificationDto {
  @IsMongoId({ message: 'معرف المستخدم غير صالح' })
  @IsNotEmpty({ message: 'معرف المستخدم مطلوب' })
  userId: string;

  @IsMongoId({ message: 'معرف الشكوى غير صالح' })
  @IsNotEmpty({ message: 'معرف الشكوى مطلوب' })
  complaintId: string;

  @IsString()
  @IsNotEmpty({ message: 'رسالة الإشعار مطلوبة' })
  message: string;

  @IsEnum(NotificationType)
  @IsNotEmpty({ message: 'نوع الإشعار مطلوب' })
  type: NotificationType;

  @IsEnum(ComplaintStatus)
  @IsOptional()
  oldStatus?: ComplaintStatus;

  @IsEnum(ComplaintStatus)
  @IsOptional()
  newStatus?: ComplaintStatus;

  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  file?: string;
}