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
import { diskStorage } from 'multer';
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
  constructor(private readonly complaintsService: ComplaintsService) { }

  // ================ CREATE COMPLAINT ================
  @Post()
  //@Roles(UserType.CITIZEN, UserType.ADMIN)
  create(
    @Body() createComplaintDto: CreateComplaintDto,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.create(createComplaintDto, user._id.toString());
  }

  // ================ GET ALL COMPLAINTS ================
  @Get()
 // @Roles(UserType.CITIZEN, UserType.ADMIN)
  findAll(
    @Query() queryDto: QueryComplaintDto,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.findAll(queryDto, user);
  }

  // ================ GET STATISTICS ================
  @Get('statistics')
 // @Roles(UserType.CITIZEN, UserType.ADMIN)
  getStatistics(@CurrentUser() user: User) {
    return this.complaintsService.getStatistics(user);
  }

  // ================ GET MY COMPLAINTS ================
  @Get('my-complaints')
 // @Roles(UserType.CITIZEN)
  getMyComplaints(
    @Query() queryDto: QueryComplaintDto,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.getMyComplaints(user._id.toString(), queryDto);
  }

  // ================ GET ONE COMPLAINT ================
  @Get(':id')
 // @Roles(UserType.CITIZEN, UserType.ADMIN)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.findOne(id, user);
  }

  // ================ UPDATE COMPLAINT ================
  @Patch(':id')
 // @Roles(UserType.CITIZEN, UserType.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateComplaintDto: UpdateComplaintDto,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.update(id, updateComplaintDto, user);
  }

  // ================ UPDATE STATUS (Admin) ================
  @Patch(':id/status')
 // @Roles(UserType.ADMIN)
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
 // @Roles(UserType.ADMIN)
  assignComplaint(
    @Param('id') id: string,
    @Body() assignDto: AssignComplaintDto,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.assignComplaint(id, assignDto.adminId, user);
  }

  // ================ UPLOAD IMAGES (متعددة) ================
  @Post(':id/upload-images')
 // @Roles(UserType.CITIZEN, UserType.ADMIN)
  @UseInterceptors(
    FilesInterceptor('images', 5, { // حد أقصى 5 صور
      storage: diskStorage({
        destination: './uploads/complaints',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `cmp-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!/(jpg|jpeg|png|pdf)$/i.test(extname(file.originalname))) {
          return cb(new Error('فقط الملفات من نوع JPG, JPEG, PNG, أو PDF مسموحة'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('لم يتم رفع أي ملف');
    }

    const filenames = files.map(file => file.filename);
    return this.complaintsService.uploadImages(id, filenames, user);
  }

  // ================ DELETE IMAGE ================
  @Delete(':id/images/:filename')
 // @Roles(UserType.CITIZEN, UserType.ADMIN)
  deleteImage(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.deleteImage(id, filename, user);
  }

  // ================ MARK AS READ (Admin) ================
  @Patch(':id/mark-read')
 // @Roles(UserType.ADMIN)
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.markAsRead(id, user);
  }

  // ================ DELETE COMPLAINT ================
  @Delete(':id')
 // @Roles(UserType.CITIZEN, UserType.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.complaintsService.remove(id, user);
  }
}