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
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { ComplaintsService } from './complaints.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserType, User } from '../users/schemas/user.schema';
import { ComplaintStatus } from './schemas/complaint.schema';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { QueryComplaintDto } from './dto/query-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { AssignComplaintDto, UpdateStatusDto } from './dto/update-status.dto';

@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  // ================ CREATE COMPLAINT ================
  @Post()
  create(
    @Body() createComplaintDto: CreateComplaintDto,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.create(createComplaintDto, user._id.toString());
  }

  // ================ GET ALL COMPLAINTS ================
  @Get()
  findAll(@Query() queryDto: QueryComplaintDto, @CurrentUser() user: User) {
    return this.complaintsService.findAll(queryDto, user);
  }

  // ================ GET STATISTICS ================
  @Get('statistics')
  getStatistics(@CurrentUser() user: User) {
    return this.complaintsService.getStatistics(user);
  }

  // ================ GET MY COMPLAINTS ================
  @Get('my-complaints')
  getMyComplaints(
    @Query() queryDto: QueryComplaintDto,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.getMyComplaints(user._id.toString(), queryDto);
  }

  // ================ GET ONE COMPLAINT ================
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.complaintsService.findOne(id, user);
  }

  // ================ UPDATE COMPLAINT ================
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateComplaintDto: UpdateComplaintDto,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.update(id, updateComplaintDto, user);
  }

  // ================ UPDATE STATUS (Admin) ================
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.updateStatus(
      id,
      updateStatusDto.status,
      user,
      updateStatusDto.note,
    );
  }

  // ================ ASSIGN COMPLAINT (Admin) ================
  @Patch(':id/assign')
  assignComplaint(
    @Param('id') id: string,
    @Body() assignDto: AssignComplaintDto,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.assignComplaint(id, assignDto.adminId, user);
  }

  // ================ UPLOAD IMAGES (Cloudinary) ================
  @Post(':id/upload-images')
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: memoryStorage(), // ✅ استخدام memory بدلاً من disk
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!/(jpg|jpeg|png|pdf)$/i.test(extname(file.originalname))) {
          return cb(
            new Error('فقط الملفات من نوع JPG, JPEG, PNG, أو PDF مسموحة'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('لم يتم رفع أي ملف');
    }

    // ✅ رفع الصور إلى Cloudinary
    return this.complaintsService.uploadImagesToCloudinary(id, files, user);
  }

  // ================ DELETE IMAGE ================
  @Delete(':id/images/:filename')
  deleteImage(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.deleteImage(id, filename, user);
  }

  // ================ MARK AS READ (Admin) ================
  @Patch(':id/mark-read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.complaintsService.markAsRead(id, user);
  }

  // ================ DELETE COMPLAINT ================
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.complaintsService.remove(id, user);
  }
}