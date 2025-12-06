import { PartialType } from '@nestjs/mapped-types';
import { CreateComplaintCategoryDto } from './create-complaint-category.dto';

export class UpdateComplaintCategoryDto extends PartialType(CreateComplaintCategoryDto) {}
