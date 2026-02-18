import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
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

  // ─── HTMX partials (public) ──────────────────────────────────────────────────

  /**
   * Renders the post-grid partial.
   * Templates expect:
   *   result  → { items, page, pageSize, total, totalPages }
   *   query   → the raw query params (q, tags, category, sort, page, pageSize)
   */
  @Get('partials/grid')
  @Public()
  async gridPartial(@Query() query: ListPostsQueryDto, @Res() res: Response) {
    const result = await this.blogPostsService.findPublished(query);
    return res.render('partials/post-grid', {
      result,
      query: {
        q: query.q || '',
        tags: query.tags || '',
        category: query.category || '',
        sort: query.sort || 'newest',
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  }

  // ─── HTMX partials (authenticated) ───────────────────────────────────────────

  /**
   * Renders the dashboard-post-table partial.
   * Template expects: posts[], currentUser
   */
  @Get('partials/table')
  async tablePartial(
    @Query() query: ListPostsQueryDto,
    @CurrentUser() currentUser: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const data = await this.blogPostsService.findAll(query, currentUser);
    return res.render('partials/dashboard-post-table', {
      posts: data.posts,
      currentUser,
    });
  }

  // ─── Authenticated CRUD ───────────────────────────────────────────────────────

  @Get()
  async findAll(@Query() query: ListPostsQueryDto, @CurrentUser() user: any) {
    return this.blogPostsService.findAll(query, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(@Body() dto: CreatePostDto, @CurrentUser() user: any, @Res() res: Response, @Req() req: Request) {
    const post = await this.blogPostsService.create(dto, user);
    const isHtmx = req.headers['hx-request'] === 'true';
    if (isHtmx) {
      return res.render('partials/flash', { type: 'success', message: `Post "${post.title}" created!` });
    }
    return res.json({ success: true, post });
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: any,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const post = await this.blogPostsService.update(id, dto, user);
    const isHtmx = req.headers['hx-request'] === 'true';
    if (isHtmx) {
      return res.render('partials/flash', { type: 'success', message: `Post "${post.title}" updated!` });
    }
    return res.json({ success: true, post });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string, @Res() res: Response, @Req() req: Request) {
    await this.blogPostsService.remove(id);
    const isHtmx = req.headers['hx-request'] === 'true';
    if (isHtmx) {
      return res.render('partials/flash', { type: 'success', message: 'Post deleted.' });
    }
    return res.json({ success: true });
  }
}
