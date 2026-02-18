import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ContentFormat, PostStatus } from '../entities/blog-post.entity';

/** Parse "true"/"false" strings into a real boolean */
function transformBoolean({ value }: { value: unknown }): boolean | undefined {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
}

/** Parse a comma-separated string OR an array into a trimmed string[] */
function transformCSV({ value }: { value: unknown }): string[] {
  if (Array.isArray(value)) return (value as unknown[]).map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  /** Optional custom slug; if omitted the service generates one from the title */
  @IsString()
  @IsOptional()
  @MaxLength(300)
  slug?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsEnum(ContentFormat)
  @IsOptional()
  contentFormat?: ContentFormat;

  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;

  @IsString()
  @IsOptional()
  featuredImageUrl?: string;

  @IsString()
  @IsOptional()
  featuredImageAlt?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(transformBoolean)
  isFeatured?: boolean;

  /** Accepts a comma-separated string "tag1,tag2" or a plain string[] */
  @IsString({ each: true })
  @IsOptional()
  @Transform(transformCSV)
  tags?: string[];

  /** Accepts a comma-separated string "cat1,cat2" or a plain string[] */
  @IsString({ each: true })
  @IsOptional()
  @Transform(transformCSV)
  categories?: string[];
}
