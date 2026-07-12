import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto, UpdateSchoolDto } from './dto/school.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('schools')
@Controller({ path: 'schools', version: '1' })
export class SchoolsController {
  constructor(
    private schoolsService: SchoolsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // Public endpoint for dropdown
  @Get('dropdown')
  async getDropdown() {
    return this.schoolsService.findAllForDropdown();
  }

  // Super admin only
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'coverPhoto', maxCount: 1 },
      ],
      { storage: memoryStorage() },
    ),
  )
  async create(
    @Body() dto: CreateSchoolDto,
    @UploadedFiles()
    files?: {
      logo?: Express.Multer.File[];
      coverPhoto?: Express.Multer.File[];
    },
  ) {
    let logoUrl: string | undefined;
    let coverPhotoUrl: string | undefined;

    if (files?.logo?.[0]) {
      logoUrl = await this.cloudinaryService.uploadImage(files.logo[0], 'school-alumni/schools');
    }
    if (files?.coverPhoto?.[0]) {
      coverPhotoUrl = await this.cloudinaryService.uploadImage(
        files.coverPhoto[0],
        'school-alumni/schools',
      );
    }

    return this.schoolsService.create(dto, logoUrl, coverPhotoUrl);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async findAll(@Query() query: PaginationDto) {
    return this.schoolsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.schoolsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'coverPhoto', maxCount: 1 },
      ],
      { storage: memoryStorage() },
    ),
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolDto,
    @UploadedFiles()
    files?: {
      logo?: Express.Multer.File[];
      coverPhoto?: Express.Multer.File[];
    },
  ) {
    let logoUrl: string | undefined;
    let coverPhotoUrl: string | undefined;

    if (files?.logo?.[0]) {
      logoUrl = await this.cloudinaryService.uploadImage(files.logo[0], 'school-alumni/schools');
    }
    if (files?.coverPhoto?.[0]) {
      coverPhotoUrl = await this.cloudinaryService.uploadImage(
        files.coverPhoto[0],
        'school-alumni/schools',
      );
    }

    return this.schoolsService.update(id, dto, logoUrl, coverPhotoUrl);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.schoolsService.toggleActive(id);
  }
}
