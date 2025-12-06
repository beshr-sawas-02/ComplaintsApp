import { 
  IsString, 
  IsNotEmpty, 
  IsMongoId
} from 'class-validator';

export class CreateComplaintLogDto {
  @IsMongoId({ message: 'معرف الشكوى غير صالح' })
  @IsNotEmpty({ message: 'معرف الشكوى مطلوب' })
  complaintId: string;

  @IsString()
  @IsNotEmpty({ message: 'نوع الإجراء مطلوب' })
  actionType: string;

  @IsString()
  @IsNotEmpty({ message: 'وصف الإجراء مطلوب' })
  description: string;
}