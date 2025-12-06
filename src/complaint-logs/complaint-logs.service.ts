import { 
  Injectable, 
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ComplaintLog } from './schemas/complaint-log.schema';
import { Complaint } from 'src/complaints/schemas/complaint.schema';
import { CreateComplaintLogDto } from './dto/create-complaint-log.dto';
import { QueryComplaintLogDto } from './dto/query-complaint-log.dto';
import { User, UserType } from 'src/users/schemas/user.schema';

@Injectable()
export class ComplaintLogsService {
  constructor(
    @InjectModel(ComplaintLog.name) 
    private logModel: Model<ComplaintLog>,
    @InjectModel(Complaint.name) 
    private complaintModel: Model<Complaint>,
  ) {}

  // ================ CREATE LOG ================
  async create(
    createLogDto: CreateComplaintLogDto,
    userId: string,
  ): Promise<ComplaintLog> {
    const { complaintId } = createLogDto;

    // التحقق من وجود الشكوى
    const complaint = await this.complaintModel.findById(complaintId);
    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    const log = await this.logModel.create({
      ...createLogDto,
      complaintId: new Types.ObjectId(complaintId),
      actionBy: new Types.ObjectId(userId),
    });

    return this.populateLog(log);
  }

  // ================ CREATE LOG AUTOMATICALLY ================
  async createAutoLog(
    complaintId: string,
    actionBy: string,
    actionType: string,
    description: string,
  ): Promise<ComplaintLog> {
    const log = await this.logModel.create({
      complaintId: new Types.ObjectId(complaintId),
      actionBy: new Types.ObjectId(actionBy),
      actionType,
      description,
    });

    return this.populateLog(log);
  }

