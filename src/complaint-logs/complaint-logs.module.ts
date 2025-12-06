import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComplaintLogsService } from './complaint-logs.service';
import { ComplaintLogsController } from './complaint-logs.controller';
import { Complaint, ComplaintSchema } from 'src/complaints/schemas/complaint.schema';
import { ComplaintLog, ComplaintLogSchema } from './schemas/complaint-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ComplaintLog.name, schema: ComplaintLogSchema },
      { name: Complaint.name, schema: ComplaintSchema }
    ]),
  ],
  controllers: [ComplaintLogsController],
  providers: [ComplaintLogsService],
  exports: [ComplaintLogsService],
})
export class ComplaintLogsModule {}