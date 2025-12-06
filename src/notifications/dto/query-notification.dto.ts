import { 
  IsOptional, 
  IsString, 
  IsEnum, 
  IsInt, 
  Min, 
  IsMongoId,
  IsBoolean 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ComplaintStatus, NotificationType } from '../schemas/notification.schema';


export class QueryNotificationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsMongoId()
  complaintId?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(ComplaintStatus)
  newStatus?: ComplaintStatus;

  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

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
