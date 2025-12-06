import { 
  Injectable, 
  NotFoundException, 
  ConflictException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ComplaintCategory } from './schemas/complaint-category.schema';
import { CreateComplaintCategoryDto } from './dto/create-complaint-category.dto';
import { QueryComplaintCategoryDto } from './dto/query-complaint-category.dto';
import { UpdateComplaintCategoryDto } from './dto/update-complaint-category.dto';

@Injectable()
export class ComplaintCategoriesService {
  constructor(
    @InjectModel(ComplaintCategory.name) 
    private categoryModel: Model<ComplaintCategory>,
  ) {}

  // ================ CREATE CATEGORY ================
  async create(
    createCategoryDto: CreateComplaintCategoryDto
  ): Promise<ComplaintCategory> {
    const { complaintItem } = createCategoryDto;

    // التحقق من عدم وجود التصنيف
    const existingCategory = await this.categoryModel.findOne({ 
      complaintItem: { $regex: new RegExp(`^${complaintItem}$`, 'i') }
    });

    if (existingCategory) {
      throw new ConflictException('هذا التصنيف موجود مسبقاً');
    }

    const category = await this.categoryModel.create(createCategoryDto);
    return category;
  }

  // ================ GET ALL CATEGORIES ================
  async findAll(queryDto: QueryComplaintCategoryDto) {
    const { 
      search, 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = queryDto;

    const query: any = {};

    // البحث في اسم التصنيف أو الوصف
    if (search) {
      query.$or = [
        { complaintItem: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(query),
    ]);

    return {
      categories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================ GET ALL (NO PAGINATION) ================
  async findAllSimple(): Promise<ComplaintCategory[]> {
    return this.categoryModel
      .find()
      .sort({ complaintItem: 1 })
      .exec();
  }

  // ================ GET ONE CATEGORY ================
  async findOne(id: string): Promise<ComplaintCategory> {
    const category = await this.categoryModel.findById(id).exec();
    
    if (!category) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    return category;
  }

  // ================ GET BY NAME ================
  async findByName(complaintItem: string): Promise<ComplaintCategory> {
    const category = await this.categoryModel
      .findOne({ 
        complaintItem: { $regex: new RegExp(`^${complaintItem}$`, 'i') }
      })
      .exec();
    
    if (!category) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    return category;
  }

  // ================ UPDATE CATEGORY ================
  async update(
  id: string, 
  updateCategoryDto: UpdateComplaintCategoryDto
): Promise<ComplaintCategory> {
  const category = await this.categoryModel.findById(id);

  if (!category) {
    throw new NotFoundException('التصنيف غير موجود');
  }

  // إذا تم تحديث الاسم، تحقق من عدم التكرار
  if (updateCategoryDto.complaintItem) {
    const existingCategory = await this.categoryModel.findOne({
      complaintItem: { 
        $regex: new RegExp(`^${updateCategoryDto.complaintItem}$`, 'i'),
      },
      _id: { $ne: id },
    });

    if (existingCategory) {
      throw new ConflictException('هذا التصنيف موجود مسبقاً');
    }
  }

  const updatedCategory = await this.categoryModel
    .findByIdAndUpdate(id, updateCategoryDto, { new: true })
    .exec();

  if (!updatedCategory) {
    throw new NotFoundException('حدث خطأ أثناء تحديث التصنيف');
  }

  return updatedCategory;
}


  // ================ DELETE CATEGORY ================
  async remove(id: string): Promise<{ message: string }> {
    const result = await this.categoryModel.findByIdAndDelete(id);
    
    if (!result) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    return { message: 'تم حذف التصنيف بنجاح' };
  }

  // ================ GET STATISTICS ================
  async getStatistics() {
    const totalCategories = await this.categoryModel.countDocuments();

    return {
      totalCategories,
    };
  }

  // ================ BULK CREATE ================
  async bulkCreate(
    categories: CreateComplaintCategoryDto[]
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const categoryDto of categories) {
      try {
        const existingCategory = await this.categoryModel.findOne({ 
          complaintItem: { 
            $regex: new RegExp(`^${categoryDto.complaintItem}$`, 'i') 
          }
        });

        if (existingCategory) {
          skipped++;
          continue;
        }

        await this.categoryModel.create(categoryDto);
        created++;
      } catch (error) {
        errors.push(`${categoryDto.complaintItem}: ${error.message}`);
      }
    }

    return { created, skipped, errors };
  }

  // ================ CHECK IF EXISTS ================
  async exists(complaintItem: string): Promise<boolean> {
    const count = await this.categoryModel.countDocuments({
      complaintItem: { $regex: new RegExp(`^${complaintItem}$`, 'i') }
    });
    return count > 0;
  }
}