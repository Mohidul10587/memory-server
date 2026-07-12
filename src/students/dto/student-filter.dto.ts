import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BloodGroup } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class StudentFilterDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1971)
  @Max(new Date().getFullYear())
  sscPassingYear?: number;

  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @IsOptional()
  @IsString()
  profession?: string;
}
