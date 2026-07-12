import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { successResponse } from '../common/helpers/response.helper';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

  // Super admin: get all users stats
  async getStats() {
    const [totalSchools, totalStudents, totalTeachers] = await Promise.all([
      this.prisma.school.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
      this.prisma.user.count({ where: { role: 'TEACHER', isActive: true } }),
    ]);

    return successResponse(
      { totalSchools, totalStudents, totalTeachers },
      'Stats fetched',
    );
  }
}
