import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ComplaintLogsService } from './complaint-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateComplaintLogDto } from './dto/create-complaint-log.dto';
import { User, UserType } from 'src/users/schemas/user.schema';
import { QueryComplaintLogDto } from './dto/query-complaint-log.dto';

@Controller('complaint-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplaintLogsController {
  constructor(private readonly logsService: ComplaintLogsService) { }

  // ================ CREATE LOG ================
  @Post()
  //@Roles(UserType.ADMIN)
  create(
    @Body() createLogDto: CreateComplaintLogDto,
    @CurrentUser() user: User,
  ) {
    return this.logsService.create(createLogDto, user._id.toString());
  }

  // ================ GET ALL LOGS ================
  @Get()
  //@Roles(UserType.CITIZEN, UserType.ADMIN)
  findAll(
    @Query() queryDto: QueryComplaintLogDto,
    @CurrentUser() user: User,
  ) {
    return this.logsService.findAll(queryDto, user);
  }

  // ================ GET STATISTICS ================
  @Get('statistics')
  //@Roles(UserType.CITIZEN, UserType.ADMIN)
  getStatistics(@CurrentUser() user: User) {
    return this.logsService.getStatistics(user);
  }

  // ================ GET LOGS BY COMPLAINT ID ================
  @Get('complaint/:complaintId')
  //@Roles(UserType.CITIZEN, UserType.ADMIN)
  findByComplaintId(
    @Param('complaintId') complaintId: string,
    @CurrentUser() user: User,
  ) {
    return this.logsService.findByComplaintId(complaintId, user);
  }

  // ================ GET ACTIVITY TIMELINE ================
  @Get('timeline/:complaintId')
  //@Roles(UserType.CITIZEN, UserType.ADMIN)
  getActivityTimeline(
    @Param('complaintId') complaintId: string,
    @CurrentUser() user: User,
  ) {
    return this.logsService.getActivityTimeline(complaintId, user);
  }

  // ================ GET LOGS BY USER ================
  @Get('user/:userId')
  //@Roles(UserType.CITIZEN, UserType.ADMIN)
  findByUser(
    @Param('userId') userId: string,
    @Query() queryDto: QueryComplaintLogDto,
    @CurrentUser() user: User,
  ) {
    return this.logsService.findByUser(userId, queryDto, user);
  }

  // ================ GET ONE LOG ================
  @Get(':id')
  //@Roles(UserType.CITIZEN, UserType.ADMIN)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.logsService.findOne(id, user);
  }

  // ================ DELETE LOG (Admin only) ================
  @Delete(':id')
  //@Roles(UserType.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.logsService.remove(id, user);
  }

  // ================ DELETE LOGS BY COMPLAINT (Admin only) ================
  @Delete('complaint/:complaintId')
  // @Roles(UserType.ADMIN)
  removeByComplaint(
    @Param('complaintId') complaintId: string,
    @CurrentUser() user: User,
  ) {
    return this.logsService.removeByComplaint(complaintId, user);
  }
}