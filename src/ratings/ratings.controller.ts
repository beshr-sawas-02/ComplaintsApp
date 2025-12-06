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
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User, UserType } from 'src/users/schemas/user.schema';
import { CreateRatingDto } from './dto/create-rating.dto';
import { QueryRatingDto } from './dto/query-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';

@Controller('ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  // ================ CREATE RATING (Citizen only) ================
  @Post()
  @Roles(UserType.CITIZEN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createRatingDto: CreateRatingDto,
    @CurrentUser() user: User,
  ) {
    return this.ratingsService.create(createRatingDto, user._id.toString());
  }

  // ================ GET ALL RATINGS ================
  @Get()
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  findAll(
    @Query() queryDto: QueryRatingDto,
    @CurrentUser() user: User,
  ) {
    return this.ratingsService.findAll(queryDto, user);
  }

  // ================ GET STATISTICS ================
  @Get('statistics')
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  getStatistics(@CurrentUser() user: User) {
    return this.ratingsService.getStatistics(user);
  }

  // ================ GET RATINGS WITH FEEDBACK (Public) ================
  @Public()
  @Get('with-feedback')
  getRatingsWithFeedback(@Query() queryDto: QueryRatingDto) {
    return this.ratingsService.getRatingsWithFeedback(queryDto);
  }

  // ================ GET MY RATINGS (Citizen) ================
  @Get('my-ratings')
  @Roles(UserType.CITIZEN)
  getMyRatings(
    @Query() queryDto: QueryRatingDto,
    @CurrentUser() user: User,
  ) {
    return this.ratingsService.getMyRatings(user._id.toString(), queryDto);
  }

  // ================ GET RATING BY COMPLAINT ================
  @Get('complaint/:complaintId')
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  findByComplaint(
    @Param('complaintId') complaintId: string,
    @CurrentUser() user: User,
  ) {
    return this.ratingsService.findByComplaint(complaintId, user);
  }

  // ================ GET AVERAGE RATING BY COMPLAINT (Public) ================
  @Public()
  @Get('average/:complaintId')
  getAverageByComplaint(@Param('complaintId') complaintId: string) {
    return this.ratingsService.getAverageByComplaint(complaintId);
  }

  // ================ CHECK IF USER RATED COMPLAINT ================
  @Get('check/:complaintId')
  @Roles(UserType.CITIZEN)
  hasUserRated(
    @Param('complaintId') complaintId: string,
    @CurrentUser() user: User,
  ) {
    return this.ratingsService.hasUserRated(
      complaintId,
      user._id.toString()
    );
  }

  // ================ GET ONE RATING ================
  @Get(':id')
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.ratingsService.findOne(id, user);
  }

  // ================ UPDATE RATING ================
  @Patch(':id')
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateRatingDto: UpdateRatingDto,
    @CurrentUser() user: User,
  ) {
    return this.ratingsService.update(id, updateRatingDto, user);
  }

  // ================ DELETE RATING ================
  @Delete(':id')
  @Roles(UserType.CITIZEN, UserType.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.ratingsService.remove(id, user);
  }
}