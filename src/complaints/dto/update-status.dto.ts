import { IsEnum, IsString, IsOptional, IsMongoId } from 'class-validator';
import { ComplaintStatus } from '../schemas/complaint.schema';

export class UpdateStatusDto {
  @IsEnum(ComplaintStatus)
  status: ComplaintStatus;

  @IsString()
  @IsOptional()
  note?: string;
}

export class AssignComplaintDto {
  @IsMongoId()
  adminId: string;
}