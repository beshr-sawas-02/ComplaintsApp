import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Complaint,
  ComplaintStatus,
  ComplaintPriority,
} from './schemas/complaint.schema';
import { User, UserType } from '../users/schemas/user.schema';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { QueryComplaintDto } from './dto/query-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { ComplaintLogsService } from 'src/complaint-logs/complaint-logs.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from 'src/notifications/schemas/notification.schema';
import { CloudinaryService } from '../config/cloudinary.service';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectModel(Complaint.name) private complaintModel: Model<Complaint>,
    private readonly complaintLogsService: ComplaintLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly cloudinaryService: CloudinaryService, // ✅ إضافة Cloudinary
  ) {}

  // ================ CREATE COMPLAINT ================
  async create(
    createComplaintDto: CreateComplaintDto,
    userId: string,
  ): Promise<Complaint> {
    const complaintId = await this.generateComplaintId();

    const complaint = await this.complaintModel.create({
      ...createComplaintDto,
      complaintId,
      userId: new Types.ObjectId(userId),
      categoryId: createComplaintDto.categoryId
        ? new Types.ObjectId(createComplaintDto.categoryId)
        : null,
      status: ComplaintStatus.PENDING,
      priority: createComplaintDto.priority || ComplaintPriority.MEDIUM,
      isRead: false,
    });

    // إشعار تلقائي: عند إنشاء شكوى جديدة
    try {
      await this.notificationsService.createAutoNotification(
        userId,
        complaint._id.toString(),
        NotificationType.NEW_COMMENT,
        'تم استلام شكواك بنجاح وهي قيد المراجعة.',
      );
    } catch (error) {
      console.error('فشل إنشاء إشعار الشكوى الجديدة:', error.message);
    }

    return this.populateComplaint(complaint);
  }

  // ================ GET ALL COMPLAINTS ================
  async findAll(queryDto: QueryComplaintDto, currentUser: User) {
    const {
      search,
      userId,
      categoryId,
      status,
      priority,
      isRead,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const query: any = {};

    // المواطن يرى شكاويه فقط
    if (currentUser.userType === UserType.CITIZEN) {
      query.userId = currentUser._id;
    }

    // Admin يمكنه الفلترة حسب المستخدم
    if (userId && currentUser.userType === UserType.ADMIN) {
      query.userId = new Types.ObjectId(userId);
    }

    if (categoryId) {
      query.categoryId = new Types.ObjectId(categoryId);
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    // البحث في العنوان أو الوصف أو الموقع
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { complaintId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [complaints, total] = await Promise.all([
      this.complaintModel
        .find(query)
        .populate('userId', 'fullName rationalId phone userType')
        .populate('categoryId', 'complaintItem description')
        .populate('assignedTo', 'fullName userType')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.complaintModel.countDocuments(query),
    ]);

    return {
      complaints,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ GET ONE COMPLAINT ================
  async findOne(id: string, currentUser: User): Promise<Complaint> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف الشكوى غير صالح');
    }

    const complaint = await this.complaintModel
      .findById(id)
      .populate('userId', 'fullName rationalId phone userType')
      .populate('categoryId', 'complaintItem description')
      .populate('assignedTo', 'fullName userType')
      .exec();

    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    this.checkAccess(complaint, currentUser);

    return complaint;
  }

  // ================ GET MY COMPLAINTS ================
  async getMyComplaints(userId: string, queryDto: QueryComplaintDto) {
    const query: any = { userId: new Types.ObjectId(userId) };

    const {
      status,
      priority,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [complaints, total] = await Promise.all([
      this.complaintModel
        .find(query)
        .populate('categoryId', 'complaintItem')
        .populate('assignedTo', 'fullName')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.complaintModel.countDocuments(query),
    ]);

    return {
      complaints,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ UPDATE COMPLAINT ================
  async update(
    id: string,
    updateComplaintDto: UpdateComplaintDto,
    currentUser: User,
  ): Promise<Complaint> {
    const complaint = await this.complaintModel.findById(id);

    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    this.checkAccess(complaint, currentUser);

    if (updateComplaintDto.categoryId) {
      (updateComplaintDto as any).categoryId = new Types.ObjectId(
        updateComplaintDto.categoryId,
      );
    }

    const updatedComplaint = await this.complaintModel
      .findByIdAndUpdate(id, updateComplaintDto, { new: true })
      .populate('userId', 'fullName rationalId phone userType')
      .populate('categoryId', 'complaintItem description')
      .populate('assignedTo', 'fullName userType')
      .exec();

    if (!updatedComplaint) {
      throw new NotFoundException('فشل في تحديث الشكوى');
    }

    return updatedComplaint;
  }

  // ================ UPDATE STATUS ================
  async updateStatus(
    complaintId: string,
    newStatus: ComplaintStatus,
    currentUser: User,
    note?: string,
  ): Promise<Complaint> {
    if (currentUser.userType !== UserType.ADMIN) {
      throw new ForbiddenException('فقط المسؤولين يمكنهم تحديث حالة الشكوى');
    }

    const complaint = await this.complaintModel.findById(complaintId);
    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    const oldStatus = complaint.status;
    complaint.status = newStatus;

    if (newStatus === ComplaintStatus.RESOLVED && !complaint.resolvedAt) {
      complaint.resolvedAt = new Date();
    }
    if (newStatus === ComplaintStatus.CLOSED && !complaint.closedAt) {
      complaint.closedAt = new Date();
    }

    await complaint.save();

    // تسجيل العملية تلقائياً في ComplaintLogs
    try {
      await this.complaintLogsService.createAutoLog(
        complaintId,
        currentUser._id.toString(),
        'status_change',
        `تم تغيير حالة الشكوى إلى ${newStatus}`,
      );
    } catch (error) {
      console.error('فشل تسجيل السجل التلقائي:', error.message);
    }

    // إشعار تلقائي عند تغيير الحالة
    try {
      await this.notificationsService.createAutoNotification(
        complaint.userId.toString(),
        complaint._id.toString(),
        NotificationType.STATUS_UPDATE,
        `تم تغيير حالة الشكوى إلى ${newStatus}`,
        {
          oldStatus,
          newStatus,
          assignedTo: currentUser._id.toString(),
          note,
        },
      );
    } catch (error) {
      console.error('فشل إنشاء إشعار تحديث الحالة:', error.message);
    }

    return this.populateComplaint(complaint);
  }

  // ================ ASSIGN COMPLAINT ================
  async assignComplaint(
    complaintId: string,
    adminId: string,
    currentUser: User,
  ): Promise<Complaint> {
    if (currentUser.userType !== UserType.ADMIN) {
      throw new ForbiddenException('فقط المسؤولين يمكنهم تعيين الشكاوى');
    }

    const complaint = await this.complaintModel.findById(complaintId);
    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    complaint.assignedTo = new Types.ObjectId(adminId);

    if (complaint.status === ComplaintStatus.PENDING) {
      complaint.status = ComplaintStatus.IN_PROGRESS;
    }

    await complaint.save();

    // سجل التعيين
    try {
      await this.complaintLogsService.createAutoLog(
        complaintId,
        currentUser._id.toString(),
        'assignment',
        `تم تعيين الشكوى إلى المسؤول ذو المعرف ${adminId}`,
      );
    } catch (error) {
      console.error('فشل تسجيل سجل التعيين:', error.message);
    }

    // إشعار تلقائي
    try {
      await this.notificationsService.createAutoNotification(
        complaint.userId.toString(),
        complaint._id.toString(),
        NotificationType.STATUS_UPDATE,
        `تم تعيين الشكوى إلى المسؤول ذو المعرف ${adminId}`,
        {
          assignedTo: adminId,
          oldStatus: ComplaintStatus.PENDING,
          newStatus: ComplaintStatus.IN_PROGRESS,
        },
      );
    } catch (error) {
      console.error('فشل إنشاء إشعار التعيين:', error.message);
    }

    return this.populateComplaint(complaint);
  }

  // ================ UPLOAD IMAGES TO CLOUDINARY ================
  async uploadImagesToCloudinary(
    complaintId: string,
    files: Express.Multer.File[],
    currentUser: User,
  ): Promise<Complaint> {
    const complaint = await this.complaintModel.findById(complaintId);
    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    this.checkAccess(complaint, currentUser);

    // ✅ رفع الصور إلى Cloudinary
    const uploadResults = await this.cloudinaryService.uploadImages(
      files,
      `complaints/${complaintId}`,
    );

    // ✅ حفظ URLs الصور في قاعدة البيانات
    const imageUrls = uploadResults.map((result) => result.secure_url);
    complaint.images.push(...imageUrls);
    await complaint.save();

    // سجل رفع الصور
    try {
      await this.complaintLogsService.createAutoLog(
        complaintId,
        currentUser._id.toString(),
        'upload_images',
        `تمت إضافة ${files.length} صورة جديدة للشكوى`,
      );
    } catch (error) {
      console.error('فشل تسجيل سجل رفع الصور:', error.message);
    }

    // إشعار تلقائي
    try {
      await this.notificationsService.createAutoNotification(
        complaint.userId.toString(),
        complaint._id.toString(),
        NotificationType.NEW_COMMENT,
        `تمت إضافة ${files.length} صورة جديدة إلى الشكوى.`,
      );
    } catch (error) {
      console.error('فشل إنشاء إشعار رفع الصور:', error.message);
    }

    return this.populateComplaint(complaint);
  }

  // ================ DELETE IMAGE (Cloudinary) ================
  async deleteImage(
    complaintId: string,
    imageUrl: string,
    currentUser: User,
  ): Promise<Complaint> {
    const complaint = await this.complaintModel.findById(complaintId);
    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    this.checkAccess(complaint, currentUser);

    // ✅ حذف الصورة من Cloudinary
    try {
      const publicId = this.cloudinaryService.extractPublicId(imageUrl);
      await this.cloudinaryService.deleteImage(publicId);
    } catch (error) {
      console.error('خطأ في حذف الصورة من Cloudinary:', error);
    }

    // حذف URL الصورة من قاعدة البيانات
    complaint.images = complaint.images.filter((img) => img !== imageUrl);
    await complaint.save();

    return this.populateComplaint(complaint);
  }

  // ================ MARK AS READ ================
  async markAsRead(id: string, currentUser: User): Promise<Complaint> {
    if (currentUser.userType !== UserType.ADMIN) {
      throw new ForbiddenException('فقط المسؤولين يمكنهم تعليم الشكوى كمقروءة');
    }

    const complaint = await this.complaintModel
      .findByIdAndUpdate(id, { isRead: true }, { new: true })
      .populate('userId', 'fullName rationalId phone')
      .populate('categoryId', 'complaintItem')
      .exec();

    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    return complaint;
  }

  // ================ DELETE COMPLAINT ================
  async remove(id: string, currentUser: User): Promise<{ message: string }> {
    const complaint = await this.complaintModel.findById(id);

    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    this.checkAccess(complaint, currentUser);

    // ✅ حذف جميع الصور من Cloudinary
    for (const imageUrl of complaint.images) {
      try {
        const publicId = this.cloudinaryService.extractPublicId(imageUrl);
        await this.cloudinaryService.deleteImage(publicId);
      } catch (error) {
        console.error('خطأ في حذف الصورة:', error);
      }
    }

    await this.complaintModel.findByIdAndDelete(id);

    return { message: 'تم حذف الشكوى بنجاح' };
  }

  // ================ GET STATISTICS ================
  async getStatistics(currentUser: User) {
    const query: any = {};

    if (currentUser.userType === UserType.CITIZEN) {
      query.userId = currentUser._id;
    }

    const [totalComplaints, byStatus, byPriority, unreadCount] =
      await Promise.all([
        this.complaintModel.countDocuments(query),
        this.complaintModel.aggregate([
          { $match: query },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        this.complaintModel.aggregate([
          { $match: query },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
        this.complaintModel.countDocuments({ ...query, isRead: false }),
      ]);

    return {
      totalComplaints,
      unreadCount,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  // ================ HELPER: Generate Complaint ID ================
  private async generateComplaintId(): Promise<string> {
    const count = await this.complaintModel.countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `CMP-${year}${month}${day}-${String(count + 1).padStart(6, '0')}`;
  }

  // ================ HELPER: Populate ================
  private async populateComplaint(complaint: Complaint): Promise<any> {
    const populated = await this.complaintModel
      .findById(complaint._id)
      .populate('userId', 'fullName rationalId phone userType')
      .populate('categoryId', 'complaintItem description')
      .populate('assignedTo', 'fullName userType')
      .exec();

    if (!populated) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    const complaintObj: any = populated.toObject();

    // ✅ الصور الآن URLs مباشرة من Cloudinary
    complaintObj.images = this.buildImageUrls(complaintObj.images || []);

    return complaintObj;
  }

  private buildImageUrls(
    images: string[],
  ): { fileName: string; fileUrl: string }[] {
    return images.map((url) => {
      // إذا كانت الصورة URL كامل (Cloudinary)
      if (url.startsWith('http')) {
        const parts = url.split('/');
        const fileName = parts[parts.length - 1];
        return {
          fileName,
          fileUrl: url,
        };
      }
      // إذا كانت الصورة اسم ملف قديم (للتوافق مع البيانات القديمة)
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      return {
        fileName: url,
        fileUrl: `${baseUrl}/uploads/complaints/${url}`,
      };
    });
  }

  // ================ HELPER: Check Access ================
  private checkAccess(complaint: Complaint, currentUser: User): void {
    // الأدمن يقدر يوصل لكل الشكاوى
    if (currentUser.userType === UserType.ADMIN) {
      return;
    }

    // استخراج الـ userId من الشكوى
    const complaintUserId =
      (complaint.userId as any)?._id?.toString() ||
      (complaint.userId as any)?.toString() ||
      '';

    // استخراج الـ userId من المستخدم الحالي
    const currentUserId = (currentUser._id as any)?.toString() || '';

    // المقارنة
    if (complaintUserId !== currentUserId) {
      throw new ForbiddenException('ليس لديك صلاحية للوصول لهذه الشكوى');
    }
  }
}