import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminUserFilterDto } from './dto/admin-user-filter.dto';
import { AdminUpdateStudentDto, AdminUpdateTeacherDto } from './dto/admin-update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ─── Super Admin Endpoints ─────────────────────────────────────────────────

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super Admin: get platform stats' })
  async getStats() {
    return this.usersService.getStats();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super Admin: list all users with filters' })
  async getAllUsers(@Query() query: AdminUserFilterDto) {
    return this.usersService.getAllUsers(query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super Admin: get single user detail' })
  async getOneUser(@Param('id', ParseUUIDPipe) userId: string) {
    return this.usersService.getOneUser(userId);
  }

  @Patch(':id/student')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super Admin: update student profile' })
  async updateStudent(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: AdminUpdateStudentDto,
  ) {
    return this.usersService.adminUpdateStudent(userId, dto);
  }

  @Patch(':id/teacher')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super Admin: update teacher profile' })
  async updateTeacher(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: AdminUpdateTeacherDto,
  ) {
    return this.usersService.adminUpdateTeacher(userId, dto);
  }

  @Patch(':id/toggle-active')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super Admin: toggle user active status' })
  async toggleActive(@Param('id', ParseUUIDPipe) userId: string) {
    return this.usersService.toggleUserActive(userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super Admin: delete a user permanently' })
  async deleteUser(@Param('id', ParseUUIDPipe) userId: string) {
    return this.usersService.deleteUser(userId);
  }

  // ─── Normal User Endpoint ──────────────────────────────────────────────────

  @Get(':id/profile')
  @ApiOperation({ summary: 'Get user profile (same school only)' })
  async getProfile(
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.usersService.getProfile(userId, schoolId);
  }
}
