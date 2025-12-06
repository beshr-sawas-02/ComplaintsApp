import { IsOptional, IsString, IsInt, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryComplaintLogDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsMongoId()
  complaintId?: string;

  @IsOptional()
  @IsMongoId()
  actionBy?: string;

  @IsOptional()
  @IsString()
  actionType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
