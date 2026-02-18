import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import { BlogPost, PostStatus, ContentFormat } from '../src/blog-posts/entities/blog-post.entity';
import { User, UserRole } from '../src/users/entities/user.entity';

describe('Public Posts (e2e)', () => {
  let app: INestApplication;
  let postRepo: Repository<BlogPost>;
  let userRepo: Repository<User>;
  let testAuthorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    postRepo = moduleFixture.get<Repository<BlogPost>>(getRepositoryToken(BlogPost));
    userRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));

    // Create test author
    const author = userRepo.create({
      id: uuidv4(),
      email: `author-${Date.now()}@test.com`,
      role: UserRole.ADMIN,
      isActive: true,
    });
    await userRepo.save(author);
    testAuthorId = author.id;

    // Create test posts
    await postRepo.save([
      postRepo.create({
        id: uuidv4(),
        title: 'Published Test Post',
        slug: `published-test-${Date.now()}`,
        status: PostStatus.PUBLISHED,
        excerpt: 'A published post for testing',
        content: 'Test content',
        contentFormat: ContentFormat.MARKDOWN,
        authorId: testAuthorId,
        tags: ['test', 'published'],
        categories: ['Test'],
      }),
      postRepo.create({
        id: uuidv4(),
        title: 'Draft Test Post',
        slug: `draft-test-${Date.now()}`,
        status: PostStatus.DRAFT,
        excerpt: 'A draft post',
        content: 'Draft content',
        contentFormat: ContentFormat.MARKDOWN,
        authorId: testAuthorId,
        tags: ['test', 'draft'],
        categories: ['Test'],
      }),
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /blog-posts/public', () => {
    it('should return only published posts', async () => {
      const res = await request(app.getHttpServer())
        .get('/blog-posts/public')
        .expect(200);

      expect(Array.isArray(res.body.posts)).toBe(true);
      const allPublished = res.body.posts.every((p: any) => p.status === 'published');
      expect(allPublished).toBe(true);
    });

    it('should support search by query', async () => {
      const res = await request(app.getHttpServer())
        .get('/blog-posts/public?q=Published+Test')
        .expect(200);

      expect(res.body.posts.length).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/blog-posts/public?page=1&pageSize=2')
        .expect(200);

      expect(res.body.posts.length).toBeLessThanOrEqual(2);
      expect(res.body.page).toBe(1);
    });
  });

  describe('GET /blog-posts/public/:slug', () => {
    it('should return a published post by slug', async () => {
      // First get a published post slug
      const listRes = await request(app.getHttpServer()).get('/blog-posts/public');
      const slug = listRes.body.posts[0]?.slug;
      expect(slug).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/blog-posts/public/${slug}`)
        .expect(200);

      expect(res.body.post.slug).toBe(slug);
    });

    it('should return 404 for draft post', async () => {
      await request(app.getHttpServer())
        .get(`/blog-posts/public/draft-test-99999`)
        .expect(404);
    });
  });

  describe('GET /blog-posts/public/featured', () => {
    it('should return featured published posts', async () => {
      const res = await request(app.getHttpServer())
        .get('/blog-posts/public/featured')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
