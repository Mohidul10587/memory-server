import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherFilterDto } from './dto/teacher-filter.dto';
import { UpdateTeacherProfileDto } from './dto/update-teacher.dto';
import { paginatedResponse, successResponse } from '../common/helpers/response.helper';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class TeachersService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findAllBySchool(schoolId: string, query: TeacherFilterDto) {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      joiningYear,
      subject,
      bloodGroup,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      user: { schoolId, isActive: true, role: 'TEACHER' },
    };

    if (joiningYear) where.joiningYear = joiningYear;
    if (subject) where.subject = { contains: subject, mode: 'insensitive' };
    if (bloodGroup) where.bloodGroup = bloodGroup;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { user: { phone: { contains: search } } },
      ];
    }

    const validSortFields = ['name', 'joiningYear', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'name';

    const [teachers, total] = await Promise.all([
      this.prisma.teacherProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        select: {
          id: true,
          name: true,
          profileImage: true,
          joiningYear: true,
          subject: true,
          designation: true,
          bloodGroup: true,
          about: true,
          user: {
            select: { id: true, phone: true, schoolId: true },
          },
        },
      }),
      this.prisma.teacherProfile.count({ where }),
    ]);

    return paginatedResponse(teachers, total, page, limit, 'Teachers fetched');
  }

  async findOne(userId: string, requestingSchoolId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
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

    if (!profile) throw new NotFoundException('Teacher not found');

    // Tenant isolation
    if (profile.user.schoolId !== requestingSchoolId) {
      throw new ForbiddenException('Access denied');
    }

    return successResponse(profile, 'Teacher profile fetched');
  }

  async updateProfile(
    userId: string,
    dto: UpdateTeacherProfileDto,
    requestingUserId: string,
    profileImage?: string,
  ) {
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only edit your own profile');
    }

    const profile = await this.prisma.teacherProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const updated = await this.prisma.teacherProfile.update({
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

    const profile = await this.prisma.teacherProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const imageUrl = await this.cloudinaryService.uploadImage(
      file,
      'school-alumni/profiles',
    );

    const updated = await this.prisma.teacherProfile.update({
      where: { userId },
      data: { profileImage: imageUrl },
    });

    return successResponse(updated, 'Profile image updated');
  }
}
