import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto, RegisterTeacherDto } from './dto/register.dto';
import { ChangePasswordDto, ChangePhoneDto } from './dto/token.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async registerStudent(dto: RegisterStudentDto, profileImage?: string) {
    // Check school exists
    const school = await this.prisma.school.findUnique({
      where: { id: dto.schoolId, isActive: true },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Check phone uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashedPassword,
        role: UserRole.STUDENT,
        schoolId: dto.schoolId,
        studentProfile: {
          create: {
            name: dto.name,
            profileImage: profileImage || null,
            sscPassingYear: dto.sscPassingYear,
            division: dto.division,
            district: dto.district,
            upazila: dto.upazila,
            union: dto.union,
            currentAddress: dto.currentAddress,
            permanentAddress: dto.permanentAddress,
            profession: dto.profession,
            workplace: dto.workplace,
            email: dto.email,
            facebookProfile: dto.facebookProfile,
            bloodGroup: dto.bloodGroup,
            about: dto.about,
          },
        },
      },
      include: {
        studentProfile: true,
        school: { select: { id: true, name: true } },
      },
    });

    const tokens = await this.generateTokens(user.id, user.phone, user.role, user.schoolId);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  async registerTeacher(dto: RegisterTeacherDto, profileImage?: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: dto.schoolId, isActive: true },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashedPassword,
        role: UserRole.TEACHER,
        schoolId: dto.schoolId,
        teacherProfile: {
          create: {
            name: dto.name,
            profileImage: profileImage || null,
            joiningYear: dto.joiningYear,
            subject: dto.subject,
            designation: dto.designation,
            division: dto.division,
            district: dto.district,
            upazila: dto.upazila,
            union: dto.union,
            currentAddress: dto.currentAddress,
            permanentAddress: dto.permanentAddress,
            email: dto.email,
            facebookProfile: dto.facebookProfile,
            bloodGroup: dto.bloodGroup,
            about: dto.about,
          },
        },
      },
      include: {
        teacherProfile: true,
        school: { select: { id: true, name: true } },
      },
    });

    const tokens = await this.generateTokens(user.id, user.phone, user.role, user.schoolId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: {
        studentProfile: { select: { name: true, profileImage: true, sscPassingYear: true } },
        teacherProfile: { select: { name: true, profileImage: true, designation: true } },
        school: { select: { id: true, name: true, logo: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role, user.schoolId);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or not found');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    // Rotate refresh token
    await this.prisma.refreshToken.delete({ where: { token: refreshToken } });

    const tokens = await this.generateTokens(
      payload.sub,
      payload.phone,
      payload.role,
      payload.schoolId,
    );

    return tokens;
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, token: refreshToken },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Password changed successfully' };
  }

  async changePhone(userId: string, dto: ChangePhoneDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Verify current password
    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    // Check new phone is different
    if (user.phone === dto.newPhone) {
      throw new BadRequestException('New phone number is the same as current');
    }

    // Check phone uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.newPhone },
    });
    if (existing) throw new ConflictException('Phone number already in use');

    // Update phone and invalidate all sessions (force re-login)
    await this.prisma.user.update({
      where: { id: userId },
      data: { phone: dto.newPhone },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Phone number changed successfully. Please log in again.' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        role: true,
        schoolId: true,
        isActive: true,
        createdAt: true,
        school: { select: { id: true, name: true, logo: true } },
        studentProfile: true,
        teacherProfile: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async generateTokens(
    userId: string,
    phone: string,
    role: string,
    schoolId: string,
  ) {
    const payload = { sub: userId, phone, role, schoolId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    // Cleanup old tokens (keep last 5)
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (tokens.length > 5) {
      const toDelete = tokens.slice(5).map((t) => t.id);
      await this.prisma.refreshToken.deleteMany({ where: { id: { in: toDelete } } });
    }

    return { accessToken, refreshToken };
  }
}
