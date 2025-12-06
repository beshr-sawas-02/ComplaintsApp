import { 
  IsString, 
  IsNotEmpty, 
} from 'class-validator';

export class CreateComplaintCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'اسم التصنيف مطلوب' })
  complaintItem: string;

  @IsString()
  @IsNotEmpty({ message: 'وصف التصنيف مطلوب' })
  description: string;
}