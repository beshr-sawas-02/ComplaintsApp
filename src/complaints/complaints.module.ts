import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComplaintsService } from './complaints.service';
import { ComplaintsController } from './complaints.controller';
import { Complaint, ComplaintSchema } from './schemas/complaint.schema';

// ✅ أضف هذا السطر
import { ComplaintLogsModule } from '../complaint-logs/complaint-logs.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { CloudinaryService } from 'src/config/cloudinary.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Complaint.name, schema: ComplaintSchema },
    ]),
    ComplaintLogsModule,
    NotificationsModule, 
  ],
  controllers: [ComplaintsController],
  providers: [ComplaintsService,CloudinaryService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
