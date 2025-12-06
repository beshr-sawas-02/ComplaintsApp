import { 
  Injectable, 
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rating } from './schemas/rating.schema';
import { Complaint } from 'src/complaints/schemas/complaint.schema';
import { CreateRatingDto } from './dto/create-rating.dto';
import { QueryRatingDto } from './dto/query-rating.dto';
import { User, UserType } from 'src/users/schemas/user.schema';
import { UpdateRatingDto } from './dto/update-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectModel(Rating.name) 
    private ratingModel: Model<Rating>,
    @InjectModel(Complaint.name) 
    private complaintModel: Model<Complaint>,
  ) {}

  // ================ CREATE RATING ================
  async create(
    createRatingDto: CreateRatingDto,
    userId: string,
  ): Promise<Rating> {
    const { complaintId } = createRatingDto;

    // التحقق من وجود الشكوى
    const complaint = await this.complaintModel.findById(complaintId);
    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    // التحقق من أن المستخدم هو صاحب الشكوى
    if (complaint.userId.toString() !== userId) {
      throw new ForbiddenException('يمكنك فقط تقييم شكاويك الخاصة');
    }

    // التحقق من عدم وجود تقييم سابق
    const existingRating = await this.ratingModel.findOne({
      complaintId: new Types.ObjectId(complaintId),
      userId: new Types.ObjectId(userId),
    });

    if (existingRating) {
      throw new ConflictException('لقد قمت بتقييم هذه الشكوى مسبقاً. يمكنك تحديث التقييم بدلاً من ذلك.');
    }

    const rating = await this.ratingModel.create({
      ...createRatingDto,
      complaintId: new Types.ObjectId(complaintId),
      userId: new Types.ObjectId(userId),
    });

    const populatedRating = await this.populateRating(rating);
    
    if (!populatedRating) {
      throw new NotFoundException('فشل في إنشاء التقييم');
    }

    return populatedRating;
  }

  // ================ GET ALL RATINGS ================
  async findAll(queryDto: QueryRatingDto, currentUser: User) {
    const { 
      search, 
      complaintId,
      userId,
      rating,
      minRating,
      maxRating,
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = queryDto;

    const query: any = {};

    // إذا كان مواطن، يرى تقييماته فقط
    if (currentUser.userType === UserType.CITIZEN) {
      query.userId = currentUser._id;
    }

    // الفلترة (للأدمن)
    if (complaintId) {
      query.complaintId = new Types.ObjectId(complaintId);
    }

    if (userId && currentUser.userType === UserType.ADMIN) {
      query.userId = new Types.ObjectId(userId);
    }

    if (rating) {
      query.rating = rating;
    }

    // نطاق التقييم
    if (minRating || maxRating) {
      query.rating = {};
      if (minRating) query.rating.$gte = minRating;
      if (maxRating) query.rating.$lte = maxRating;
    }

    // البحث في التعليق
    if (search) {
      query.feedback = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [ratings, total] = await Promise.all([
      this.ratingModel
        .find(query)
        .populate('complaintId', 'complaintId message type')
        .populate('userId', 'fullName rationalId userType')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.ratingModel.countDocuments(query),
    ]);

    return {
      ratings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ GET ONE RATING ================
  async findOne(id: string, currentUser: User): Promise<Rating> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف التقييم غير صالح');
    }

    const rating = await this.ratingModel
      .findById(id)
      .populate('complaintId', 'complaintId message type')
      .populate('userId', 'fullName rationalId userType')
      .exec();
    
    if (!rating) {
      throw new NotFoundException('التقييم غير موجود');
    }

    // التحقق من الصلاحيات
    this.checkAccess(rating, currentUser);

    return rating;
  }

  // ================ GET RATING BY COMPLAINT ================
  async findByComplaint(
    complaintId: string,
    currentUser: User
  ): Promise<Rating | null> {
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
        throw new ForbiddenException('ليس لديك صلاحية للوصول لهذا التقييم');
      }
    }

    const rating = await this.ratingModel
      .findOne({ complaintId: new Types.ObjectId(complaintId) })
      .populate('userId', 'fullName userType')
      .exec();

    return rating;
  }

  // ================ GET MY RATINGS ================
  async getMyRatings(
    userId: string,
    queryDto: QueryRatingDto
  ) {
    const { 
      rating,
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = queryDto;

    const query: any = { userId: new Types.ObjectId(userId) };

    if (rating) {
      query.rating = rating;
    }

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [ratings, total] = await Promise.all([
      this.ratingModel
        .find(query)
        .populate('complaintId', 'complaintId message type')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.ratingModel.countDocuments(query),
    ]);

    return {
      ratings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ UPDATE RATING ================
  async update(
    id: string, 
    updateRatingDto: UpdateRatingDto,
    currentUser: User,
  ): Promise<Rating> {
    const rating = await this.ratingModel.findById(id);
    
    if (!rating) {
      throw new NotFoundException('التقييم غير موجود');
    }

    // التحقق من الصلاحيات
    this.checkAccess(rating, currentUser);

    const updatedRating = await this.ratingModel
      .findByIdAndUpdate(id, updateRatingDto, { new: true })
      .populate('complaintId', 'complaintId message type')
      .populate('userId', 'fullName rationalId userType')
      .exec();

    if (!updatedRating) {
      throw new NotFoundException('فشل في تحديث التقييم');
    }

    return updatedRating;
  }

  // ================ DELETE RATING ================
  async remove(id: string, currentUser: User): Promise<{ message: string }> {
    const rating = await this.ratingModel.findById(id);
    
    if (!rating) {
      throw new NotFoundException('التقييم غير موجود');
    }

    // التحقق من الصلاحيات
    this.checkAccess(rating, currentUser);

    await this.ratingModel.findByIdAndDelete(id);

    return { message: 'تم حذف التقييم بنجاح' };
  }

  // ================ GET STATISTICS ================
  async getStatistics(currentUser: User) {
    const query: any = {};

    // إذا كان مواطن، إحصائياته فقط
    if (currentUser.userType === UserType.CITIZEN) {
      query.userId = currentUser._id;
    }

    const [
      totalRatings,
      averageRating,
      ratingDistribution,
      topRatedComplaints,
      lowRatedComplaints,
    ] = await Promise.all([
      this.ratingModel.countDocuments(query),
      this.ratingModel.aggregate([
        { $match: query },
        { $group: { _id: null, average: { $avg: '$rating' } } }
      ]),
      this.ratingModel.aggregate([
        { $match: query },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      this.ratingModel.aggregate([
        { $match: query },
        { $match: { rating: { $gte: 4 } } },
        {
          $lookup: {
            from: 'complaints',
            localField: 'complaintId',
            foreignField: '_id',
            as: 'complaint'
          }
        },
        { $unwind: '$complaint' },
        {
          $project: {
            rating: 1,
            feedback: 1,
            complaintId: '$complaint.complaintId',
            message: '$complaint.message'
          }
        },
        { $sort: { rating: -1 } },
        { $limit: 5 }
      ]),
      this.ratingModel.aggregate([
        { $match: query },
        { $match: { rating: { $lte: 2 } } },
        {
          $lookup: {
            from: 'complaints',
            localField: 'complaintId',
            foreignField: '_id',
            as: 'complaint'
          }
        },
        { $unwind: '$complaint' },
        {
          $project: {
            rating: 1,
            feedback: 1,
            complaintId: '$complaint.complaintId',
            message: '$complaint.message'
          }
        },
        { $sort: { rating: 1 } },
        { $limit: 5 }
      ]),
    ]);

    return {
      totalRatings,
      averageRating: averageRating[0]?.average || 0,
      ratingDistribution: ratingDistribution.reduce((acc, item) => {
        acc[`${item._id}_stars`] = item.count;
        return acc;
      }, {}),
      topRatedComplaints,
      lowRatedComplaints,
    };
  }

  // ================ GET AVERAGE RATING BY COMPLAINT ================
  async getAverageByComplaint(complaintId: string): Promise<number> {
    const result = await this.ratingModel.aggregate([
      { $match: { complaintId: new Types.ObjectId(complaintId) } },
      { $group: { _id: null, average: { $avg: '$rating' } } }
    ]);

    return result[0]?.average || 0;
  }

  // ================ CHECK IF USER RATED COMPLAINT ================
  async hasUserRated(
    complaintId: string,
    userId: string
  ): Promise<boolean> {
    const count = await this.ratingModel.countDocuments({
      complaintId: new Types.ObjectId(complaintId),
      userId: new Types.ObjectId(userId),
    });

    return count > 0;
  }

  // ================ GET RATINGS WITH FEEDBACK ================
  async getRatingsWithFeedback(queryDto: QueryRatingDto) {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = queryDto;

    const query = { 
      feedback: { 
        $exists: true, 
        $nin: [null, '']
      } 
    };

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [ratings, total] = await Promise.all([
      this.ratingModel
        .find(query)
        .populate('complaintId', 'complaintId message')
        .populate('userId', 'fullName')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.ratingModel.countDocuments(query),
    ]);

    return {
      ratings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ HELPER: Populate rating ================
  private async populateRating(rating: Rating): Promise<Rating | null> {
    return this.ratingModel
      .findById(rating._id)
      .populate('complaintId', 'complaintId message type')
      .populate('userId', 'fullName rationalId userType')
      .exec();
  }

  // ================ HELPER: التحقق من الصلاحيات ================
  private checkAccess(rating: Rating, currentUser: User): void {
    // الأدمن يمكنه الوصول لكل شيء
    if (currentUser.userType === UserType.ADMIN) {
      return;
    }

    // المواطن يمكنه الوصول لتقييماته فقط
    if (rating.userId.toString() !== currentUser._id.toString()) {
      throw new ForbiddenException('ليس لديك صلاحية للوصول لهذا التقييم');
    }
  }
}