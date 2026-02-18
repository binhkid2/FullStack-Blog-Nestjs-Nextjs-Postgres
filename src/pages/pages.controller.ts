import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BlogPostsService } from '../blog-posts/blog-posts.service';
import { UsersService } from '../users/users.service';
import { Public } from '../common/decorators/public.decorator';
import { marked } from 'marked';

@Controller()
export class PagesController {
  constructor(
    private readonly blogPostsService: BlogPostsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('health')
  @Public()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // ─── Home page ─────────────────────────────────────────────────────────────

  @Get()
  @Public()
  async home(@Req() req: Request, @Res() res: Response, @Query() rawQuery: Record<string, string>) {
    const currentUser = (req as any).user || null;

    // Determine query params with defaults
    const query = {
      q: rawQuery.q || '',
      tags: rawQuery.tags || '',
      category: rawQuery.category || '',
      sort: rawQuery.sort || 'newest',
      page: rawQuery.page || '1',
      pageSize: rawQuery.pageSize || '9',
    };

    const [featured, postsResult, topTags, topCategories, popularPosts] = await Promise.all([
      this.blogPostsService.findFeatured(3),
      this.blogPostsService.findPublished(query),
      this.blogPostsService.getTagCloud(),
      this.blogPostsService.getCategoryCloud(),
      this.blogPostsService.findPopular(5),
    ]);

    return res.render('pages/home', {
      title: 'Duc Binh Blog',
      currentUser,
      featured,
      // home.njk does {% set result = posts %} then includes post-grid.njk
      // so `posts` must be the result shape { items, page, pageSize, total, totalPages }
      posts: postsResult,
      query,
      topTags: topTags.slice(0, 20),
      topCategories: topCategories.slice(0, 10),
      popularPosts,
    });
  }

  // ─── Blog detail ───────────────────────────────────────────────────────────

  @Get('blog/:slug')
  @Public()
  async blogDetail(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const post = await this.blogPostsService.findBySlug(slug);
    // Increment views
    await this.blogPostsService.incrementViews(slug);

    const contentHtml =
      post.contentFormat === 'markdown'
        ? await marked(post.content)
        : post.content;

    const currentUser = (req as any).user || null;

    const [relatedPosts, popularPosts, topTags] = await Promise.all([
      this.blogPostsService.findRelated(post, 4),
      this.blogPostsService.findPopular(5),
      this.blogPostsService.getTagCloud(),
    ]);

    return res.render('pages/blog-detail', {
      title: post.title,
      currentUser,
      post,
      contentHtml,
      relatedPosts,
      popularPosts,
      topTags: topTags.slice(0, 20),
    });
  }

  // ─── Auth page ─────────────────────────────────────────────────────────────

  @Get('auth')
  @Public()
  async authPage(
    @Req() req: Request,
    @Res() res: Response,
    @Query('token') resetToken?: string,
  ) {
    // If already logged in, redirect to dashboard
    if ((req as any).user) {
      return res.redirect('/dashboard');
    }
    return res.render('pages/auth', {
      title: 'Sign In — Duc Binh Blog',
      currentUser: null,
      resetToken: resetToken || '',
    });
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  @Get('dashboard')
  async dashboard(@Req() req: Request, @Res() res: Response) {
    const currentUser = (req as any).user;
    const [postsResult, usersResult] = await Promise.all([
      this.blogPostsService.findAll({ page: '1', pageSize: '10' }, currentUser),
      currentUser.role === 'ADMIN'
        ? this.usersService.findAll(1, 10)
        : Promise.resolve(null),
    ]);

    return res.render('pages/dashboard', {
      title: 'Dashboard — Duc Binh Blog',
      currentUser,
      // dashboard-post-table.njk uses `posts` directly (flat array)
      posts: postsResult.posts,
      postsPagination: {
        page: postsResult.page,
        totalPages: postsResult.totalPages,
        total: postsResult.total,
      },
      users: usersResult?.users || null,
      usersPagination: usersResult
        ? {
            page: usersResult.page,
            totalPages: usersResult.totalPages,
            total: usersResult.total,
          }
        : null,
    });
  }
}
