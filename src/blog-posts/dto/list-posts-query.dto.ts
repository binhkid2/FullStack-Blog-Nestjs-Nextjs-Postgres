import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PostStatus } from '../entities/blog-post.entity';

export class ListPostsQueryDto {
  @IsNumberString()
  @IsOptional()
  page?: string;

  @IsNumberString()
  @IsOptional()
  pageSize?: string;

  /** Full-text search on title + excerpt */
  @IsString()
  @IsOptional()
  q?: string;

  /** Comma-separated tags e.g. "nestjs,htmx" */
  @IsString()
  @IsOptional()
  tags?: string;

  /** Single category filter */
  @IsString()
  @IsOptional()
  category?: string;

  /** Sort order: newest | oldest | most_viewed | featured */
  @IsEnum(['newest', 'oldest', 'most_viewed', 'featured'])
  @IsOptional()
  sort?: string;

  /** Admin/manager status filter */
  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;
}
