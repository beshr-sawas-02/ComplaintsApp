import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Complaint, ComplaintSchema } from 'src/complaints/schemas/complaint.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Complaint.name, schema: ComplaintSchema },
      { name: User.name, schema: UserSchema }
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}