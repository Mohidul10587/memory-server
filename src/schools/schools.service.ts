import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto, UpdateSchoolDto } from './dto/school.dto';
import { paginatedResponse, successResponse } from '../common/helpers/response.helper';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSchoolDto, logo?: string, coverPhoto?: string) {
    if (dto.eiin) {
      const existing = await this.prisma.school.findUnique({ where: { eiin: dto.eiin } });
      if (existing) throw new ConflictException('EIIN already exists');
    }

    const school = await this.prisma.school.create({
      data: { ...dto, logo, coverPhoto },
    });
    return successResponse(school, 'School created successfully');
  }

  async findAll(query: PaginationDto) {
    const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          isActive: true,
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { district: { contains: search, mode: 'insensitive' as const } },
            { division: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : { isActive: true };

    const validSortFields = ['name', 'district', 'division', 'establishedYear', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'name';

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        select: {
          id: true,
          name: true,
          eiin: true,
          logo: true,
          district: true,
          division: true,
          establishedYear: true,
          isActive: true,
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    return paginatedResponse(schools, total, page, limit, 'Schools fetched');
  }

  // For public dropdown — only active schools, minimal info
  async findAllForDropdown() {
    const schools = await this.prisma.school.findMany({
      where: { isActive: true },
      select: { id: true, name: true, district: true, logo: true },
      orderBy: { name: 'asc' },
    });
    return successResponse(schools, 'Schools fetched for dropdown');
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id, isActive: true },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
    if (!school) throw new NotFoundException('School not found');
    return successResponse(school, 'School fetched');
  }

  async update(id: string, dto: UpdateSchoolDto, logo?: string, coverPhoto?: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');

    if (dto.eiin && dto.eiin !== school.eiin) {
      const existing = await this.prisma.school.findUnique({ where: { eiin: dto.eiin } });
      if (existing) throw new ConflictException('EIIN already exists');
    }

    const updated = await this.prisma.school.update({
      where: { id },
      data: {
        ...dto,
        ...(logo && { logo }),
        ...(coverPhoto && { coverPhoto }),
      },
    });
    return successResponse(updated, 'School updated');
  }

  async toggleActive(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    const updated = await this.prisma.school.update({
      where: { id },
      data: { isActive: !school.isActive },
    });
    return successResponse(updated, `School ${updated.isActive ? 'activated' : 'deactivated'}`);
  }
}
