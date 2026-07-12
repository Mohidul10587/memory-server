import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TeachersService } from './teachers.service';
import { TeacherFilterDto } from './dto/teacher-filter.dto';
import { UpdateTeacherProfileDto } from './dto/update-teacher.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'teachers', version: '1' })
export class TeachersController {
  constructor(private teachersService: TeachersService) {}

  @Get()
  async findAll(
    @CurrentUser('schoolId') schoolId: string,
    @Query() query: TeacherFilterDto,
  ) {
    return this.teachersService.findAllBySchool(schoolId, query);
  }

  @Get(':userId')
  async findOne(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.teachersService.findOne(userId, schoolId);
  }

  @Patch(':userId')
  async updateProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateTeacherProfileDto,
    @CurrentUser('id') requestingUserId: string,
  ) {
    return this.teachersService.updateProfile(userId, dto, requestingUserId);
  }

  @Patch(':userId/image')
  @UseInterceptors(FileInterceptor('profileImage', { storage: memoryStorage() }))
  async updateImage(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser('id') requestingUserId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'image/(jpeg|png|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.teachersService.updateProfileImage(userId, requestingUserId, file);
  }
}
