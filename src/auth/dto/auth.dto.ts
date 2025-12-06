import { 
  IsString, 
  IsNotEmpty, 
  IsEnum,
  IsOptional
} from 'class-validator';
import { UserType } from 'src/users/schemas/user.schema';


export class LoginDto {
  @IsString()
  rationalId: string;

  @IsString()
  password: string;
}

export class RegisterDto {
  @IsString()
  rationalId: string;

  @IsString()
  fullName: string;

  @IsString()
  phone: string;

  @IsString()
  password: string;

  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;

  @IsString()
  @IsOptional()
  profileImage?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
