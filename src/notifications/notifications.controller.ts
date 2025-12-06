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
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserType } from 'src/users/schemas/user.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ================ CREATE NOTIFICATION (Admin only) ================
  @Post()
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  // ================ GET ALL NOTIFICATIONS ================
  @Get()
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  findAll(
    @Query() queryDto: QueryNotificationDto,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.findAll(queryDto, user);
  }

  // ================ GET STATISTICS ================
  @Get('statistics')
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  getStatistics(@CurrentUser() user: User) {
    return this.notificationsService.getStatistics(user);
  }

  // ================ GET MY NOTIFICATIONS ================
  @Get('my-notifications')
  @Roles(UserType.CITIZEN)
  getMyNotifications(
    @Query() queryDto: QueryNotificationDto,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.getMyNotifications(
      user._id.toString(),
      queryDto
    );
  }

  // ================ GET RECENT NOTIFICATIONS ================
  @Get('recent')
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  getRecentNotifications(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getRecentNotifications(
      user._id.toString(),
      limit || 10
    );
  }

  // ================ GET NOTIFICATIONS BY COMPLAINT ================
  @Get('complaint/:complaintId')
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  findByComplaint(
    @Param('complaintId') complaintId: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.findByComplaint(complaintId, user);
  }

  // ================ GET NOTIFICATIONS BY ASSIGNED USER ================
  @Get('assigned/:userId')
  @Roles(UserType.ADMIN)
  findByAssignedUser(
    @Param('userId') userId: string,
    @Query() queryDto: QueryNotificationDto,
  ) {
    return this.notificationsService.findByAssignedUser(userId, queryDto);
  }

  // ================ GET ONE NOTIFICATION ================
  @Get(':id')
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.findOne(id, user);
  }

  // ================ UPDATE NOTIFICATION (Admin only) ================
  @Patch(':id')
  @Roles(UserType.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.update(id, updateNotificationDto, user);
  }

  // ================ DELETE NOTIFICATION ================
  @Delete(':id')
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.remove(id, user);
  }

  // ================ DELETE NOTIFICATIONS BY COMPLAINT (Admin only) ================
  @Delete('complaint/:complaintId')
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.OK)
  removeByComplaint(
    @Param('complaintId') complaintId: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.removeByComplaint(complaintId, user);
  }
}