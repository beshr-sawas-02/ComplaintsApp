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
import { ComplaintCategoriesService } from './complaint-categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserType } from 'src/users/schemas/user.schema';
import { CreateComplaintCategoryDto } from './dto/create-complaint-category.dto';
import { QueryComplaintCategoryDto } from './dto/query-complaint-category.dto';
import { UpdateComplaintCategoryDto } from './dto/update-complaint-category.dto';

@Controller('complaint-categories')
//@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplaintCategoriesController {
  constructor(
    private readonly categoriesService: ComplaintCategoriesService
  ) {}

  // ================ CREATE CATEGORY (Admin only) ================
  @Post()
 // @Roles(UserType.ADMIN)
  create(@Body() createCategoryDto: CreateComplaintCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  // ================ BULK CREATE (Admin only) ================
  @Post('bulk')
 // @Roles(UserType.ADMIN)
  bulkCreate(@Body() categories: CreateComplaintCategoryDto[]) {
    return this.categoriesService.bulkCreate(categories);
  }

  // ================ GET ALL CATEGORIES (Public) ================
  @Public()
  @Get()
  findAll(@Query() queryDto: QueryComplaintCategoryDto) {
    return this.categoriesService.findAll(queryDto);
  }

  // ================ GET ALL SIMPLE (Public - للقوائم المنسدلة) ================
  @Public()
  @Get('list')
  findAllSimple() {
    return this.categoriesService.findAllSimple();
  }

  // ================ GET STATISTICS (Admin only) ================
  @Get('statistics')
 // @Roles(UserType.ADMIN)
  getStatistics() {
    return this.categoriesService.getStatistics();
  }

  // ================ GET BY NAME (Public) ================
  @Public()
  @Get('name/:name')
  findByName(@Param('name') name: string) {
    return this.categoriesService.findByName(name);
  }

  // ================ GET ONE CATEGORY (Public) ================
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  // ================ UPDATE CATEGORY (Admin only) ================
  @Patch(':id')
 // @Roles(UserType.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateComplaintCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  // ================ DELETE CATEGORY (Admin only) ================
  @Delete(':id')
 // @Roles(UserType.ADMIN)
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  // ================ CHECK IF EXISTS (Public) ================
  @Public()
  @Get('exists/:name')
  async checkExists(@Param('name') name: string) {
    const exists = await this.categoriesService.exists(name);
    return { exists };
  }
}
