import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BlogPostsService } from './blog-posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('blog-posts')
export class BlogPostsController {
  constructor(private readonly blogPostsService: BlogPostsService) {}

  // ─── Public endpoints ────────────────────────────────────────────────────────

  @Get('public')
  @Public()
  async findPublished(@Query() query: ListPostsQueryDto) {
    return this.blogPostsService.findPublished(query);
  }

  @Get('public/featured')
  @Public()
  async findFeatured() {
    return this.blogPostsService.findFeatured();
  }

  @Get('public/:slug')
  @Public()
  async findBySlug(@Param('slug') slug: string) {
    const post = await this.blogPostsService.findBySlug(slug);
    return { success: true, post };
  }

  @Post('public/:slug/view')
  @Public()
  async incrementViews(@Param('slug') slug: string) {
    await this.blogPostsService.incrementViews(slug);
    return { success: true };
  }

  // ─── Authenticated CRUD ───────────────────────────────────────────────────────

  @Get()
  async findAll(@Query() query: ListPostsQueryDto, @CurrentUser() user: any) {
    return this.blogPostsService.findAll(query, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(@Body() dto: CreatePostDto, @CurrentUser() user: any) {
    const post = await this.blogPostsService.create(dto, user);
    return { success: true, post };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: any,
  ) {
    const post = await this.blogPostsService.update(id, dto, user);
    return { success: true, post };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.blogPostsService.remove(id);
    return { success: true };
  }
}
