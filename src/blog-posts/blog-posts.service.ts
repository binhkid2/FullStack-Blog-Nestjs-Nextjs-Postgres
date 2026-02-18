import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BlogPost, PostStatus } from './entities/blog-post.entity';
import { UserRole } from '../users/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { generateSlug } from '../common/helpers/slug.helper';

// Safe author columns — never include passwordHash
const AUTHOR_COLS: string[] = [
  'author.id',
  'author.email',
  'author.name',
  'author.role',
  'author.isActive',
  'author.createdAt',
];

@Injectable()
export class BlogPostsService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly postRepo: Repository<BlogPost>,
  ) {}

  // ─── Public (published) posts ──────────────────────────────────────────────

  async findPublished(query: ListPostsQueryDto) {
    const page = parseInt(query.page || '1', 10);
    const pageSize = parseInt(query.pageSize || '9', 10);

    const qb = this.postRepo
      .createQueryBuilder('post')
      .leftJoin('post.author', 'author')
      .addSelect(AUTHOR_COLS)
      .where('post.status = :status', { status: PostStatus.PUBLISHED });

    if (query.q) {
      qb.andWhere(
        '(post.title ILIKE :q OR post.excerpt ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }

    // Support comma-separated tags (from HTMX filter form: name="tags")
    if (query.tags) {
      const tagList = query.tags.split(',').map((t) => t.trim()).filter(Boolean);
      tagList.forEach((tag, i) => {
        qb.andWhere(`post.tags LIKE :tag${i}`, { [`tag${i}`]: `%${tag}%` });
      });
    }

    if (query.category) {
      qb.andWhere('post.categories LIKE :cat', { cat: `%${query.category}%` });
    }

    // Sort options matching the home page template values
    switch (query.sort) {
      case 'oldest':
        qb.orderBy('post.createdAt', 'ASC');
        break;
      case 'most_viewed':
        qb.orderBy('post.views', 'DESC');
        break;
      case 'featured':
        qb.orderBy('post.isFeatured', 'DESC').addOrderBy('post.createdAt', 'DESC');
        break;
      default: // 'newest' or undefined
        qb.orderBy('post.createdAt', 'DESC');
    }

    const total = await qb.getCount();
    const posts = await qb.skip((page - 1) * pageSize).take(pageSize).getMany();

    return {
      items: posts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findFeatured(limit = 3) {
    return this.postRepo
      .createQueryBuilder('post')
      .leftJoin('post.author', 'author')
      .addSelect(AUTHOR_COLS)
      .where('post.status = :status', { status: PostStatus.PUBLISHED })
      .andWhere('post.isFeatured = true')
      .orderBy('post.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async findPopular(limit = 5) {
    return this.postRepo
      .createQueryBuilder('post')
      .where('post.status = :status', { status: PostStatus.PUBLISHED })
      .orderBy('post.views', 'DESC')
      .take(limit)
      .select(['post.slug', 'post.title', 'post.views'])
      .getMany();
  }

  async findRelated(post: BlogPost, limit = 4) {
    const qb = this.postRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PostStatus.PUBLISHED })
      .andWhere('p.id != :id', { id: post.id })
      .orderBy('p.createdAt', 'DESC')
      .take(limit);

    // Prefer posts sharing at least one category or tag
    const cats = (post.categories || []).filter(Boolean);
    const tags = (post.tags || []).filter(Boolean);

    if (cats.length > 0) {
      qb.andWhere(
        '(' + cats.map((_, i) => `p.categories LIKE :rc${i}`).join(' OR ') + ')',
        Object.fromEntries(cats.map((c, i) => [`rc${i}`, `%${c}%`])),
      );
    } else if (tags.length > 0) {
      qb.andWhere(
        '(' + tags.map((_, i) => `p.tags LIKE :rt${i}`).join(' OR ') + ')',
        Object.fromEntries(tags.map((t, i) => [`rt${i}`, `%${t}%`])),
      );
    }

    const results = await qb.getMany();
    // Fallback: if nothing related, return latest posts
    if (results.length === 0) {
      return this.postRepo
        .createQueryBuilder('p')
        .where('p.status = :status', { status: PostStatus.PUBLISHED })
        .andWhere('p.id != :id', { id: post.id })
        .orderBy('p.createdAt', 'DESC')
        .take(limit)
        .getMany();
    }
    return results;
  }

  async findBySlug(slug: string): Promise<BlogPost> {
    const post = await this.postRepo
      .createQueryBuilder('post')
      .leftJoin('post.author', 'author')
      .addSelect(AUTHOR_COLS)
      .where('post.slug = :slug', { slug })
      .getOne();

    if (!post || post.status !== PostStatus.PUBLISHED) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async incrementViews(slug: string) {
    await this.postRepo.increment({ slug }, 'views', 1);
  }

  // ─── Admin / authenticated ──────────────────────────────────────────────────

  async findAll(query: ListPostsQueryDto, user: any) {
    const page = parseInt(query.page || '1', 10);
    const pageSize = parseInt(query.pageSize || '20', 10);
    const qb = this.postRepo
      .createQueryBuilder('post')
      .leftJoin('post.author', 'author')
      .addSelect(AUTHOR_COLS);

    if (user.role !== UserRole.ADMIN) {
      qb.where('post.authorId = :uid', { uid: user.sub });
    }
    if (query.status) {
      qb.andWhere('post.status = :status', { status: query.status });
    }
    if (query.q) {
      qb.andWhere('post.title ILIKE :q', { q: `%${query.q}%` });
    }

    qb.orderBy('post.createdAt', 'DESC');
    const total = await qb.getCount();
    const posts = await qb.skip((page - 1) * pageSize).take(pageSize).getMany();

    return { posts, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async create(dto: CreatePostDto, user: any): Promise<BlogPost> {
    let status = dto.status || PostStatus.DRAFT;
    // MANAGER can only create drafts
    if (user.role === UserRole.MANAGER) {
      status = PostStatus.DRAFT;
    }

    // Use provided slug or generate from title
    const slug = dto.slug ? dto.slug.trim() : generateSlug(dto.title);

    const post = this.postRepo.create({
      id: uuidv4(),
      title: dto.title,
      slug,
      status,
      excerpt: dto.excerpt || '',
      content: dto.content,
      contentFormat: dto.contentFormat,
      authorId: user.sub,
      featuredImageUrl: dto.featuredImageUrl,
      featuredImageAlt: dto.featuredImageAlt,
      isFeatured: dto.isFeatured || false,
      tags: dto.tags || [],
      categories: dto.categories || [],
    });

    return this.postRepo.save(post);
  }

  async update(id: string, dto: UpdatePostDto, user: any): Promise<BlogPost> {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');

    // Regenerate slug if title changed and no explicit slug provided
    if (dto.title && dto.title !== post.title && !dto.slug) {
      (dto as any).slug = generateSlug(dto.title);
    }

    Object.assign(post, dto);
    return this.postRepo.save(post);
  }

  async remove(id: string): Promise<void> {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    await this.postRepo.remove(post);
  }

  // ─── Tag cloud ──────────────────────────────────────────────────────────────

  async getTagCloud(): Promise<Array<{ name: string; count: number }>> {
    const posts = await this.postRepo.find({
      where: { status: PostStatus.PUBLISHED },
      select: ['tags'],
    });

    const counts: Record<string, number> = {};
    for (const post of posts) {
      for (const tag of post.tags || []) {
        const t = tag.trim();
        if (t) counts[t] = (counts[t] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ─── Category cloud ─────────────────────────────────────────────────────────

  async getCategoryCloud(): Promise<Array<{ name: string; count: number }>> {
    const posts = await this.postRepo.find({
      where: { status: PostStatus.PUBLISHED },
      select: ['categories'],
    });

    const counts: Record<string, number> = {};
    for (const post of posts) {
      for (const cat of post.categories || []) {
        const c = cat.trim();
        if (c) counts[c] = (counts[c] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }
}
