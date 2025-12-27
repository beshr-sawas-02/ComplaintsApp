import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserType } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CloudinaryService } from '../config/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly cloudinaryService: CloudinaryService, // ✅ إضافة Cloudinary
  ) {}

  // ================ CREATE ================
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { rationalId, password, ...rest } = createUserDto;

    const existingUser = await this.userModel.findOne({ rationalId });
    if (existingUser) {
      throw new ConflictException('الرقم الوطني مسجل مسبقاً');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userModel.create({
      rationalId,
      password: hashedPassword,
      ...rest,
      userType: rest.userType || UserType.CITIZEN,
      isActive: rest.isActive !== undefined ? rest.isActive : true,
    });

    return this.sanitizeUser(user);
  }

  // ================ READ ALL ================
  async findAll(queryDto: QueryUserDto) {
    const {
      search,
      userType,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const query: any = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { rationalId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (userType) {
      query.userType = userType;
    }

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('-password')
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ READ ONE ================
  async findOne(id: string): Promise<any> {
    const user = await this.userModel.findById(id).select('-password').exec();

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    return this.sanitizeUser(user);
  }

  // ================ READ BY RATIONAL ID ================
  async findByRationalId(rationalId: string): Promise<User> {
    const user = await this.userModel
      .findOne({ rationalId })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    return user;
  }

  // ================ UPDATE ================
  async update(id: string, updateUserDto: UpdateUserDto): Promise<any> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const { newPassword, ...updateData } = updateUserDto;

    if (newPassword) {
      updateData['password'] = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('المستخدم غير موجود بعد التحديث');
    }

    return this.sanitizeUser(updatedUser);
  }

  // ✅ ================ UPLOAD PROFILE IMAGE TO CLOUDINARY ================
  async uploadProfileImageToCloudinary(
    userId: string,
    file: Express.Multer.File,
  ): Promise<User> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // حذف الصورة القديمة من Cloudinary إذا كانت موجودة
    if (user.profileImage && user.profileImage.startsWith('http')) {
      try {
        const publicId = this.cloudinaryService.extractPublicId(user.profileImage);
        await this.cloudinaryService.deleteImage(publicId);
      } catch (error) {
        console.error('خطأ في حذف الصورة القديمة من Cloudinary:', error);
      }
    }

    // ✅ رفع الصورة الجديدة إلى Cloudinary
    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      `profiles/${userId}`,
    );

    // تحديث بـ URL الصورة الجديدة
    user.profileImage = uploadResult.secure_url;
    await user.save();

    return this.sanitizeUser(user);
  }

  // ✅ ================ DELETE PROFILE IMAGE (Cloudinary) ================
  async deleteProfileImage(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    if (user.profileImage) {
      // حذف من Cloudinary إذا كانت URL
      if (user.profileImage.startsWith('http')) {
        try {
          const publicId = this.cloudinaryService.extractPublicId(user.profileImage);
          await this.cloudinaryService.deleteImage(publicId);
        } catch (error) {
          console.error('خطأ في حذف الصورة من Cloudinary:', error);
        }
      }

      user.profileImage = null;
      await user.save();
    }

    return this.sanitizeUser(user);
  }

  // ================ CHANGE PASSWORD ================
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.userModel.findById(userId).select('+password').exec();

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('كلمة المرور القديمة غير صحيحة');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }

  // ================ TOGGLE ACTIVE STATUS ================
  async toggleActive(id: string): Promise<User> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    user.isActive = !user.isActive;
    await user.save();

    return this.sanitizeUser(user);
  }

  // ================ DELETE (SOFT) ================
  async remove(id: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    user.isActive = false;
    await user.save();

    return { message: 'تم تعطيل المستخدم بنجاح' };
  }

  // ================ DELETE (HARD) ================
  async hardDelete(id: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // ✅ حذف الصورة من Cloudinary
    if (user.profileImage && user.profileImage.startsWith('http')) {
      try {
        const publicId = this.cloudinaryService.extractPublicId(user.profileImage);
        await this.cloudinaryService.deleteImage(publicId);
      } catch (error) {
        console.error('خطأ في حذف الصورة:', error);
      }
    }

    await this.userModel.findByIdAndDelete(id);

    return { message: 'تم حذف المستخدم نهائياً' };
  }

  // ================ GET STATISTICS ================
  async getStatistics() {
    const [totalUsers, activeUsers, inactiveUsers, citizensCount, adminsCount] =
      await Promise.all([
        this.userModel.countDocuments(),
        this.userModel.countDocuments({ isActive: true }),
        this.userModel.countDocuments({ isActive: false }),
        this.userModel.countDocuments({ userType: UserType.CITIZEN }),
        this.userModel.countDocuments({ userType: UserType.ADMIN }),
      ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      citizensCount,
      adminsCount,
    };
  }

  // ================ HELPER: Get Profile Image URL ================
  private getProfileImageUrl(profileImage: string | null): string | null {
    if (!profileImage) return null;

    // ✅ إذا كانت URL كاملة (Cloudinary)، أرجعها مباشرة
    if (profileImage.startsWith('http')) {
      return profileImage;
    }

    // للتوافق مع البيانات القديمة
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/profiles/${profileImage}`;
  }

  // ================ HELPER: Sanitize User ================
  private sanitizeUser(user: UserDocument): any {
    const userObject = user.toObject();
    delete userObject.password;

    // ✅ أضف رابط الصورة الكامل
    userObject.profileImageUrl = this.getProfileImageUrl(userObject.profileImage);

    return userObject;
  }
}