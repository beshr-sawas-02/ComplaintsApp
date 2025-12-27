import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserService } from './users.service';
import { User, UserType } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ================ CREATE USER (Admin only) ================
  @Post()
  @Roles(UserType.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  // ================ GET ALL USERS (Admin only) ================
  @Get()
  @Roles(UserType.ADMIN)
  findAll(@Query() queryDto: QueryUserDto) {
    return this.userService.findAll(queryDto);
  }

  // ================ GET STATISTICS (Admin only) ================
  @Get('statistics')
  @Roles(UserType.ADMIN)
  getStatistics() {
    return this.userService.getStatistics();
  }

  // ================ GET CURRENT USER PROFILE ================
  @Get('me')
  getCurrentUser(@CurrentUser() user: User) {
    return this.userService.findOne(user._id.toString());
  }

  // ================ GET USER BY RATIONAL ID ================
  @Get('rational/:rationalId')
  @Roles(UserType.ADMIN)
  findByRationalId(@Param('rationalId') rationalId: string) {
    return this.userService.findByRationalId(rationalId);
  }

  // ✅ ================ UPLOAD PROFILE IMAGE (Cloudinary) ================
  @Post('me/upload-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(), // ✅ استخدام memory بدلاً من disk
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new Error('فقط الصور مسموحة (jpg, jpeg, png)'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('لم يتم رفع أي ملف');
    }
    // ✅ رفع إلى Cloudinary
    return this.userService.uploadProfileImageToCloudinary(user._id.toString(), file);
  }

  // ✅ ================ DELETE PROFILE IMAGE ================
  @Delete('me/profile-image')
  deleteProfileImage(@CurrentUser() user: User) {
    return this.userService.deleteProfileImage(user._id.toString());
  }

  // ✅ ================ UPLOAD IMAGE FOR ANY USER (Admin) ================
  @Post(':id/upload-image')
  @Roles(UserType.ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(), // ✅ استخدام memory
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new Error('فقط الصور مسموحة'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadUserImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('لم يتم رفع أي ملف');
    }
    // ✅ رفع إلى Cloudinary
    return this.userService.uploadProfileImageToCloudinary(id, file);
  }

  // ================ GET USER BY ID (Admin only) ================
  @Get(':id')
  @Roles(UserType.ADMIN)
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  // ================ UPDATE USER ================
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    if (currentUser.userType !== UserType.ADMIN && currentUser._id.toString() !== id) {
      throw new BadRequestException('ليس لديك صلاحية لتحديث هذا المستخدم');
    }
    return this.userService.update(id, updateUserDto);
  }

  // ================ UPDATE CURRENT USER ================
  @Patch('me/update')
  updateCurrentUser(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(user._id.toString(), updateUserDto);
  }

  // ================ CHANGE PASSWORD ================
  @Patch('me/change-password')
  changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(user._id.toString(), changePasswordDto);
  }

  // ================ TOGGLE USER ACTIVE STATUS (Admin only) ================
  @Patch(':id/toggle-active')
  @Roles(UserType.ADMIN)
  toggleActive(@Param('id') id: string) {
    return this.userService.toggleActive(id);
  }

  // ================ SOFT DELETE (Admin only) ================
  @Delete(':id')
  @Roles(UserType.ADMIN)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  // ================ HARD DELETE (Admin only) ================
  @Delete(':id/hard')
  @Roles(UserType.ADMIN)
  hardDelete(@Param('id') id: string) {
    return this.userService.hardDelete(id);
  }
}