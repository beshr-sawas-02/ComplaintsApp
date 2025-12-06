import { 
  IsInt, 
  IsNotEmpty, 
  Min,
  Max,
  IsString,
  IsOptional,
  MaxLength,
  IsMongoId
} from 'class-validator';

export class CreateRatingDto {
  @IsMongoId({ message: 'معرف الشكوى غير صالح' })
  @IsNotEmpty({ message: 'معرف الشكوى مطلوب' })
  complaintId: string;

  @IsInt({ message: 'التقييم يجب أن يكون رقم صحيح' })
  @IsNotEmpty({ message: 'التقييم مطلوب' })
  @Min(1, { message: 'التقييم يجب أن يكون من 1 إلى 5' })
  @Max(5, { message: 'التقييم يجب أن يكون من 1 إلى 5' })
  rating: number;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'التعليق يجب أن لا يتجاوز 500 حرف' })
  feedback?: string;
}