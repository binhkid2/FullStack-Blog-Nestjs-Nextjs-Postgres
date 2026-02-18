import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';

const mockUser: Partial<User> = {
  id: 'uuid-1',
  email: 'test@test.com',
  name: 'Test User',
  role: UserRole.MEMBER,
  isActive: true,
  passwordHash: 'hash',
};

const mockRepo = {
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      mockRepo.findAndCount.mockResolvedValue([[mockUser], 1]);
      const result = await service.findAll(1, 20);
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);
      const user = await service.findById('uuid-1');
      expect(user.id).toBe('uuid-1');
    });

    it('should throw NotFoundException for unknown id', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      mockRepo.findOne.mockResolvedValue(null); // no existing user
      mockRepo.create.mockReturnValue({ ...mockUser });
      mockRepo.save.mockResolvedValue({ ...mockUser });

      const result = await service.create({ email: 'new@test.com', password: 'password123' });
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser); // existing user
      await expect(
        service.create({ email: mockUser.email, password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockUser });
      mockRepo.update.mockResolvedValue({});
      mockRepo.findOne.mockResolvedValueOnce({ ...mockUser })
                      .mockResolvedValueOnce({ ...mockUser, role: UserRole.MANAGER });

      const result = await service.updateRole('uuid-1', { role: UserRole.MANAGER });
      expect(mockRepo.update).toHaveBeenCalledWith('uuid-1', { role: UserRole.MANAGER });
    });
  });
});