  // ================ GET ALL LOGS ================
  async findAll(queryDto: QueryComplaintLogDto, currentUser: User) {
    const { 
      search, 
      complaintId,
      actionBy,
      actionType,
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = queryDto;

    const query: any = {};

    // إذا كان مواطن، يرى سجلات شكاويه فقط
    if (currentUser.userType === UserType.CITIZEN) {
      const userComplaints = await this.complaintModel
        .find({ userId: currentUser._id })
        .select('_id')
        .exec();
      
      const complaintIds = userComplaints.map(c => c._id);
      query.complaintId = { $in: complaintIds };
    }

    if (complaintId) {
      query.complaintId = new Types.ObjectId(complaintId);
    }

    if (actionBy) {
      query.actionBy = new Types.ObjectId(actionBy);
    }

    if (actionType) {
      query.actionType = { $regex: actionType, $options: 'i' };
    }

    // البحث في نوع الإجراء أو الوصف
    if (search) {
      query.$or = [
        { actionType: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [logs, total] = await Promise.all([
      this.logModel
        .find(query)
        .populate('complaintId', 'complaintId message type')
        .populate('actionBy', 'fullName rationalId userType')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.logModel.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ GET ONE LOG ================
  async findOne(id: string, currentUser: User): Promise<ComplaintLog> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف السجل غير صالح');
    }

    const log = await this.logModel
      .findById(id)
      .populate('complaintId', 'complaintId message type userId')
      .populate('actionBy', 'fullName rationalId userType')
      .exec();
    
    if (!log) {
      throw new NotFoundException('السجل غير موجود');
    }

    // التحقق من الصلاحيات
    await this.checkAccess(log, currentUser);

    return log;
  }

  // ================ GET LOGS BY COMPLAINT ID ================
  async findByComplaintId(
    complaintId: string, 
    currentUser: User
  ): Promise<ComplaintLog[]> {
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
        throw new ForbiddenException('ليس لديك صلاحية للوصول لهذه السجلات');
      }
    }

    const logs = await this.logModel
      .find({ complaintId: new Types.ObjectId(complaintId) })
      .populate('actionBy', 'fullName rationalId userType')
      .sort({ createdAt: -1 })
      .exec();

    return logs;
  }

  // ================ GET LOGS BY USER ================
  async findByUser(
    userId: string,
    queryDto: QueryComplaintLogDto,
    currentUser: User
  ) {
    // فقط الأدمن أو المستخدم نفسه يمكنه الوصول
    if (
      currentUser.userType !== UserType.ADMIN && 
      userId !== currentUser._id.toString()
    ) {
      throw new ForbiddenException('ليس لديك صلاحية للوصول لهذه السجلات');
    }

    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = queryDto;

    const query = { actionBy: new Types.ObjectId(userId) };
    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [logs, total] = await Promise.all([
      this.logModel
        .find(query)
        .populate('complaintId', 'complaintId message type')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.logModel.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ DELETE LOG (Admin only) ================
  async remove(id: string, currentUser: User): Promise<{ message: string }> {
    if (currentUser.userType !== UserType.ADMIN) {
      throw new ForbiddenException('فقط المسؤولين يمكنهم حذف السجلات');
    }

    const result = await this.logModel.findByIdAndDelete(id);
    
    if (!result) {
      throw new NotFoundException('السجل غير موجود');
    }

    return { message: 'تم حذف السجل بنجاح' };
  }

  // ================ DELETE LOGS BY COMPLAINT ================
  async removeByComplaint(
    complaintId: string,
    currentUser: User
  ): Promise<{ message: string; deletedCount: number }> {
    if (currentUser.userType !== UserType.ADMIN) {
      throw new ForbiddenException('فقط المسؤولين يمكنهم حذف السجلات');
    }

    const result = await this.logModel.deleteMany({ 
      complaintId: new Types.ObjectId(complaintId) 
    });

    return { 
      message: 'تم حذف السجلات بنجاح',
      deletedCount: result.deletedCount 
    };
  }

  // ================ GET STATISTICS ================
  async getStatistics(currentUser: User) {
    const query: any = {};

    // إذا كان مواطن، إحصائيات سجلاته فقط
    if (currentUser.userType === UserType.CITIZEN) {
      const userComplaints = await this.complaintModel
        .find({ userId: currentUser._id })
        .select('_id')
        .exec();
      
      const complaintIds = userComplaints.map(c => c._id);
      query.complaintId = { $in: complaintIds };
    }

    const [
      totalLogs,
      logsByActionType,
      logsByUser,
    ] = await Promise.all([
      this.logModel.countDocuments(query),
      this.logModel.aggregate([
        { $match: query },
        { $group: { _id: '$actionType', count: { $sum: 1 } } },
      ]),
      this.logModel.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'users',
            localField: 'actionBy',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $group: {
            _id: '$actionBy',
            fullName: { $first: '$user.fullName' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
    ]);

    return {
      totalLogs,
      logsByActionType: logsByActionType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topUsers: logsByUser,
    };
  }

  // ================ GET ACTIVITY TIMELINE ================
  async getActivityTimeline(
    complaintId: string,
    currentUser: User
  ): Promise<ComplaintLog[]> {
    const complaint = await this.complaintModel.findById(complaintId);
    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    // التحقق من الصلاحيات
    if (currentUser.userType === UserType.CITIZEN) {
      if (complaint.userId.toString() !== currentUser._id.toString()) {
        throw new ForbiddenException('ليس لديك صلاحية للوصول لهذا الجدول الزمني');
      }
    }

    return this.logModel
      .find({ complaintId: new Types.ObjectId(complaintId) })
      .populate('actionBy', 'fullName userType profileImage')
      .sort({ createdAt: 1 }) // ترتيب تصاعدي (من القديم للحديث)
      .exec();
  }

  // ================ HELPER: Populate log ================
  private async populateLog(log: ComplaintLog): Promise<ComplaintLog> {
  const populatedLog = await this.logModel
    .findById(log._id)
    .populate('complaintId', 'complaintId message type')
    .populate('actionBy', 'fullName rationalId userType')
    .exec();

  if (!populatedLog) {
    throw new NotFoundException('سجل الشكوى غير موجود');
  }

  return populatedLog;
}


  // ================ HELPER: التحقق من الصلاحيات ================
  private async checkAccess(log: ComplaintLog, currentUser: User): Promise<void> {
    if (currentUser.userType === UserType.ADMIN) {
      return;
    }

    // المواطن يمكنه رؤية سجلات شكاويه فقط
    const complaint = await this.complaintModel.findById(log.complaintId);
    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    if (complaint.userId.toString() !== currentUser._id.toString()) {
      throw new ForbiddenException('ليس لديك صلاحية للوصول لهذا السجل');
    }
  }
}