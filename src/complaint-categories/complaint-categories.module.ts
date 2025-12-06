import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComplaintCategoriesService } from './complaint-categories.service';
import { ComplaintCategoriesController } from './complaint-categories.controller';
import { ComplaintCategory, ComplaintCategorySchema } from './schemas/complaint-category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ComplaintCategory.name, schema: ComplaintCategorySchema }
    ]),
  ],
  controllers: [ComplaintCategoriesController],
  providers: [ComplaintCategoriesService],
  exports: [ComplaintCategoriesService],
})
export class ComplaintCategoriesModule {}