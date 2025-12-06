import { 
  IsString, 
  IsNotEmpty, 
  IsOptional,
  IsEnum,
  IsMongoId
} from 'class-validator';
import { ComplaintPriority } from '../schemas/complaint.schema';

export class CreateComplaintDto {
  @IsMongoId({ message: 'معرف التصنيف غير صالح' })
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsNotEmpty({ message: 'عنوان الشكوى مطلوب' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'وصف الشكوى مطلوب' })
  description: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(ComplaintPriority)
  @IsOptional()
  priority?: ComplaintPriority;
}