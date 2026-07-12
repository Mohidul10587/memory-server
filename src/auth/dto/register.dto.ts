import {
  IsString,
  IsNotEmpty,
  Matches,
  MinLength,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsEmail,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { UserRole, BloodGroup } from '@prisma/client';

export class RegisterStudentDto {
  @IsUUID()
  schoolId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^01[3-9]\d{8}$/, { message: 'Invalid Bangladeshi phone number' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsInt()
  @Min(1971)
  @Max(new Date().getFullYear())
  sscPassingYear: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  profession?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  workplace?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  facebookProfile?: string;

  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  about?: string;
}

export class RegisterTeacherDto {
  @IsUUID()
  schoolId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^01[3-9]\d{8}$/, { message: 'Invalid Bangladeshi phone number' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsInt()
  @Min(1971)
  @Max(new Date().getFullYear())
  joiningYear: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  designation: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  permanentAddress?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  facebookProfile?: string;

  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  about?: string;
}
