import { PartialType } from '@nestjs/mapped-types';
import { CreateComplaintLogDto } from './create-complaint-log.dto';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ComplaintStatus } from 'src/notifications/schemas/notification.schema';

export class UpdateComplaintLogDto extends PartialType(CreateComplaintLogDto) {
  @IsString()
  @IsOptional()
  complaintid?: string;

  @IsString()
  @IsOptional()
  actionBy?: string;

  @IsString()
  @IsOptional()
  actionType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ComplaintStatus)
  @IsOptional()
  oldStatus?: ComplaintStatus;

  @IsEnum(ComplaintStatus)
  @IsOptional()
  newStatus?: ComplaintStatus;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  note?: string;
}