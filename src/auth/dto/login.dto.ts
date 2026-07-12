import { IsString, IsNotEmpty, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^01[3-9]\d{8}$/, { message: 'Invalid Bangladeshi phone number' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
