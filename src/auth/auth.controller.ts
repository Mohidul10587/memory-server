import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto, RegisterTeacherDto } from './dto/register.dto';
import { RefreshTokenDto, ChangePasswordDto, ChangePhoneDto } from './dto/token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { successResponse } from '../common/helpers/response.helper';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private authService: AuthService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Post('register/student')
  @UseGuards(ThrottlerGuard)
  @UseInterceptors(FileInterceptor('profileImage', { storage: memoryStorage() }))
  async registerStudent(
    @Body() dto: RegisterStudentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.cloudinaryService.uploadImage(file, 'school-alumni/profiles');
    }
    const result = await this.authService.registerStudent(dto, imageUrl);
    return successResponse(result, 'Registration successful');
  }

  @Post('register/teacher')
  @UseGuards(ThrottlerGuard)
  @UseInterceptors(FileInterceptor('profileImage', { storage: memoryStorage() }))
  async registerTeacher(
    @Body() dto: RegisterTeacherDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.cloudinaryService.uploadImage(file, 'school-alumni/profiles');
    }
    const result = await this.authService.registerTeacher(dto, imageUrl);
    return successResponse(result, 'Registration successful');
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return successResponse(result, 'Login successful');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshTokens(dto.refreshToken);
    return successResponse(result, 'Tokens refreshed');
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Body() dto: RefreshTokenDto,
  ) {
    const result = await this.authService.logout(userId, dto.refreshToken);
    return successResponse(result, 'Logged out');
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(userId, dto);
    return successResponse(result, 'Password changed');
  }

  @Post('change-phone')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePhone(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePhoneDto,
  ) {
    const result = await this.authService.changePhone(userId, dto);
    return successResponse(result, 'Phone number changed');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMe(@CurrentUser('id') userId: string) {
    const result = await this.authService.getMe(userId);
    return successResponse(result, 'User profile fetched');
  }
}
