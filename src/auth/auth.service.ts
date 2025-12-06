import { 
  Injectable, 
  UnauthorizedException, 
  ConflictException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtPayload, AuthResponse } from './interfaces/jwt-payload.interface';
import { User, UserType } from 'src/users/schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { rationalId, password, fullName, phone, userType, profileImage } = registerDto;

    const existingUser = await this.userModel.findOne({ rationalId });
    if (existingUser) {
      throw new ConflictException('الرقم الوطني مسجل مسبقاً');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userModel.create({
      rationalId,
      password: hashedPassword,
      fullName,
      phone,
      userType: userType || UserType.CITIZEN,
      profileImage: profileImage || null,
      isActive: true,
    });

    return this.generateAuthResponse(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { rationalId, password } = loginDto;

    const user = await this.userModel
      .findOne({ rationalId })
      .select('+password')
      .exec();

    if (!user) {
      throw new UnauthorizedException('الرقم الوطني أو كلمة المرور غير صحيحة');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('الحساب غير مفعل');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('الرقم الوطني أو كلمة المرور غير صحيحة');
    }

    return this.generateAuthResponse(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('رمز التحديث غير صالح');
      }

      return this.generateAuthResponse(user);
    } catch (error) {
      throw new UnauthorizedException('رمز التحديث منتهي الصلاحية');
    }
  }

  private async generateAuthResponse(user: User): Promise<AuthResponse> {
  const payload: JwtPayload = {
    sub: user._id.toString(),
    rationalId: user.rationalId,
    userType: user.userType,
    fullName: user.fullName,
  };

  const accessToken = this.jwtService.sign(payload, {
  secret: this.configService.get<string>('JWT_SECRET'),
  expiresIn: this.configService.get<string>('JWT_EXPIRATION', '1d') as any,
});

const refreshToken = this.jwtService.sign(payload, {
  secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
  expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d') as any,
});


  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      rationalId: user.rationalId,
      fullName: user.fullName,
      userType: user.userType,
      phone: user.phone,
      profileImage: user.profileImage,
    },
  };
}


  async validateUser(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('المستخدم غير موجود أو غير مفعل');
    }
    return user;
  }
}