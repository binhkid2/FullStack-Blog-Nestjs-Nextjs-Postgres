import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BlogPostsService } from './blog-posts.service';
import { BlogPost, PostStatus, ContentFormat } from './entities/blog-post.entity';
import { UserRole } from '../users/entities/user.entity';

const mockPost: Partial<BlogPost> = {
  id: 'post-uuid-1',
  title: 'Test Post',
  slug: 'test-post-abc',
  status: PostStatus.PUBLISHED,
  excerpt: 'A test post',
  content: '# Test',
  contentFormat: ContentFormat.MARKDOWN,
  authorId: 'user-1',
  isFeatured: false,
  views: 100,
  tags: ['test'],
  categories: ['Testing'],
};

const mockQueryBuilder = {
  leftJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(1),
  getMany: jest.fn().mockResolvedValue([mockPost]),
  getOne: jest.fn().mockResolvedValue(mockPost),
};

const mockRepo = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
  remove: jest.fn(),
};

describe('BlogPostsService', () => {
  let service: BlogPostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogPostsService,
        { provide: getRepositoryToken(BlogPost), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<BlogPostsService>(BlogPostsService);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('findPublished', () => {
    it('should return paginated published posts', async () => {
      const result = await service.findPublished({});
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'post.status = :status',
        { status: PostStatus.PUBLISHED },
      );
    });
  });

  describe('findBySlug', () => {
    it('should return published post by slug', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockPost);
      const post = await service.findBySlug('test-post-abc');
      expect(post.slug).toBe('test-post-abc');
    });

    it('should throw NotFoundException for draft post', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ ...mockPost, status: PostStatus.DRAFT });
      await expect(service.findBySlug('test-post-abc')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent slug', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      await expect(service.findBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const adminUser = { sub: 'user-1', role: UserRole.ADMIN };
    const managerUser = { sub: 'user-2', role: UserRole.MANAGER };

    it('ADMIN can create published post', async () => {
      mockRepo.create.mockReturnValue({ ...mockPost });
      mockRepo.save.mockResolvedValue({ ...mockPost, status: PostStatus.PUBLISHED });

      const result = await service.create(
        { title: 'New Post', content: 'Content', status: PostStatus.PUBLISHED },
        adminUser,
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('MANAGER is forced to draft', async () => {
      mockRepo.create.mockImplementation((data) => ({ ...data }));
      mockRepo.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.create(
        { title: 'Manager Post', content: 'Content', status: PostStatus.PUBLISHED },
        managerUser,
      );
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: PostStatus.DRAFT }),
      );
    });
  });

  describe('incrementViews', () => {
    it('should increment post views', async () => {
      mockRepo.increment.mockResolvedValue({});
      await service.incrementViews('test-post-abc');
      expect(mockRepo.increment).toHaveBeenCalledWith(
        { slug: 'test-post-abc' },
        'views',
        1,
      );
    });
  });

  describe('remove', () => {
    it('should remove a post', async () => {
      mockRepo.findOne.mockResolvedValue(mockPost);
      mockRepo.remove.mockResolvedValue({});
      await service.remove('post-uuid-1');
      expect(mockRepo.remove).toHaveBeenCalledWith(mockPost);
    });

    it('should throw NotFoundException for non-existent post', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
