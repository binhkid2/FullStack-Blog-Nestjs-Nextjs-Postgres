import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserNameDto } from './dto/update-user-name.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(page = 1, pageSize = 20, q?: string) {
    const where = q
      ? [{ email: ILike(`%${q}%`) }, { name: ILike(`%${q}%`) }]
      : {};

    const [users, total] = await this.userRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const user = this.userRepo.create({
      id: uuidv4(),
      email: dto.email,
      name: dto.name,
      role: dto.role || UserRole.MEMBER,
      passwordHash: dto.password ? await bcrypt.hash(dto.password, 12) : null,
    });
    return this.userRepo.save(user);
  }

  async updateName(id: string, dto: UpdateUserNameDto): Promise<User> {
    await this.findById(id);
    await this.userRepo.update(id, { name: dto.name });
    return this.findById(id);
  }

  async updateRole(id: string, dto: UpdateUserRoleDto): Promise<User> {
    await this.findById(id);
    await this.userRepo.update(id, { role: dto.role });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // throws NotFoundException if not found
    await this.userRepo.delete(id);
  }

  async setPassword(id: string, password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 12);
    await this.userRepo.update(id, { passwordHash: hash });
  }

  async upsertByEmail(
    email: string,
    data: Partial<Pick<User, 'name' | 'role' | 'passwordHash' | 'isActive'>>,
  ): Promise<User> {
    let user = await this.findByEmail(email);
    if (!user) {
      user = this.userRepo.create({ id: uuidv4(), email, ...data });
    } else {
      Object.assign(user, data);
    }
    return this.userRepo.save(user);
  }
}
