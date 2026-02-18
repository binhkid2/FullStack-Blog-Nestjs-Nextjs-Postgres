import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserNameDto {
  @IsString()
  @MaxLength(120)
  @IsOptional()
  name?: string;
}
