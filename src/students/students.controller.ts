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
import { StudentsService } from './students.service';
import { StudentFilterDto } from './dto/student-filter.dto';
import { UpdateStudentProfileDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'students', version: '1' })
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  async findAll(
    @CurrentUser('schoolId') schoolId: string,
    @Query() query: StudentFilterDto,
  ) {
    return this.studentsService.findAllBySchool(schoolId, query);
  }

  @Get('batches')
  async getBatches(@CurrentUser('schoolId') schoolId: string) {
    return this.studentsService.getBatches(schoolId);
  }

  @Get('batch/:year')
  async getByBatch(
    @CurrentUser('schoolId') schoolId: string,
    @Param('year') year: number,
    @Query() query: StudentFilterDto,
  ) {
    return this.studentsService.findByBatch(schoolId, year, query);
  }

  @Get(':userId')
  async findOne(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.studentsService.findOne(userId, schoolId);
  }

  @Patch(':userId')
  async updateProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateStudentProfileDto,
    @CurrentUser('id') requestingUserId: string,
  ) {
    return this.studentsService.updateProfile(userId, dto, requestingUserId);
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
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.studentsService.updateProfileImage(userId, requestingUserId, file);
  }
}
