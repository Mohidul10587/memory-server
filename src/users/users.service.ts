import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  successResponse,
  paginatedResponse,
} from '../common/helpers/response.helper';
import { AdminUserFilterDto } from './dto/admin-user-filter.dto';
import {
  AdminUpdateStudentDto,
  AdminUpdateTeacherDto,
} from './dto/admin-update-user.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ─── Normal User: Get own profile ─────────────────────────────────────────
  async getProfile(userId: string, requestingSchoolId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        phone: true,
        role: true,
        schoolId: true,
        school: { select: { id: true, name: true, logo: true } },
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Tenant isolation — same school only
    if (user.schoolId !== requestingSchoolId) {
      throw new ForbiddenException('Access denied');
    }

    return successResponse(user, 'User profile fetched');
  }

  // ─── Super Admin: Get all users (all schools) ──────────────────────────────
  async getAllUsers(query: AdminUserFilterDto) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      schoolId,
      division,
      district,
      upazila,
    } = query;
    const skip = (page - 1) * limit;

    const userWhere: any = {
      // Exclude super admin from list
      role: role ?? { in: [UserRole.STUDENT, UserRole.TEACHER] },
    };

    if (schoolId) userWhere.schoolId = schoolId;

    // Build profile location filter
    const profileLocationFilter: any = {};
    if (division)
      profileLocationFilter.division = {
        contains: division,
        mode: 'insensitive',
      };
    if (district)
      profileLocationFilter.district = {
        contains: district,
        mode: 'insensitive',
      };
    if (upazila)
      profileLocationFilter.upazila = {
        contains: upazila,
        mode: 'insensitive',
      };

    if (search) {
      userWhere.OR = [
        { phone: { contains: search } },
        {
          studentProfile: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          teacherProfile: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    // Apply location filters to student/teacher profiles
    if (Object.keys(profileLocationFilter).length > 0) {
      if (!userWhere.OR) {
        userWhere.AND = [
          {
            OR: [
              { studentProfile: profileLocationFilter },
              { teacherProfile: profileLocationFilter },
            ],
          },
        ];
      } else {
        // combine search with location
        const existingOR = userWhere.OR;
        delete userWhere.OR;
        userWhere.AND = [
          { OR: existingOR },
          {
            OR: [
              { studentProfile: profileLocationFilter },
              { teacherProfile: profileLocationFilter },
            ],
          },
        ];
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: userWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          schoolId: true,
          school: {
            select: { id: true, name: true, logo: true, district: true },
          },
          studentProfile: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              sscPassingYear: true,
              profession: true,
              bloodGroup: true,
              division: true,
              district: true,
              upazila: true,
              union: true,
            },
          },
          teacherProfile: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              joiningYear: true,
              subject: true,
              designation: true,
              bloodGroup: true,
              division: true,
              district: true,
              upazila: true,
              union: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where: userWhere }),
    ]);

    return paginatedResponse(users, total, page, limit, 'Users fetched');
  }

  // ─── Super Admin: Get single user full detail ──────────────────────────────
  async getOneUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        schoolId: true,
        school: {
          select: {
            id: true,
            name: true,
            logo: true,
            district: true,
            division: true,
          },
        },
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.SUPER_ADMIN)
      throw new ForbiddenException('Cannot view super admin');

    return successResponse(user, 'User fetched');
  }

  // ─── Super Admin: Update student profile ──────────────────────────────────
  async adminUpdateStudent(userId: string, dto: AdminUpdateStudentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.STUDENT) {
      throw new BadRequestException('User is not a student');
    }
    if (!user.studentProfile)
      throw new NotFoundException('Student profile not found');

    const { isActive, ...profileData } = dto;

    await this.prisma.$transaction(async (tx) => {
      // Update isActive on User if provided
      if (isActive !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { isActive },
        });
      }
      // Update student profile
      await tx.studentProfile.update({
        where: { userId },
        data: profileData,
      });
    });

    const updated = await this.getOneUser(userId);
    return successResponse(updated.data, 'Student updated successfully');
  }

  // ─── Super Admin: Update teacher profile ──────────────────────────────────
  async adminUpdateTeacher(userId: string, dto: AdminUpdateTeacherDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { teacherProfile: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.TEACHER) {
      throw new BadRequestException('User is not a teacher');
    }
    if (!user.teacherProfile)
      throw new NotFoundException('Teacher profile not found');

    const { isActive, ...profileData } = dto;

    await this.prisma.$transaction(async (tx) => {
      if (isActive !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { isActive },
        });
      }
      await tx.teacherProfile.update({
        where: { userId },
        data: profileData,
      });
    });

    const updated = await this.getOneUser(userId);
    return successResponse(updated.data, 'Teacher updated successfully');
  }

  // ─── Super Admin: Delete user ──────────────────────────────────────────────
  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot delete super admin');
    }

    // Cascade delete handles profiles & refresh tokens via Prisma schema
    await this.prisma.user.delete({ where: { id: userId } });
    return successResponse(null, 'User deleted successfully');
  }

  // ─── Super Admin: Toggle user active status ────────────────────────────────
  async toggleUserActive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot modify super admin');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true, phone: true, role: true },
    });

    return successResponse(
      updated,
      `User ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
    );
  }

  // ─── Super Admin: Stats ────────────────────────────────────────────────────
  async getStats() {
    const [
      totalSchools,
      totalStudents,
      totalTeachers,
      activeStudents,
      activeTeachers,
    ] = await Promise.all([
      this.prisma.school.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.user.count({ where: { role: 'TEACHER' } }),
      this.prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
      this.prisma.user.count({ where: { role: 'TEACHER', isActive: true } }),
    ]);

    return successResponse(
      {
        totalSchools,
        totalStudents,
        totalTeachers,
        activeStudents,
        activeTeachers,
        totalUsers: totalStudents + totalTeachers,
      },
      'Stats fetched',
    );
  }
}
