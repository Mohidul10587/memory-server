import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StudentFilterDto } from './dto/student-filter.dto';
import { UpdateStudentProfileDto } from './dto/update-student.dto';
import { paginatedResponse, successResponse } from '../common/helpers/response.helper';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findAllBySchool(schoolId: string, query: StudentFilterDto) {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'sscPassingYear',
      sortOrder = 'desc',
      sscPassingYear,
      bloodGroup,
      profession,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      user: { schoolId, isActive: true, role: 'STUDENT' },
    };

    if (sscPassingYear) where.sscPassingYear = sscPassingYear;
    if (bloodGroup) where.bloodGroup = bloodGroup;
    if (profession) where.profession = { contains: profession, mode: 'insensitive' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { profession: { contains: search, mode: 'insensitive' } },
        { user: { phone: { contains: search } } },
      ];
      if (!isNaN(parseInt(search))) {
        where.OR.push({ sscPassingYear: parseInt(search) });
      }
    }

    const validSortFields = ['name', 'sscPassingYear', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'sscPassingYear';

    const [students, total] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        select: {
          id: true,
          name: true,
          profileImage: true,
          sscPassingYear: true,
          profession: true,
          bloodGroup: true,
          about: true,
          user: {
            select: { id: true, phone: true, schoolId: true },
          },
        },
      }),
      this.prisma.studentProfile.count({ where }),
    ]);

    return paginatedResponse(students, total, page, limit, 'Students fetched');
  }

  async findByBatch(schoolId: string, sscYear: number, query: StudentFilterDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      sscPassingYear: sscYear,
      user: { schoolId, isActive: true, role: 'STUDENT' as const },
    };

    const [students, total] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          profileImage: true,
          sscPassingYear: true,
          profession: true,
          bloodGroup: true,
          user: { select: { id: true, phone: true } },
        },
      }),
      this.prisma.studentProfile.count({ where }),
    ]);

    return paginatedResponse(students, total, page, limit, `Batch ${sscYear} students fetched`);
  }

  async getBatches(schoolId: string) {
    const batches = await this.prisma.studentProfile.groupBy({
      by: ['sscPassingYear'],
      where: { user: { schoolId, isActive: true, role: 'STUDENT' } },
      _count: { sscPassingYear: true },
      orderBy: { sscPassingYear: 'desc' },
    });

    const result = batches.map((b) => ({
      year: b.sscPassingYear,
      count: b._count.sscPassingYear,
    }));

    return successResponse(result, 'Batches fetched');
  }

  async findOne(userId: string, requestingSchoolId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            role: true,
            schoolId: true,
            school: { select: { id: true, name: true, logo: true } },
          },
        },
      },
    });

    if (!profile) throw new NotFoundException('Student not found');

    // Tenant isolation
    if (profile.user.schoolId !== requestingSchoolId) {
      throw new ForbiddenException('Access denied');
    }

    return successResponse(profile, 'Student profile fetched');
  }

  async updateProfile(
    userId: string,
    dto: UpdateStudentProfileDto,
    requestingUserId: string,
    profileImage?: string,
  ) {
    // Only own profile
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only edit your own profile');
    }

    const profile = await this.prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const updated = await this.prisma.studentProfile.update({
      where: { userId },
      data: {
        ...dto,
        ...(profileImage && { profileImage }),
      },
    });

    return successResponse(updated, 'Profile updated');
  }

  async updateProfileImage(userId: string, requestingUserId: string, file: Express.Multer.File) {
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only edit your own profile');
    }

    const profile = await this.prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const imageUrl = await this.cloudinaryService.uploadImage(
      file,
      'school-alumni/profiles',
    );

    const updated = await this.prisma.studentProfile.update({
      where: { userId },
      data: { profileImage: imageUrl },
    });

    return successResponse(updated, 'Profile image updated');
  }
}
