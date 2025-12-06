import { 
  IsString, 
  IsNotEmpty, 
  MinLength, 
  MaxLength, 
  Matches,
  IsEnum,
  IsOptional,
  IsBoolean
} from 'class-validator';
import { UserType } from '../schemas/user.schema';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'الرقم الوطني مطلوب' })
  rationalId: string;

  @IsString()
  @IsNotEmpty({ message: 'الاسم الكامل مطلوب' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'كلمة المرور مطلوبة' })
  password: string;

  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;

  @IsString()
  @IsOptional()
  profileImage?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}