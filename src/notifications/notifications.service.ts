import { 
  Injectable, 
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema';
import { Complaint } from 'src/complaints/schemas/complaint.schema';
import { User, UserType } from 'src/users/schemas/user.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ComplaintStatus, NotificationType } from './schemas/notification.schema';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) 
    private notificationModel: Model<Notification>,
    @InjectModel(Complaint.name) 
    private complaintModel: Model<Complaint>,
    @InjectModel(User.name) 
    private userModel: Model<User>,
  ) {}

  // ================ CREATE NOTIFICATION ================
  async create(
    createNotificationDto: CreateNotificationDto
  ): Promise<Notification> {
    const { userId, complaintId, assignedTo } = createNotificationDto;

    // التحقق من وجود المستخدم
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // التحقق من وجود الشكوى
    const complaint = await this.complaintModel.findById(complaintId);
    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    // إذا كان هناك مستخدم معين، التحقق من وجوده
    if (assignedTo) {
      const assignedUser = await this.userModel.findById(assignedTo);
      if (!assignedUser) {
        throw new NotFoundException('المستخدم المعين غير موجود');
      }
    }

    const notification = await this.notificationModel.create({
      ...createNotificationDto,
      userId: new Types.ObjectId(userId),
      complaintId: new Types.ObjectId(complaintId),
      assignedTo: assignedTo ? new Types.ObjectId(assignedTo) : null,
    });

    const populatedNotification = await this.populateNotification(notification);
    
    if (!populatedNotification) {
      throw new NotFoundException('فشل في إنشاء الإشعار');
    }

    return populatedNotification;
  }

  // ================ CREATE AUTO NOTIFICATION ================
  async createAutoNotification(
    userId: string,
    complaintId: string,
    type: NotificationType,
    message: string,
    options?: {
      oldStatus?: ComplaintStatus;
      newStatus?: ComplaintStatus;
      assignedTo?: string;
      note?: string;
      file?: string;
    }
  ): Promise<Notification> {
    const notification = await this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      complaintId: new Types.ObjectId(complaintId),
      type,
      message,
      oldStatus: options?.oldStatus || ComplaintStatus.PENDING,
      newStatus: options?.newStatus || ComplaintStatus.PENDING,
      assignedTo: options?.assignedTo 
        ? new Types.ObjectId(options.assignedTo) 
        : null,
      note: options?.note || null,
      file: options?.file || null,
    });

    const populatedNotification = await this.populateNotification(notification);
    
    if (!populatedNotification) {
      throw new NotFoundException('فشل في إنشاء الإشعار');
    }

    return populatedNotification;
  }

  // ================ GET ALL NOTIFICATIONS ================
  async findAll(queryDto: QueryNotificationDto, currentUser: User) {
    const { 
      search, 
      userId,
      complaintId,
      type,
      newStatus,
      assignedTo,
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = queryDto;

    const query: any = {};

    // إذا كان مواطن، يرى إشعاراته فقط
    if (currentUser.userType === UserType.CITIZEN) {
      query.userId = currentUser._id;
    }

    // الفلترة حسب المعايير (للأدمن)
    if (userId && currentUser.userType === UserType.ADMIN) {
      query.userId = new Types.ObjectId(userId);
    }

    if (complaintId) {
      query.complaintId = new Types.ObjectId(complaintId);
    }

    if (type) {
      query.type = type;
    }

    if (newStatus) {
      query.newStatus = newStatus;
    }

    if (assignedTo) {
      query.assignedTo = new Types.ObjectId(assignedTo);
    }

    // البحث في الرسالة أو الملاحظة
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .populate('userId', 'fullName rationalId phone userType')
        .populate('complaintId', 'complaintId message type')
        .populate('assignedTo', 'fullName userType')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ GET ONE NOTIFICATION ================
  async findOne(id: string, currentUser: User): Promise<Notification> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف الإشعار غير صالح');
    }

    const notification = await this.notificationModel
      .findById(id)
      .populate('userId', 'fullName rationalId phone userType')
      .populate('complaintId', 'complaintId message type')
      .populate('assignedTo', 'fullName userType')
      .exec();
    
    if (!notification) {
      throw new NotFoundException('الإشعار غير موجود');
    }

    // التحقق من الصلاحيات
    this.checkAccess(notification, currentUser);

    return notification;
  }

  // ================ GET MY NOTIFICATIONS ================
  async getMyNotifications(
    userId: string,
    queryDto: QueryNotificationDto
  ) {
    const { 
      type,
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = queryDto;

    const query: any = { userId: new Types.ObjectId(userId) };

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .populate('complaintId', 'complaintId message type')
        .populate('assignedTo', 'fullName userType')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ GET NOTIFICATIONS BY COMPLAINT ================
  async findByComplaint(
    complaintId: string,
    currentUser: User
  ): Promise<Notification[]> {
    if (!Types.ObjectId.isValid(complaintId)) {
      throw new BadRequestException('معرف الشكوى غير صالح');
    }

    const complaint = await this.complaintModel.findById(complaintId);
    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    // التحقق من الصلاحيات
    if (currentUser.userType === UserType.CITIZEN) {
      if (complaint.userId.toString() !== currentUser._id.toString()) {
        throw new ForbiddenException('ليس لديك صلاحية للوصول لهذه الإشعارات');
      }
    }

    const notifications = await this.notificationModel
      .find({ complaintId: new Types.ObjectId(complaintId) })
      .populate('userId', 'fullName userType')
      .populate('assignedTo', 'fullName userType')
      .sort({ createdAt: -1 })
      .exec();

    return notifications;
  }

  // ================ GET NOTIFICATIONS BY ASSIGNED USER ================
  async findByAssignedUser(
    userId: string,
    queryDto: QueryNotificationDto
  ) {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = queryDto;

    const query = { assignedTo: new Types.ObjectId(userId) };
    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .populate('userId', 'fullName userType')
        .populate('complaintId', 'complaintId message type')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ UPDATE NOTIFICATION ================
  async update(
    id: string, 
    updateNotificationDto: UpdateNotificationDto,
    currentUser: User,
  ): Promise<Notification> {
    const notification = await this.notificationModel.findById(id);
    
    if (!notification) {
      throw new NotFoundException('الإشعار غير موجود');
    }

    // فقط الأدمن يمكنه التحديث
    if (currentUser.userType !== UserType.ADMIN) {
      throw new ForbiddenException('ليس لديك صلاحية لتحديث الإشعارات');
    }

    const updatedNotification = await this.notificationModel
      .findByIdAndUpdate(id, updateNotificationDto, { new: true })
      .populate('userId', 'fullName rationalId phone userType')
      .populate('complaintId', 'complaintId message type')
      .populate('assignedTo', 'fullName userType')
      .exec();

    if (!updatedNotification) {
      throw new NotFoundException('فشل في تحديث الإشعار');
    }

    return updatedNotification;
  }

  // ================ DELETE NOTIFICATION ================
  async remove(id: string, currentUser: User): Promise<{ message: string }> {
    const notification = await this.notificationModel.findById(id);
    
    if (!notification) {
      throw new NotFoundException('الإشعار غير موجود');
    }

    // التحقق من الصلاحيات
    this.checkAccess(notification, currentUser);

    await this.notificationModel.findByIdAndDelete(id);

    return { message: 'تم حذف الإشعار بنجاح' };
  }

  // ================ DELETE NOTIFICATIONS BY COMPLAINT ================
  async removeByComplaint(
    complaintId: string,
    currentUser: User
  ): Promise<{ message: string; deletedCount: number }> {
    if (currentUser.userType !== UserType.ADMIN) {
      throw new ForbiddenException('فقط المسؤولين يمكنهم حذف الإشعارات');
    }

    const result = await this.notificationModel.deleteMany({ 
      complaintId: new Types.ObjectId(complaintId) 
    });

    return { 
      message: 'تم حذف الإشعارات بنجاح',
      deletedCount: result.deletedCount 
    };
  }

  // ================ GET STATISTICS ================
  async getStatistics(currentUser: User) {
    const query: any = {};

    // إذا كان مواطن، إحصائياته فقط
    if (currentUser.userType === UserType.CITIZEN) {
      query.userId = currentUser._id;
    }

    const [
      totalNotifications,
      byType,
      byStatus,
    ] = await Promise.all([
      this.notificationModel.countDocuments(query),
      this.notificationModel.aggregate([
        { $match: query },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.notificationModel.aggregate([
        { $match: query },
        { $group: { _id: '$newStatus', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalNotifications,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  // ================ GET RECENT NOTIFICATIONS ================
  async getRecentNotifications(
    userId: string,
    limit: number = 10
  ): Promise<Notification[]> {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('complaintId', 'complaintId message')
      .populate('assignedTo', 'fullName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  // ================ HELPER: Populate notification ================
  private async populateNotification(
    notification: Notification
  ): Promise<Notification | null> {
    return this.notificationModel
      .findById(notification._id)
      .populate('userId', 'fullName rationalId phone userType')
      .populate('complaintId', 'complaintId message type')
      .populate('assignedTo', 'fullName userType')
      .exec();
  }

  // ================ HELPER: التحقق من الصلاحيات ================
  private checkAccess(notification: Notification, currentUser: User): void {
    // الأدمن يمكنه الوصول لكل شيء
    if (currentUser.userType === UserType.ADMIN) {
      return;
    }

    // المواطن يمكنه الوصول لإشعاراته فقط
    if (notification.userId.toString() !== currentUser._id.toString()) {
      throw new ForbiddenException('ليس لديك صلاحية للوصول لهذا الإشعار');
    }
  }
}