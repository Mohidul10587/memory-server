import { IsOptional, IsString, IsIn, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUserFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Filter by school ID' })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional({ description: 'Filter by division' })
  @IsOptional()
  @IsString()
  division?: string;

  @ApiPropertyOptional({ description: 'Filter by district' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Filter by upazila' })
  @IsOptional()
  @IsString()
  upazila?: string;
}
