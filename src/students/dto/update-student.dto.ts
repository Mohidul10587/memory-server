import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsEmail,
  IsUrl,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { BloodGroup } from '@prisma/client';

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1971)
  @Max(new Date().getFullYear())
  sscPassingYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  division?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  upazila?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  union?: string;

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
